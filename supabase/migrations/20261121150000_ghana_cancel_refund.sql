-- =====================================================================
-- Suya Factory: GHANA cancellations and refunds
--
-- Customers can cancel until the kilishi is handed to their rider. If they
-- had already sent MoMo, the order is marked "refund due". Staff refund it
-- within 2 days, ONLY to the MoMo number the money came from (stops refund
-- scams), then tap "Refunded" in Telegram.
-- =====================================================================

alter table public.orders
  add column momo_paid_from    text check (momo_paid_from is null or length(momo_paid_from) <= 20),
  add column refund_due_minor  bigint check (refund_due_minor is null or refund_due_minor >= 0),
  add column refunded_at       timestamptz,
  add column refunded_by       text check (refunded_by is null or length(refunded_by) <= 100);


-- Who may cancel what (one place, used by the page and by the cancel itself).
create function public.customer_can_cancel(o public.orders)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case
    -- Before payment: anyone (also after "I've paid": the money is refunded).
    when o.status::text in ('awaiting_quote', 'pending_payment') then
      o.currency = 'GHS'
      or not exists (select 1 from public.payments p where p.order_id = o.id and p.status = 'success')
    -- Ghana own rider: paid, until it is handed to the rider.
    when o.status::text in ('paid', 'preparing') then o.currency = 'GHS' and o.own_rider
    else false
  end;
$$;
revoke all on function public.customer_can_cancel(public.orders) from public, anon, authenticated;


-- "I've paid" now also records the number the customer paid from.
drop function public.claim_momo_payment_by_token(uuid, text);
create function public.claim_momo_payment_by_token(p_token uuid, p_reference text, p_paid_from text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_ref   text := nullif(btrim(coalesce(p_reference, '')), '');
  v_from  text := btrim(coalesce(p_paid_from, ''));
begin
  if length(coalesce(v_ref, '')) > 100 then raise exception 'SF:too_long'; end if;
  if v_from !~ '^[0-9+()\s-]+$' or length(regexp_replace(v_from, '\D', '', 'g')) not between 9 and 15 then
    raise exception 'SF:paid_from';
  end if;
  select * into v_order from public.orders where access_token = p_token for update;
  if not found then raise exception 'SF:order_not_found'; end if;
  if v_order.currency <> 'GHS' or v_order.status <> 'pending_payment' then raise exception 'SF:not_payable'; end if;
  if v_order.delivery_quote_minor is null then raise exception 'SF:not_payable'; end if;

  if v_order.momo_claimed_at is not null and v_order.momo_claimed_at > now() - interval '2 minutes' then
    return null;
  end if;

  update public.orders
    set momo_claimed_at = now(), momo_claim_ref = v_ref, momo_paid_from = v_from, momo_claim_rejected_at = null
    where id = v_order.id;
  perform public.log_order_note(v_order.id,
    'Customer says they paid ' || public.money_text(v_order.total_minor, v_order.currency) || ' by MoMo from ' || v_from
    || coalesce(' (ref ' || v_ref || ')', ''));
  return v_order.order_number;
end;
$$;
revoke all on function public.claim_momo_payment_by_token(uuid, text, text) from public;
grant execute on function public.claim_momo_payment_by_token(uuid, text, text) to anon, authenticated;


-- Customer cancels. Returns the order number (for the staff alert).
drop function public.cancel_order_by_token(uuid);
create function public.cancel_order_by_token(p_token uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_paid  boolean;
begin
  select * into v_order from public.orders where access_token = p_token for update;
  if not found then raise exception 'SF:order_not_found'; end if;
  if not public.customer_can_cancel(v_order) then raise exception 'SF:cannot_cancel'; end if;

  -- Money may have reached us: confirmed, or the customer said they sent it.
  v_paid := v_order.currency = 'GHS' and (
    v_order.momo_claimed_at is not null
    or exists (select 1 from public.payments where order_id = v_order.id and status = 'success'));
  if v_paid then
    update public.orders set refund_due_minor = v_order.total_minor where id = v_order.id;
  end if;

  perform set_config('sf.status_note',
    'Cancelled by customer' || case when v_paid then ' (refund ' || public.money_text(v_order.total_minor, v_order.currency) || ' due)' else '' end,
    true);
  update public.orders set status = 'cancelled' where id = v_order.id;
  perform set_config('sf.status_note', '', true);
  return v_order.order_number;
end;
$$;
revoke all on function public.cancel_order_by_token(uuid) from public, anon, authenticated;
grant execute on function public.cancel_order_by_token(uuid) to anon, authenticated;


-- Staff (Telegram, server only): refund sent.
create function public.mark_refunded(p_order_number text, p_by text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_by    text := left(coalesce(nullif(btrim(p_by), ''), 'Staff'), 100);
begin
  select * into v_order from public.orders where order_number = p_order_number for update;
  if not found or v_order.refund_due_minor is null or v_order.refunded_at is not null then return false; end if;
  update public.orders set refunded_at = now(), refunded_by = v_by where id = v_order.id;
  perform public.log_order_note(v_order.id,
    'Refund of ' || public.money_text(v_order.refund_due_minor, v_order.currency) || ' sent by ' || v_by);
  return true;
end;
$$;
revoke all on function public.mark_refunded(text, text) from public, anon, authenticated;
grant execute on function public.mark_refunded(text, text) to service_role;


-- Customer order page: new cancel rule + refund status.
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
