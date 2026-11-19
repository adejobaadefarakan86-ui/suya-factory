import Link from "next/link";
import { getCatalog, lowestPrice } from "@/lib/catalog";
import { getCountry } from "@/lib/country";
import { COUNTRIES } from "@/lib/countries";
import { formatMoney } from "@/lib/money";
import { ProductImage } from "@/components/product-image";
import { SELLS_VIA_SUPERMARKETS } from "@/lib/stores";

/** Product cards with "From" prices in the visitor's currency.
 *  Reads the country cookie, so always render it inside <Suspense>. */
export async function ProductGrid() {
  const [catalog, country] = await Promise.all([getCatalog(), getCountry()]);
  const { currency } = COUNTRIES[country];

  // Only show products sold in this visitor's country.
  const products = catalog.filter((p) => lowestPrice(p, currency) !== null);

  if (products.length === 0) {
    return <p className="text-stone-600">No products yet. Check back soon!</p>;
  }

  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product, i) => {
        const from = lowestPrice(product, currency)!;
        return (
          <li key={product.id}>
            <Link
              href={`/shop/${product.slug}`}
              className="group block overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <ProductImage name={product.name} index={i} />
              <div className="p-4">
                <p className="text-xs uppercase tracking-wide text-stone-500">{product.category?.name}</p>
                <h3 className="font-semibold text-stone-900 group-hover:text-orange-700">{product.name}</h3>
                {SELLS_VIA_SUPERMARKETS[country] ? (
                  <p className="mt-1 text-sm text-stone-700">In supermarkets near you</p>
                ) : (
                  <p className="mt-1 text-sm text-stone-700">
                    From <span className="font-semibold">{formatMoney(from, currency)}</span>
                  </p>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function ProductGridSkeleton() {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
      {Array.from({ length: 4 }, (_, i) => (
        <li key={i} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <div className="aspect-[4/3] animate-pulse bg-stone-200" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-16 animate-pulse rounded bg-stone-200" />
            <div className="h-4 w-28 animate-pulse rounded bg-stone-200" />
          </div>
        </li>
      ))}
    </ul>
  );
}
