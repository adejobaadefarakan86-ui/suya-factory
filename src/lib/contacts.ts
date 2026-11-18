// Business contact numbers for bulk & custom orders, per country.
// Numbers are stored as digits with the country code (what WhatsApp links need).
import type { CountryCode } from "@/lib/countries";

export const BULK_MIN_KG = 1;

export const CONTACTS: Record<CountryCode, { whatsapp: string; phone: string }> = {
  NG: { whatsapp: "2349132654740", phone: "2349132654740" },
  GH: { whatsapp: "233530515656", phone: "233545809740" },
};

const BULK_MESSAGE =
  "Hi Suya Factory! I'd like to make a bulk order of Beef Kilishi (1kg or more).";

export function whatsappLink(digits: string) {
  return `https://wa.me/${digits}?text=${encodeURIComponent(BULK_MESSAGE)}`;
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
