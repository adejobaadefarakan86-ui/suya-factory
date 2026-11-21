import Link from "next/link";
import { getCatalog, lowestPrice, variantLabel } from "@/lib/catalog";
import { getCountry } from "@/lib/country";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { COUNTRIES } from "@/lib/countries";
import { formatMoney } from "@/lib/money";
import { FOOD_INFO } from "@/lib/business";
import { ProductImage } from "@/components/product-image";
import { AddPackButton } from "@/components/add-pack-button";
import { SELLS_VIA_SUPERMARKETS } from "@/lib/stores";
import { Chilli, Flame } from "@/components/doodles";

/**
 * Our products as clear "product panels": photo, name, short description, the
 * pack sizes with prices, and obvious buttons. Ghana: "Add to cart" on each
 * pack. Nigeria: packs are bought in supermarkets, so "Find a supermarket".
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
    return <p className="text-muted">No products yet. Check back soon!</p>;
  }

  return (
    <ul className="space-y-8">
      {products.map((product, i) => {
        const href = `/shop/${product.slug}`;
        const packs = product.variants
          .filter((v) => v.prices[currency] !== undefined)
          .sort((a, b) => a.grams - b.grams);
        return (
          <li key={product.id}
            className="overflow-hidden rounded-[1.5rem] border border-line bg-surface md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {/* The photo sits inside the card with a margin, never edge to edge. */}
            <Link href={href} aria-label={`${product.name}: see details`} className="group relative block p-3 md:h-full">
              <span className="block overflow-hidden rounded-[1.1rem] md:h-full">
                <ProductImage name={product.name} src={product.imageUrls[0]} index={i}
                  className="transition duration-700 group-hover:scale-[1.03] md:aspect-auto md:h-full md:min-h-96"
                  sizes="(min-width: 768px) 540px, 92vw" />
              </span>
              <span className="absolute right-7 top-7 grid h-11 w-11 place-items-center rounded-full bg-night/85 text-sun">
                <Flame className="flicker h-6 w-5" />
              </span>
            </Link>

            <div className="flex flex-col p-6 sm:p-9">
              {product.category?.name && (
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{product.category.name}</p>
              )}
              <h3 className="mt-2 flex items-center gap-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                <Link href={href} className="transition hover:text-accent">{product.name}</Link>
                <Chilli className="h-8 w-8 shrink-0 text-accent" />
              </h3>
              {product.description && <p className="mt-3 line-clamp-3 leading-relaxed text-muted">{product.description}</p>}

              <p className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
                <span className="rounded-lg bg-cream px-2.5 py-1 text-ink">Contains {FOOD_INFO.allergens.toLowerCase()}</span>
              </p>

              <p className="mt-6 text-sm font-medium text-muted">
                {viaSupermarkets ? "Packs in supermarkets" : "Choose your pack"}
              </p>
              <ul className="mt-2 divide-y divide-line rounded-2xl border border-line">
                {packs.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="min-w-0">
                      <span className="block font-medium text-ink">{variantLabel(v)}</span>
                      <span className="block font-display text-lg font-semibold tabular-nums text-ink">{formatMoney(v.prices[currency]!, currency)}</span>
                    </span>
                    {!viaSupermarkets && !teamView && <AddPackButton variantId={v.id} label={variantLabel(v)} />}
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                {viaSupermarkets ? (
                  <Link href="/where-to-buy" className="btn btn-primary px-6 py-3.5 text-base">Find a supermarket near you</Link>
                ) : null}
                <Link href={href} className="btn btn-ghost px-6 py-3.5 text-base">
                  {teamView ? "See the product" : "See details"}
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
    <div className="overflow-hidden rounded-[1.5rem] border border-line bg-surface md:grid md:grid-cols-2" aria-busy="true">
      <div className="aspect-[4/3] animate-pulse bg-cream" />
      <div className="space-y-3 p-9">
        <div className="h-3 w-20 animate-pulse rounded bg-cream" />
        <div className="h-8 w-56 animate-pulse rounded bg-cream" />
        <div className="h-4 w-full animate-pulse rounded bg-cream" />
        <div className="h-28 w-full animate-pulse rounded-2xl bg-cream" />
        <div className="h-12 w-48 animate-pulse rounded-xl bg-cream" />
      </div>
    </div>
  );
}
