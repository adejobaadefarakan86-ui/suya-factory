// The public product catalogue: every active product, its variants and prices
// in BOTH currencies. It's the same for every visitor, so it's cached for an
// hour and shared. (Admin edits will clear the cache using the "catalog" tag.)
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { Currency } from "@/lib/money";
import { SPICE_LABELS, type SpiceLevel } from "@/lib/spice";

export type CatalogVariant = {
  id: string;
  sku: string | null;
  sizeLabel: string;
  spiceLevel: SpiceLevel | null;
  grams: number; // pack weight, used for the 1kg bulk-order limit
  prices: Partial<Record<Currency, number>>; // in kobo / pesewas
};

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrls: string[];
  category: { name: string; slug: string; sortOrder: number } | null;
  variants: CatalogVariant[];
};

type Row = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_urls: string[];
  categories: { name: string; slug: string; sort_order: number } | null;
  product_variants: {
    id: string;
    sku: string | null;
    size_label: string;
    spice_level: SpiceLevel | null;
    weight_grams: number | null;
    variant_prices: { currency: Currency; amount_minor: number }[];
  }[];
};

export async function getCatalog(): Promise<CatalogProduct[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");

  const supabase = createPublicClient();
  // RLS already hides inactive products/variants from the public.
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, slug, description, image_urls, categories(name, slug, sort_order), product_variants(id, sku, size_label, spice_level, weight_grams, sort_order, variant_prices(currency, amount_minor))",
    )
    .order("name")
    .order("sort_order", { referencedTable: "product_variants" });

  if (error) throw new Error(`Could not load the catalogue: ${error.message}`);

  return ((data ?? []) as unknown as Row[])
    .map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      imageUrls: p.image_urls ?? [],
      category: p.categories
        ? { name: p.categories.name, slug: p.categories.slug, sortOrder: p.categories.sort_order }
        : null,
      variants: p.product_variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        sizeLabel: v.size_label,
        spiceLevel: v.spice_level,
        grams: v.weight_grams ?? 0,
        prices: Object.fromEntries(v.variant_prices.map((pr) => [pr.currency, pr.amount_minor])),
      })),
    }))
    .sort((a, b) => (a.category?.sortOrder ?? 99) - (b.category?.sortOrder ?? 99));
}

export async function getProduct(slug: string) {
  const catalog = await getCatalog();
  return catalog.find((p) => p.slug === slug) ?? null;
}

/** e.g. "500g · Hot" or "250g" */
export function variantLabel(v: Pick<CatalogVariant, "sizeLabel" | "spiceLevel">) {
  return v.spiceLevel ? `${v.sizeLabel} · ${SPICE_LABELS[v.spiceLevel]}` : v.sizeLabel;
}

/** Cheapest price for this product in a currency (for "From ₦4,500"). */
export function lowestPrice(product: CatalogProduct, currency: Currency) {
  const prices = product.variants
    .map((v) => v.prices[currency])
    .filter((p): p is number => typeof p === "number");
  return prices.length ? Math.min(...prices) : null;
}
