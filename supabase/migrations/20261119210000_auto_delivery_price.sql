-- =====================================================================
-- Suya Factory: AUTOMATIC DELIVERY PRICE, PAID ONLINE (Nigeria)
--
-- Nigeria: the delivery fee is worked out the moment the customer drops their
-- pin -- base + per km from our pickup point -- rounded UP to the next NGN 100,
-- and paid online together with the kilishi. No waiting for staff.
--   (Later the same slot will hold Chowdeck's real quote.)
-- Ghana: unchanged for now (staff quote, paid to the rider), because Paystack
-- Nigeria can't take GHS; a separate Paystack Ghana account is needed.
--
-- Rule kept from before: delivery_fee_minor > 0 means "delivery was paid
-- online as part of total_minor"; 0 means "pay the rider".
-- =====================================================================

-- 1. Settings, one row per country ------------------------------------------
create table public.delivery_settings (
  country       public.country_code primary key,
  auto_price    boolean not null default false,
  pickup_lat    numeric(9, 6) check (pickup_lat between -90 and 90),
  pickup_lng    numeric(9, 6) check (pickup_lng between -180 and 180),
  pickup_label  text check (pickup_label is null or length(pickup_label) <= 200),
  pickup_phone  text check (pickup_phone is null or length(pickup_phone) <= 20),
  base_minor    bigint not null default 0 check (base_minor between 0 and 100000000),
  per_km_minor  bigint not null default 0 check (per_km_minor between 0 and 10000000),
  -- Straight-line distance x this = rough road distance (city roads wind).
  road_factor   numeric(3, 2) not null default 1.30 check (road_factor between 1 and 3),
  updated_at    timestamptz not null default now(),
  check (not auto_price or (pickup_lat is not null and pickup_lng is not null))
);
alter table public.delivery_settings enable row level security;
-- The shop's pickup point and prices are public (they're shown at checkout).
create policy "delivery settings: public read" on public.delivery_settings
  for select to anon, authenticated using (true);
create policy "delivery settings: admin write" on public.delivery_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create trigger delivery_settings_updated_at before update on public.delivery_settings
  for each row execute function public.set_updated_at();

-- Starting values: NGN 800 + NGN 150 per km from Ifako-Ijaiye (approximate:
-- set the exact shop location in Admin -> Delivery settings).
insert into public.delivery_settings (country, auto_price, pickup_lat, pickup_lng, pickup_label, base_minor, per_km_minor)
values
  ('NG', true,  6.663603, 3.289491, 'Ifako-Ijaiye (approximate)', 80000, 15000),
  ('GH', false, null, null, null, 0, 0);


-- 2. Distance and price -------------------------------------------------------
-- Road-ish distance in km (1 decimal) from the pickup point, or null.
create function public.delivery_km(p_country public.country_code, p_lat numeric, p_lng numeric)
returns numeric
language sql
stable
set search_path = ''
as $$
  select round((
    -- haversine, earth radius 6371 km
    2 * 6371 * asin(sqrt(
      power(sin(radians((p_lat - s.pickup_lat)::float8 / 2)), 2)
      + cos(radians(s.pickup_lat::float8)) * cos(radians(p_lat::float8))
        * power(sin(radians((p_lng - s.pickup_lng)::float8 / 2)), 2)
    )) * s.road_factor::float8
  )::numeric, 1)
  from public.delivery_settings s
  where s.country = p_country and s.pickup_lat is not null and s.pickup_lng is not null;
$$;

-- Automatic delivery fee in minor units, rounded UP to a whole 100 (NGN 100),
-- or null where automatic pricing is off.
create function public.delivery_fee(p_country public.country_code, p_lat numeric, p_lng numeric)
returns bigint
language sql
stable
set search_path = ''
as $$
  select (ceil((s.base_minor + s.per_km_minor * public.delivery_km(p_country, p_lat, p_lng)) / 10000.0) * 10000)::bigint
  from public.delivery_settings s
  where s.country = p_country and s.auto_price;
$$;
grant execute on function public.delivery_km(public.country_code, numeric, numeric) to anon, authenticated;
grant execute on function public.delivery_fee(public.country_code, numeric, numeric) to anon, authenticated;


