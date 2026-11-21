-- Temporary: the old 2-argument "I've paid" for the live site until it runs the
-- new code (which also sends the number the customer paid from). Safe to drop
-- once the new code is deployed:  drop function public.claim_momo_payment_by_token(uuid, text);
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
