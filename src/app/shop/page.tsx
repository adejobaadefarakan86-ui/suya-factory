import { Suspense } from "react";
import { ProductGrid, ProductGridSkeleton } from "@/components/product-grid";

export const metadata = { title: "Shop · Suya Factory" };

export default function ShopPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-bold text-stone-900">Shop</h1>
      <p className="mt-1 mb-8 text-stone-600">
        Spicy beef kilishi in small and big packs. Need 1kg or more? Ask us about bulk orders.
      </p>
      <Suspense fallback={<ProductGridSkeleton />}>
        <ProductGrid />
      </Suspense>
    </main>
  );
}
