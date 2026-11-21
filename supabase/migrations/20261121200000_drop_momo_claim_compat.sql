-- The live site now sends the number the customer paid from, so the
-- temporary 2-argument "I've paid" (20261121160000) is no longer needed.
drop function if exists public.claim_momo_payment_by_token(uuid, text);
