-- =====================================================================
-- Suya Factory: NO MORE DELIVERY AREAS, LAGOS-ONLY, 1KG = BULK
--
-- * The exact map pin replaces the "Delivery area" dropdown: place_order()
--   no longer takes a zone (old orders keep theirs).
-- * Nigeria: regular orders only for pins inside Lagos State (the business
--   is based there). Further away = bulk order, arranged with us directly.
-- * Any order of 1kg or more is a bulk order (special pricing) and can't be
--   placed through the normal checkout.
-- The same Lagos polygon lives in src/lib/lagos.ts for instant feedback.
-- =====================================================================

-- 1. Is a point inside Lagos State? (simplified OSM border, ~100 m) ---------
create function public.in_lagos(p_lat numeric, p_lng numeric)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  -- [lng, lat] pairs, flattened
  v_pts constant float8[] := array[
    2.7067,6.4514, 2.707,6.3726, 2.7552,6.3801, 2.7894,6.3834, 2.8123,6.3874, 2.836,6.3889, 2.8505,6.3918, 2.9701,6.3961,
    3.0232,6.3947, 3.069,6.3966, 3.0727,6.3994, 3.0769,6.3968, 3.2023,6.4008, 3.3105,6.4, 3.404,6.3901, 3.4028,6.3944,
    3.4249,6.4055, 3.4447,6.4094, 3.6942,6.4197, 3.7475,6.4267, 3.8453,6.4261, 3.9911,6.4214, 4.051,6.4131, 4.181,6.3889,
    4.2435,6.3804, 4.3225,6.3722, 4.3509,6.3667, 4.3508,6.4276, 4.3434,6.4358, 4.3372,6.4395, 4.3241,6.4378, 4.3039,6.4395,
    4.2987,6.4352, 4.2956,6.4346, 4.2911,6.4366, 4.284,6.4368, 4.2813,6.4388, 4.279,6.4379, 4.2724,6.4428, 4.2638,6.4436,
    4.2543,6.4413, 4.2533,6.4343, 4.2453,6.4345, 4.2369,6.4382, 4.2374,6.4419, 4.2357,6.4448, 4.2258,6.4456, 4.2218,6.4505,
    4.2173,6.4631, 4.2134,6.4645, 4.2078,6.4642, 4.2035,6.4619, 4.1937,6.4632, 4.1922,6.4655, 4.1774,6.4701, 4.172,6.4736,
    4.1611,6.4747, 4.1594,6.4872, 4.155,6.4966, 4.1562,6.4988, 4.1677,6.5036, 4.174,6.5087, 4.1783,6.5151, 4.1918,6.519,
    4.2061,6.5253, 4.2223,6.5377, 4.2287,6.5576, 4.2231,6.562, 4.218,6.5697, 4.2153,6.5777, 4.2127,6.5786, 4.2118,6.5817,
    4.1996,6.5885, 4.1988,6.5858, 4.1867,6.5849, 4.1796,6.5864, 4.1783,6.5887, 4.1663,6.5934, 4.1622,6.5922, 4.143,6.5751,
    4.1289,6.571, 4.1164,6.5634, 4.1106,6.5583, 4.1095,6.5469, 4.103,6.5459, 4.0947,6.546, 4.0936,6.5493, 4.0954,6.5507,
    4.092,6.5553, 4.0906,6.5618, 4.0886,6.5626, 4.0861,6.5588, 4.0682,6.5636, 4.0649,6.5624, 4.0671,6.5695, 4.0649,6.5806,
    4.0575,6.5964, 4.0559,6.6036, 4.0565,6.6111, 4.0514,6.616, 4.0505,6.6192, 4.0566,6.6247, 4.0588,6.636, 4.0643,6.6361,
    4.0704,6.6332, 4.0767,6.6371, 4.0815,6.6376, 4.088,6.6448, 4.0915,6.6526, 4.0952,6.6515, 4.0904,6.6661, 4.0943,6.6707,
    4.0915,6.679, 3.4611,6.6855, 3.4616,6.6787, 3.4642,6.676, 3.4615,6.669, 3.4512,6.6724, 3.4488,6.6752, 3.4436,6.6673,
    3.4526,6.6523, 3.4543,6.6445, 3.4577,6.6394, 3.4483,6.6406, 3.4344,6.6373, 3.3767,6.6385, 3.3692,6.6399, 3.3691,6.6429,
    3.364,6.6492, 3.3579,6.6519, 3.3537,6.6588, 3.3448,6.6654, 3.336,6.6682, 3.3154,6.6667, 3.3095,6.6717, 3.2912,6.679,
    3.2883,6.6817, 3.2845,6.6813, 3.2685,6.6916, 3.265,6.6968, 3.2629,6.6966, 3.2601,6.6944, 3.2595,6.6905, 3.2417,6.6599,
    3.2388,6.6401, 3.2392,6.6308, 3.2414,6.6287, 3.2399,6.6161, 3.2374,6.6142, 3.2332,6.6059, 3.2074,6.5884, 3.1968,6.5762,
    3.1963,6.5707, 3.2047,6.5425, 3.2038,6.5296, 3.1971,6.5249, 3.1912,6.5229, 3.1795,6.5098, 3.1711,6.5094, 3.157,6.5049,
    3.1555,6.5021, 3.1436,6.5045, 3.1302,6.5007, 3.1114,6.5012, 3.0959,6.4978, 3.0883,6.4993, 3.0739,6.4982, 3.0632,6.4995,
    3.0283,6.4981, 3.0157,6.5001, 2.9911,6.5009, 2.9868,6.5026, 2.9486,6.5003, 2.9243,6.5026, 2.9202,6.5012, 2.9094,6.5044,
    2.9035,6.5015, 2.8929,6.5019, 2.8973,6.4917, 2.8973,6.4877, 2.8937,6.4801, 2.8806,6.4699, 2.8693,6.4717, 2.8602,6.4677,
    2.8545,6.4517, 2.8428,6.444, 2.8305,6.4424, 2.8199,6.4513, 2.8015,6.4583, 2.7939,6.4573, 2.7836,6.4508, 2.7758,6.4484,
    2.7575,6.4474, 2.7457,6.4478, 2.7422,6.4489, 2.7341,6.4557, 2.7278,6.4574, 2.7187,6.4574, 2.7067,6.4514
  ];
  v_n      int := array_length(v_pts, 1) / 2;
  v_inside boolean := false;
  v_x      float8 := p_lng;
  v_y      float8 := p_lat;
  i        int;
  j        int;
  xi float8; yi float8; xj float8; yj float8;
