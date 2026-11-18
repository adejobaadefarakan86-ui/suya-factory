-- =====================================================================
-- Suya Factory: SAMPLE data for development
-- Products, prices, zones and quantities are PLACEHOLDERS. Replace them
-- with real values later. Safe to run more than once (skips duplicates).
-- Prices are in kobo / pesewas: 850000 = NGN 8,500.00, 10000 = GHS 100.00
-- =====================================================================


-- ---------- Kitchen (one, in Nigeria) ----------
insert into public.kitchens (name, country, address)
values ('Main Kitchen', 'NG', null)
on conflict (name) do nothing;


-- ---------- Categories ----------
insert into public.categories (name, slug, description, sort_order) values
  ('Suya',   'suya',   'Freshly grilled, spiced meat skewers', 1),
  ('Spices', 'spices', 'Our signature yaji spice blend',       2)
on conflict (slug) do nothing;


-- ---------- Products ----------
insert into public.products (category_id, name, slug, description)
select c.id, p.name, p.slug, p.description
from (values
  ('suya',   'Beef Suya',    'beef-suya',    'Classic thin-sliced beef, grilled over open flame with yaji.'),
  ('suya',   'Chicken Suya', 'chicken-suya', 'Tender chicken pieces with our house spice blend.'),
  ('suya',   'Ram Suya',     'ram-suya',     'Rich, juicy ram meat for the true suya lover.'),
  ('spices', 'Yaji Spice',   'yaji-spice',   'The secret: groundnut, pepper and spices, ready to use at home.')
) as p (category_slug, name, slug, description)
join public.categories c on c.slug = p.category_slug
on conflict (slug) do nothing;


-- ---------- Variants: meats come in 3 sizes x 2 spice levels ----------
insert into public.product_variants (product_id, size_label, weight_grams, spice_level, sku, sort_order)
select p.id, s.label, s.grams, sp.level::public.spice_level,
       m.code || '-' || s.grams || '-' || sp.code,
       s.ord * 10 + sp.ord
from (values ('beef-suya', 'BEEF'), ('chicken-suya', 'CHKN'), ('ram-suya', 'RAM')) as m (slug, code)
join public.products p on p.slug = m.slug
cross join (values ('250g', 250, 1), ('500g', 500, 2), ('1kg', 1000, 3)) as s (label, grams, ord)
cross join (values ('mild', 'MILD', 1), ('hot', 'HOT', 2)) as sp (level, code, ord)
on conflict do nothing;

-- Yaji comes in 2 sizes, no spice level
insert into public.product_variants (product_id, size_label, weight_grams, spice_level, sku, sort_order)
select p.id, s.label, s.grams, null::public.spice_level, 'YAJI-' || s.grams, s.ord
from public.products p
cross join (values ('100g', 100, 1), ('250g', 250, 2)) as s (label, grams, ord)
where p.slug = 'yaji-spice'
on conflict do nothing;


-- ---------- Prices (same price for mild and hot) ----------
-- (product code, grams, Naira, Cedis)
insert into public.variant_prices (variant_id, currency, amount_minor)
select v.id, cur.currency::public.currency_code, cur.amount * 100
from (values
  ('BEEF', 250,  4500,  55), ('BEEF', 500,  8500, 100), ('BEEF', 1000, 16000, 190),
  ('CHKN', 250,  4000,  50), ('CHKN', 500,  7500,  90), ('CHKN', 1000, 14000, 170),
  ('RAM',  250,  5500,  65), ('RAM',  500, 10500, 125), ('RAM',  1000, 20000, 240),
  ('YAJI', 100,  2000,  30), ('YAJI', 250,  4500,  60)
) as pr (code, grams, ngn, ghs)
join public.product_variants v
  on split_part(v.sku, '-', 1) = pr.code
 and split_part(v.sku, '-', 2) = pr.grams::text
cross join lateral (values ('NGN', pr.ngn), ('GHS', pr.ghs)) as cur (currency, amount)
on conflict (variant_id, currency) do nothing;


