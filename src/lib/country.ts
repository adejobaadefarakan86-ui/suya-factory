// Which country is this visitor shopping in? (Server only.)
// 1. Their own choice, saved in a cookie.
// 2. Otherwise, where they are browsing from (Vercel adds this header once the site is live).
// 3. Otherwise, Nigeria.
import { cookies, headers } from "next/headers";
import { COUNTRY_COOKIE, isCountry, type CountryCode } from "@/lib/countries";

export async function getCountry(): Promise<CountryCode> {
  const chosen = (await cookies()).get(COUNTRY_COOKIE)?.value;
  if (isCountry(chosen)) return chosen;

  const detected = (await headers()).get("x-vercel-ip-country");
  return detected === "GH" ? "GH" : "NG";
}
