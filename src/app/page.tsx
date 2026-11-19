import Link from "next/link";
import { Suspense } from "react";
import { ProductGrid, ProductGridSkeleton } from "@/components/product-grid";
import { getCountry } from "@/lib/country";
import { SELLS_VIA_SUPERMARKETS } from "@/lib/stores";

export default function HomePage() {
  return (
    <main className="flex-1">
      <section className="bg-gradient-to-br from-stone-900 via-red-950 to-orange-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <p className="text-sm font-semibold uppercase tracking-widest text-orange-300">
            Nigeria · Ghana
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold leading-tight sm:text-6xl">
            Spicy beef kilishi, delivered.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-stone-200">
            A satisfying mix of soft and crunchy, prepared in a clean, hygienic kitchen and professionally
            packaged for freshness. Definitely not your ordinary kilishi!
          </p>
          <Suspense fallback={<ShopNowButton />}>
            <HeroButton />
          </Suspense>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="mb-6 text-2xl font-bold text-stone-900">Our kilishi</h2>
        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductGrid />
        </Suspense>
      </section>

      <section className="border-t border-stone-200 bg-white">
        <Suspense fallback={<div className="h-40" />}>
          <HowItWorks />
        </Suspense>
      </section>
    </main>
  );
}

function ShopNowButton() {
  return (
    <Link href="/shop" className="mt-8 inline-block rounded-lg bg-orange-600 px-6 py-3 font-semibold text-white hover:bg-orange-500">
      Shop now
    </Link>
  );
}

// The main button and the "how it works" steps depend on the visitor's country (a cookie).
async function HeroButton() {
  if (!SELLS_VIA_SUPERMARKETS[await getCountry()]) return <ShopNowButton />;
  return (
    <Link href="/where-to-buy" className="mt-8 inline-block rounded-lg bg-orange-600 px-6 py-3 font-semibold text-white hover:bg-orange-500">
      📍 Find a supermarket near you
    </Link>
  );
}

async function HowItWorks() {
  const steps = SELLS_VIA_SUPERMARKETS[await getCountry()]
    ? [
        ["1. Find a supermarket", "We show you the nearest supermarket that has our kilishi in stock."],
        ["2. Buy from them", "Call or WhatsApp the supermarket, pay them, and they keep your pack ready."],
        ["3. Send a rider", "Book a rider with a delivery app and we write the pickup message for you. Or pick it up yourself."],
      ]
    : [
        ["1. Pick your pack", "Small pack or big pack."],
        ["2. Pay securely", "Card, bank transfer or USSD. Ghana mobile money coming soon."],
        ["3. We deliver", "Inside Greater Accra."],
      ];
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:grid-cols-3">
      {steps.map(([title, text]) => (
        <div key={title}>
          <h3 className="font-semibold text-stone-900">{title}</h3>
          <p className="mt-1 text-sm text-stone-600">{text}</p>
        </div>
      ))}
      <p className="text-sm text-stone-600 sm:col-span-3">
        Need 1kg or more?{" "}
        <Link href="/bulk-orders" className="font-medium text-orange-700 hover:underline">Ask about bulk orders</Link>.
      </p>
    </div>
  );
}
