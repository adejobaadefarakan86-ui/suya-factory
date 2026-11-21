-- =====================================================================
-- Suya Factory: simpler Ghana flow for staff
--
-- 1. Customers can say WHY they cancelled (a reason or their own words).
-- 2. Our part ends when Gloria hands the kilishi to the customer's rider:
--    "Handed to rider" now completes the order (no rider tracking).
-- 3. Ghana pickup details (what customers type into their ride app) are
--    kept in delivery_settings, so admins can change them.
-- =====================================================================

alter table public.orders
  add column cancel_reason text check (cancel_reason is null or length(cancel_reason) <= 300);

alter table public.delivery_settings
  add column pickup_contact text check (pickup_contact is null or length(pickup_contact) <= 100),
  add column pickup_hours   text check (pickup_hours is null or length(pickup_hours) <= 100);

update public.delivery_settings
  set pickup_contact = 'Gloria Okai',
      pickup_label   = '1st Addogono Ave (GPS GZ-046-1754), Accra'
  where country = 'GH';


-- 1. Customer: why they cancelled (once, right after cancelling) -------------
-- Returns the order number when saved (for the staff message), null if already given.
create function public.set_cancel_reason_by_token(p_token uuid, p_reason text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order  public.orders%rowtype;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if v_reason = '' or length(v_reason) > 300 then raise exception 'SF:cancel_reason'; end if;
  select * into v_order from public.orders where access_token = p_token for update;
  if not found then raise exception 'SF:order_not_found'; end if;
  if v_order.status <> 'cancelled' then raise exception 'SF:bad_transition'; end if;
  if v_order.cancel_reason is not null then return null; end if;

  update public.orders set cancel_reason = v_reason where id = v_order.id;
  perform public.log_order_note(v_order.id, 'Reason for cancelling: ' || v_reason);
  return v_order.order_number;
end;
$$;
revoke all on function public.set_cancel_reason_by_token(uuid, text) from public;
grant execute on function public.set_cancel_reason_by_token(uuid, text) to anon, authenticated;


-- 2. Handed to the rider = done ------------------------------------------------
create or replace function public.mark_handed_to_rider(p_order_number text, p_by text)
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
  perform set_config('sf.status_note',
    'Handed to the rider (' || v_order.rider_name || ') by ' || left(coalesce(nullif(btrim(p_by), ''), 'Staff'), 100), true);
  update public.orders set status = 'delivered' where id = v_order.id;
  perform set_config('sf.status_note', '', true);
  return true;
end;
$$;

-- Earlier own-rider orders left at "out for delivery": they were handed over, so finish them.
do $$
declare r record;
begin
  for r in select id from public.orders where own_rider and status = 'out_for_delivery' loop
    perform set_config('sf.status_note', 'Handed to the rider (our part is done)', true);
    update public.orders set status = 'delivered' where id = r.id;
  end loop;
  perform set_config('sf.status_note', '', true);
end;
$$;


-- Customer order page: also whether they already gave a reason for cancelling.
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
    'can_cancel',           public.customer_can_cancel(o),
    'momo_claimed_at',        o.momo_claimed_at,
    'momo_claim_rejected_at', o.momo_claim_rejected_at,
    'momo_paid_from',         o.momo_paid_from,
    'refund_due_minor',       o.refund_due_minor,
    'refunded_at',            o.refunded_at,
    'cancel_reason',          o.cancel_reason,
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
