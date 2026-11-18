import { Suspense } from "react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, type Currency } from "@/lib/money";

export const metadata = { title: "Products · Admin · Suya Factory" };

type Price = { currency: Currency; amount_minor: number };
type Variant = {
  id: string;
  sku: string | null;
  size_label: string;
  spice_level: string | null;
  is_active: boolean;
  variant_prices: Price[];
};
type Product = {
  id: string;
  name: string;
  is_active: boolean;
  categories: { name: string } | null;
  product_variants: Variant[];
};

function priceIn(variant: Variant, currency: Currency) {
  const price = variant.variant_prices.find((p) => p.currency === currency);
  return price ? formatMoney(price.amount_minor, currency) : "—";
}

export default function AdminProductsPage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-stone-900">Products</h1>
      <Suspense fallback={<p className="mt-4 text-sm text-stone-400">Loading products…</p>}>
        <ProductList />
      </Suspense>
    </>
  );
}

async function ProductList() {
  // Checked HERE, next to the data, on every visit.
  await requireStaff("/admin/products");
  const supabase = await createClient();

  // One request fetches products + their variants + their prices.
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, is_active, categories(name), product_variants(id, sku, size_label, spice_level, is_active, sort_order, variant_prices(currency, amount_minor))",
    )
    .order("name")
    .order("sort_order", { referencedTable: "product_variants" });

  if (error) {
    return <p className="text-red-700">Couldn&apos;t load products: {error.message}</p>;
  }

  const products = (data ?? []) as unknown as Product[];

  return (
    <>
      <p className="mt-1 mb-6 text-sm text-stone-600">
        {products.length} products · editing comes in a later phase.
      </p>

      <div className="space-y-6">
        {products.map((product) => (
          <section key={product.id} className="overflow-hidden rounded-xl border border-stone-200 bg-white">
            <header className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-4 py-3">
              <h2 className="font-semibold text-stone-900">
                {product.name}
                <span className="ml-2 text-xs font-normal text-stone-500">{product.categories?.name}</span>
              </h2>
              {!product.is_active && (
                <span className="rounded bg-stone-200 px-2 py-0.5 text-xs text-stone-700">Hidden</span>
              )}
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-stone-500">
                  <tr>
                    <th className="px-4 py-2">SKU</th>
                    <th className="px-4 py-2">Size</th>
                    <th className="px-4 py-2">Spice</th>
                    <th className="px-4 py-2 text-right">Nigeria</th>
                    <th className="px-4 py-2 text-right">Ghana</th>
                  </tr>
                </thead>
                <tbody>
                  {product.product_variants.map((v) => (
                    <tr key={v.id} className="border-t border-stone-100">
                      <td className="px-4 py-2 font-mono text-xs text-stone-600">{v.sku}</td>
                      <td className="px-4 py-2">{v.size_label}</td>
                      <td className="px-4 py-2 capitalize">{v.spice_level?.replace("_", " ") ?? "—"}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{priceIn(v, "NGN")}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{priceIn(v, "GHS")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
