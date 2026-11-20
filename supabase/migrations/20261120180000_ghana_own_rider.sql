-- =====================================================================
-- Suya Factory: GHANA = customer books and pays their OWN rider
--
-- Like the Nigerian supermarket flow: after we confirm the MoMo payment, the
-- customer books a Bolt / Yango / Uber rider with our pickup address and pays
-- the rider themselves. They enter the rider's details; Gloria gets them on
-- Telegram with a pickup code and taps "Handed to rider".
-- (Dawurobo booking stays in the code, switched off: src/lib/ghana-orders.ts.)
-- =====================================================================

alter table public.orders
  add column own_rider       boolean not null default false,
  add column pickup_code     text check (pickup_code is null or pickup_code ~ '^[0-9]{4}$'),
  add column rider_plate     text check (rider_plate is null or length(rider_plate) <= 20),
  add column rider_company   text check (rider_company is null or length(rider_company) <= 50),
  add column rider_booked_at timestamptz;


-- 1. Order placed: no delivery price, the customer books their own rider (server only)
create function public.set_own_rider_delivery(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'SF:order_not_found'; end if;
  if v_order.status <> 'awaiting_quote' or v_order.delivery_fee_minor <> 0 then return; end if;

  update public.orders
    set own_rider = true, delivery_quote_minor = 0, delivery_quoted_at = now(),
        delivery_quote_note = 'Customer books and pays their own rider'
    where id = p_order_id;
  perform set_config('sf.status_note', 'Customer will book their own rider (Bolt / Yango / Uber)', true);
  update public.orders set status = 'pending_payment' where id = p_order_id;
  perform set_config('sf.status_note', '', true);
end;
$$;
revoke all on function public.set_own_rider_delivery(uuid) from public, anon, authenticated;
grant execute on function public.set_own_rider_delivery(uuid) to service_role;


-- 2. Customer: "this is my rider" (needs the order's secret link) ----------------
-- Returns the 4-digit pickup code the rider says to Gloria.
create function public.set_own_rider_by_token(
  p_token uuid, p_rider_name text, p_rider_phone text, p_plate text, p_company text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_name  text := btrim(coalesce(p_rider_name, ''));
  v_phone text := btrim(coalesce(p_rider_phone, ''));
  v_plate text := nullif(upper(btrim(coalesce(p_plate, ''))), '');
  v_comp  text := nullif(btrim(coalesce(p_company, '')), '');
  v_code  text;
  v_text  text;
begin
  if v_name = '' or length(v_name) > 100 then raise exception 'SF:rider_name'; end if;
  if v_phone !~ '^[0-9+()\s-]+$' or length(regexp_replace(v_phone, '\D', '', 'g')) not between 7 and 15 then
    raise exception 'SF:rider_phone';
  end if;
  if length(coalesce(v_plate, '')) > 20 or length(coalesce(v_comp, '')) > 50 then raise exception 'SF:too_long'; end if;

  select * into v_order from public.orders where access_token = p_token for update;
  if not found then raise exception 'SF:order_not_found'; end if;
  if not v_order.own_rider or v_order.status not in ('paid', 'preparing') then raise exception 'SF:bad_transition'; end if;

  v_code := coalesce(v_order.pickup_code, lpad((floor(random() * 10000))::int::text, 4, '0'));
  update public.orders
    set rider_name = v_name, rider_phone = v_phone, rider_plate = v_plate, rider_company = v_comp,
        rider_booked_at = now(), pickup_code = v_code
    where id = v_order.id;

  v_text := 'Customer booked their rider: ' || v_name || coalesce(' (' || v_comp || ')', '') || ', code ' || v_code;
  if v_order.status = 'paid' then
    perform set_config('sf.status_note', v_text, true);
    update public.orders set status = 'preparing' where id = v_order.id;
    perform set_config('sf.status_note', '', true);
  else
    perform public.log_order_note(v_order.id, 'Rider changed. ' || v_text);
  end if;
  return v_code;
end;
$$;
revoke all on function public.set_own_rider_by_token(uuid, text, text, text, text) from public;
grant execute on function public.set_own_rider_by_token(uuid, text, text, text, text) to anon, authenticated;


-- 3. Staff (Telegram, server only): kilishi handed to the customer's rider -----
create function public.mark_handed_to_rider(p_order_number text, p_by text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where order_number = p_order_number for update;
  if not found or v_order.status <> 'preparing' or v_order.rider_name is null then return false; end if;
  update public.orders set delivery_stage = 'on_the_way' where id = v_order.id;
  perform set_config('sf.status_note',
    'Handed to the rider (' || v_order.rider_name || ') by ' || left(coalesce(nullif(btrim(p_by), ''), 'Staff'), 100), true);
  update public.orders set status = 'out_for_delivery' where id = v_order.id;
  perform set_config('sf.status_note', '', true);
  return true;
end;
$$;
revoke all on function public.mark_handed_to_rider(text, text) from public, anon, authenticated;
grant execute on function public.mark_handed_to_rider(text, text) to service_role;


-- 4. Customer order page: own-rider details ----------------------------------------
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
    -- Customer books their own rider (Ghana): nothing to expire.
    'quote_expires_at',     case when o.delivery_quoted_at is not null and not o.own_rider
                                 then public.quote_expires_at(o.delivery_quoted_at) end,
    'quote_expired',        not o.own_rider and coalesce(public.quote_expires_at(o.delivery_quoted_at) <= now(), false),
    'can_cancel',           o.status::text in ('awaiting_quote', 'pending_payment')
                            and o.momo_claimed_at is null
                            and not exists (select 1 from public.payments p
                                            where p.order_id = o.id and p.status = 'success'),
    'momo_claimed_at',        o.momo_claimed_at,
    'momo_claim_rejected_at', o.momo_claim_rejected_at,
    'courier',                o.courier,
    'courier_eta',            o.courier_eta,
    'courier_tracking_url',   o.courier_tracking_url,
    'own_rider',              o.own_rider,
    'pickup_code',            o.pickup_code,
    -- The rider the customer booked themselves.
    'booked_rider', case when o.own_rider and o.rider_name is not null then jsonb_build_object(
               'name', o.rider_name, 'phone', o.rider_phone, 'plate', o.rider_plate, 'company', o.rider_company) end,
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
