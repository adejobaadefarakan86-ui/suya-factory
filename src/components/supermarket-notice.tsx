import Link from "next/link";

/** Shown instead of the cart / checkout where we sell through supermarkets (Nigeria). */
export function SupermarketNotice() {
  return (
    <div className="mt-6 rounded-2xl border border-accent/40 bg-accent-soft p-6">
      <p className="font-semibold text-ink">In Nigeria, our kilishi is sold in supermarkets.</p>
      <p className="mt-1 text-sm text-ink/80">
        Find the supermarket nearest you, buy from them, and send a rider or pick it up yourself.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/where-to-buy" className="rounded-lg bg-accent px-4 py-2.5 font-semibold text-white hover:bg-accent-strong">
          Find a supermarket near you
        </Link>
        <Link href="/bulk-orders" className="rounded-lg border border-accent/40 bg-surface px-4 py-2.5 font-semibold text-ink hover:bg-accent-soft">
          Buying 1kg or more? Bulk orders
        </Link>
      </div>
    </div>
  );
}
