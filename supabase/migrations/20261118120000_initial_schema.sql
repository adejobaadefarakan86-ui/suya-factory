-- =====================================================================
-- Suya Factory: initial database schema
-- One business entity, one kitchen, selling in Nigeria (NGN) and Ghana (GHS).
-- Money is stored as whole numbers in the smallest unit (kobo / pesewas).
-- Every table has Row Level Security (RLS) on: locked unless a policy allows.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Fixed lists of allowed values ("enums")
-- ---------------------------------------------------------------------
create type public.user_role        as enum ('customer', 'staff', 'admin');
create type public.country_code     as enum ('NG', 'GH');
create type public.currency_code    as enum ('NGN', 'GHS');
create type public.spice_level      as enum ('mild', 'medium', 'hot', 'extra_hot');
create type public.order_status     as enum ('pending_payment', 'paid', 'preparing', 'out_for_delivery', 'delivered', 'cancelled');
create type public.payment_provider as enum ('paystack', 'flutterwave');
create type public.payment_status   as enum ('pending', 'success', 'failed', 'abandoned', 'refunded');
create type public.stock_reason     as enum ('purchase', 'production_use', 'production_output', 'sale', 'waste', 'adjustment');


-- ---------------------------------------------------------------------
-- 2. Shared helper: keep updated_at current
-- ---------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------
-- 3. ACCOUNTS
-- ---------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  phone      text,
  country    public.country_code,
  role       public.user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Role checks used by the security rules below.
