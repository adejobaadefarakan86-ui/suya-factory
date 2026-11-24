// Which country is this visitor shopping in? (Server only.)
// Customers choose once, on first open (components/country-picker.tsx); the
// choice is saved in a cookie and can't be switched afterwards.
// Before they choose: where they are browsing from (the host adds this header:
// Vercel or Netlify), otherwise Nigeria.
import { cookies, headers } from "next/headers";
import { COUNTRY_COOKIE, isCountry, type CountryCode } from "@/lib/countries";

export async function getCountry(): Promise<CountryCode> {
  return (await chosenCountry()) ?? (await detectCountry());
}

/** The country the visitor picked, or null if they haven't picked yet. */
export async function chosenCountry(): Promise<CountryCode | null> {
  const chosen = (await cookies()).get(COUNTRY_COOKIE)?.value;
  return isCountry(chosen) ? chosen : null;
}

/** Where the visitor seems to be browsing from (Ghana or, by default, Nigeria). */
export async function detectCountry(): Promise<CountryCode> {
  const h = await headers();
  const detected = h.get("x-vercel-ip-country") ?? h.get("x-country") ?? netlifyGeoCountry(h.get("x-nf-geo"));
  return detected === "GH" ? "GH" : "NG";
}

// Netlify sends the visitor's location as base64-encoded JSON.
function netlifyGeoCountry(geo: string | null): string | null {
  if (!geo) return null;
  try {
    return JSON.parse(atob(geo))?.country?.code ?? null;
  } catch {
    return null;
  }
}
