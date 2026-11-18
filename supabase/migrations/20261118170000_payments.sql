-- =====================================================================
-- Suya Factory: PAYMENTS
-- =====================================================================
-- Two functions:
--   begin_payment()   - anyone holding an order's secret link may START a
--                       payment. It records a "pending" payment with the
--                       amount taken from the ORDER, never from the browser.
--   confirm_payment() - ONLY our server (with the Supabase secret key) may
--                       record the result, and only after asking the payment
--                       provider directly. Visitors can never mark an order paid.
-- =====================================================================


-- Which provider takes which currency. Ghana (GHS) will be added once a
-- provider confirms GHS + mobile money for the business.
create function public.provider_accepts(p_provider public.payment_provider, p_currency public.currency_code)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_provider = 'paystack' and p_currency = 'NGN';
$$;


-- ---------------------------------------------------------------------
-- 1. begin_payment(): start paying for an order
-- ---------------------------------------------------------------------
create function public.begin_payment(p_token uuid, p_provider public.payment_provider)
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
  if not public.provider_accepts(p_provider, v_order.currency) then
    raise exception 'SF:provider_currency';
  end if;

  -- Stop someone hammering the button: at most 10 attempts per order.
  if (select count(*) from public.payments p where p.order_id = v_order.id) >= 10 then
    raise exception 'SF:too_many_attempts';
  end if;

  -- A fresh, unique reference for every attempt, e.g. SF-1001-3f9a1c0b2d
  v_ref := v_order.order_number || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);

  insert into public.payments (order_id, provider, reference, amount_minor, currency)
  values (v_order.id, p_provider, v_ref, v_order.total_minor, v_order.currency);

  return query select v_ref, v_order.total_minor, v_order.currency,
                      v_order.contact_email, v_order.order_number;
end;
$$;

revoke all on function public.begin_payment(uuid, public.payment_provider) from public, anon, authenticated;
grant execute on function public.begin_payment(uuid, public.payment_provider) to anon, authenticated;


-- ---------------------------------------------------------------------
-- 2. confirm_payment(): record what the provider told our server
-- ---------------------------------------------------------------------
-- Safe to call more than once for the same payment (the redirect back AND
-- the webhook may both arrive): the second call changes nothing.
create function public.confirm_payment(
  p_reference    text,
  p_status       public.payment_status,   -- 'success', 'failed' or 'abandoned'
  p_amount_minor bigint,                  -- what the provider says was paid
  p_currency     public.currency_code,
  p_raw          jsonb                    -- the provider's full reply, kept for disputes
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pay   public.payments%rowtype;
  v_order public.orders%rowtype;
begin
  if p_status not in ('success', 'failed', 'abandoned') then
    raise exception 'SF:bad_status';
  end if;

  -- "for update" = lock this payment so two confirmations can't overlap.
  select * into v_pay from public.payments where reference = p_reference for update;
  if not found then raise exception 'SF:unknown_reference'; end if;

  select * into v_order from public.orders where id = v_pay.order_id for update;

  -- Already settled earlier: just report the current state.
  if v_pay.status = 'success' then
    return jsonb_build_object('payment_status', v_pay.status, 'order_status', v_order.status);
  end if;

  if p_status = 'success' then
    -- The provider must report EXACTLY what we asked for.
    if p_amount_minor is distinct from v_pay.amount_minor
       or p_currency is distinct from v_pay.currency then
      update public.payments
        set status = 'failed', raw_response = p_raw, verified_at = now()
        where id = v_pay.id;
      raise warning 'Payment % amount/currency mismatch: got % %, expected % %',
        p_reference, p_amount_minor, p_currency, v_pay.amount_minor, v_pay.currency;
      return jsonb_build_object('payment_status', 'failed', 'order_status', v_order.status,
                                'problem', 'amount_mismatch');
    end if;

    update public.payments
      set status = 'success', raw_response = p_raw, verified_at = now()
      where id = v_pay.id;

    -- Only an order still waiting for payment moves to "paid".
    -- (If it was cancelled or already paid, staff will see the extra payment and can refund it.)
    update public.orders set status = 'paid'
      where id = v_order.id and status = 'pending_payment'
      returning * into v_order;
    if not found then
      select * into v_order from public.orders where id = v_pay.order_id;
    end if;

    return jsonb_build_object('payment_status', 'success', 'order_status', v_order.status);
  end if;

  -- Failed or abandoned: record it (only if it hadn't been settled already).
  if v_pay.status = 'pending' then
    update public.payments
      set status = p_status, raw_response = p_raw, verified_at = now()
      where id = v_pay.id;
  end if;
  return jsonb_build_object('payment_status', p_status, 'order_status', v_order.status);
end;
$$;

-- ONLY the server's secret key (the "service_role") may call this.
revoke all on function public.confirm_payment(text, public.payment_status, bigint, public.currency_code, jsonb)
  from public, anon, authenticated;
grant execute on function public.confirm_payment(text, public.payment_status, bigint, public.currency_code, jsonb)
  to service_role;
