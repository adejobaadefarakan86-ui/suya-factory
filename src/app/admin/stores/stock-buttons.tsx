"use client";
import { useTransition } from "react";
import { setStock } from "@/app/admin/stores/actions";

/** Two big buttons: "Has kilishi" / "Finished". The current one is highlighted. */
export function StockButtons({ storeId, inStock, title }: { storeId: string; inStock: boolean; title: string }) {
  const [pending, start] = useTransition();
  const choose = (value: boolean) => {
    if (value === inStock) return;
    start(() => setStock(storeId, value));
  };

  return (
    <div className="grid grid-cols-2 gap-2" aria-busy={pending}>
      <button
        type="button"
        disabled={pending}
        aria-pressed={inStock}
        aria-label={`${title} has kilishi`}
        onClick={() => choose(true)}
        className={`rounded-xl px-3 py-3 text-base font-semibold transition disabled:opacity-60 ${
          inStock ? "bg-green-600 text-white" : "border border-stone-300 bg-white text-stone-700 active:bg-green-50"
        }`}
      >
        ✅ Has kilishi
      </button>
      <button
        type="button"
        disabled={pending}
        aria-pressed={!inStock}
        aria-label={`${title} has finished`}
        onClick={() => choose(false)}
        className={`rounded-xl px-3 py-3 text-base font-semibold transition disabled:opacity-60 ${
          !inStock ? "bg-red-600 text-white" : "border border-stone-300 bg-white text-stone-700 active:bg-red-50"
        }`}
      >
        ❌ Finished
      </button>
      {pending && <p className="col-span-2 text-center text-sm text-stone-500">Saving…</p>}
    </div>
  );
}
