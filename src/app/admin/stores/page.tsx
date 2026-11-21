// Supermarkets (Nigeria), all in one place: contact, stock, details.
// Supermarkets tell us when they run out; staff tap "Finished" here and
// customers are sent to the next nearest one. Stores that need attention come
// first, in red, and show as a red number in the admin menu.
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatPhone, telLink, whatsappLink } from "@/lib/contacts";
import { shortTime, storeTitle } from "@/lib/stores";
import { AutoRefresh } from "@/components/auto-refresh";
import { PhoneText } from "@/components/phone-text";
import { StockButtons } from "./stock-buttons";
import { StoreForm, type StoreFormRow } from "./store-form";

export const metadata = { title: "Supermarkets · Admin · Suya Factory" };

type Row = {
  id: string;
  store_no: number;
  name: string;
  branch: string | null;
  address: string;
  lat: string | number;
  lng: string | number;
  phone: string | null;
  whatsapp: string | null;
  opening_hours: string | null;
  packs: string | null;
  in_stock: boolean;
  stock_updated_at: string;
  out_reported_at: string | null;
  stock_updated_by: string | null;
  active: boolean;
};

const CHECK_MESSAGE = "Hello, this is Suya Factory. Do you still have our beef kilishi in stock? Thank you!";

/** Out of kilishi, or a customer says so: needs a restock or a check. */
const needsCheck = (r: Row) => r.active && (!r.in_stock || Boolean(r.out_reported_at));

export default function AdminStoresPage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-stone-900">Supermarkets</h1>
      <p className="mt-1 max-w-2xl text-sm text-stone-600">
        Nigeria. When a supermarket says they&apos;ve run out, tap <strong>Finished</strong>: customers are sent to the next
        nearest one. Tap <strong>Has kilishi</strong> once it&apos;s restocked.
      </p>
      <AutoRefresh seconds={60} />
      <Suspense fallback={<div className="mt-6 h-64 animate-pulse rounded-2xl bg-stone-200" />}>
        <Stores />
      </Suspense>
    </>
  );
}

async function Stores() {
  const me = await requireStaff("/admin/stores");
  const isAdmin = me.role === "admin";
  const supabase = await createClient();
  const { data, error } = await supabase.from("stores").select("*").eq("country", "NG").order("store_no");
  if (error) return <p className="mt-4 text-red-700">Couldn&apos;t load supermarkets: {error.message}</p>;
  const rows = [...((data ?? []) as Row[])].sort((a, b) => Number(needsCheck(b)) - Number(needsCheck(a)));
  const live = rows.filter((r) => r.active);
  const out = live.filter((r) => !r.in_stock).length;

  return (
    <div className="mt-6 max-w-3xl space-y-4">
      {rows.length === 0 ? (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">No supermarkets yet. Add the first one below.</p>
      ) : (
        <p className={`rounded-xl px-4 py-2 text-sm font-medium ${out ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}>
          {live.length - out} of {live.length} supermarkets have kilishi{out ? ` · ${out} finished` : " ✅"}
        </p>
      )}

      <ul className="space-y-4">
        {rows.map((r) => {
          const form: StoreFormRow = {
            id: r.id, name: r.name, branch: r.branch, address: r.address, lat: Number(r.lat), lng: Number(r.lng),
            phone: r.phone, whatsapp: r.whatsapp, openingHours: r.opening_hours, packs: r.packs, active: r.active,
          };
          return (
            <li key={r.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${
              !r.active ? "border-dashed border-stone-300 opacity-70" : needsCheck(r) ? "border-red-400 ring-2 ring-red-200" : "border-stone-200"
            }`}>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-stone-900">
                  {storeTitle(r)}
                  {!r.active && <span className="ml-2 text-xs font-normal text-stone-500">(hidden from customers)</span>}
                </h2>
                <p className="text-sm text-stone-600">{r.address}</p>
                {(r.opening_hours || r.packs) && (
                  <p className="text-sm text-stone-500">{[r.opening_hours, r.packs].filter(Boolean).join(" · ")}</p>
                )}
              </div>

              {/* Contact */}
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                {r.phone && (
                  <a href={telLink(r.phone)} className="rounded-lg border border-stone-300 px-3 py-1.5 font-semibold hover:bg-stone-50">
                    📞 <PhoneText value={formatPhone(r.phone)} />
                  </a>
                )}
                {r.whatsapp && (
                  <a href={whatsappLink(r.whatsapp, CHECK_MESSAGE)} target="_blank" rel="noopener noreferrer"
                    className="rounded-lg bg-green-600 px-3 py-1.5 font-semibold text-white hover:bg-green-700">
                    💬 WhatsApp <PhoneText value={formatPhone(r.whatsapp)} />
                  </a>
                )}
                {!r.phone && !r.whatsapp && <span className="text-stone-500">No phone saved yet.</span>}
              </div>

              {/* Stock */}
              {r.active && (
                <div className="mt-4">
                  {r.in_stock && r.out_reported_at && (
                    <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                      ⚠️ A customer said they&apos;ve finished ({shortTime(r.out_reported_at)}). Please check with them.
                    </p>
                  )}
                  <StockButtons storeId={r.id} inStock={r.in_stock} title={storeTitle(r)} />
                  <p className="mt-1 text-xs text-stone-500">
                    Last updated {shortTime(r.stock_updated_at)}{r.stock_updated_by ? ` by ${r.stock_updated_by}` : ""}
                  </p>
                </div>
              )}

              {isAdmin && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-orange-700">Edit details</summary>
                  <div className="mt-3"><StoreForm row={form} /></div>
                </details>
              )}
            </li>
          );
        })}
      </ul>

      {isAdmin && (
        <details className="rounded-2xl border border-stone-200 bg-white p-4" open={rows.length === 0}>
          <summary className="cursor-pointer font-semibold text-stone-900">+ Add a supermarket</summary>
          <div className="mt-4"><StoreForm /></div>
        </details>
      )}
    </div>
  );
}
