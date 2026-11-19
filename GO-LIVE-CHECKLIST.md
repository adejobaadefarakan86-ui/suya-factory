# Go-live checklist

Things that are set up for development and MUST change before real customers use the site.

## Supabase (Authentication settings)
- [ ] Turn **Confirm email** back ON (Authentication → Sign In / Providers → Email).
      It was switched off on 2026-11-18 so test accounts log in instantly.
- [ ] URL Configuration: set **Site URL** to the live address (Vercel URL or real domain).
- [ ] URL Configuration: add the live address to **Redirect URLs** (e.g. `https://your-site.vercel.app/**`).
- [ ] Set up a custom SMTP email sender (the built-in one only sends a few emails per hour).

## Paystack
- [ ] Complete business verification (activate account) so live payments are allowed.
- [ ] Enable Ghana (GHS) payments on the account, or set up a Ghana arrangement with Paystack.
- [ ] Swap the TEST secret key for the LIVE one in Vercel's environment variables.
- [ ] Set the live webhook URL in Paystack (Settings → API Keys & Webhooks).

## App settings
- [ ] Set `NEXT_PUBLIC_SITE_URL` to the live address in Vercel's environment variables.
- [ ] Add `SUPABASE_SECRET_KEY` and `PAYSTACK_SECRET_KEY` to Vercel's environment variables (never `NEXT_PUBLIC_`).
- [ ] Map + address search use free services (OpenFreeMap tiles, Photon search). If checkout traffic grows a lot,
      move search to a paid provider so we stay within Photon's fair-use limits.

## Data
- [ ] Replace the sample delivery zones and fees with the real ones.
- [ ] Delete test orders, payments and enquiries from the database.
- [ ] Upload real product photos.

## Test on real phones (Android and iPhone)
- [ ] "Call us" opens the normal phone dialer.
- [ ] "Chat on WhatsApp" opens WhatsApp with the bulk-order message filled in.
- [ ] A full order + Paystack payment works on mobile data.
