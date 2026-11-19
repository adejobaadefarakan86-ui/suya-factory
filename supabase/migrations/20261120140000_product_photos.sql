-- Suya Factory: first real product photos (files in /public/images).
-- The first one is the main photo; the rest show on the product page.
update public.products
set image_urls = array[
  '/images/kilishi-pouches.webp',
  '/images/kilishi-closeup.webp',
  '/images/kilishi-tubs.webp',
  '/images/kilishi-ghana-pouches.webp'
]
where slug = 'beef-kilishi';
