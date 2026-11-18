-- =====================================================================
-- Suya Factory: ADMIN ORDER MANAGEMENT
-- =====================================================================
-- * Every order status change is logged in order_events (who, when, note).
-- * Status changes go ONLY through set_order_status(), which enforces the
--   allowed steps:
--     staff:  paid -> preparing -> out_for_delivery -> delivered
--     admins: also cancel (before delivery) and step back one step
-- * Admins can record offline payments (mobile money, bank transfer, cash)
--   with mark_order_paid_manually().
-- * Customers' order page gets a simple timeline (statuses + times only).
-- Plain ASCII only.
-- =====================================================================


-- 1. A payment "provider" for payments recorded by hand ----------------
alter type public.payment_provider add value if not exists 'manual';


-- 2. Internal notes on orders (staff only; never shown to customers) ----
alter table public.orders
  add column staff_notes text check (staff_notes is null or length(staff_notes) <= 2000);


-- 3. The order history log ----------------------------------------------
create table public.order_events (
  id          bigint generated always as identity primary key,
  order_id    uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,            -- empty for "order placed"
  to_status   public.order_status not null,
  note        text,
  actor_id    uuid references public.profiles (id) on delete set null,
  actor_name  text,                           -- kept even if the account is deleted
  created_at  timestamptz not null default now()
);

create index order_events_order_idx on public.order_events (order_id, created_at);

alter table public.order_events enable row level security;
create policy "order events: staff read" on public.order_events
  for select to authenticated using (public.is_staff());
-- No insert/update/delete policies: only the trigger below writes here.


-- Writes a log entry whenever an order is created or its status changes.
-- The note comes from set_config('sf.status_note', ...) set by the functions below.
create function public.log_order_event()
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

  insert into public.order_events (order_id, from_status, to_status, note, actor_id, actor_name)
  values (
    new.id,
    case when tg_op = 'UPDATE' then old.status end,
    new.status,
    coalesce(v_note, case
      when tg_op = 'INSERT' then 'Order placed'
      when v_uid is null then 'Paid online'
    end),
    v_uid,
    coalesce(v_name, case when v_uid is null then 'System' end)
  );
  return new;
end;
$$;

create trigger orders_log_insert after insert on public.orders
  for each row execute function public.log_order_event();
create trigger orders_log_status after update of status on public.orders
  for each row execute function public.log_order_event();

-- History for orders that already exist.
insert into public.order_events (order_id, from_status, to_status, note, actor_name, created_at)
select o.id, null, 'pending_payment', 'Order placed', 'System', o.created_at
from public.orders o;

insert into public.order_events (order_id, from_status, to_status, note, actor_name, created_at)
select o.id, 'pending_payment', 'paid', 'Paid online', 'System',
       coalesce((select min(p.verified_at) from public.payments p
                 where p.order_id = o.id and p.status = 'success'), o.updated_at)
from public.orders o
where o.status = 'paid';


-- 4. Changing an order's status -----------------------------------------
-- Staff (and admins) can no longer edit orders directly: only via the functions below.
drop policy "orders: staff update" on public.orders;

create function public.set_order_status(
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

  if v_step in ('paid>preparing', 'preparing>out_for_delivery', 'out_for_delivery>delivered') then
    null;  -- normal kitchen/delivery steps: any staff member
  elsif v_admin and p_status = 'cancelled'
        and v_from in ('pending_payment', 'paid', 'preparing', 'out_for_delivery') then
    null;  -- admins can cancel anything not yet delivered
  elsif v_admin and v_step in ('preparing>paid', 'out_for_delivery>preparing', 'delivered>out_for_delivery') then
    null;  -- admins can undo one step
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

revoke all on function public.set_order_status(uuid, public.order_status, text) from public, anon, authenticated;
grant execute on function public.set_order_status(uuid, public.order_status, text) to authenticated;


-- 5. Recording an offline payment (admins only) --------------------------
create function public.mark_order_paid_manually(
  p_order_id  uuid,
  p_method    text,     -- 'mobile_money' | 'bank_transfer' | 'cash' | 'other'
  p_reference text,     -- e.g. the MoMo transaction ID (optional for cash)
  p_note      text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_ref   text := nullif(btrim(coalesce(p_reference, '')), '');
begin
  if not public.is_admin() then raise exception 'SF:admin_only'; end if;
  if p_method not in ('mobile_money', 'bank_transfer', 'cash', 'other') then
    raise exception 'SF:bad_method';
  end if;
  if v_ref is null and p_method <> 'cash' then raise exception 'SF:reference_required'; end if;
  if length(coalesce(v_ref, '')) > 100 or length(coalesce(p_note, '')) > 500 then
    raise exception 'SF:too_long';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'SF:order_not_found'; end if;
  if v_order.status <> 'pending_payment' then raise exception 'SF:not_payable'; end if;

  insert into public.payments
    (order_id, provider, reference, amount_minor, currency, status, raw_response, verified_at)
  values (
    v_order.id, 'manual',
    v_order.order_number || '-MAN-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
    v_order.total_minor, v_order.currency, 'success',
    jsonb_build_object('method', p_method, 'reference', v_ref,
                       'note', nullif(btrim(coalesce(p_note, '')), ''), 'recorded_by', auth.uid()),
    now()
  );

  perform set_config('sf.status_note',
    'Paid manually: ' || replace(p_method, '_', ' ') || coalesce(' (ref ' || v_ref || ')', ''), true);
  update public.orders set status = 'paid' where id = v_order.id;
  perform set_config('sf.status_note', '', true);
end;
$$;

revoke all on function public.mark_order_paid_manually(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.mark_order_paid_manually(uuid, text, text, text) to authenticated;


-- 6. Internal notes ------------------------------------------------------
create function public.set_order_notes(p_order_id uuid, p_notes text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then raise exception 'SF:not_allowed'; end if;
  if length(coalesce(p_notes, '')) > 2000 then raise exception 'SF:too_long'; end if;
  update public.orders set staff_notes = nullif(btrim(coalesce(p_notes, '')), '') where id = p_order_id;
  if not found then raise exception 'SF:order_not_found'; end if;
end;
$$;

revoke all on function public.set_order_notes(uuid, text) from public, anon, authenticated;
grant execute on function public.set_order_notes(uuid, text) to authenticated;


-- 7. Customer order page: add the timeline -------------------------------
-- Same as before, plus "events" (status + time only: no notes, no staff names).
create or replace function public.get_order_by_token(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'order_number',       o.order_number,
    'status',             o.status,
    'created_at',         o.created_at,
    'contact_name',       o.contact_name,
    'contact_email',      o.contact_email,
    'contact_phone',      o.contact_phone,
    'country',            o.country,
    'currency',           o.currency,
    'delivery_address',   o.delivery_address,
    'notes',              o.notes,
    'subtotal_minor',     o.subtotal_minor,
    'delivery_fee_minor', o.delivery_fee_minor,
    'total_minor',        o.total_minor,
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
      select jsonb_agg(jsonb_build_object('status', e.to_status, 'at', e.created_at)
                       order by e.created_at, e.id)
      from public.order_events e
      where e.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.access_token = p_token;
$$;
