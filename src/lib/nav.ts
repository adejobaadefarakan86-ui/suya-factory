// Main links of the customer site (top bar on computers, menu on phones).
// "Where to buy" (supermarkets) only where we sell through supermarkets.
import type { CountryCode } from "@/lib/countries";
import { SELLS_VIA_SUPERMARKETS } from "@/lib/stores";

export type NavLink = { href: string; label: string };

export function navLinks(country: CountryCode): NavLink[] {
  return [
    { href: "/shop", label: "Shop" },
    ...(SELLS_VIA_SUPERMARKETS[country] ? [{ href: "/where-to-buy", label: "Where to buy" }] : []),
    { href: "/bulk-orders", label: "Custom orders" },
  ];
}
