// Which country is this visitor shopping in? (Server only.)
// 1. Their own choice, saved in a cookie.
// 2. Otherwise, where they are browsing from (the host adds this header: Vercel or Netlify).
// 3. Otherwise, Nigeria.
import { cookies, headers } from "next/headers";
import { COUNTRY_COOKIE, isCountry, type CountryCode } from "@/lib/countries";

export async function getCountry(): Promise<CountryCode> {
  const chosen = (await cookies()).get(COUNTRY_COOKIE)?.value;
  if (isCountry(chosen)) return chosen;

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
