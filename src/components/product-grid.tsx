import Link from "next/link";
import { getCatalog, lowestPrice, variantLabel } from "@/lib/catalog";
import { getCountry } from "@/lib/country";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { COUNTRIES } from "@/lib/countries";
import { formatMoney } from "@/lib/money";
import { ProductImage } from "@/components/product-image";
import { SELLS_VIA_SUPERMARKETS } from "@/lib/stores";

/**
 * Our products as clear "product panels": photo, name, short description, the
 * pack sizes with prices, and obvious buttons (team feedback: people didn't
 * know the old small card was clickable).
 * Reads the country cookie, so always render it inside <Suspense>.
 */
export async function ProductGrid() {
  const [catalog, country, user] = await Promise.all([getCatalog(), getCountry(), getCurrentUser()]);
  const teamView = isStaff(user);
  const { currency } = COUNTRIES[country];
  const viaSupermarkets = SELLS_VIA_SUPERMARKETS[country];

  // Only show products sold in this visitor's country.
  const products = catalog.filter((p) => lowestPrice(p, currency) !== null);

  if (products.length === 0) {
    return <p className="text-stone-600">No products yet. Check back soon!</p>;
  }

  return (
    <ul className="space-y-6">
      {products.map((product, i) => {
        const href = `/shop/${product.slug}`;
        const packs = product.variants
          .filter((v) => v.prices[currency] !== undefined)
          .sort((a, b) => a.grams - b.grams);
        return (
          <li key={product.id}
            className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <Link href={href} aria-label={`${product.name}: see details`} className="block md:h-full">
              <ProductImage name={product.name} src={product.imageUrls[0]} index={i}
                className="md:aspect-auto md:h-full md:min-h-80"
                sizes="(min-width: 768px) 460px, 100vw" />
            </Link>

            <div className="flex flex-col p-5 sm:p-7">
              {product.category?.name && (
                <p className="text-xs font-semibold uppercase tracking-widest text-orange-700">{product.category.name}</p>
              )}
              <h3 className="mt-1 text-2xl font-extrabold text-stone-900 sm:text-3xl">
                <Link href={href} className="hover:text-orange-700">{product.name}</Link>
              </h3>
              {product.description && <p className="mt-2 line-clamp-3 text-stone-600">{product.description}</p>}

              <p className="mt-5 text-sm font-semibold text-stone-700">
                {viaSupermarkets ? "Packs in supermarkets" : "Choose your pack"}
              </p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {packs.map((v) => (
                  <li key={v.id}>
                    <Link href={href}
                      className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 px-4 py-3 hover:border-orange-400 hover:bg-orange-50">
                      <span className="font-medium text-stone-900">{variantLabel(v)}</span>
                      <span className="font-bold text-stone-900 tabular-nums">{formatMoney(v.prices[currency]!, currency)}</span>
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                {viaSupermarkets ? (
                  <Link href="/where-to-buy"
                    className="rounded-xl bg-orange-700 px-6 py-3.5 text-center text-lg font-bold text-white shadow-sm hover:bg-orange-800">
                    📍 Find a supermarket near you
                  </Link>
                ) : (
                  <Link href={href}
                    className="rounded-xl bg-orange-700 px-6 py-3.5 text-center text-lg font-bold text-white shadow-sm hover:bg-orange-800">
                    {teamView ? "See the product →" : <>Choose pack &amp; order →</>}
                  </Link>
                )}
                <Link href={href}
                  className="rounded-xl border-2 border-stone-300 px-6 py-3 text-center font-semibold text-stone-800 hover:border-stone-500">
                  See details
                </Link>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ProductGridSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white md:grid md:grid-cols-[5fr_6fr]" aria-busy="true">
      <div className="aspect-[4/3] animate-pulse bg-stone-200" />
      <div className="space-y-3 p-7">
        <div className="h-3 w-20 animate-pulse rounded bg-stone-200" />
        <div className="h-7 w-48 animate-pulse rounded bg-stone-200" />
        <div className="h-4 w-full animate-pulse rounded bg-stone-200" />
        <div className="grid gap-2 pt-4 sm:grid-cols-2">
          <div className="h-12 animate-pulse rounded-xl bg-stone-100" />
          <div className="h-12 animate-pulse rounded-xl bg-stone-100" />
        </div>
        <div className="h-12 w-56 animate-pulse rounded-xl bg-stone-200" />
      </div>
    </div>
  );
}
