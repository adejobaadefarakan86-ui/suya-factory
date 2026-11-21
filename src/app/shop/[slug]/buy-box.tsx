"use client";
import Link from "next/link";
import { useState } from "react";
import { SPICE_LABELS, type SpiceLevel } from "@/lib/spice";
import { cart, MAX_QTY } from "@/lib/cart";
import { formatMoney, type Currency } from "@/lib/money";

export type BuyBoxVariant = {
  id: string;
  sizeLabel: string;
  spiceLevel: SpiceLevel | null;
  price: number | null; // in kobo / pesewas; null = not sold in this country
};

const unique = <T,>(items: T[]) => [...new Set(items)];

const optionClass = (selected: boolean) =>
  `rounded-lg border px-4 py-2 text-sm font-semibold ${
    selected
      ? "border-orange-700 bg-orange-50 text-orange-800"
      : "border-stone-300 bg-white text-stone-700 hover:border-stone-400"
  }`;

export function BuyBox({
  productName,
  variants,
  currency,
  countryName,
  inSupermarkets = false,
  teamView = false,
}: {
  productName: string;
  variants: BuyBoxVariant[];
  currency: Currency;
  countryName: string;
  /** Sold through supermarkets in this country: show sizes, then "find a supermarket". */
  inSupermarkets?: boolean;
  /** Signed in with a team account: see everything, but no buying. */
  teamView?: boolean;
}) {
  const sizes = unique(variants.map((v) => v.sizeLabel));
  const [size, setSize] = useState(sizes[0]);
  const spices = unique(variants.filter((v) => v.sizeLabel === size).map((v) => v.spiceLevel));
  const [spice, setSpice] = useState<SpiceLevel | null>(spices[0] ?? null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  // If the chosen spice isn't offered in this size, fall back to the first one that is.
  const activeSpice = spices.includes(spice) ? spice : (spices[0] ?? null);
  const variant = variants.find((v) => v.sizeLabel === size && v.spiceLevel === activeSpice);

  function addToCart() {
    if (!variant || variant.price === null) return;
    cart.add(variant.id, quantity);
    setAdded(true);
  }

  if (inSupermarkets) {
    return (
      <div className="mt-6 space-y-4">
        <p className="text-sm text-stone-700">
          <span className="font-medium">Pack sizes:</span> {sizes.join(", ")}
        </p>
        <p className="text-stone-700">
          In {countryName}, {productName} is sold in supermarkets. Find the one nearest you, buy from them, and send a
          rider or pick it up yourself.
        </p>
        <Link href="/where-to-buy"
          className="block w-full rounded-lg bg-orange-700 px-4 py-3 text-center font-semibold text-white hover:bg-orange-800">
          📍 Find a supermarket near you
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-stone-700">Size</legend>
        <div className="flex flex-wrap gap-2">
          {sizes.map((s) => (
            <button key={s} type="button" aria-pressed={s === size} className={optionClass(s === size)}
              onClick={() => { setSize(s); setAdded(false); }}>
              {s}
            </button>
          ))}
        </div>
      </fieldset>

      {spices.some((s) => s !== null) && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-stone-700">Spice level</legend>
          <div className="flex flex-wrap gap-2">
            {spices.map((s) =>
              s === null ? null : (
                <button key={s} type="button" aria-pressed={s === activeSpice} className={optionClass(s === activeSpice)}
                  onClick={() => { setSpice(s); setAdded(false); }}>
                  {s === "hot" || s === "extra_hot" ? "🌶️ " : ""}{SPICE_LABELS[s]}
                </button>
              ),
            )}
          </div>
        </fieldset>
      )}

      <div className="flex items-end justify-between gap-4 border-t border-stone-200 pt-6">
        <div>
          <p className="text-sm text-stone-500">Price</p>
          <p className="text-3xl font-bold text-stone-900 tabular-nums">
            {variant?.price != null ? formatMoney(variant.price * quantity, currency) : "—"}
          </p>
          {quantity > 1 && variant?.price != null && (
            <p className="text-xs text-stone-500">{formatMoney(variant.price, currency)} each</p>
          )}
        </div>

        <div className="flex items-center rounded-lg border border-stone-300 bg-white" role="group" aria-label="Quantity">
          <button type="button" className="px-3 py-2 text-lg disabled:opacity-30" aria-label="One less"
            disabled={quantity <= 1} onClick={() => { setQuantity((q) => q - 1); setAdded(false); }}>−</button>
          <span className="w-8 text-center font-semibold tabular-nums" aria-live="polite">{quantity}</span>
          <button type="button" className="px-3 py-2 text-lg disabled:opacity-30" aria-label="One more"
            disabled={quantity >= MAX_QTY} onClick={() => { setQuantity((q) => q + 1); setAdded(false); }}>+</button>
        </div>
      </div>

      {teamView ? (
        <p className="rounded-lg bg-stone-100 p-3 text-center text-sm font-medium text-stone-600">
          👀 Team view: this is what customers see. Ordering is off for team accounts.
        </p>
      ) : variant?.price == null ? (
        <p className="rounded-lg bg-stone-100 p-3 text-sm text-stone-700">
          This option isn&apos;t available in {countryName} yet.
        </p>
      ) : (
        <button type="button" onClick={addToCart}
          className="w-full rounded-lg bg-orange-700 px-4 py-3 font-semibold text-white hover:bg-orange-800">
          Add to cart
        </button>
      )}

      {added && (
        <p role="status" className="flex items-center justify-between rounded-lg bg-green-50 p-3 text-sm text-green-900">
          <span>Added {quantity} × {productName} to your cart.</span>
          <Link href="/cart" className="font-semibold underline">View cart</Link>
        </p>
      )}
    </div>
  );
}
