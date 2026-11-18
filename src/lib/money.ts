export type Currency = "NGN" | "GHS";

/** 850000 (kobo) -> "₦8,500.00"; 10000 (pesewas) -> "GH₵100.00" */
export function formatMoney(amountMinor: number, currency: Currency) {
  return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-GH", {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}
