# Go-live checklist

Things that are set up for development and MUST change before real customers use the site.

## Supabase (Authentication settings)
- [ ] Turn **Confirm email** back ON (Authentication → Sign In / Providers → Email).
      It was switched off on 2026-11-18 so test accounts log in instantly.
- [ ] URL Configuration: set **Site URL** to the live address (Vercel URL or real domain).
- [ ] URL Configuration: add the live address to **Redirect URLs** (e.g. `https://your-site.vercel.app/**`).
- [ ] Set up a custom SMTP email sender (the built-in one only sends a few emails per hour).

## App settings
- [ ] Set `NEXT_PUBLIC_SITE_URL` to the live address in Vercel's environment variables.
