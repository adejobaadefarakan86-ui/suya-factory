"use server";
import { cookies } from "next/headers";
import { COUNTRY_COOKIE, isCountry } from "@/lib/countries";

/** Save the visitor's country, chosen once on first open. It can't be changed afterwards. */
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
