"use client";
// "Add" next to a pack (Ghana). Uses the existing cart, unchanged.
import Link from "next/link";
import { useState } from "react";
import { cart } from "@/lib/cart";

export function AddPackButton({ variantId, label }: { variantId: string; label: string }) {
  const [added, setAdded] = useState(false);
  if (added) {
    return (
      <Link href="/cart" className="btn btn-ghost px-3.5 py-2 text-sm" aria-live="polite">
        Added · View cart
      </Link>
    );
  }
  return (
    <button type="button" aria-label={`Add ${label} to cart`}
      onClick={() => { cart.add(variantId, 1); setAdded(true); }}
      className="btn btn-primary px-3.5 py-2 text-sm">
      Add to cart
    </button>
  );
}
