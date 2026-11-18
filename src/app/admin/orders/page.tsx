import Link from "next/link";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, type Currency } from "@/lib/money";
import { ORDER_STATUS, formatOrderDate, type OrderStatus } from "@/lib/orders";
import type { CountryCode } from "@/lib/countries";
import { AutoRefresh } from "@/components/auto-refresh";

export const metadata = { title: "Orders · Admin · Suya Factory" };

// Tabs in working order: what needs doing first comes first.
const TABS: { status: OrderStatus; label: string }[] = [
  { status: "awaiting_quote", label: "Needs delivery price" },
  { status: "paid", label: "To prepare" },
  { status: "preparing", label: "Preparing" },
  { status: "out_for_delivery", label: "Out for delivery" },
  { status: "delivered", label: "Delivered" },
  { status: "pending_payment", label: "Waiting for payment" },
  { status: "cancelled", label: "Cancelled" },
];

type Row = {
  order_number: string;
  contact_name: string;
  country: CountryCode;
  currency: Currency;
  total_minor: number;
  status: OrderStatus;
  created_at: string;
  delivery_address: { zone_name?: string; city?: string };
  order_items: { quantity: number }[];
};

export default function AdminOrdersPage(props: PageProps<"/admin/orders">) {
  return (
    <>
      <h1 className="text-2xl font-bold text-stone-900">Orders</h1>
      <AutoRefresh seconds={60} />
      <Suspense fallback={<p className="mt-4 text-sm text-stone-400">Loading orders…</p>}>
        <OrderList searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function OrderList({ searchParams }: { searchParams: PageProps<"/admin/orders">["searchParams"] }) {
  await requireStaff("/admin/orders");
  const sp = await searchParams;
  const status = (TABS.find((t) => t.status === sp.status)?.status ?? "awaiting_quote") as OrderStatus;
  const country = sp.country === "NG" || sp.country === "GH" ? sp.country : null;
  // Keep only letters, numbers, spaces and dashes: stops the search box being used to inject filters.
  const q = String(sp.q ?? "").replace(/[^\p{L}\p{N} -]/gu, "").trim().slice(0, 50);

  const supabase = await createClient();

  // How many orders in each tab (respecting the country filter).
  const counts = await Promise.all(
    TABS.map(async (t) => {
      let query = supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", t.status);
      if (country) query = query.eq("country", country);
      return (await query).count ?? 0;
    }),
  );

  let query = supabase
    .from("orders")
    .select("order_number, contact_name, country, currency, total_minor, status, created_at, delivery_address, order_items(quantity)")
    .eq("status", status)
    // Work queue tabs: oldest first (first come, first served). History tabs: newest first.
    .order("created_at", { ascending: ["awaiting_quote", "paid", "preparing", "out_for_delivery"].includes(status) })
    .limit(100);
  if (country) query = query.eq("country", country);
  if (q) query = query.or(`order_number.ilike.%${q}%,contact_name.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return <p className="mt-4 text-red-700">Couldn&apos;t load orders: {error.message}</p>;
  const orders = (data ?? []) as unknown as Row[];

  const link = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams();
    const merged = { status, country, q: q || null, ...changes };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    return `/admin/orders?${params}`;
  };

  return (
    <>
      <nav className="mt-4 flex flex-wrap gap-2" aria-label="Order status">
        {TABS.map((t, i) => (
          <Link key={t.status} href={link({ status: t.status })}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              t.status === status ? "bg-stone-900 text-white" : "bg-white text-stone-700 ring-1 ring-stone-300 hover:bg-stone-100"
            }`}>
            {t.label} <span className="tabular-nums opacity-70">{counts[i]}</span>
          </Link>
        ))}
      </nav>

      <form className="mt-4 flex flex-wrap items-center gap-2" action="/admin/orders">
        <input type="hidden" name="status" value={status} />
        <input name="q" defaultValue={q} placeholder="Search order number or name"
          className="w-64 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm" />
        <select name="country" defaultValue={country ?? ""} className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm">
          <option value="">Both countries</option>
          <option value="NG">Nigeria</option>
          <option value="GH">Ghana</option>
        </select>
        <button className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-semibold text-white">Filter</button>
        {(q || country) && <Link href={link({ q: null, country: null })} className="text-sm text-stone-600 hover:underline">Clear</Link>}
      </form>

      {orders.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-stone-300 p-6 text-center text-stone-500">
          No orders here.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-2">Order</th>
                <th className="px-4 py-2">Placed</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Deliver to</th>
                <th className="px-4 py-2 text-right">Items</th>
                <th className="px-4 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.order_number} className="border-t border-stone-100 hover:bg-orange-50/40">
                  <td className="px-4 py-2">
                    <Link href={`/admin/orders/${o.order_number}`} className="font-semibold text-orange-700 hover:underline">
                      {o.order_number}
                    </Link>
                    <span className="ml-2 text-xs text-stone-500">{o.country === "NG" ? "🇳🇬" : "🇬🇭"}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-stone-600">{formatOrderDate(o.created_at, o.country)}</td>
                  <td className="px-4 py-2">{o.contact_name}</td>
                  <td className="px-4 py-2 text-stone-600">{o.delivery_address.city} · {o.delivery_address.zone_name}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{o.order_items.reduce((s, i) => s + i.quantity, 0)}</td>
                  <td className="px-4 py-2 text-right font-semibold tabular-nums">{formatMoney(o.total_minor, o.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-stone-500">
        {ORDER_STATUS[status].label} · showing up to 100 orders.
      </p>
    </>
  );
}
