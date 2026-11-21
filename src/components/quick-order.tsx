// Ordering without scrolling:
//  - <HeroOrder>: the packs with prices right in the first screen
//    (Ghana: "Add to cart" on each; Nigeria: sizes + "Find a supermarket").
//  - <OrderBarForPage>: data for the slim "Order now" bar on phones.
// Both read the country cookie and login, so render them inside <Suspense>.
import Link from "next/link";
import { getCatalog, lowestPrice, variantLabel } from "@/lib/catalog";
import { getCountry } from "@/lib/country";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { COUNTRIES } from "@/lib/countries";
import { formatMoney } from "@/lib/money";
import { SELLS_VIA_SUPERMARKETS } from "@/lib/stores";
import { AddPackButton } from "@/components/add-pack-button";
import { OrderBar } from "@/components/order-bar";

async function load() {
  const [catalog, country, user] = await Promise.all([getCatalog(), getCountry(), getCurrentUser()]);
  const { currency } = COUNTRIES[country];
  const product = catalog.find((p) => lowestPrice(p, currency) !== null) ?? null;
  const packs = product
    ? product.variants.filter((v) => v.prices[currency] !== undefined).sort((a, b) => a.grams - b.grams)
    : [];
  return { product, packs, currency, viaSupermarkets: SELLS_VIA_SUPERMARKETS[country], teamView: isStaff(user) };
}

export async function HeroOrder() {
  const { product, packs, currency, viaSupermarkets, teamView } = await load();
  if (!product) return null;

  return (
    <div id="order" className="mt-5 max-w-md sm:mt-8 scroll-mt-24 rounded-2xl border border-line bg-surface p-2 shadow-[0_20px_40px_-30px_rgba(60,25,5,0.5)]">
      <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-[0.14em] text-muted">
        {viaSupermarkets ? "Packs in supermarkets" : "Order now"}
      </p>
      <ul className="divide-y divide-line">
        {packs.map((v) => (
          <li key={v.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <span className="min-w-0 text-sm text-ink">
              {variantLabel(v)}
              <span className="block font-display text-lg font-semibold tabular-nums">{formatMoney(v.prices[currency]!, currency)}</span>
            </span>
            {!viaSupermarkets && !teamView && <AddPackButton variantId={v.id} label={variantLabel(v)} />}
          </li>
        ))}
      </ul>
      {viaSupermarkets && (
        <Link href="/where-to-buy" className="btn btn-primary mt-1 w-full py-3 text-base">Find a supermarket near you</Link>
      )}
    </div>
  );
}

/** The phone "Order now" bar: Ghana jumps to the packs at the top; Nigeria goes to the supermarket finder. */
export async function OrderBarForPage({ orderHref }: { orderHref: string }) {
  const { product, currency, viaSupermarkets, teamView } = await load();
  if (!product || teamView) return null;
  const from = lowestPrice(product, currency);
  return viaSupermarkets
    ? <OrderBar title={product.name} note="In supermarkets near you" href="/where-to-buy" action="Find a store" />
    : <OrderBar title={product.name} note={from !== null ? `From ${formatMoney(from, currency)}` : ""} href={orderHref} action="Order now" />;
}
