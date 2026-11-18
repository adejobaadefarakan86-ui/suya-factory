-- =====================================================================
-- Suya Factory: CHECKOUT
-- =====================================================================
-- Adds the ONLY way to create an order: the place_order() function.
-- The browser says WHAT it wants (items, quantities, zone, address);
-- the database works out every price itself, so totals can't be faked.
--
-- Also adds a secret "access token" per order, so a guest can view their
-- own order through a private link (like "view your order" links in shop emails).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Secret link code for each order
-- ---------------------------------------------------------------------
-- gen_random_uuid() = 122 random bits: impossible to guess.
alter table public.orders
  add column access_token uuid not null unique default gen_random_uuid();


-- ---------------------------------------------------------------------
-- 2. place_order(): create an order safely
-- ---------------------------------------------------------------------
-- Errors are raised as 'SF:<code>' so the website can show a friendly message.
--
-- "security definer" = this function runs with the database owner's rights,
-- so it can insert orders even though the public can't. That's why it must
-- check EVERYTHING itself. "search_path = ''" stops anyone from tricking it
-- into using look-alike tables; every name below is written in full (public.x).
create function public.place_order(
  p_country              public.country_code,
  p_zone_id              uuid,
  p_contact_name         text,
  p_contact_email        text,
  p_contact_phone        text,
  p_address              jsonb,     -- {"line1","line2","city","landmark"}
  p_notes                text,
  p_items                jsonb,     -- [{"variant_id": "...", "quantity": 2}, ...]
  p_expected_total_minor bigint     -- the total the customer was shown
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
  v_zone       record;
  v_wanted     int;
  v_found      int;
  v_subtotal   bigint;
  v_order      public.orders%rowtype;
begin
  -- Contact details ------------------------------------------------------
  if p_country is null then raise exception 'SF:country'; end if;
  if v_name = '' or length(v_name) > 100 then raise exception 'SF:name'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 200 then
    raise exception 'SF:email';
  end if;
  -- Phone: 7 to 15 digits; spaces, +, - and brackets are allowed around them.
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

  -- Delivery zone: must be active AND in the same country -----------------
  select z.id, z.name, z.fee_minor into v_zone
  from public.delivery_zones z
  where z.id = p_zone_id and z.is_active and z.country = p_country;
  if not found then raise exception 'SF:zone'; end if;

  -- Items ----------------------------------------------------------------
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'SF:empty';
  end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'SF:too_many'; end if;

  -- Every line must be {"variant_id": <an id>, "quantity": <a whole number>}.
  if exists (
    select 1 from jsonb_array_elements(p_items) as i
    where jsonb_typeof(i) <> 'object'
       or coalesce(i ->> 'variant_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or coalesce(i ->> 'quantity', '') !~ '^[0-9]{1,3}$'
  ) then
    raise exception 'SF:bad_items';
  end if;

  -- Merge duplicate lines, then check each quantity is 1 to 20.
  if exists (
    select 1 from jsonb_array_elements(p_items) as i
    group by i ->> 'variant_id'
    having sum((i ->> 'quantity')::int) not between 1 and 20
  ) then
    raise exception 'SF:quantity';
  end if;

  -- Every item must be on sale, with a price in this country's currency.
  select count(distinct i ->> 'variant_id') into v_wanted
  from jsonb_array_elements(p_items) as i;

  with b as (
    select (i ->> 'variant_id')::uuid as variant_id, sum((i ->> 'quantity')::int) as quantity
    from jsonb_array_elements(p_items) as i group by 1
  )
  select count(*), coalesce(sum(vp.amount_minor * b.quantity), 0)
    into v_found, v_subtotal
  from b
  join public.product_variants v on v.id = b.variant_id and v.is_active
  join public.products p        on p.id = v.product_id and p.is_active
  join public.variant_prices vp on vp.variant_id = v.id and vp.currency = v_currency;
  if v_found <> v_wanted then raise exception 'SF:unavailable'; end if;

  -- If a price changed since the customer loaded the page, stop and tell them.
  if p_expected_total_minor is distinct from v_subtotal + v_zone.fee_minor then
    raise exception 'SF:price_changed';
  end if;

  -- Save the order + its items (all or nothing) --------------------------
  insert into public.orders (
    user_id, contact_name, contact_email, contact_phone, country, currency,
    zone_id, delivery_address, subtotal_minor, delivery_fee_minor, total_minor, notes
  ) values (
    auth.uid(),            -- empty for guests
    v_name, v_email, v_phone, p_country, v_currency,
    v_zone.id,
    jsonb_build_object(
      'line1', v_line1, 'line2', v_line2, 'city', v_city,
      'landmark', v_landmark, 'zone_name', v_zone.name
    ),
    v_subtotal, v_zone.fee_minor, v_subtotal + v_zone.fee_minor, v_notes
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
    -- e.g. '500g [dot] Extra hot' (same wording as the website); chr(183) = middle dot
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

-- Only the website's visitors (logged in or not) may call it.
revoke all on function public.place_order(
  public.country_code, uuid, text, text, text, jsonb, text, jsonb, bigint
) from public, anon, authenticated;
grant execute on function public.place_order(
  public.country_code, uuid, text, text, text, jsonb, text, jsonb, bigint
) to anon, authenticated;


-- ---------------------------------------------------------------------
-- 3. get_order_by_token(): view ONE order with its secret link code
-- ---------------------------------------------------------------------
-- Returns nothing if the code is wrong. Never reveals who owns the order.
create function public.get_order_by_token(p_token uuid)
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
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.access_token = p_token;
$$;

revoke all on function public.get_order_by_token(uuid) from public, anon, authenticated;
grant execute on function public.get_order_by_token(uuid) to anon, authenticated;
