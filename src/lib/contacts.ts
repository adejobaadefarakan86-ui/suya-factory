// Business contact numbers for bulk & custom orders, per country.
// Numbers are stored as digits with the country code (what WhatsApp links need).
import type { CountryCode } from "@/lib/countries";

export const BULK_MIN_KG = 1;

// "phones": numbers customers can call (either one). Ghana calls go to a different number from WhatsApp on purpose.
export const CONTACTS: Record<CountryCode, { whatsapp: string; phones: string[] }> = {
  NG: { whatsapp: "2349132654740", phones: ["2349132654740", "2347080807300"] },
  GH: { whatsapp: "233530515656", phones: ["233545809740"] },
};

const BULK_MESSAGE =
  "Hi Suya Factory! I'd like to make a bulk order of Beef Kilishi (1kg or more).";

export function whatsappLink(digits: string, message: string = BULK_MESSAGE) {
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/**
 * A customer's typed phone number -> international digits for WhatsApp/calls.
 * "0803 000 0000" (NG) -> "2348030000000";  "+233 24 123 4567" -> "233241234567"
 */
export function toInternationalDigits(phone: string, country: "NG" | "GH") {
  const digits = phone.replace(/\D/g, "");
  if (phone.trim().startsWith("+")) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return (country === "NG" ? "234" : "233") + digits.slice(1);
  return digits;
}

export function telLink(digits: string) {
  return `tel:+${digits}`;
}

/** "2349132654740" -> "+234 913 265 4740";  "233530515656" -> "+233 53 051 5656" */
export function formatPhone(digits: string) {
  if (digits.startsWith("234")) {
    const r = digits.slice(3);
    return `+234 ${r.slice(0, 3)} ${r.slice(3, 6)} ${r.slice(6)}`;
  }
  if (digits.startsWith("233")) {
    const r = digits.slice(3);
    return `+233 ${r.slice(0, 2)} ${r.slice(2, 5)} ${r.slice(5)}`;
  }
  return `+${digits}`;
}

/** "2348121023991" / "+233 53 051 5656" -> "08121023991" / "0530515656" (what local apps expect). */
export function localPhone(raw: string) {
  const d = raw.replace(/\D/g, "");
  if (d.startsWith("234") || d.startsWith("233")) return "0" + d.slice(3);
  return d;
}

/** "Golden Choice Supermarket – Ikeja" -> "Golden Choice Supermarket Ikeja": delivery apps (Bolt) reject symbols in names. */
export function plainName(name: string) {
  return name.replace(/[^\p{L}\p{N} ]+/gu, " ").replace(/\s+/g, " ").trim();
}
