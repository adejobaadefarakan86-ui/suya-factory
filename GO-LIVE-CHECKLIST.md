# Go-live checklist

Things that are set up for development and MUST change before real customers use the site.

## Hosting
- [x] Live on Vercel: https://suyafactory.vercel.app (code: private GitHub repo adejobaadefarakan86-ui/suya-factory;
      every push to `main` deploys automatically). Done 2026-11-20.
- [ ] Vercel's free Hobby plan is for non-commercial use: before taking real orders, upgrade to Pro (~$20/month)
      or move to a host whose free plan allows business use.
- [ ] Custom domain (e.g. suyafactory.com), then point Supabase Site URL / Redirect URLs and NEXT_PUBLIC_SITE_URL at it.

## Supabase (Authentication settings)
- [ ] Turn **Confirm email** back ON (Authentication → Sign In / Providers → Email).
      It was switched off on 2026-11-18 so test accounts log in instantly.
- [x] URL Configuration: **Site URL** = https://suyafactory.vercel.app (2026-11-20).
- [x] URL Configuration: **Redirect URLs** include https://suyafactory.vercel.app/** (localhost kept for development).
- [ ] Set up a custom SMTP email sender (the built-in one only sends a few emails per hour).

## Paystack
- [ ] Complete business verification (activate account) so live payments are allowed.
- [ ] Swap the TEST secret key for the LIVE one in Vercel's environment variables.
- [ ] Set the live webhook URL in Paystack (Settings → API Keys & Webhooks).
- [ ] Later: Paystack Ghana account → MoMo/card payments confirmed automatically (no staff tap).

## App settings
- [x] All 12 settings from .env.local added to Vercel, with `NEXT_PUBLIC_SITE_URL` = https://suyafactory.vercel.app.
      (Change a setting there → redeploy for it to take effect.)
- [ ] Map + address search use free services (OpenFreeMap tiles, Photon search). If checkout traffic grows a lot,
      move search to a paid provider so we stay within Photon's fair-use limits.

## Telegram
- [x] Webhook points at the live site, so the ✅ / ❌ / 📦 buttons and /stock work (2026-11-20).
- [ ] Staff group: someone else creates it and adds the bot (the owner's account is limited), then re-run
      scripts/telegram-setup.mjs (run `node scripts/telegram-webhook.mjs --off` first, then set the webhook again).

## Data
- [ ] Delete test orders, payments and enquiries from the database (e.g. SF-1022 … SF-1025).
- [ ] Upload real product photos.

## Test on real phones (Android and iPhone)
- [ ] "Call us" opens the normal phone dialer.
- [ ] "Chat on WhatsApp" opens WhatsApp with the message filled in.
- [ ] Ghana: Bolt / Uber / Yango / Qargo buttons open the apps (Uber with pickup + drop-off filled in).

## Supermarkets (Nigeria)
- [ ] Once each supermarket agrees: run `node scripts/seed-stores.mjs --real` so Call/WhatsApp go to the store
      (right now they go to our own business number for testing).
- [ ] Fix each store's map pin in Admin → Supermarkets (current pins are street-level guesses).
- [ ] Confirm opening hours (8am–8pm is a placeholder) and add YK Supermarket (0816 322 2827) once it has an address.

## Ghana
- [ ] Gloria's pickup hours + a backup person; who confirms MoMo payments joins the Telegram group.
- [ ] Dawurobo (switched off, GH_DELIVERY in src/lib/ghana-orders.ts): only if we ever turn it back on, do their
      Partner Hub → Go live and swap to production keys.
