-- =====================================================================
-- Suya Factory: GHANA = MoMo to our number + Dawurobo delivery
--
--   1. At checkout the app asks Dawurobo for the delivery price to the pin and
--      saves it on the order (set_courier_quote) -> straight to "pay".
--      The customer pays that fee to the rider on arrival (delivery_fee_minor = 0).
--   2. The customer sends MoMo for the kilishi to our number and taps
--      "I've paid" (claim_momo_payment_by_token). Staff get a Telegram message.
--   3. Staff tap "Payment received" (confirm_momo_payment) -> order paid ->
--      the app books a Dawurobo rider (set_courier_booking).
--   4. Dawurobo tells us about the rider and delivery (apply_courier_update).
--
-- The confirm / courier functions are for the server only (service role);
-- visitors can only claim "I've paid" on their own order (needs its secret link).
-- =====================================================================

alter table public.orders
  add column momo_claimed_at        timestamptz,
  add column momo_claim_ref         text check (momo_claim_ref is null or length(momo_claim_ref) <= 100),
  add column momo_claim_rejected_at timestamptz,
  add column courier                text check (courier is null or courier in ('dawurobo')),
  add column courier_order_id       text check (courier_order_id is null or length(courier_order_id) <= 100),
  add column courier_status         text check (courier_status is null or length(courier_status) <= 50),
  add column courier_eta            text check (courier_eta is null or length(courier_eta) <= 200),
  add column courier_tracking_url   text check (courier_tracking_url is null or (courier_tracking_url ~ '^https://' and length(courier_tracking_url) <= 500)),
  add column courier_booked_at      timestamptz,
  add column courier_synced_at      timestamptz;
create unique index orders_courier_order_idx on public.orders (courier, courier_order_id) where courier_order_id is not null;