-- "security definer" lets them read profiles without tripping over RLS.
create function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('staff', 'admin')
  );
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- Create a profile automatically when someone signs up.
-- Role is ALWAYS 'customer' here; it is never taken from sign-up data.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Stop customers promoting themselves to admin.
-- Website users must be admins to change a role. The Supabase dashboard
-- (where you'll make your first admin) is allowed.
create function public.guard_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and current_user in ('anon', 'authenticated')
     and not public.is_admin() then
    raise exception 'Only admins can change user roles';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role before update on public.profiles
  for each row execute function public.guard_role_change();


-- ---------------------------------------------------------------------
-- 4. CATALOGUE
-- ---------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,          -- used in web addresses, e.g. /shop/beef-suya
  description text,
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.products (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  name        text not null,
  slug        text not null unique,
  description text,
  image_urls  text[] not null default '{}',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- What customers actually buy: a size + (optional) spice level.
create table public.product_variants (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  size_label   text not null,                -- e.g. '250g', '500g', '1kg'
  weight_grams int check (weight_grams > 0),
  spice_level  public.spice_level,           -- empty for items without spice options
  sku          text unique,                  -- your internal stock code
  sort_order   int not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  unique nulls not distinct (product_id, size_label, spice_level)
);

-- One price per variant per currency (set by you, not an exchange rate).
create table public.variant_prices (
  variant_id   uuid not null references public.product_variants (id) on delete cascade,
  currency     public.currency_code not null,
  amount_minor bigint not null check (amount_minor > 0),
  updated_at   timestamptz not null default now(),
  primary key (variant_id, currency)
);

create trigger variant_prices_updated_at before update on public.variant_prices
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- 5. DELIVERY
-- ---------------------------------------------------------------------
create table public.delivery_zones (
  id             uuid primary key default gen_random_uuid(),
  country        public.country_code not null,
  name           text not null,
  fee_minor      bigint not null check (fee_minor >= 0),
  currency       public.currency_code not null,
  estimated_time text,                        -- e.g. 'Same day', '3-5 days'
  sort_order     int not null default 0,
  is_active      boolean not null default true,
  unique (country, name),
  -- Nigerian zones charge in Naira, Ghanaian zones in Cedis.
  check ((country = 'NG' and currency = 'NGN') or (country = 'GH' and currency = 'GHS'))
);

create table public.addresses (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  zone_id        uuid not null references public.delivery_zones (id),
  recipient_name text not null,
  phone          text not null,
  line1          text not null,
  line2          text,
  city           text not null,
  landmark       text,
  is_default     boolean not null default false,
  created_at     timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 6. ORDERS & PAYMENTS
-- ---------------------------------------------------------------------
create sequence public.order_number_seq start 1001;

create table public.orders (
  id                 uuid primary key default gen_random_uuid(),
  order_number       text not null unique
                     default 'SF-' || nextval('public.order_number_seq')::text,
  user_id            uuid references public.profiles (id) on delete set null,  -- empty = guest order
  contact_name       text not null,
  contact_email      text not null,
  contact_phone      text not null,
  country            public.country_code not null,
  currency           public.currency_code not null,
  zone_id            uuid references public.delivery_zones (id) on delete set null,
  delivery_address   jsonb not null,          -- copy of the address at order time
  subtotal_minor     bigint not null check (subtotal_minor >= 0),
  delivery_fee_minor bigint not null check (delivery_fee_minor >= 0),
  total_minor        bigint not null,
  status             public.order_status not null default 'pending_payment',
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (total_minor = subtotal_minor + delivery_fee_minor),
  check ((country = 'NG' and currency = 'NGN') or (country = 'GH' and currency = 'GHS'))
);

create index orders_user_id_idx on public.orders (user_id);
create index orders_status_idx  on public.orders (status);

create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders (id) on delete cascade,
  variant_id       uuid references public.product_variants (id) on delete set null,
  product_name     text not null,             -- copied at order time
  variant_label    text not null,             -- e.g. '500g - Hot'
  unit_price_minor bigint not null check (unit_price_minor >= 0),
  quantity         int not null check (quantity > 0),
  line_total_minor bigint generated always as (unit_price_minor * quantity) stored
);

create index order_items_order_id_idx on public.order_items (order_id);

create table public.payments (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  provider     public.payment_provider not null,
  reference    text not null unique,          -- Paystack/Flutterwave transaction reference
  amount_minor bigint not null check (amount_minor > 0),
  currency     public.currency_code not null,
  status       public.payment_status not null default 'pending',
  raw_response jsonb,                         -- provider's reply, kept for disputes
  verified_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index payments_order_id_idx on public.payments (order_id);


-- ---------------------------------------------------------------------
-- 7. KITCHEN & STOCK (staff/admin only)
-- ---------------------------------------------------------------------
create table public.kitchens (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  country    public.country_code not null,
  address    text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.ingredients (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  unit          text not null check (unit in ('kg', 'g', 'litre', 'ml', 'piece')),
  reorder_level numeric not null default 0 check (reorder_level >= 0),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- How much of each ingredient goes into ONE unit of a variant.
create table public.recipes (
  variant_id        uuid not null references public.product_variants (id) on delete cascade,
  ingredient_id     uuid not null references public.ingredients (id) on delete restrict,
  quantity_per_unit numeric not null check (quantity_per_unit > 0),
  primary key (variant_id, ingredient_id)
);

create table public.production_batches (
  id          uuid primary key default gen_random_uuid(),
  kitchen_id  uuid not null references public.kitchens (id),
  variant_id  uuid not null references public.product_variants (id),
  quantity    int not null check (quantity > 0),
  produced_at timestamptz not null default now(),
  made_by     uuid references public.profiles (id) on delete set null,
  notes       text
);

-- The stock ledger: every change, with a reason. Never edit a row; add a correction.
create table public.stock_movements (
  id              uuid primary key default gen_random_uuid(),
  kitchen_id      uuid not null references public.kitchens (id),
  ingredient_id   uuid references public.ingredients (id),
  variant_id      uuid references public.product_variants (id),
  quantity_change numeric not null check (quantity_change <> 0),  -- + in, - out
  reason          public.stock_reason not null,
  batch_id        uuid references public.production_batches (id) on delete set null,
  order_id        uuid references public.orders (id) on delete set null,
  note            text,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  -- Each movement is about exactly one thing: an ingredient OR a finished product.
  check (num_nonnulls(ingredient_id, variant_id) = 1)
);

create index stock_movements_ingredient_idx on public.stock_movements (ingredient_id);
create index stock_movements_variant_idx    on public.stock_movements (variant_id);

-- Current stock = sum of the ledger. security_invoker makes the view obey RLS.
create view public.stock_levels with (security_invoker = on) as
  select kitchen_id, ingredient_id, variant_id, sum(quantity_change) as quantity
  from public.stock_movements
  group by kitchen_id, ingredient_id, variant_id;


-- ---------------------------------------------------------------------
-- 8. SECURITY RULES (Row Level Security)
-- ---------------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.categories         enable row level security;
alter table public.products           enable row level security;
alter table public.product_variants   enable row level security;
alter table public.variant_prices     enable row level security;
alter table public.delivery_zones     enable row level security;
alter table public.addresses          enable row level security;
alter table public.orders             enable row level security;
alter table public.order_items        enable row level security;
alter table public.payments           enable row level security;
alter table public.kitchens           enable row level security;
alter table public.ingredients        enable row level security;
alter table public.recipes            enable row level security;
alter table public.production_batches enable row level security;
alter table public.stock_movements    enable row level security;

-- Profiles: you see/edit your own; staff can see everyone; admins can edit anyone.
create policy "profiles: read own or staff" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_staff());
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profiles: admin update any" on public.profiles
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Catalogue + delivery zones: anyone can browse active items; staff see all; admins edit.
create policy "categories: public read active" on public.categories
  for select to anon, authenticated using (is_active or public.is_staff());
create policy "categories: admin write" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "products: public read active" on public.products
  for select to anon, authenticated using (is_active or public.is_staff());
create policy "products: admin write" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "variants: public read active" on public.product_variants
  for select to anon, authenticated using (is_active or public.is_staff());
create policy "variants: admin write" on public.product_variants
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "prices: public read" on public.variant_prices
  for select to anon, authenticated using (true);
create policy "prices: admin write" on public.variant_prices
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "zones: public read active" on public.delivery_zones
  for select to anon, authenticated using (is_active or public.is_staff());
create policy "zones: admin write" on public.delivery_zones
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Addresses: customers manage their own; staff can read (to deliver).
create policy "addresses: own" on public.addresses
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "addresses: staff read" on public.addresses
  for select to authenticated using (public.is_staff());

-- Orders: customers read their own; staff read all and update status.
-- NOTE: no one can INSERT orders or payments from the browser. The checkout
-- phase adds a secure server-side step that calculates prices itself, so
-- nobody can tamper with totals or fake a payment.
create policy "orders: read own or staff" on public.orders
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_staff());
create policy "orders: staff update" on public.orders
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "order items: read if order visible" on public.order_items
  for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and (o.user_id = (select auth.uid()) or public.is_staff())
  ));

create policy "payments: staff read" on public.payments
  for select to authenticated using (public.is_staff());

-- Kitchen: staff read everything and record production/stock; admins manage setup.
create policy "kitchens: staff read" on public.kitchens
  for select to authenticated using (public.is_staff());
create policy "kitchens: admin write" on public.kitchens
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "ingredients: staff read" on public.ingredients
  for select to authenticated using (public.is_staff());
create policy "ingredients: admin write" on public.ingredients
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "recipes: staff read" on public.recipes
  for select to authenticated using (public.is_staff());
create policy "recipes: admin write" on public.recipes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "batches: staff read" on public.production_batches
  for select to authenticated using (public.is_staff());
create policy "batches: staff record" on public.production_batches
  for insert to authenticated with check (public.is_staff());

create policy "stock: staff read" on public.stock_movements
  for select to authenticated using (public.is_staff());
create policy "stock: staff record" on public.stock_movements
  for insert to authenticated with check (public.is_staff());
