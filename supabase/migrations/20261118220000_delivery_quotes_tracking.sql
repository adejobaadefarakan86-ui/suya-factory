-- =====================================================================
-- Suya Factory: DELIVERY QUOTES, EXACT LOCATION, RIDER TRACKING, TEAM
-- =====================================================================
-- New order journey:
--   awaiting_quote   order placed with an exact location (map pin / GPS)
--   pending_payment  staff entered the delivery price; customer can pay
--                    (items only - the delivery fee is paid to the rider)
--                    or cancel. A delivery quote is valid for 6 hours.
--   paid -> preparing
--   out_for_delivery rider name/phone/tracking link; stages:
--                    on_the_way -> almost_there -> arrived
--   delivered
-- Plus: admins manage the team (staff/admin roles) by email.
-- Plain ASCII only.
-- =====================================================================


-- 1. New statuses and fields ---------------------------------------------
alter type public.order_status add value if not exists 'awaiting_quote' before 'pending_payment';

create type public.delivery_stage as enum ('on_the_way', 'almost_there', 'arrived');

alter table public.orders
  add column delivery_quote_minor bigint check (delivery_quote_minor is null or delivery_quote_minor between 0 and 100000000),
  add column delivery_quote_note  text   check (delivery_quote_note is null or length(delivery_quote_note) <= 300),
  add column delivery_quoted_at   timestamptz,
  add column rider_name           text   check (rider_name is null or length(rider_name) <= 100),
  add column rider_phone          text   check (rider_phone is null or length(rider_phone) <= 30),
  add column tracking_url         text   check (tracking_url is null or (tracking_url ~ '^https://' and length(tracking_url) <= 500)),
  add column delivery_stage       public.delivery_stage;

alter table public.order_events
  add column delivery_stage public.delivery_stage;

-- Delivery areas no longer carry a fee (the rider is paid on arrival).
update public.delivery_zones set fee_minor = 0;

-- How long a delivery quote stays valid.
create function public.quote_expires_at(p_quoted_at timestamptz)
returns timestamptz
language sql
immutable
set search_path = ''
as $$ select p_quoted_at + interval '6 hours'; $$;

-- Formats 230000 + 'NGN' as 'NGN 2,300.00' for history notes.
create function public.money_text(p_minor bigint, p_currency public.currency_code)
returns text
language sql
immutable
set search_path = ''
as $$ select p_currency::text || ' ' || to_char(p_minor / 100.0, 'FM999,999,999,990.00'); $$;


-- 2. History log: also record the delivery stage --------------------------
create or replace function public.log_order_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_name text;
  v_note text := nullif(current_setting('sf.status_note', true), '');
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;
  if v_uid is not null then
    select full_name into v_name from public.profiles where id = v_uid;
  end if;

  insert into public.order_events (order_id, from_status, to_status, note, actor_id, actor_name, delivery_stage)
  values (
    new.id,
    case when tg_op = 'UPDATE' then old.status end,
    new.status,
    coalesce(v_note, case
      when tg_op = 'INSERT' then 'Order placed'
      when v_uid is null then 'Paid online'
    end),
    v_uid,
    coalesce(v_name, case when v_uid is null then 'System' end),
    case when new.status = 'out_for_delivery' then new.delivery_stage end
  );
  return new;
end;
$$;