-- ---------- Delivery zones (placeholders) ----------
-- Ghana orders ship from the Nigerian kitchen, hence longer times and higher fees.
insert into public.delivery_zones (country, name, fee_minor, currency, estimated_time, sort_order) values
  ('NG', 'Lagos Mainland', 250000, 'NGN', 'Same day',  1),
  ('NG', 'Lagos Island',   350000, 'NGN', 'Same day',  2),
  ('NG', 'Abuja',          600000, 'NGN', '2-3 days',  3),
  ('GH', 'Accra',            8000, 'GHS', '4-7 days',  1),
  ('GH', 'Kumasi',          10000, 'GHS', '5-8 days',  2)
on conflict (country, name) do nothing;


-- ---------- Ingredients ----------
insert into public.ingredients (name, unit, reorder_level) values
  ('Beef',            'kg',     20),
  ('Chicken',         'kg',     15),
  ('Ram meat',        'kg',     10),
  ('Yaji spice mix',  'kg',      5),
  ('Groundnut oil',   'litre',   5),
  ('Onions',          'kg',      5),
  ('Suya box',        'piece', 100),
  ('Spice pouch',     'piece',  50)
on conflict (name) do nothing;


-- ---------- Recipes (estimates per ONE pack) ----------
-- Raw meat: 1.25x the pack weight (meat shrinks when grilled)
insert into public.recipes (variant_id, ingredient_id, quantity_per_unit)
select v.id, i.id, round(v.weight_grams * 1.25 / 1000.0, 3)
from public.product_variants v
join public.products p on p.id = v.product_id
join public.ingredients i on i.name = case p.slug
  when 'beef-suya'    then 'Beef'
  when 'chicken-suya' then 'Chicken'
  when 'ram-suya'     then 'Ram meat'
end
on conflict do nothing;

-- Yaji on meats: 6% of weight for mild, 10% for hot
insert into public.recipes (variant_id, ingredient_id, quantity_per_unit)
select v.id, i.id,
       round(v.weight_grams * (case v.spice_level when 'hot' then 0.10 else 0.06 end) / 1000.0, 3)
from public.product_variants v
join public.products p on p.id = v.product_id
join public.ingredients i on i.name = 'Yaji spice mix'
where p.slug <> 'yaji-spice'
on conflict do nothing;

-- Oil, onions and a box for every meat pack
insert into public.recipes (variant_id, ingredient_id, quantity_per_unit)
select v.id, i.id,
       case i.name
         when 'Groundnut oil' then round(v.weight_grams * 0.04 / 1000.0, 3)
         when 'Onions'        then round(v.weight_grams * 0.10 / 1000.0, 3)
         when 'Suya box'      then 1
       end
from public.product_variants v
join public.products p on p.id = v.product_id
cross join public.ingredients i
where p.slug <> 'yaji-spice'
  and i.name in ('Groundnut oil', 'Onions', 'Suya box')
on conflict do nothing;

-- Yaji packs: the spice itself plus a pouch
insert into public.recipes (variant_id, ingredient_id, quantity_per_unit)
select v.id, i.id,
       case i.name when 'Yaji spice mix' then v.weight_grams / 1000.0 else 1 end
from public.product_variants v
join public.products p on p.id = v.product_id
cross join public.ingredients i
where p.slug = 'yaji-spice'
  and i.name in ('Yaji spice mix', 'Spice pouch')
on conflict do nothing;


-- ---------- Opening stock (one sample purchase of each ingredient) ----------
insert into public.stock_movements (kitchen_id, ingredient_id, quantity_change, reason, note)
select k.id, i.id, s.qty, 'purchase'::public.stock_reason, 'Sample opening stock'
from (values
  ('Beef', 50), ('Chicken', 40), ('Ram meat', 25), ('Yaji spice mix', 15),
  ('Groundnut oil', 20), ('Onions', 20), ('Suya box', 500), ('Spice pouch', 200)
) as s (ingredient, qty)
join public.ingredients i on i.name = s.ingredient
cross join public.kitchens k
where k.name = 'Main Kitchen'
  and not exists (select 1 from public.stock_movements where note = 'Sample opening stock');