-- 3. place_order: automatic price + straight to payment ---------------------
create or replace function public.place_order(
  p_country              public.country_code,
  p_contact_name         text,
  p_contact_email        text,
  p_contact_phone        text,
  p_address              jsonb,     -- {"line1","line2","city","landmark","lat","lng","accuracy"}
  p_notes                text,
  p_items                jsonb,     -- [{"variant_id": "...", "quantity": 2}, ...]
  p_expected_total_minor bigint     -- the total the customer was shown (items + automatic delivery fee)
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
  v_grams      bigint;
  v_wanted     int;
  v_found      int;
  v_subtotal   bigint;
  v_order      public.orders%rowtype;
  v_fee        bigint;  -- automatic delivery fee (null = staff will quote)
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

  -- Regular orders: only inside our home region (Lagos State / Greater Accra)
  if not public.in_service_area(p_country, v_lat, v_lng) then
    raise exception 'SF:outside_area';
  end if;

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
  select count(*), coalesce(sum(vp.amount_minor * b.quantity), 0), coalesce(sum(coalesce(v.weight_grams, 0) * b.quantity), 0)
    into v_found, v_subtotal, v_grams
  from b
  join public.product_variants v on v.id = b.variant_id and v.is_active
  join public.products p        on p.id = v.product_id and p.is_active
  join public.variant_prices vp on vp.variant_id = v.id and vp.currency = v_currency;
  if v_found <> v_wanted then raise exception 'SF:unavailable'; end if;

  -- 1kg or more is a bulk order: special pricing, arranged with us directly.
  if v_grams >= 1000 then raise exception 'SF:bulk'; end if;

  -- Automatic delivery price where it's switched on (Nigeria); otherwise
  -- staff quote it later and it's paid to the rider (Ghana, for now).
  v_fee := public.delivery_fee(p_country, v_lat, v_lng);

  -- The customer pays online for the items + the automatic delivery fee.
  if p_expected_total_minor is distinct from v_subtotal + coalesce(v_fee, 0) then
    raise exception 'SF:price_changed';
  end if;

  -- Save the order + its items (all or nothing) --------------------------
  insert into public.orders (
    user_id, contact_name, contact_email, contact_phone, country, currency, zone_id,
    delivery_address, subtotal_minor, delivery_fee_minor, total_minor, notes, status,
    delivery_quote_minor, delivery_quote_note, delivery_quoted_at
  ) values (
    auth.uid(),
    v_name, v_email, v_phone, p_country, v_currency, null,
    jsonb_build_object(
      'line1', v_line1, 'line2', v_line2, 'city', v_city, 'landmark', v_landmark,
      'lat', v_lat, 'lng', v_lng, 'accuracy_m', v_acc
    ),
    v_subtotal, coalesce(v_fee, 0), v_subtotal + coalesce(v_fee, 0), v_notes,
    case when v_fee is null then 'awaiting_quote' else 'pending_payment' end::public.order_status,
    v_fee,
    case when v_fee is null then null else 'Automatic price, ' || public.delivery_km(p_country, v_lat, v_lng) || ' km' end,
    case when v_fee is null then null else now() end
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



-- 4. Expired automatic price: just work it out again (no staff needed) -------
create or replace function public.request_new_quote_by_token(p_token uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_lat   numeric;
  v_lng   numeric;
  v_fee   bigint;
begin
  select * into v_order from public.orders where access_token = p_token for update;
  if not found then raise exception 'SF:order_not_found'; end if;
  if v_order.status <> 'pending_payment' or v_order.delivery_quoted_at is null
     or public.quote_expires_at(v_order.delivery_quoted_at) > now() then
    raise exception 'SF:quote_still_valid';
  end if;

  v_lat := (v_order.delivery_address ->> 'lat')::numeric;
  v_lng := (v_order.delivery_address ->> 'lng')::numeric;
  v_fee := case when v_order.delivery_fee_minor > 0 then public.delivery_fee(v_order.country, v_lat, v_lng) end;

  if v_fee is not null then
    update public.orders
      set delivery_quote_minor = v_fee,
          delivery_quote_note  = 'Automatic price, ' || public.delivery_km(v_order.country, v_lat, v_lng) || ' km',
          delivery_quoted_at   = now(),
          delivery_fee_minor   = v_fee,
          total_minor          = subtotal_minor + v_fee
      where id = v_order.id;
    perform public.log_order_note(v_order.id, 'New automatic delivery price: ' || public.money_text(v_fee, v_order.currency));
    return;
  end if;

  update public.orders
    set delivery_quote_minor = null, delivery_quote_note = null, delivery_quoted_at = null
    where id = v_order.id;
  perform set_config('sf.status_note', 'Customer asked for a new delivery price', true);
  update public.orders set status = 'awaiting_quote' where id = v_order.id;
  perform set_config('sf.status_note', '', true);
end;
$$;


-- 5. Staff changing the price of a paid-online delivery updates the total -----
create or replace function public.set_delivery_quote(p_order_id uuid, p_amount_minor bigint, p_note text default null)
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
        delivery_quoted_at   = now(),
        -- paid-online delivery (automatic price): the total follows the new price
        delivery_fee_minor   = case when v_order.delivery_fee_minor > 0 then p_amount_minor else delivery_fee_minor end,
        total_minor          = case when v_order.delivery_fee_minor > 0 then subtotal_minor + p_amount_minor else total_minor end
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