-- Writes a history entry that is NOT a status change (e.g. "almost there").
create function public.log_order_note(p_order_id uuid, p_note text, p_stage public.delivery_stage default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_name   text;
  v_status public.order_status;
begin
  select status into v_status from public.orders where id = p_order_id;
  if v_uid is not null then
    select full_name into v_name from public.profiles where id = v_uid;
  end if;
  insert into public.order_events (order_id, from_status, to_status, note, actor_id, actor_name, delivery_stage)
  values (p_order_id, v_status, v_status, p_note, v_uid,
          coalesce(v_name, case when v_uid is null then 'Customer' end), p_stage);
end;
$$;
revoke all on function public.log_order_note(uuid, text, public.delivery_stage) from public, anon, authenticated;


-- 3. place_order: exact location required, no delivery fee charged --------
create or replace function public.place_order(
  p_country              public.country_code,
  p_zone_id              uuid,
  p_contact_name         text,
  p_contact_email        text,
  p_contact_phone        text,
  p_address              jsonb,     -- {"line1","line2","city","landmark","lat","lng","accuracy"}
  p_notes                text,
  p_items                jsonb,     -- [{"variant_id": "...", "quantity": 2}, ...]
  p_expected_total_minor bigint     -- the total the customer was shown (items only)
)
returns table (order_id uuid, order_number text, access_token uuid)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_currency   public.currency_code := case p_country when 'NG' then 'NGN' else 'GHS' end;
  v_name       text := btrim(coalesce(p_contact_name, ''));
  v_email      text := lower(btrim(coalesce(p_contact_email, '')));
  v_phone      text := btrim(coalesce(p_contact_phone, ''));
  v_line1      text := btrim(coalesce(p_address ->> 'line1', ''));
  v_line2      text := nullif(btrim(coalesce(p_address ->> 'line2', '')), '');
  v_city       text := btrim(coalesce(p_address ->> 'city', ''));
  v_landmark   text := nullif(btrim(coalesce(p_address ->> 'landmark', '')), '');
  v_notes      text := nullif(btrim(coalesce(p_notes, '')), '');
  v_lat_text   text := coalesce(p_address ->> 'lat', '');
  v_lng_text   text := coalesce(p_address ->> 'lng', '');
  v_acc_text   text := coalesce(p_address ->> 'accuracy', '');
  v_lat        numeric;
  v_lng        numeric;
  v_acc        numeric;
  v_zone       record;
  v_wanted     int;
  v_found      int;
  v_subtotal   bigint;
  v_order      public.orders%rowtype;
begin
  -- Contact details ------------------------------------------------------
  if p_country is null then raise exception 'SF:country'; end if;
  if v_name = '' or length(v_name) > 100 then raise exception 'SF:name'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 200 then
    raise exception 'SF:email';
  end if;
  if v_phone !~ '^[0-9+()\s-]+$'
     or length(regexp_replace(v_phone, '\D', '', 'g')) not between 7 and 15 then
    raise exception 'SF:phone';
  end if;

  -- Address --------------------------------------------------------------
  if v_line1 = '' or v_city = '' then raise exception 'SF:address'; end if;
  if length(v_line1) > 200 or length(coalesce(v_line2, '')) > 200
     or length(v_city) > 100 or length(coalesce(v_landmark, '')) > 200
     or length(coalesce(v_notes, '')) > 500 then
    raise exception 'SF:too_long';
  end if;

  -- Exact location: required, and roughly inside the chosen country -------
  if v_lat_text !~ '^-?[0-9]{1,3}(\.[0-9]{1,10})?$' or v_lng_text !~ '^-?[0-9]{1,3}(\.[0-9]{1,10})?$' then
    raise exception 'SF:location';
  end if;
  v_lat := v_lat_text::numeric;
  v_lng := v_lng_text::numeric;
  if (p_country = 'NG' and not (v_lat between 4.0 and 14.0 and v_lng between 2.5 and 15.0))
     or (p_country = 'GH' and not (v_lat between 4.5 and 11.5 and v_lng between -3.5 and 1.5)) then
    raise exception 'SF:location_country';
  end if;
  if v_acc_text ~ '^[0-9]{1,6}(\.[0-9]+)?$' then v_acc := round(v_acc_text::numeric); end if;

  -- Delivery area: must be active AND in the same country ------------------
  select z.id, z.name into v_zone
  from public.delivery_zones z
  where z.id = p_zone_id and z.is_active and z.country = p_country;
  if not found then raise exception 'SF:zone'; end if;

  -- Items ----------------------------------------------------------------
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'SF:empty';
  end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'SF:too_many'; end if;

  if exists (
    select 1 from jsonb_array_elements(p_items) as i
    where jsonb_typeof(i) <> 'object'
       or coalesce(i ->> 'variant_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or coalesce(i ->> 'quantity', '') !~ '^[0-9]{1,3}$'
  ) then
    raise exception 'SF:bad_items';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_items) as i
    group by i ->> 'variant_id'
    having sum((i ->> 'quantity')::int) not between 1 and 20
  ) then
    raise exception 'SF:quantity';
  end if;

  select count(distinct i ->> 'variant_id') into v_wanted
  from jsonb_array_elements(p_items) as i;

  with b as (
    select (i ->> 'variant_id')::uuid as variant_id, sum((i ->> 'quantity')::int) as quantity
    from jsonb_array_elements(p_items) as i group by 1
  )
  select count(*), coalesce(sum(vp.amount_minor * b.quantity), 0)
    into v_found, v_subtotal
  from b
  join public.product_variants v on v.id = b.variant_id and v.is_active
  join public.products p        on p.id = v.product_id and p.is_active
  join public.variant_prices vp on vp.variant_id = v.id and vp.currency = v_currency;
  if v_found <> v_wanted then raise exception 'SF:unavailable'; end if;

  -- The customer pays online for the items only.
  if p_expected_total_minor is distinct from v_subtotal then
    raise exception 'SF:price_changed';
  end if;

  -- Save the order + its items (all or nothing) --------------------------
  insert into public.orders (
    user_id, contact_name, contact_email, contact_phone, country, currency, zone_id,
    delivery_address, subtotal_minor, delivery_fee_minor, total_minor, notes, status
  ) values (
    auth.uid(),
    v_name, v_email, v_phone, p_country, v_currency, v_zone.id,
    jsonb_build_object(
      'line1', v_line1, 'line2', v_line2, 'city', v_city, 'landmark', v_landmark,
      'zone_name', v_zone.name, 'lat', v_lat, 'lng', v_lng, 'accuracy_m', v_acc
    ),
    v_subtotal, 0, v_subtotal, v_notes, 'awaiting_quote'
  )
  returning * into v_order;

  insert into public.order_items (
    order_id, variant_id, product_name, variant_label, unit_price_minor, quantity
  )
  with b as (
    select (i ->> 'variant_id')::uuid as variant_id, sum((i ->> 'quantity')::int) as quantity
    from jsonb_array_elements(p_items) as i group by 1
  )
  select
    v_order.id, v.id, p.name,
    -- chr(183) = middle dot, e.g. '500g [dot] Hot'
    v.size_label || case when v.spice_level is null then '' else
      ' ' || chr(183) || ' ' || upper(left(v.spice_level::text, 1)) || replace(substr(v.spice_level::text, 2), '_', ' ')
    end,
    vp.amount_minor, b.quantity
  from b
  join public.product_variants v on v.id = b.variant_id
  join public.products p       on p.id = v.product_id
  join public.variant_prices vp on vp.variant_id = v.id and vp.currency = v_currency
  order by p.name, v.sort_order;

  return query select v_order.id, v_order.order_number, v_order.access_token;
