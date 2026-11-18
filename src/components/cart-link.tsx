"use client";
import Link from "next/link";
import { useCartLines, usePruneCart } from "@/lib/cart";

/** Header cart icon. `validIds` = every variant still for sale; anything else
 *  in the browser's cart is removed and not counted. */
export function CartLink({ validIds }: { validIds?: string[] }) {
  usePruneCart(validIds);
  const valid = validIds ? new Set(validIds) : null;
  const count = useCartLines()
    .filter((l) => !valid || valid.has(l.variantId))
    .reduce((sum, l) => sum + l.quantity, 0);

  return (
    <Link href="/cart" className="relative flex items-center gap-1 hover:text-orange-700" aria-label={`Cart, ${count} items`}>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.5L21 8H6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10" cy="20" r="1.5" />
        <circle cx="17" cy="20" r="1.5" />
      </svg>
      <span className="hidden sm:inline">Cart</span>
      {count > 0 && (
        <span className="absolute -top-2 -right-3 rounded-full bg-orange-700 px-1.5 text-[10px] font-bold text-white sm:static sm:px-2 sm:text-xs">
          {count}
        </span>
      )}
    </Link>
  );
}
