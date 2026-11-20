export type Currency = "NGN" | "GHS";

/**
 * 850000 (kobo) -> "₦8,500"; 10000 (pesewas) -> "GH₵100"; 12550 -> "GH₵125.50".
 * Whole amounts are shown without ".00" (easier to read); amounts with coins keep them.
 */
export function formatMoney(amountMinor: number, currency: Currency) {
  const whole = amountMinor % 100 === 0;
  return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-GH", {
    style: "currency",
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}
