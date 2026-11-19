import { Suspense } from "react";
import { getCatalog, variantLabel } from "@/lib/catalog";
import { getCountry } from "@/lib/country";
import { COUNTRIES } from "@/lib/countries";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CartItemInfo } from "../cart/cart-view";
import { CheckoutForm } from "./checkout-form";

export const metadata = { title: "Checkout · Suya Factory", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-bold text-stone-900">Checkout</h1>
      <Suspense fallback={<div className="mt-6 h-96 animate-pulse rounded-2xl bg-stone-200" />}>
        <PricedCheckout />
      </Suspense>
    </main>
  );
}

async function PricedCheckout() {
  const [catalog, country, user] = await Promise.all([getCatalog(), getCountry(), getCurrentUser()]);
  const { currency, name: countryName } = COUNTRIES[country];

  // Today's names and prices for every variant, in this visitor's currency.
  const items: Record<string, CartItemInfo> = {};
  for (const product of catalog) {
    for (const v of product.variants) {
      items[v.id] = {
        productName: product.name,
        productSlug: product.slug,
        label: variantLabel(v),
        price: v.prices[currency] ?? null,
        grams: v.grams,
      };
    }
  }

  // Logged-in customers get their details filled in for them.
  let phone = "";
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase.from("profiles").select("phone").eq("id", user.id).single();
    phone = data?.phone ?? "";
  }

  return (
    <CheckoutForm
      items={items}
      country={country}
      countryName={countryName}
      currency={currency}
      defaults={{ name: user?.fullName ?? "", email: user?.email ?? "", phone }}
      loggedIn={!!user}
    />
  );
}