end;
$$;


-- 4. Staff: enter the delivery price ---------------------------------------
create function public.set_delivery_quote(p_order_id uuid, p_amount_minor bigint, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_text  text;
begin
  if not public.is_staff() then raise exception 'SF:not_allowed'; end if;
  if p_amount_minor is null or p_amount_minor not between 0 and 100000000 then raise exception 'SF:bad_amount'; end if;
  if length(coalesce(p_note, '')) > 300 then raise exception 'SF:too_long'; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'SF:order_not_found'; end if;
  if v_order.status not in ('awaiting_quote', 'pending_payment') then raise exception 'SF:quote_locked'; end if;

  update public.orders
    set delivery_quote_minor = p_amount_minor,
        delivery_quote_note  = nullif(btrim(coalesce(p_note, '')), ''),
        delivery_quoted_at   = now()
    where id = p_order_id;

  v_text := 'Delivery price: ' || public.money_text(p_amount_minor, v_order.currency)
            || coalesce(' (' || nullif(btrim(coalesce(p_note, '')), '') || ')', '');

  if v_order.status = 'awaiting_quote' then
    perform set_config('sf.status_note', v_text, true);
    update public.orders set status = 'pending_payment' where id = p_order_id;
    perform set_config('sf.status_note', '', true);
  else
    perform public.log_order_note(p_order_id, 'New ' || lower(left(v_text, 1)) || substr(v_text, 2));
  end if;
end;
$$;
revoke all on function public.set_delivery_quote(uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.set_delivery_quote(uuid, bigint, text) to authenticated;


-- 5. Customers (by secret link): cancel before paying, or ask for a new price
create function public.cancel_order_by_token(p_token uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where access_token = p_token for update;
  if not found then raise exception 'SF:order_not_found'; end if;
  if v_order.status not in ('awaiting_quote', 'pending_payment')
     or exists (select 1 from public.payments where order_id = v_order.id and status = 'success') then
    raise exception 'SF:cannot_cancel';
  end if;
  perform set_config('sf.status_note', 'Cancelled by customer', true);
  update public.orders set status = 'cancelled' where id = v_order.id;
  perform set_config('sf.status_note', '', true);
end;
$$;
revoke all on function public.cancel_order_by_token(uuid) from public, anon, authenticated;
grant execute on function public.cancel_order_by_token(uuid) to anon, authenticated;

create function public.request_new_quote_by_token(p_token uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where access_token = p_token for update;
  if not found then raise exception 'SF:order_not_found'; end if;
  if v_order.status <> 'pending_payment' or v_order.delivery_quoted_at is null
     or public.quote_expires_at(v_order.delivery_quoted_at) > now() then
    raise exception 'SF:quote_still_valid';
  end if;
  update public.orders
    set delivery_quote_minor = null, delivery_quote_note = null, delivery_quoted_at = null
    where id = v_order.id;
  perform set_config('sf.status_note', 'Customer asked for a new delivery price', true);
  update public.orders set status = 'awaiting_quote' where id = v_order.id;
  perform set_config('sf.status_note', '', true);
end;
$$;
revoke all on function public.request_new_quote_by_token(uuid) from public, anon, authenticated;
grant execute on function public.request_new_quote_by_token(uuid) to anon, authenticated;


-- 6. Payment can only start with a valid delivery quote --------------------
create or replace function public.begin_payment(p_token uuid, p_provider public.payment_provider)
returns table (reference text, amount_minor bigint, currency public.currency_code,
               email text, order_number text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_order public.orders%rowtype;
  v_ref   text;
begin
  select * into v_order from public.orders o where o.access_token = p_token;
  if not found then raise exception 'SF:order_not_found'; end if;
  if v_order.status <> 'pending_payment' then raise exception 'SF:not_payable'; end if;
  if v_order.delivery_quoted_at is null then raise exception 'SF:no_quote'; end if;
  if public.quote_expires_at(v_order.delivery_quoted_at) <= now() then raise exception 'SF:quote_expired'; end if;
  if not public.provider_accepts(p_provider, v_order.currency) then
    raise exception 'SF:provider_currency';
  end if;
  if (select count(*) from public.payments p where p.order_id = v_order.id) >= 10 then
    raise exception 'SF:too_many_attempts';
  end if;

  v_ref := v_order.order_number || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);

  insert into public.payments (order_id, provider, reference, amount_minor, currency)
  values (v_order.id, p_provider, v_ref, v_order.total_minor, v_order.currency);

  return query select v_ref, v_order.total_minor, v_order.currency,
                      v_order.contact_email, v_order.order_number;
end;
$$;


-- 7. Status rules: going out for delivery now needs rider details ----------
create or replace function public.set_order_status(
  p_order_id uuid,
  p_status   public.order_status,
  p_note     text default null
)
returns public.order_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from  public.order_status;
  v_step  text;
  v_admin boolean := public.is_admin();
begin
  if not public.is_staff() then raise exception 'SF:not_allowed'; end if;
  if length(coalesce(p_note, '')) > 500 then raise exception 'SF:too_long'; end if;

  select status into v_from from public.orders where id = p_order_id for update;
  if not found then raise exception 'SF:order_not_found'; end if;

  v_step := v_from::text || '>' || p_status::text;

  if v_step = 'preparing>out_for_delivery' then
    raise exception 'SF:use_send_out';  -- needs rider details: send_out_for_delivery()
  elsif v_step in ('paid>preparing', 'out_for_delivery>delivered') then
    null;
  elsif v_admin and p_status = 'cancelled'
        and v_from in ('awaiting_quote', 'pending_payment', 'paid', 'preparing', 'out_for_delivery') then
    null;
  elsif v_admin and v_step in ('preparing>paid', 'out_for_delivery>preparing', 'delivered>out_for_delivery') then
    null;
  elsif not v_admin and (p_status = 'cancelled' or v_step in
        ('preparing>paid', 'out_for_delivery>preparing', 'delivered>out_for_delivery')) then
    raise exception 'SF:admin_only';
  else
    raise exception 'SF:bad_transition';
  end if;

  perform set_config('sf.status_note', coalesce(btrim(p_note), ''), true);
  update public.orders set status = p_status where id = p_order_id;
  perform set_config('sf.status_note', '', true);
  return p_status;
end;
$$;


-- 8. Rider details and delivery stages --------------------------------------
create function public.send_out_for_delivery(
  p_order_id     uuid,
  p_rider_name   text,
  p_rider_phone  text,
  p_tracking_url text default null,
  p_note         text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.order_status;
  v_name   text := btrim(coalesce(p_rider_name, ''));
  v_phone  text := btrim(coalesce(p_rider_phone, ''));
  v_url    text := nullif(btrim(coalesce(p_tracking_url, '')), '');
  v_text   text;
begin
  if not public.is_staff() then raise exception 'SF:not_allowed'; end if;
  if v_name = '' or length(v_name) > 100 then raise exception 'SF:rider_name'; end if;
  if v_phone !~ '^[0-9+()\s-]+$'
     or length(regexp_replace(v_phone, '\D', '', 'g')) not between 7 and 15 then
    raise exception 'SF:rider_phone';
  end if;
  if v_url is not null and (v_url !~ '^https://[^\s]+$' or length(v_url) > 500) then
    raise exception 'SF:tracking_url';
  end if;
  if length(coalesce(p_note, '')) > 300 then raise exception 'SF:too_long'; end if;

  select status into v_status from public.orders where id = p_order_id for update;
  if not found then raise exception 'SF:order_not_found'; end if;
  if v_status not in ('preparing', 'out_for_delivery') then raise exception 'SF:bad_transition'; end if;

  v_text := 'Rider: ' || v_name || coalesce(' - ' || nullif(btrim(coalesce(p_note, '')), ''), '');

  if v_status = 'preparing' then
    update public.orders
      set rider_name = v_name, rider_phone = v_phone, tracking_url = v_url, delivery_stage = 'on_the_way'
      where id = p_order_id;
    perform set_config('sf.status_note', v_text, true);
    update public.orders set status = 'out_for_delivery' where id = p_order_id;
    perform set_config('sf.status_note', '', true);
  else
    -- Already out: just correct the rider details.
    update public.orders
      set rider_name = v_name, rider_phone = v_phone, tracking_url = v_url
      where id = p_order_id;
    perform public.log_order_note(p_order_id, 'Rider details updated. ' || v_text);
  end if;
end;
$$;
revoke all on function public.send_out_for_delivery(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.send_out_for_delivery(uuid, text, text, text, text) to authenticated;

create function public.set_delivery_stage(p_order_id uuid, p_stage public.delivery_stage, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.order_status;
begin
  if not public.is_staff() then raise exception 'SF:not_allowed'; end if;
  if length(coalesce(p_note, '')) > 300 then raise exception 'SF:too_long'; end if;
  select status into v_status from public.orders where id = p_order_id for update;
  if not found then raise exception 'SF:order_not_found'; end if;
  if v_status <> 'out_for_delivery' then raise exception 'SF:bad_transition'; end if;

  update public.orders set delivery_stage = p_stage where id = p_order_id;
  perform public.log_order_note(
    p_order_id,
    case p_stage when 'on_the_way' then 'Rider on the way'
                 when 'almost_there' then 'Rider almost there'
                 else 'Rider has arrived' end
      || coalesce(' - ' || nullif(btrim(coalesce(p_note, '')), ''), ''),
    p_stage);
end;
$$;
revoke all on function public.set_delivery_stage(uuid, public.delivery_stage, text) from public, anon, authenticated;
grant execute on function public.set_delivery_stage(uuid, public.delivery_stage, text) to authenticated;


-- 9. Customer order page data ------------------------------------------------
create or replace function public.get_order_by_token(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'order_number',         o.order_number,
    'status',               o.status,
    'created_at',           o.created_at,
    'contact_name',         o.contact_name,
    'contact_email',        o.contact_email,
    'contact_phone',        o.contact_phone,
    'country',              o.country,
    'currency',             o.currency,
    'delivery_address',     o.delivery_address,
    'notes',                o.notes,
    'subtotal_minor',       o.subtotal_minor,
    'delivery_fee_minor',   o.delivery_fee_minor,
    'total_minor',          o.total_minor,
    'delivery_quote_minor', o.delivery_quote_minor,
    'delivery_quote_note',  o.delivery_quote_note,
    'delivery_quoted_at',   o.delivery_quoted_at,
    'quote_expires_at',     case when o.delivery_quoted_at is not null
                                 then public.quote_expires_at(o.delivery_quoted_at) end,
    'quote_expired',        coalesce(public.quote_expires_at(o.delivery_quoted_at) <= now(), false),
    -- (compared as text: a brand-new enum value can't be used as a literal in the same run)
    'can_cancel',           o.status::text in ('awaiting_quote', 'pending_payment')
                            and not exists (select 1 from public.payments p
                                            where p.order_id = o.id and p.status = 'success'),
    -- Rider details only while the rider is actually on the way.
    'rider', case when o.status = 'out_for_delivery' then jsonb_build_object(
               'name', o.rider_name, 'phone', o.rider_phone,
               'tracking_url', o.tracking_url, 'stage', o.delivery_stage) end,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
               'product_name',     i.product_name,
               'variant_label',    i.variant_label,
               'unit_price_minor', i.unit_price_minor,
               'quantity',         i.quantity,
               'line_total_minor', i.line_total_minor
             ) order by i.product_name, i.variant_label)
      from public.order_items i
      where i.order_id = o.id
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object('from_status', e.from_status, 'status', e.to_status,
                                          'stage', e.delivery_stage, 'at', e.created_at)
                       order by e.created_at, e.id)
      from public.order_events e
      where e.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.access_token = p_token;
$$;


-- 10. Team management (admins only) ------------------------------------------
create function public.list_team()
returns table (user_id uuid, email text, full_name text, role public.user_role, joined_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'SF:admin_only'; end if;
  return query
    select p.id, u.email::text, p.full_name, p.role, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.role in ('staff', 'admin')
    order by p.role, p.full_name;
end;
$$;
revoke all on function public.list_team() from public, anon, authenticated;
grant execute on function public.list_team() to authenticated;

create function public.set_user_role(p_email text, p_role public.user_role)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id   uuid;
  v_old  public.user_role;
  v_name text;
begin
  if not public.is_admin() then raise exception 'SF:admin_only'; end if;

  select u.id into v_id from auth.users u where lower(u.email) = lower(btrim(coalesce(p_email, '')));
  if not found then raise exception 'SF:user_not_found'; end if;
  select role, coalesce(full_name, '') into v_old, v_name from public.profiles where id = v_id;

  if v_id = auth.uid() and p_role <> 'admin' then raise exception 'SF:not_self'; end if;
  if v_old = 'admin' and p_role <> 'admin'
     and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'SF:last_admin';
  end if;

  update public.profiles set role = p_role where id = v_id;
  return v_name;
end;
$$;
revoke all on function public.set_user_role(text, public.user_role) from public, anon, authenticated;
grant execute on function public.set_user_role(text, public.user_role) to authenticated;
