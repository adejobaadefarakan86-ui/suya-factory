-- =====================================================================
-- Suya Factory: SUPERMARKETS (Nigeria sells through supermarkets)
--
-- Customers find the nearest supermarket that has our kilishi, call/WhatsApp
-- it, pay the supermarket directly, then book their own rider. The app:
--   - lists the stores (public), nearest first, skipping out-of-stock ones
--   - lets customers report "they're out of stock" (staff get a Telegram alert)
--   - logs each rider pickup the customer sends to a store (with a short
--     pickup code) -> rough sales numbers per store, without store staff work
-- Stock is kept by OUR staff (admin page or Telegram /in /out commands).
-- =====================================================================

-- 1. Stores ----------------------------------------------------------------
create table public.stores (
  id               uuid primary key default gen_random_uuid(),
  -- Short stable number staff use in Telegram commands ("/out 3").
  store_no         integer generated always as identity unique,
  country          public.country_code not null default 'NG',
  name             text not null check (length(name) between 1 and 100),
  branch           text check (branch is null or length(branch) <= 100),
  address          text not null check (length(address) between 1 and 300),
  lat              numeric(9, 6) not null check (lat between -90 and 90),
  lng              numeric(9, 6) not null check (lng between -180 and 180),
  -- International digits, e.g. 2348030000000 (what call / WhatsApp links need).
  phone            text check (phone is null or phone ~ '^[0-9]{8,15}$'),
  whatsapp         text check (whatsapp is null or whatsapp ~ '^[0-9]{8,15}$'),
  opening_hours    text check (opening_hours is null or length(opening_hours) <= 200),
  -- What they stock and their price, as shown to customers ("50g ₦1,500 · 100g ₦2,800").
  packs            text check (packs is null or length(packs) <= 300),
  in_stock         boolean not null default true,
  stock_updated_at timestamptz not null default now(),
  -- Last time a customer said "they're out" (cleared when staff update stock).
  out_reported_at  timestamptz,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index stores_country_idx on public.stores (country) where active;
alter table public.stores enable row level security;

create policy "stores: public read active" on public.stores
  for select to anon, authenticated using (active or public.is_staff());
create policy "stores: admin write" on public.stores
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create trigger stores_updated_at before update on public.stores
  for each row execute function public.set_updated_at();


-- 2. Stock: staff mark a store in / out of stock ------------------------------
create function public.set_store_stock(p_store_id uuid, p_in_stock boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'SF:not_staff';
  end if;
  update public.stores
  set in_stock = p_in_stock, stock_updated_at = now(), out_reported_at = null
  where id = p_store_id;
  if not found then
    raise exception 'SF:not_found';
  end if;
end;
$$;
revoke execute on function public.set_store_stock(uuid, boolean) from public, anon;
grant execute on function public.set_store_stock(uuid, boolean) to authenticated;


-- 3. Customers: "this store is out of stock" ---------------------------------
-- Doesn't change the stock itself (anyone can press it); it flags the store and
-- staff are alerted. Returns true only for the first report in 30 minutes, so
-- repeated taps don't flood the staff chat.
create function public.report_store_out_of_stock(p_store_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated int;
begin
  update public.stores
  set out_reported_at = now()
  where id = p_store_id and active and in_stock
    and (out_reported_at is null or out_reported_at < now() - interval '30 minutes');
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;
revoke execute on function public.report_store_out_of_stock(uuid) from public;
grant execute on function public.report_store_out_of_stock(uuid) to anon, authenticated;


-- 4. Pickups: the customer tells the store who their rider is -----------------
create table public.store_pickups (
  id               uuid primary key default gen_random_uuid(),
  code             text not null,                 -- "SF-4821", said by the rider at the counter
  store_id         uuid not null references public.stores (id) on delete cascade,
  customer_name    text not null check (length(customer_name) between 1 and 100),
  customer_phone   text not null check (length(customer_phone) between 7 and 20),
  paid_from        text check (paid_from is null or length(paid_from) <= 100),
  rider_name       text not null check (length(rider_name) between 1 and 100),
  rider_phone      text not null check (length(rider_phone) between 7 and 20),
  rider_plate      text check (rider_plate is null or length(rider_plate) <= 20),
  delivery_company text check (delivery_company is null or length(delivery_company) <= 50),
  created_at       timestamptz not null default now()
);
create index store_pickups_store_idx on public.store_pickups (store_id, created_at desc);
create index store_pickups_created_idx on public.store_pickups (created_at desc);
alter table public.store_pickups enable row level security;
-- Customers write through log_store_pickup() only; staff read.
create policy "store pickups: staff read" on public.store_pickups
  for select to authenticated using (public.is_staff());

create function public.log_store_pickup(
  p_store_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_paid_from text,
  p_rider_name text,
  p_rider_phone text,
  p_rider_plate text,
  p_delivery_company text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code  text;
  v_phone text := btrim(coalesce(p_customer_phone, ''));
begin
  if not exists (select 1 from public.stores where id = p_store_id and active) then
    raise exception 'SF:store';
  end if;
  if length(btrim(coalesce(p_customer_name, ''))) = 0 then raise exception 'SF:name'; end if;
  if length(regexp_replace(v_phone, '\D', '', 'g')) not between 7 and 15 then raise exception 'SF:phone'; end if;
  if length(btrim(coalesce(p_rider_name, ''))) = 0 then raise exception 'SF:rider_name'; end if;
  if length(regexp_replace(coalesce(p_rider_phone, ''), '\D', '', 'g')) not between 7 and 15 then
    raise exception 'SF:rider_phone';
  end if;

  -- Same customer, same store, within 2 minutes = a double tap: reuse that code.
  select code into v_code from public.store_pickups
  where store_id = p_store_id and customer_phone = v_phone and created_at > now() - interval '2 minutes'
  order by created_at desc limit 1;
  if v_code is not null then
    return v_code;
  end if;

  v_code := 'SF-' || lpad((floor(random() * 10000))::int::text, 4, '0');
  insert into public.store_pickups
    (code, store_id, customer_name, customer_phone, paid_from, rider_name, rider_phone, rider_plate, delivery_company)
  values (
    v_code, p_store_id, btrim(p_customer_name), v_phone, nullif(btrim(coalesce(p_paid_from, '')), ''),
    btrim(p_rider_name), btrim(p_rider_phone), nullif(upper(btrim(coalesce(p_rider_plate, ''))), ''),
    nullif(btrim(coalesce(p_delivery_company, '')), '')
  );
  return v_code;
exception
  when check_violation then raise exception 'SF:too_long';
end;
$$;
revoke execute on function public.log_store_pickup(uuid, text, text, text, text, text, text, text) from public;
grant execute on function public.log_store_pickup(uuid, text, text, text, text, text, text, text) to anon, authenticated;
