"use server";
import { cookies } from "next/headers";
import { COUNTRY_COOKIE, isCountry } from "@/lib/countries";

/** Remember the visitor's country for a year. The page re-renders with the new currency. */
export async function setCountry(formData: FormData) {
  const country = formData.get("country");
  if (!isCountry(country)) return;

  (await cookies()).set(COUNTRY_COOKIE, country, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
