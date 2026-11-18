-- =====================================================================
-- Suya Factory: REAL CATALOGUE - Beef Kilishi
-- =====================================================================
-- One product, one spice level (spicy), different packs per country:
--   Nigeria: Small pack 50g  N2,500    Big pack 100g  N5,000
--   Ghana:   Small pack 80g  GHS 60    Big pack 180g  GHS 150
-- A pack priced in ONE currency is only sold in that country.
-- Prices are in kobo / pesewas (250000 = N2,500.00; 6000 = GHS 60.00).
-- Safe to run more than once.
-- =====================================================================

-- Category
insert into public.categories (name, slug, description, sort_order)
values ('Kilishi', 'kilishi', 'Spicy, sun-dried beef jerky', 1)
on conflict (slug) do update
  set name = excluded.name, description = excluded.description,
      sort_order = excluded.sort_order, is_active = true;

-- Product
insert into public.products (category_id, name, slug, description)
select c.id, 'Beef Kilishi', 'beef-kilishi',
  'Enjoy delicious, spicy kilishi with a satisfying mix of soft and crunchy textures. '
  || 'Carefully prepared in a clean, hygienic environment and professionally packaged to preserve '
  || 'its quality and freshness. At Suya Factory, we take pride in great taste, cleanliness and '
  || 'quality. Definitely not your ordinary kilishi!'
from public.categories c
where c.slug = 'kilishi'
on conflict (slug) do update
  set category_id = excluded.category_id, description = excluded.description, is_active = true;

-- Packs (no spice picker: there is only one spice level, so spice_level stays empty)
insert into public.product_variants (product_id, size_label, weight_grams, spice_level, sku, sort_order)
-- Labels become e.g. "Small pack [dot] 50g"; chr(183) makes the middle dot
-- (written as a number so copying the file can't garble it).
select p.id, v.pack || ' ' || chr(183) || ' ' || v.grams || 'g', v.grams, null, v.sku, v.ord
from public.products p,
  (values
    ('Small pack',  50, 'KIL-NG-050', 1),
    ('Big pack',   100, 'KIL-NG-100', 2),
    ('Small pack',  80, 'KIL-GH-080', 3),
    ('Big pack',   180, 'KIL-GH-180', 4)
  ) as v (pack, grams, sku, ord)
where p.slug = 'beef-kilishi'
on conflict (sku) do update
  set size_label = excluded.size_label, weight_grams = excluded.weight_grams,
      sort_order = excluded.sort_order, is_active = true;

-- Prices: each pack in its own country's currency only
insert into public.variant_prices (variant_id, currency, amount_minor)
select v.id, x.currency::public.currency_code, x.amount
from (values
    ('KIL-NG-050', 'NGN', 250000),
    ('KIL-NG-100', 'NGN', 500000),
    ('KIL-GH-080', 'GHS',   6000),
    ('KIL-GH-180', 'GHS',  15000)
  ) as x (sku, currency, amount)
join public.product_variants v on v.sku = x.sku
on conflict (variant_id, currency) do update set amount_minor = excluded.amount_minor;

-- Switch off the sample suya products (kept, not deleted: test orders refer to them).
update public.products   set is_active = false where slug in ('beef-suya', 'chicken-suya', 'ram-suya', 'yaji-spice');
update public.categories set is_active = false where slug in ('suya', 'spices');
