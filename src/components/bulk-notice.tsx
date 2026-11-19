import Link from "next/link";
import { BULK_MIN_KG } from "@/lib/contacts";

export const BULK_MIN_GRAMS = BULK_MIN_KG * 1000;

/** Total weight of cart lines, in grams. */
export function cartGrams(rows: { quantity: number; info: { grams: number } }[]) {
  return rows.reduce((sum, r) => sum + r.info.grams * r.quantity, 0);
}

const kg = (grams: number) => `${(grams / 1000).toLocaleString("en", { maximumFractionDigits: 1 })}kg`;

/**
 * Shown instead of checkout when a regular order would be 1kg+ (a bulk order),
 * or when the delivery pin is outside our delivery region (Lagos State / Greater Accra).
 */
export function BulkNotice({ reason, grams, area }: { reason: "weight" | "outside_area"; grams?: number; area?: string }) {
  return (
    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-orange-950">
      <p className="font-semibold">
        {reason === "weight" ? `${kg(grams ?? 0)} is a bulk order` : `This address is outside ${area}`}
      </p>
      <p className="mt-1 text-sm text-orange-900">
        {reason === "weight"
          ? `Orders of ${BULK_MIN_KG}kg and above get bulk pricing and are arranged with our team directly. Reduce your cart below ${BULK_MIN_KG}kg, or send us a bulk request.`
          : `Regular orders are delivered within ${area} only. For delivery outside ${area}, send us a bulk order request (${BULK_MIN_KG}kg and above) and we'll arrange it with you.`}
      </p>
      <Link
        href="/bulk-orders"
        className="mt-4 inline-block rounded-full bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-stone-800"
      >
        Request a bulk order
      </Link>
    </div>
  );
}
