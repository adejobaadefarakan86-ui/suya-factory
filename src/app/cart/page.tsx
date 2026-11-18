import { Suspense } from "react";
import { getCatalog, variantLabel } from "@/lib/catalog";
import { getCountry } from "@/lib/country";
import { COUNTRIES } from "@/lib/countries";
import { CartView, type CartItemInfo } from "./cart-view";

export const metadata = { title: "Your cart · Suya Factory" };

export default function CartPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-bold text-stone-900">Your cart</h1>
      <Suspense fallback={<div className="mt-6 h-48 animate-pulse rounded-2xl bg-stone-200" />}>
        <PricedCart />
      </Suspense>
    </main>
  );
}

// The cart itself lives in the browser; the server supplies today's names
// and prices in the visitor's currency for every variant.
async function PricedCart() {
  const [catalog, country] = await Promise.all([getCatalog(), getCountry()]);
  const { currency, name } = COUNTRIES[country];

  const items: Record<string, CartItemInfo> = {};
  for (const product of catalog) {
    for (const v of product.variants) {
      items[v.id] = {
        productName: product.name,
        productSlug: product.slug,
        label: variantLabel(v),
        price: v.prices[currency] ?? null,
      };
    }
  }

  return <CartView items={items} currency={currency} countryName={name} />;
}
