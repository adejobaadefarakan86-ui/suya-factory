import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { getCatalog } from "@/lib/catalog";
import { getCountry } from "@/lib/country";
import { COUNTRIES } from "@/lib/countries";
import { createPublicClient } from "@/lib/supabase/public";
import { SELLS_VIA_SUPERMARKETS, STORE_FIELDS, toStore, type StoreRow } from "@/lib/stores";
import { StoreFinder } from "./store-finder";

export const metadata = { title: "Where to buy · Suya Factory" };

export default function WhereToBuyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-bold text-stone-900">Where to buy</h1>
      <Suspense fallback={<div className="mt-6 h-96 animate-pulse rounded-2xl bg-stone-200" />}>
        <Finder />
      </Suspense>
    </main>
  );
}

async function Finder() {
  const country = await getCountry();

  if (!SELLS_VIA_SUPERMARKETS[country]) {
    return (
      <p className="mt-3 text-stone-700">
        In {COUNTRIES[country].name}, order online and we deliver to you.{" "}
        <Link href="/shop" className="font-semibold text-orange-700 underline">Go to the shop</Link>
      </p>
    );
  }

  // Stock changes during the day: always read it fresh.
  await connection();
  const [{ data, error }, catalog] = await Promise.all([
    createPublicClient()
      .from("stores")
      .select(STORE_FIELDS)
      .eq("country", country)
      .eq("active", true)
      .order("name"),
    getCatalog(),
  ]);
  if (error) throw new Error(`Could not load supermarkets: ${error.message}`);

  // Pack sizes sold in this country, to tell customers what to ask for ("Small pack · 50g or Big pack · 100g").
  const { currency } = COUNTRIES[country];
  const sizes = [...new Set(catalog.flatMap((p) => p.variants.filter((v) => v.prices[currency] !== undefined).map((v) => v.sizeLabel)))];
  const askFor = sizes.length ? sizes.join(" or ") : "any pack size";

  return (
    <>
      <p className="mt-2 text-stone-700">
        In Nigeria, our beef kilishi is sold in supermarkets. Find the nearest one, buy from them, and send your own
        rider to pick it up, or go and get it yourself.
      </p>
      <p className="mt-2 text-sm text-stone-600">
        Buying 1kg or more?{" "}
        <Link href="/bulk-orders" className="font-semibold text-orange-700 underline">Order wholesale directly from us</Link>.
      </p>
      <StoreFinder stores={((data ?? []) as StoreRow[]).map(toStore)} askFor={askFor} />
    </>
  );
}