-- 1. Courier's delivery price (server only) -------------------------------------
create function public.set_courier_quote(p_order_id uuid, p_amount_minor bigint, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_text  text;
begin
  if p_amount_minor is null or p_amount_minor not between 0 and 100000000 then raise exception 'SF:bad_amount'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'SF:order_not_found'; end if;
  -- Only orders whose delivery is paid to the rider and not priced yet.
  if v_order.status <> 'awaiting_quote' or v_order.delivery_fee_minor <> 0 then return; end if;

  update public.orders
    set delivery_quote_minor = p_amount_minor,
        delivery_quote_note  = left(nullif(btrim(coalesce(p_note, '')), ''), 300),
        delivery_quoted_at   = now()
    where id = p_order_id;

  v_text := 'Delivery price: ' || public.money_text(p_amount_minor, v_order.currency)
            || coalesce(' (' || left(nullif(btrim(coalesce(p_note, '')), ''), 200) || ')', '');
  perform set_config('sf.status_note', v_text, true);
  update public.orders set status = 'pending_payment' where id = p_order_id;
  perform set_config('sf.status_note', '', true);
end;
$$;
revoke all on function public.set_courier_quote(uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.set_courier_quote(uuid, bigint, text) to service_role;


-- 2. Customer: "I've sent the MoMo" ---------------------------------------------
-- Returns the order number when staff should be alerted, or null when this is
-- a repeat tap within 2 minutes (no second alert).
create function public.claim_momo_payment_by_token(p_token uuid, p_reference text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_ref   text := nullif(btrim(coalesce(p_reference, '')), '');
begin
  if length(coalesce(v_ref, '')) > 100 then raise exception 'SF:too_long'; end if;
  select * into v_order from public.orders where access_token = p_token for update;
  if not found then raise exception 'SF:order_not_found'; end if;
  if v_order.currency <> 'GHS' or v_order.status <> 'pending_payment' then raise exception 'SF:not_payable'; end if;
  if v_order.delivery_quote_minor is null then raise exception 'SF:not_payable'; end if;

  if v_order.momo_claimed_at is not null and v_order.momo_claimed_at > now() - interval '2 minutes' then
    return null;
  end if;

  update public.orders
    set momo_claimed_at = now(), momo_claim_ref = v_ref, momo_claim_rejected_at = null
    where id = v_order.id;
  perform public.log_order_note(v_order.id,
    'Customer says they paid ' || public.money_text(v_order.total_minor, v_order.currency) || ' by MoMo'
    || coalesce(' (ref ' || v_ref || ')', ''));
  return v_order.order_number;
end;
$$;
revoke all on function public.claim_momo_payment_by_token(uuid, text) from public;
grant execute on function public.claim_momo_payment_by_token(uuid, text) to anon, authenticated;


-- 3. Staff (via Telegram, server only): payment received / not received --------
-- Returns the order id when it was marked paid now, null when it already was.
create function public.confirm_momo_payment(p_order_number text, p_confirmed_by text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_by    text := left(coalesce(nullif(btrim(p_confirmed_by), ''), 'Staff'), 100);
begin
  select * into v_order from public.orders where order_number = p_order_number for update;
  if not found then raise exception 'SF:order_not_found'; end if;
  if v_order.status <> 'pending_payment' then return null; end if;

  insert into public.payments
    (order_id, provider, reference, amount_minor, currency, status, raw_response, verified_at)
  values (
    v_order.id, 'manual',
    v_order.order_number || '-MOMO-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
    v_order.total_minor, v_order.currency, 'success',
    jsonb_build_object('method', 'mobile_money', 'reference', v_order.momo_claim_ref, 'confirmed_by', v_by),
    now()
  );

  perform set_config('sf.status_note',
    'MoMo payment confirmed by ' || v_by || coalesce(' (ref ' || v_order.momo_claim_ref || ')', ''), true);
  update public.orders set status = 'paid', paid_alert_sent_at = coalesce(paid_alert_sent_at, now()) where id = v_order.id;
  perform set_config('sf.status_note', '', true);
  return v_order.id;
end;
$$;
revoke all on function public.confirm_momo_payment(text, text) from public, anon, authenticated;
grant execute on function public.confirm_momo_payment(text, text) to service_role;

create function public.reject_momo_claim(p_order_number text, p_by text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where order_number = p_order_number for update;
  if not found or v_order.status <> 'pending_payment' or v_order.momo_claimed_at is null then return false; end if;
  update public.orders set momo_claimed_at = null, momo_claim_rejected_at = now() where id = v_order.id;
  perform public.log_order_note(v_order.id,
    'MoMo payment not found by ' || left(coalesce(nullif(btrim(p_by), ''), 'Staff'), 100) || '; customer asked to check');
  return true;
end;
$$;
revoke all on function public.reject_momo_claim(text, text) from public, anon, authenticated;
grant execute on function public.reject_momo_claim(text, text) to service_role;


-- 4. Courier booked (server only) -----------------------------------------------
create function public.set_courier_booking(
  p_order_id uuid, p_courier text, p_courier_order_id text, p_tracking_url text, p_eta text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_url   text := nullif(btrim(coalesce(p_tracking_url, '')), '');
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'SF:order_not_found'; end if;
  if v_url is not null and v_url !~ '^https://' then v_url := null; end if;

  update public.orders
    set courier = p_courier, courier_order_id = p_courier_order_id, courier_tracking_url = left(v_url, 500),
        courier_eta = left(nullif(btrim(coalesce(p_eta, '')), ''), 200),
        courier_status = 'booked', courier_booked_at = now(), courier_synced_at = now()
    where id = p_order_id;

  if v_order.status = 'paid' then
    perform set_config('sf.status_note',
      initcap(p_courier) || ' rider booked' || coalesce(' (' || left(nullif(btrim(coalesce(p_eta, '')), ''), 150) || ')', ''), true);
    update public.orders set status = 'preparing' where id = p_order_id;
    perform set_config('sf.status_note', '', true);
  else
    perform public.log_order_note(p_order_id, initcap(p_courier) || ' rider booked');
  end if;
end;
$$;
revoke all on function public.set_courier_booking(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.set_courier_booking(uuid, text, text, text, text) to service_role;


-- 5. Courier status updates (webhook / sync, server only) -------------------------
-- p_stage: 'picked_up' | 'delivered' | 'problem' | 'other'
create function public.apply_courier_update(
  p_order_id uuid, p_status text, p_stage text, p_rider_name text, p_rider_phone text, p_tracking_url text
)
returns text  -- the order's status afterwards
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_name  text := left(nullif(btrim(coalesce(p_rider_name, '')), ''), 100);
  v_phone text := left(nullif(btrim(coalesce(p_rider_phone, '')), ''), 30);
  v_url   text := nullif(btrim(coalesce(p_tracking_url, '')), '');
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'SF:order_not_found'; end if;
  if v_url is not null and (v_url !~ '^https://' or length(v_url) > 500) then v_url := null; end if;

  update public.orders
    set courier_status = left(coalesce(nullif(btrim(p_status), ''), courier_status), 50),
        courier_tracking_url = coalesce(v_url, courier_tracking_url),
        rider_name  = coalesce(v_name, rider_name),
        rider_phone = coalesce(v_phone, rider_phone),
        tracking_url = coalesce(v_url, tracking_url, courier_tracking_url),
        courier_synced_at = now()
    where id = p_order_id;

  if p_stage in ('picked_up', 'delivered') and v_order.status in ('paid', 'preparing') then
    update public.orders
      set rider_name = coalesce(rider_name, 'Dawurobo rider'),
          rider_phone = coalesce(rider_phone, '0555175699'),
          delivery_stage = 'on_the_way'
      where id = p_order_id;
    perform set_config('sf.status_note', 'Picked up by the ' || coalesce(v_order.courier, 'courier') || ' rider'
      || coalesce(': ' || v_name, ''), true);
    update public.orders set status = 'out_for_delivery' where id = p_order_id;
    perform set_config('sf.status_note', '', true);
    v_order.status := 'out_for_delivery';
  end if;

  if p_stage = 'delivered' and v_order.status = 'out_for_delivery' then
    perform set_config('sf.status_note', 'Delivered (' || coalesce(v_order.courier, 'courier') || ')', true);
    update public.orders set status = 'delivered', delivery_stage = 'arrived' where id = p_order_id;
    perform set_config('sf.status_note', '', true);
    v_order.status := 'delivered';
  elsif p_stage = 'problem' and v_order.courier_status is distinct from p_status then
    perform public.log_order_note(p_order_id, 'Courier problem: ' || left(coalesce(p_status, ''), 50));
  end if;

  return v_order.status::text;
end;
$$;
revoke all on function public.apply_courier_update(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.apply_courier_update(uuid, text, text, text, text, text) to service_role;


-- 6. Customer order page: MoMo + courier details ----------------------------------
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
    'can_cancel',           o.status::text in ('awaiting_quote', 'pending_payment')
                            and o.momo_claimed_at is null
                            and not exists (select 1 from public.payments p
                                            where p.order_id = o.id and p.status = 'success'),
    'momo_claimed_at',        o.momo_claimed_at,
    'momo_claim_rejected_at', o.momo_claim_rejected_at,
    'courier',                o.courier,
    'courier_eta',            o.courier_eta,
    'courier_tracking_url',   o.courier_tracking_url,
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


-- 7. Ghana pickup point (Gloria) for the delivery settings -------------------------
-- auto_price stays OFF for Ghana: the price comes from Dawurobo, paid to the rider.
update public.delivery_settings
  set pickup_lat = 5.610095, pickup_lng = -0.089863,
      pickup_label = '1st Addogono Ave (GZ-046-1754)', pickup_phone = '0530515656'
  where country = 'GH';
