import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCatalog, getProduct } from "@/lib/catalog";
import { getCountry } from "@/lib/country";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { BUSINESS, FOOD_INFO } from "@/lib/business";
import { COUNTRIES } from "@/lib/countries";
import { SELLS_VIA_SUPERMARKETS } from "@/lib/stores";
import { ProductImage } from "@/components/product-image";
import { BuyBox, type BuyBoxVariant } from "./buy-box";

// Build a page for every product ahead of time. Products added later are
// built on their first visit.
export async function generateStaticParams() {
  const catalog = await getCatalog();
  return catalog.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(props: PageProps<"/shop/[slug]">) {
  const { slug } = await props.params;
  const product = await getProduct(slug);
  return { title: product ? `${product.name} · Suya Factory` : "Product not found · Suya Factory" };
}

export default function ProductPage(props: PageProps<"/shop/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-12">
      <Link href="/shop" className="text-sm text-muted hover:text-accent-strong">
        ← Back to shop
      </Link>
      <Suspense fallback={<div className="mt-6 h-96 animate-pulse rounded-2xl bg-cream" />}>
        <ProductDetail params={props.params} />
      </Suspense>
    </main>
  );
}

async function ProductDetail({ params }: { params: PageProps<"/shop/[slug]">["params"] }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const catalog = await getCatalog();
  const index = catalog.findIndex((p) => p.id === product.id);

  return (
    <div className="mt-6 grid gap-10 md:grid-cols-[1.1fr_1fr] lg:gap-14">
      <div>
        <ProductImage name={product.name} src={product.imageUrls[0]} index={index} className="rounded-[1.5rem]"
          sizes="(min-width: 768px) 600px, 100vw" priority />
        {product.imageUrls.length > 1 && (
          <ul className="mt-3 grid grid-cols-3 gap-3">
            {product.imageUrls.slice(1, 4).map((src) => (
              <li key={src}>
                <ProductImage name={product.name} src={src} className="rounded-xl" sizes="160px" />
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{product.category?.name}</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">{product.name}</h1>
        {product.description && <p className="mt-4 leading-relaxed text-muted">{product.description}</p>}

        <p className="mt-3 flex flex-wrap gap-2 text-sm">
          {FOOD_INFO.halal && <span className="rounded-lg bg-green-100 px-2.5 py-1 font-medium text-green-800">Halal</span>}
          <span className="rounded-lg bg-amber-100 px-2.5 py-1 font-medium text-amber-900">Contains: {FOOD_INFO.allergens}</span>
        </p>
        <details className="mt-3 text-sm text-ink">
          <summary className="cursor-pointer font-medium text-accent-strong">Ingredients &amp; storage</summary>
          <p className="mt-2"><span className="font-semibold">Ingredients:</span> {FOOD_INFO.ingredients}</p>
          <p className="mt-1"><span className="font-semibold">Best before:</span> {FOOD_INFO.shelfLife} from packing</p>
          <p className="mt-1"><span className="font-semibold">Storage:</span> {FOOD_INFO.storage}</p>
        </details>

        {/* Prices depend on the visitor's country (a cookie), so this part streams in. */}
        <Suspense fallback={<div className="mt-6 h-64 animate-pulse rounded-xl bg-cream" />}>
          <PricedBuyBox slug={product.slug} />
        </Suspense>

        <Link href="/bulk-orders"
          className="mt-8 block rounded-xl border border-accent/40 bg-accent-soft p-4 hover:border-accent">
          <span className="font-semibold text-ink">Need 1kg or more?</span>
          <span className="block text-sm text-ink/80">
            Bulk & custom orders: chat with us on WhatsApp, call, or send an enquiry →
          </span>
        </Link>
      </div>
    </div>
  );
}

async function PricedBuyBox({ slug }: { slug: string }) {
  const [product, country, user] = await Promise.all([getProduct(slug), getCountry(), getCurrentUser()]);
  if (!product) return null;
  const { currency, name } = COUNTRIES[country];

  // Only the packs sold in this country (e.g. 50g/100g in Nigeria, 80g/180g in Ghana),
  // each with its price in ONE currency.
  const variants: BuyBoxVariant[] = product.variants
    .filter((v) => v.prices[currency] !== undefined)
    .map((v) => ({
      id: v.id,
      sizeLabel: v.sizeLabel,
      spiceLevel: v.spiceLevel,
      price: v.prices[currency]!,
    }));

  if (variants.length === 0) {
    return (
      <p className="mt-6 rounded-xl bg-amber-50 p-4 text-amber-900">
        Sorry, this product isn&apos;t available in {name} yet.
      </p>
    );
  }

  const regNo = BUSINESS.foodRegNo[country];
  return (
    <>
      {/* key: switching country starts the size choice afresh (packs differ per country). */}
      <BuyBox key={currency} productName={product.name} variants={variants} currency={currency} countryName={name}
        inSupermarkets={SELLS_VIA_SUPERMARKETS[country]} teamView={isStaff(user)} />
      {regNo && <p className="mt-3 text-xs text-muted">{regNo}</p>}
    </>
  );
}
