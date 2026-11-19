"use client";
import Link from "next/link";
import { cart, MAX_QTY, useCartLines, usePruneCart } from "@/lib/cart";
import { formatMoney, type Currency } from "@/lib/money";
import { BulkNotice, BULK_MIN_GRAMS, cartGrams } from "@/components/bulk-notice";

export type CartItemInfo = {
  productName: string;
  productSlug: string;
  label: string;
  price: number | null; // null = not sold in this country
  grams: number;
};

export function CartView({
  items,
  currency,
  countryName,
}: {
  items: Record<string, CartItemInfo>;
  currency: Currency;
  countryName: string;
}) {
  const lines = useCartLines();
  usePruneCart(Object.keys(items)); // remove discontinued items from the browser's cart

  // Skip anything that's no longer on sale (e.g. a product was removed).
  const rows = lines
    .map((line) => ({ ...line, info: items[line.variantId] }))
    .filter((row) => row.info !== undefined);

  const unavailable = rows.filter((r) => r.info.price === null);
  const subtotal = rows.reduce((sum, r) => sum + (r.info.price ?? 0) * r.quantity, 0);
  const grams = cartGrams(rows);
  const bulk = grams >= BULK_MIN_GRAMS;

  if (rows.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-8 text-center">
        <p className="text-stone-600">Your cart is empty.</p>
        <Link href="/shop" className="mt-4 inline-block rounded-lg bg-orange-700 px-5 py-2.5 font-semibold text-white hover:bg-orange-800">
          Browse the shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
        {rows.map(({ variantId, quantity, info }) => (
          <li key={variantId} className="flex flex-wrap items-center gap-4 p-4">
            <div className="min-w-40 flex-1">
              <Link href={`/shop/${info.productSlug}`} className="font-semibold text-stone-900 hover:text-orange-700">
                {info.productName}
              </Link>
              <p className="text-sm text-stone-600">{info.label}</p>
              {info.price === null && (
                <p className="text-xs font-medium text-red-700">Not available in {countryName}</p>
              )}
            </div>

            <div className="flex items-center rounded-lg border border-stone-300" role="group" aria-label={`Quantity of ${info.productName}`}>
              <button type="button" className="px-3 py-1 text-lg" aria-label="One less"
                onClick={() => cart.setQuantity(variantId, quantity - 1)}>−</button>
              <span className="w-8 text-center tabular-nums">{quantity}</span>
              <button type="button" className="px-3 py-1 text-lg disabled:opacity-30" aria-label="One more"
                disabled={quantity >= MAX_QTY} onClick={() => cart.setQuantity(variantId, quantity + 1)}>+</button>
            </div>

            <p className="w-28 text-right font-semibold tabular-nums">
              {info.price !== null ? formatMoney(info.price * quantity, currency) : "—"}
            </p>

            <button type="button" onClick={() => cart.remove(variantId)}
              className="text-sm text-stone-500 hover:text-red-700">
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <div className="flex justify-between text-lg">
          <span>Subtotal</span>
          <span className="font-bold tabular-nums">{formatMoney(subtotal, currency)}</span>
        </div>
        <p className="mt-1 text-sm text-stone-500">Delivery fee is calculated at checkout.</p>

        {unavailable.length > 0 && (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Some items aren&apos;t available in {countryName}. Remove them to continue.
          </p>
        )}

        {bulk && (
          <div className="mt-4">
            <BulkNotice reason="weight" grams={grams} />
          </div>
        )}

        {unavailable.length > 0 || bulk ? (
          <button type="button" disabled
            className="mt-4 w-full cursor-not-allowed rounded-lg bg-stone-300 px-4 py-3 font-semibold text-stone-600">
            Go to checkout
          </button>
        ) : (
          <Link href="/checkout"
            className="mt-4 block w-full rounded-lg bg-orange-700 px-4 py-3 text-center font-semibold text-white hover:bg-orange-800">
            Go to checkout
          </Link>
        )}
      </div>
    </div>
  );
}
