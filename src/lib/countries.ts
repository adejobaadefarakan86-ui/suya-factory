// Shared by server and browser code.
import type { Currency } from "@/lib/money";

export const COUNTRIES = {
  NG: { name: "Nigeria", currency: "NGN", symbol: "₦" },
  GH: { name: "Ghana", currency: "GHS", symbol: "GH₵" },
} as const satisfies Record<string, { name: string; currency: Currency; symbol: string }>;

export type CountryCode = keyof typeof COUNTRIES;

export const COUNTRY_COOKIE = "sf_country";

export function isCountry(value: unknown): value is CountryCode {
  return value === "NG" || value === "GH";
}
