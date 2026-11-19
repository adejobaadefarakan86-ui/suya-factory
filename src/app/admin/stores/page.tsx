import { Suspense } from "react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatOrderDate } from "@/lib/orders";
import { formatPhone, telLink } from "@/lib/contacts";
import { storeTitle } from "@/lib/stores";
import { AutoRefresh } from "@/components/auto-refresh";
import { setStock } from "./actions";
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

type Pickup = {
  id: string;
  code: string;
  store_id: string;
  customer_name: string;
  customer_phone: string;
  paid_from: string | null;
  rider_name: string;
  rider_phone: string;
  rider_plate: string | null;
  delivery_company: string | null;
  created_at: string;
};

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export default function AdminStoresPage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-stone-900">Supermarkets (Nigeria)</h1>
      <p className="mt-1 max-w-2xl text-sm text-stone-600">
        Customers see the nearest supermarket that has kilishi. Staff keep the stock up to date on the{" "}
        <a href="/stock" className="font-medium text-orange-700 underline">stock page</a> (easy on a phone) or with the
        tap buttons in the staff Telegram chat (<code>/stock</code>).
      </p>
      <AutoRefresh seconds={60} />
      <Suspense fallback={<p className="mt-4 text-sm text-stone-400">Loading…</p>}>
        <Stores />
      </Suspense>
    </>
  );
}

async function Stores() {
  const me = await requireStaff("/admin/stores");
  const isAdmin = me.role === "admin";
  const supabase = await createClient();

  const weekAgo = daysAgo(7);
  const [stores, pickups] = await Promise.all([
    supabase.from("stores").select("*").eq("country", "NG").order("store_no"),
    supabase.from("store_pickups").select("*").order("created_at", { ascending: false }).limit(50),
  ]);
  if (stores.error) return <p className="mt-4 text-red-700">Couldn&apos;t load supermarkets: {stores.error.message}</p>;
  const rows = (stores.data ?? []) as Row[];
  const recent = (pickups.data ?? []) as Pickup[];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const weekCount = (id: string) => recent.filter((p) => p.store_id === id && p.created_at >= weekAgo).length;

  return (
    <div className="mt-6 space-y-8">
      {rows.length === 0 && (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">No supermarkets yet. Add the first one below.</p>
      )}

      <ul className="space-y-3">
        {rows.map((r) => {
          const form: StoreFormRow = {
            id: r.id, name: r.name, branch: r.branch, address: r.address, lat: Number(r.lat), lng: Number(r.lng),
            phone: r.phone, whatsapp: r.whatsapp, openingHours: r.opening_hours, packs: r.packs, active: r.active,
          };
          return (
            <li key={r.id} className={`rounded-2xl border bg-white p-4 ${r.active ? "border-stone-200" : "border-dashed border-stone-300 opacity-70"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-stone-900">
                    <span className="mr-2 rounded bg-stone-100 px-1.5 py-0.5 text-xs tabular-nums text-stone-600">#{r.store_no}</span>
                    {storeTitle(r)}
                    {!r.active && <span className="ml-2 text-xs font-normal text-stone-500">(hidden from customers)</span>}
                  </p>
                  <p className="text-sm text-stone-600">{r.address}</p>
                  <p className="text-sm text-stone-500">
                    {r.phone && <a href={telLink(r.phone)} className="hover:underline">📞 {formatPhone(r.phone)}</a>}
                    {r.whatsapp && <span className="ml-3">💬 {formatPhone(r.whatsapp)}</span>}
                    {r.packs && <span className="ml-3">{r.packs}</span>}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    {weekCount(r.id)} app pickups in the last 7 days · stock updated {formatOrderDate(r.stock_updated_at, "NG")}{r.stock_updated_by ? ` by ${r.stock_updated_by}` : ""}
                  </p>
                  {r.in_stock && r.out_reported_at && (
                    <p className="mt-1 text-sm font-medium text-amber-700">
                      ⚠️ A customer said they&apos;re out ({formatOrderDate(r.out_reported_at, "NG")}). Please check.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${r.in_stock ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {r.in_stock ? "In stock" : "Out of stock"}
                  </span>
                  <form action={setStock.bind(null, r.id, !r.in_stock)}>
                    <button className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium hover:bg-stone-50">
                      {r.in_stock ? "Mark out of stock" : "Mark restocked"}
                    </button>
                  </form>
                  {r.in_stock && r.out_reported_at && (
                    <form action={setStock.bind(null, r.id, true)}>
                      <button className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium hover:bg-stone-50">Still in stock</button>
                    </form>
                  )}
                </div>
              </div>
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

      <section>
        <h2 className="text-lg font-semibold text-stone-900">Recent pickups</h2>
        <p className="text-sm text-stone-600">Each time a customer sends their rider&apos;s details to a supermarket from the app.</p>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">None yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-stone-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase text-stone-500">
                <tr>
                  <th className="px-3 py-2">When</th><th className="px-3 py-2">Code</th><th className="px-3 py-2">Supermarket</th>
                  <th className="px-3 py-2">Customer</th><th className="px-3 py-2">Rider</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((p) => {
                  const s = byId.get(p.store_id);
                  return (
                    <tr key={p.id} className="border-t border-stone-100 align-top">
                      <td className="whitespace-nowrap px-3 py-2">{formatOrderDate(p.created_at, "NG")}</td>
                      <td className="px-3 py-2 font-mono">{p.code}</td>
                      <td className="px-3 py-2">{s ? storeTitle(s) : "?"}</td>
                      <td className="px-3 py-2">{p.customer_name}<br /><span className="text-stone-500">{p.customer_phone}{p.paid_from ? ` · paid from ${p.paid_from}` : ""}</span></td>
                      <td className="px-3 py-2">{p.rider_name}<br /><span className="text-stone-500">{[p.rider_phone, p.rider_plate, p.delivery_company].filter(Boolean).join(" · ")}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
