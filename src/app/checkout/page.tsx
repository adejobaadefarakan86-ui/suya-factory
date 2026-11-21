import { Suspense } from "react";
import { getCatalog, variantLabel } from "@/lib/catalog";
import { getCountry } from "@/lib/country";
import { COUNTRIES } from "@/lib/countries";
import { SELLS_VIA_SUPERMARKETS } from "@/lib/stores";
import { SupermarketNotice } from "@/components/supermarket-notice";
import Link from "next/link";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CartItemInfo } from "../cart/cart-view";
import { CheckoutForm } from "./checkout-form";

export const metadata = { title: "Checkout · Suya Factory", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-bold text-ink">Checkout</h1>
      <Suspense fallback={<div className="mt-6 h-96 animate-pulse rounded-2xl bg-cream" />}>
        <PricedCheckout />
      </Suspense>
    </main>
  );
}

async function PricedCheckout() {
  if (SELLS_VIA_SUPERMARKETS[await getCountry()]) return <SupermarketNotice />;
  const [catalog, country, user] = await Promise.all([getCatalog(), getCountry(), getCurrentUser()]);
  const { currency, name: countryName } = COUNTRIES[country];
  if (isStaff(user)) return <TeamAccountNotice />;

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

/** Team accounts don't order (it would mix staff and customer records). */
function TeamAccountNotice() {
  return (
    <div className="mt-6 max-w-xl rounded-2xl bg-amber-50 p-5 text-amber-950">
      <p className="font-semibold">You&apos;re signed in with a team account.</p>
      <p className="mt-1 text-sm">
        Team accounts can&apos;t place orders. To order (or test an order), log out first and order as a guest, or use a
        customer account.
      </p>
      <Link href="/account" className="mt-3 inline-block text-sm font-semibold text-accent-strong underline">Go to my account to log out</Link>
    </div>
  );
}