begin
  if p_lat is null or p_lng is null then return false; end if;
  j := v_n;
  for i in 1 .. v_n loop
    xi := v_pts[2 * i - 1]; yi := v_pts[2 * i];
    xj := v_pts[2 * j - 1]; yj := v_pts[2 * j];
    if ((yi > v_y) <> (yj > v_y)) and (v_x < (xj - xi) * (v_y - yi) / (yj - yi) + xi) then
      v_inside := not v_inside;
    end if;
    j := i;
  end loop;
  return v_inside;
end;
$$;
grant execute on function public.in_lagos(numeric, numeric) to anon, authenticated;


-- 2. place_order without a delivery area -----------------------------------
drop function public.place_order(
  public.country_code, uuid, text, text, text, jsonb, text, jsonb, bigint
);

create function public.place_order(
  p_country              public.country_code,
  p_contact_name         text,
  p_contact_email        text,
  p_contact_phone        text,
  p_address              jsonb,     -- {"line1","line2","city","landmark","lat","lng","accuracy"}
  p_notes                text,
  p_items                jsonb,     -- [{"variant_id": "...", "quantity": 2}, ...]
  p_expected_total_minor bigint     -- the total the customer was shown (items only)
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
  v_lat_text   text := coalesce(p_address ->> 'lat', '');
  v_lng_text   text := coalesce(p_address ->> 'lng', '');
  v_acc_text   text := coalesce(p_address ->> 'accuracy', '');
  v_lat        numeric;
  v_lng        numeric;
  v_acc        numeric;
  v_grams      bigint;
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

  -- Exact location: required, and roughly inside the chosen country -------
  if v_lat_text !~ '^-?[0-9]{1,3}(\.[0-9]{1,10})?$' or v_lng_text !~ '^-?[0-9]{1,3}(\.[0-9]{1,10})?$' then
    raise exception 'SF:location';
  end if;
  v_lat := v_lat_text::numeric;
  v_lng := v_lng_text::numeric;
  if (p_country = 'NG' and not (v_lat between 4.0 and 14.0 and v_lng between 2.5 and 15.0))
     or (p_country = 'GH' and not (v_lat between 4.5 and 11.5 and v_lng between -3.5 and 1.5)) then
    raise exception 'SF:location_country';
  end if;
  if v_acc_text ~ '^[0-9]{1,6}(\.[0-9]+)?$' then v_acc := round(v_acc_text::numeric); end if;

  -- Nigeria: regular orders are delivered inside Lagos State only ----------
  if p_country = 'NG' and not public.in_lagos(v_lat, v_lng) then
    raise exception 'SF:outside_lagos';
  end if;

  -- Items ----------------------------------------------------------------
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'SF:empty';
  end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'SF:too_many'; end if;

  if exists (
    select 1 from jsonb_array_elements(p_items) as i
    where jsonb_typeof(i) <> 'object'
       or coalesce(i ->> 'variant_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or coalesce(i ->> 'quantity', '') !~ '^[0-9]{1,3}$'
  ) then
    raise exception 'SF:bad_items';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_items) as i
    group by i ->> 'variant_id'
    having sum((i ->> 'quantity')::int) not between 1 and 20
  ) then
    raise exception 'SF:quantity';
  end if;

  select count(distinct i ->> 'variant_id') into v_wanted
  from jsonb_array_elements(p_items) as i;

  with b as (
    select (i ->> 'variant_id')::uuid as variant_id, sum((i ->> 'quantity')::int) as quantity
    from jsonb_array_elements(p_items) as i group by 1
  )
  select count(*), coalesce(sum(vp.amount_minor * b.quantity), 0), coalesce(sum(coalesce(v.weight_grams, 0) * b.quantity), 0)
    into v_found, v_subtotal, v_grams
  from b
  join public.product_variants v on v.id = b.variant_id and v.is_active
  join public.products p        on p.id = v.product_id and p.is_active
  join public.variant_prices vp on vp.variant_id = v.id and vp.currency = v_currency;
  if v_found <> v_wanted then raise exception 'SF:unavailable'; end if;

  -- 1kg or more is a bulk order: special pricing, arranged with us directly.
  if v_grams >= 1000 then raise exception 'SF:bulk'; end if;

  -- The customer pays online for the items only.
  if p_expected_total_minor is distinct from v_subtotal then
    raise exception 'SF:price_changed';
  end if;

  -- Save the order + its items (all or nothing) --------------------------
  insert into public.orders (
    user_id, contact_name, contact_email, contact_phone, country, currency, zone_id,
    delivery_address, subtotal_minor, delivery_fee_minor, total_minor, notes, status
  ) values (
    auth.uid(),
    v_name, v_email, v_phone, p_country, v_currency, null,
    jsonb_build_object(
      'line1', v_line1, 'line2', v_line2, 'city', v_city, 'landmark', v_landmark,
      'lat', v_lat, 'lng', v_lng, 'accuracy_m', v_acc
    ),
    v_subtotal, 0, v_subtotal, v_notes, 'awaiting_quote'
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
    -- chr(183) = middle dot, e.g. '500g [dot] Hot'
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


revoke all on function public.place_order(
  public.country_code, text, text, text, jsonb, text, jsonb, bigint
) from public, anon, authenticated;
grant execute on function public.place_order(
  public.country_code, text, text, text, jsonb, text, jsonb, bigint
) to anon, authenticated;
