// Staff stock page, made for a phone: after calling a supermarket, tap
// "Has kilishi" or "Finished". Customers see the change at once, and the
// staff Telegram chat is told. Tip: add it to the phone's home screen.
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatPhone, telLink, whatsappLink } from "@/lib/contacts";
import { storeTitle } from "@/lib/stores";
import { shortTime } from "@/lib/stock-telegram";
import { AutoRefresh } from "@/components/auto-refresh";
import { StockButtons } from "./stock-buttons";

export const metadata = { title: "Stock · Suya Factory", robots: { index: false } };

type Row = {
  id: string;
  name: string;
  branch: string | null;
  phone: string | null;
  whatsapp: string | null;
  in_stock: boolean;
  stock_updated_at: string;
  stock_updated_by: string | null;
  out_reported_at: string | null;
};

export default function StockPage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <h1 className="text-2xl font-bold text-stone-900">Supermarket stock</h1>
      <p className="mt-1 text-sm text-stone-600">
        Call or WhatsApp each supermarket, then tap what they said. Customers see it straight away.
      </p>
      <AutoRefresh seconds={60} />
      <Suspense fallback={<div className="mt-6 h-64 animate-pulse rounded-2xl bg-stone-200" />}>
        <StockList />
      </Suspense>
    </main>
  );
}

const CHECK_MESSAGE = "Hello, this is Suya Factory. Do you still have our beef kilishi in stock? Thank you!";

async function StockList() {
  await requireStaff("/stock");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stores")
    .select("id, name, branch, phone, whatsapp, in_stock, stock_updated_at, stock_updated_by, out_reported_at")
    .eq("active", true)
    .order("store_no");
  if (error) return <p className="mt-4 text-red-700">Couldn&apos;t load supermarkets: {error.message}</p>;
  const rows = (data ?? []) as Row[];

  if (rows.length === 0) {
    return <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">No supermarkets yet. An admin can add them in Admin → Supermarkets.</p>;
  }

  const finished = rows.filter((r) => !r.in_stock).length;

  return (
    <>
      <p className="mt-4 rounded-xl bg-stone-100 px-4 py-2 text-sm text-stone-700">
        {rows.length - finished} of {rows.length} supermarkets have kilishi
        {finished > 0 && <span className="font-semibold text-red-700"> · {finished} finished</span>}
      </p>
      <ul className="mt-4 space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold text-stone-900">{storeTitle(r)}</h2>
              <div className="flex shrink-0 gap-1.5">
                {r.phone && (
                  <a href={telLink(r.phone)} aria-label={`Call ${storeTitle(r)} on ${formatPhone(r.phone)}`}
                    className="grid size-10 place-items-center rounded-full border border-stone-300 text-lg">📞</a>
                )}
                {r.whatsapp && (
                  <a href={whatsappLink(r.whatsapp, CHECK_MESSAGE)} target="_blank" rel="noopener noreferrer"
                    aria-label={`WhatsApp ${storeTitle(r)}`}
                    className="grid size-10 place-items-center rounded-full border border-green-600 text-lg">💬</a>
                )}
              </div>
            </div>
            <p className="mb-3 text-xs text-stone-500">
              Last checked {shortTime(r.stock_updated_at)}{r.stock_updated_by ? ` by ${r.stock_updated_by}` : ""}
            </p>
            {r.in_stock && r.out_reported_at && (
              <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                ⚠️ A customer said they&apos;ve finished ({shortTime(r.out_reported_at)}). Please check.
              </p>
            )}
            <StockButtons storeId={r.id} inStock={r.in_stock} title={storeTitle(r)} />
          </li>
        ))}
      </ul>
    </>
  );
}
