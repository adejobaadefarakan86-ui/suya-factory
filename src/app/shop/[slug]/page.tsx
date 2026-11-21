import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCatalog, getProduct } from "@/lib/catalog";
import { getCountry } from "@/lib/country";
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
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <Link href="/shop" className="text-sm text-stone-600 hover:text-orange-700">
        ← Back to shop
      </Link>
      <Suspense fallback={<div className="mt-6 h-96 animate-pulse rounded-2xl bg-stone-200" />}>
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
    <div className="mt-6 grid gap-8 md:grid-cols-2">
      <div>
        <ProductImage name={product.name} src={product.imageUrls[0]} index={index} className="rounded-2xl"
          sizes="(min-width: 768px) 480px, 100vw" priority />
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
        <p className="text-sm uppercase tracking-wide text-stone-500">{product.category?.name}</p>
        <h1 className="text-3xl font-bold text-stone-900">{product.name}</h1>
        {product.description && <p className="mt-3 text-stone-700">{product.description}</p>}

        <p className="mt-3 flex flex-wrap gap-2 text-sm">
          {FOOD_INFO.halal && <span className="rounded-full bg-green-100 px-3 py-1 font-semibold text-green-800">Halal</span>}
          <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-900">Contains: {FOOD_INFO.allergens}</span>
        </p>
        <details className="mt-3 text-sm text-stone-700">
          <summary className="cursor-pointer font-medium text-orange-700">Ingredients &amp; storage</summary>
          <p className="mt-2"><span className="font-semibold">Ingredients:</span> {FOOD_INFO.ingredients}</p>
          <p className="mt-1"><span className="font-semibold">Best before:</span> {FOOD_INFO.shelfLife} from packing</p>
          <p className="mt-1"><span className="font-semibold">Storage:</span> {FOOD_INFO.storage}</p>
        </details>

        {/* Prices depend on the visitor's country (a cookie), so this part streams in. */}
        <Suspense fallback={<div className="mt-6 h-64 animate-pulse rounded-xl bg-stone-100" />}>
          <PricedBuyBox slug={product.slug} />
        </Suspense>

        <Link href="/bulk-orders"
          className="mt-8 block rounded-xl border border-orange-200 bg-orange-50 p-4 hover:border-orange-400">
          <span className="font-semibold text-orange-900">Need 1kg or more?</span>
          <span className="block text-sm text-orange-900/80">
            Bulk & custom orders: chat with us on WhatsApp, call, or send an enquiry →
          </span>
        </Link>
      </div>
    </div>
  );
}

async function PricedBuyBox({ slug }: { slug: string }) {
  const [product, country] = await Promise.all([getProduct(slug), getCountry()]);
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
      <BuyBox productName={product.name} variants={variants} currency={currency} countryName={name}
        inSupermarkets={SELLS_VIA_SUPERMARKETS[country]} />
      {regNo && <p className="mt-3 text-xs text-stone-500">{regNo}</p>}
    </>
  );
}
