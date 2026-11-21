import { Suspense } from "react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, type Currency } from "@/lib/money";
import { BUSINESS, FOOD_INFO } from "@/lib/business";

export const metadata = { title: "Products · Admin · Suya Factory" };

type Variant = {
  id: string;
  size_label: string;
  is_active: boolean;
  variant_prices: { currency: Currency; amount_minor: number }[];
};
type Product = { id: string; name: string; description: string | null; is_active: boolean; product_variants: Variant[] };

// Each pack is sold in one country (its price currency).
const COUNTRIES: { currency: Currency; title: string; how: string }[] = [
  { currency: "NGN", title: "🇳🇬 Nigeria", how: "Sold in supermarkets" },
  { currency: "GHS", title: "🇬🇭 Ghana", how: "Sold online (MoMo)" },
];

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
  await requireStaff("/admin/products");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, description, is_active, product_variants(id, size_label, is_active, sort_order, variant_prices(currency, amount_minor))")
    .order("name")
    .order("sort_order", { referencedTable: "product_variants" });
  if (error) return <p className="text-red-700">Couldn&apos;t load products: {error.message}</p>;

  const all = (data ?? []) as unknown as Product[];
  const selling = all.filter((p) => p.is_active);
  const old = all.filter((p) => !p.is_active);

  return (
    <div className="mt-6 max-w-3xl space-y-6">
      {selling.map((p) => (
        <section key={p.id} className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-xl font-bold text-stone-900">{p.name}</h2>
          {p.description && <p className="mt-1 text-sm text-stone-600">{p.description}</p>}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {COUNTRIES.map((c) => {
              const packs = p.product_variants.filter((v) => v.is_active && v.variant_prices.some((x) => x.currency === c.currency));
              return (
                <div key={c.currency} className="rounded-xl bg-stone-50 p-4">
                  <p className="font-semibold text-stone-900">{c.title}</p>
                  <p className="text-xs text-stone-500">{c.how}</p>
                  {packs.length === 0 ? <p className="mt-2 text-sm text-stone-500">Not sold here.</p> : (
                    <ul className="mt-2 space-y-1 text-sm">
                      {packs.map((v) => (
                        <li key={v.id} className="flex justify-between gap-3">
                          <span>{v.size_label}</span>
                          <span className="font-semibold tabular-nums">
                            {formatMoney(v.variant_prices.find((x) => x.currency === c.currency)!.amount_minor, c.currency)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          <dl className="mt-4 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[9rem_1fr]">
            <dt className="text-stone-500">Ingredients</dt><dd>{FOOD_INFO.ingredients}</dd>
            <dt className="text-stone-500">Allergens</dt><dd>Contains {FOOD_INFO.allergens}</dd>
            <dt className="text-stone-500">Halal</dt><dd>{FOOD_INFO.halal ? "Yes" : "No"}</dd>
            <dt className="text-stone-500">Best before</dt><dd>{FOOD_INFO.shelfLife} from packing</dd>
            <dt className="text-stone-500">Storage</dt><dd>{FOOD_INFO.storage}</dd>
            {Object.entries(BUSINESS.foodRegNo).map(([country, no]) => (
              <div key={country} className="contents"><dt className="text-stone-500">Registration ({country})</dt><dd>{no}</dd></div>
            ))}
          </dl>
        </section>
      ))}

      <p className="text-xs text-stone-500">To change a price, pack or the food details, ask your developer (editing here comes later).</p>

      {old.length > 0 && (
        <details className="text-sm text-stone-500">
          <summary className="cursor-pointer">Old products, hidden from customers ({old.length})</summary>
          <p className="mt-2">{old.map((p) => p.name).join(", ")}</p>
        </details>
      )}
    </div>
  );
}
