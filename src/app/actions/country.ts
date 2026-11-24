"use server";
import { cookies } from "next/headers";
import { COUNTRY_COOKIE, isCountry } from "@/lib/countries";

/** Save the visitor's country, confirmed on first open (Settings uses changeCountry). */
export async function setCountry(formData: FormData) {
  const country = formData.get("country");
  if (!isCountry(country)) return;

  const jar = await cookies();
  if (isCountry(jar.get(COUNTRY_COOKIE)?.value)) return; // already chosen: no switching

  jar.set(COUNTRY_COOKIE, country, {
    path: "/",
    maxAge: 60 * 60 * 24 * 400, // the longest browsers allow
    sameSite: "lax",
  });
}

/** Settings > Change country (after an "Are you sure?"), for when detection was wrong. */
export async function changeCountry(country: string) {
  if (!isCountry(country)) return;
  (await cookies()).set(COUNTRY_COOKIE, country, { path: "/", maxAge: 60 * 60 * 24 * 400, sameSite: "lax" });
}
