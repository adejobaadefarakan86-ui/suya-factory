import { Suspense } from "react";
import { ProductGrid, ProductGridSkeleton } from "@/components/product-grid";

export const metadata = { title: "Shop · Suya Factory" };

export default function ShopPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Shop</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">Spicy beef kilishi</h1>
      <p className="mb-10 mt-3 max-w-xl leading-relaxed text-muted">
        Small pack or big pack. Need 1kg or more?{" "}
        <a href="/bulk-orders" className="font-medium text-accent-strong underline-offset-4 hover:underline">Ask about bulk orders</a>.
      </p>
      <Suspense fallback={<ProductGridSkeleton />}>
        <ProductGrid />
      </Suspense>
    </main>
  );
}
