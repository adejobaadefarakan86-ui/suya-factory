import Link from "next/link";

/** Shown instead of the cart / checkout where we sell through supermarkets (Nigeria). */
export function SupermarketNotice() {
  return (
    <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-6">
      <p className="font-semibold text-orange-950">In Nigeria, our kilishi is sold in supermarkets.</p>
      <p className="mt-1 text-sm text-orange-950/80">
        Find the supermarket nearest you, buy from them, and send a rider or pick it up yourself.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/where-to-buy" className="rounded-lg bg-orange-700 px-4 py-2.5 font-semibold text-white hover:bg-orange-800">
          📍 Find a supermarket near you
        </Link>
        <Link href="/bulk-orders" className="rounded-lg border border-orange-300 bg-white px-4 py-2.5 font-semibold text-orange-900 hover:bg-orange-100">
          Buying 1kg or more? Bulk orders
        </Link>
      </div>
    </div>
  );
}
