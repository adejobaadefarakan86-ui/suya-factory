-- =====================================================================
-- Suya Factory: GHANA = GREATER ACCRA ONLY (same rule as Lagos in Nigeria)
--
-- Regular orders (under 1kg) are delivered inside one home region per country:
--   NG -> Lagos State, GH -> Greater Accra Region.
-- Anywhere else must be a bulk order (1kg+), arranged with us directly.
-- Same polygons as src/lib/service-areas.ts.
-- =====================================================================

-- 1. Is a point inside the Greater Accra Region? (OSM border, ~100 m) -------
create function public.in_accra(p_lat numeric, p_lng numeric)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  -- [lng, lat] pairs, flattened
  v_pts constant float8[] := array[
    -0.5197,5.7005, -0.5189,5.6923, -0.5151,5.6888, -0.5114,5.6888, -0.5124,5.681, -0.5072,5.6795, -0.4987,5.666, -0.4983,5.6627,
    -0.495,5.6591, -0.494,5.6543, -0.4277,5.6184, -0.4257,5.6116, -0.4271,5.6085, -0.4258,5.6027, -0.4203,5.5985, -0.4181,5.5939,
    -0.4205,5.5847, -0.4191,5.579, -0.4215,5.5689, -0.4196,5.5507, -0.4216,5.5409, -0.4157,5.537, -0.4126,5.5263, -0.4133,5.524,
    -0.4068,5.5178, -0.4055,5.5115, -0.4035,5.5099, -0.4049,5.5025, -0.4028,5.4969, -0.4041,5.4918, -0.4003,5.4844, -0.4043,5.4829,
    -0.4069,5.4786, -0.4068,5.4707, -0.4052,5.4738, -0.4,5.4775, -0.3759,5.4873, -0.3709,5.4898, -0.3677,5.4941, -0.3579,5.4979,
    -0.3127,5.5108, -0.2359,5.5258, -0.2074,5.5329, -0.2049,5.5348, -0.2049,5.5406, -0.1838,5.5457, -0.1504,5.5584, -0.1227,5.5661,
    -0.1034,5.5743, -0.0951,5.5807, -0.074,5.5891, -0.0549,5.6077, -0.0221,5.6142, -0.0138,5.6045, 0.0037,5.612, 0.0247,5.6263,
    0.0218,5.6303, 0.0219,5.6342, 0.019,5.6411, 0.0282,5.6469, 0.0286,5.6509, 0.0344,5.6576, 0.0426,5.662, 0.0437,5.6706,
    0.0516,5.6746, 0.0662,5.6889, 0.0697,5.6947, 0.1244,5.7069, 0.1308,5.7107, 0.1333,5.717, 0.138,5.7223, 0.1488,5.7275,
    0.1646,5.7318, 0.1671,5.7349, 0.1742,5.7371, 0.1732,5.7388, 0.1782,5.7405, 0.1789,5.7428, 0.1825,5.7421, 0.1873,5.7452,
    0.2199,5.7468, 0.2208,5.7489, 0.246,5.7604, 0.2497,5.7658, 0.2567,5.7686, 0.2778,5.7742, 0.3239,5.7829, 0.3645,5.7869,
    0.4412,5.7897, 0.4689,5.7889, 0.5398,5.7819, 0.6208,5.7764, 0.6654,5.7697, 0.6723,5.7743, 0.6697,5.7769, 0.6695,5.7815,
    0.6716,5.7875, 0.6569,5.8108, 0.6521,5.8164, 0.6429,5.8217, 0.6363,5.8345, 0.6209,5.8343, 0.6201,5.8517, 0.6259,5.8621,
    0.6312,5.8627, 0.6323,5.866, 0.6294,5.8687, 0.6251,5.8693, 0.6225,5.8691, 0.6183,5.8655, 0.6146,5.8656, 0.6128,5.8726,
    0.6143,5.8744, 0.6194,5.8743, 0.6193,5.8762, 0.6111,5.8766, 0.61,5.884, 0.604,5.8873, 0.6053,5.8899, 0.6121,5.8941,
    0.6088,5.9003, 0.6066,5.9014, 0.6026,5.9003, 0.5974,5.907, 0.5899,5.9104, 0.5884,5.9202, 0.577,5.9327, 0.5719,5.9298,
    0.5706,5.9304, 0.5715,5.9321, 0.5692,5.9327, 0.5665,5.936, 0.5669,5.9377, 0.5615,5.9403, 0.5597,5.9394, 0.5546,5.9453,
    0.545,5.9429, 0.5429,5.9393, 0.5293,5.9477, 0.5245,5.9576, 0.5254,5.9786, 0.5146,5.9825, 0.4969,5.9818, 0.4949,5.9856,
    0.4883,5.9892, 0.4874,6.0033, 0.479,6.0096, 0.4604,6.0074, 0.4494,6.0011, 0.446,5.9965, 0.4427,5.9964, 0.4404,5.9911,
    0.4419,5.9868, 0.4344,5.9743, 0.4299,5.9741, 0.4251,5.9776, 0.4213,5.9783, 0.4164,5.9763, 0.4143,5.9693, 0.3896,5.96,
    0.3862,5.9613, 0.3667,5.9604, 0.344,5.9549, 0.348,5.9626, 0.3504,5.9772, 0.3123,5.9892, 0.3197,5.9957, 0.3199,6.001,
    0.3333,6.0158, 0.3439,6.0216, 0.3485,6.0223, 0.3315,6.0342, 0.3376,6.0514, 0.2943,6.0614, 0.2911,6.0667, 0.2888,6.0779,
    0.2831,6.0905, 0.2713,6.1006, 0.2642,6.1046, 0.2485,6.1036, 0.236,6.1054, 0.183,6.0926, 0.1755,6.0938, 0.1676,6.0993,
    0.1446,6.1076, 0.1436,6.1009, 0.1497,6.0855, 0.1378,6.0735, 0.1269,6.073, 0.1169,6.0623, 0.1017,6.057, 0.0949,6.0482,
    0.0835,6.0432, 0.065,6.0532, 0.0542,6.0466, 0.0506,6.0464, 0.0464,6.0404, 0.0433,6.0503, 0.0378,6.0515, 0.0189,6.0614,
    0.0179,6.0389, 0.0139,6.0302, 0.0085,6.0241, 0.0079,6.0168, 0.0041,6.0095, -0.0008,6.0076, -0.0097,6.0104, -0.0148,5.9972,
    -0.0082,5.9939, -0.0047,5.9859, -0.0041,5.9763, -0.0062,5.971, -0.0406,5.9448, -0.0466,5.9433, -0.0628,5.9304, -0.0833,5.9078,
    -0.0951,5.9019, -0.1142,5.8866, -0.1256,5.8711, -0.1306,5.8525, -0.1378,5.851, -0.1439,5.8548, -0.1467,5.8519, -0.1527,5.8501,
    -0.1556,5.8462, -0.1642,5.8411, -0.1639,5.8382, -0.1529,5.8397, -0.1493,5.8337, -0.1492,5.8306, -0.1528,5.8268, -0.155,5.8145,
    -0.1646,5.8121, -0.1722,5.814, -0.1722,5.8058, -0.1808,5.7941, -0.1852,5.7922, -0.186,5.7895, -0.1942,5.7842, -0.1982,5.7845,
    -0.2027,5.782, -0.2047,5.7678, -0.2044,5.7637, -0.202,5.7631, -0.2071,5.7549, -0.2144,5.7494, -0.2183,5.7506, -0.2206,5.7483,
    -0.2213,5.7426, -0.2254,5.7404, -0.242,5.7468, -0.2434,5.751, -0.243,5.7645, -0.2386,5.7732, -0.2338,5.7782, -0.2629,5.7994,
    -0.269,5.8004, -0.2708,5.8082, -0.2746,5.808, -0.2833,5.802, -0.3108,5.7893, -0.3165,5.7827, -0.321,5.7807, -0.3244,5.7749,
    -0.3274,5.7729, -0.3314,5.7789, -0.3354,5.7767, -0.3403,5.7781, -0.3482,5.7743, -0.3523,5.7663, -0.3547,5.7671, -0.366,5.7624,
    -0.3709,5.7673, -0.3786,5.7702, -0.3789,5.7744, -0.3847,5.7764, -0.3874,5.7713, -0.3891,5.7616, -0.3935,5.7599, -0.4018,5.7659,
    -0.4037,5.7656, -0.4057,5.769, -0.4132,5.7722, -0.4161,5.7766, -0.4164,5.7801, -0.4131,5.7856, -0.4219,5.7892, -0.4243,5.7934,
    -0.428,5.7926, -0.4307,5.7961, -0.437,5.7994, -0.4415,5.798, -0.4483,5.7881, -0.4577,5.7889, -0.4597,5.7758, -0.4681,5.7784,
    -0.4736,5.7828, -0.4771,5.7767, -0.477,5.7613, -0.4904,5.7543, -0.4926,5.7484, -0.4957,5.7489, -0.504,5.7401, -0.5133,5.7349,
    -0.51,5.7306, -0.5119,5.7265, -0.5092,5.7217, -0.5098,5.7048, -0.5197,5.7005
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
grant execute on function public.in_accra(numeric, numeric) to anon, authenticated;


-- 2. One check for every country -------------------------------------------
create function public.in_service_area(p_country public.country_code, p_lat numeric, p_lng numeric)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_country
    when 'NG' then public.in_lagos(p_lat, p_lng)
    when 'GH' then public.in_accra(p_lat, p_lng)
    else false
  end;
$$;
grant execute on function public.in_service_area(public.country_code, numeric, numeric) to anon, authenticated;


-- 3. place_order: use the per-country check (error code SF:outside_area) ----
create or replace function public.place_order(
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

  -- Regular orders: only inside our home region (Lagos State / Greater Accra)
  if not public.in_service_area(p_country, v_lat, v_lng) then
    raise exception 'SF:outside_area';
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

