import Link from "next/link";
import { Suspense } from "react";
import { ProductGrid, ProductGridSkeleton } from "@/components/product-grid";

export default function HomePage() {
  return (
    <main className="flex-1">
      <section className="bg-gradient-to-br from-stone-900 via-red-950 to-orange-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <p className="text-sm font-semibold uppercase tracking-widest text-orange-300">
            Nigeria · Ghana
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold leading-tight sm:text-6xl">
            Authentic suya, flame-grilled and delivered.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-stone-200">
            Thin-sliced beef, chicken and ram, rubbed in our house yaji and grilled over open flame.
          </p>
          <Link
            href="/shop"
            className="mt-8 inline-block rounded-lg bg-orange-600 px-6 py-3 font-semibold text-white hover:bg-orange-500"
          >
            Shop now
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="mb-6 text-2xl font-bold text-stone-900">Our menu</h2>
        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductGrid />
        </Suspense>
      </section>

      <section className="border-t border-stone-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:grid-cols-3">
          <div>
            <h3 className="font-semibold text-stone-900">1. Pick your suya</h3>
            <p className="mt-1 text-sm text-stone-600">Choose the size and how hot you like it.</p>
          </div>
          <div>
            <h3 className="font-semibold text-stone-900">2. Pay securely</h3>
            <p className="mt-1 text-sm text-stone-600">In Naira or Cedis, by card, bank or mobile money.</p>
          </div>
          <div>
            <h3 className="font-semibold text-stone-900">3. We deliver</h3>
            <p className="mt-1 text-sm text-stone-600">Same day in Lagos. Across Nigeria and to Ghana.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
