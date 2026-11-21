import Link from "next/link";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, type Currency } from "@/lib/money";
import { AutoRefresh } from "@/components/auto-refresh";

export const metadata = { title: "Overview · Admin · Suya Factory" };

export default function AdminOverviewPage() {
  return (
    <>
      <AutoRefresh seconds={60} />
      <Suspense fallback={<div className="h-40 animate-pulse rounded-3xl bg-stone-200" />}>
        <Overview />
      </Suspense>
    </>
  );
}

/** "Good morning" etc. in Lagos time (Accra is an hour behind; close enough for a greeting). */
function greeting(now: Date) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" }).format(now));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

type Card = { label: string; count: number; href: string; icon: string; red?: boolean };

async function Overview() {
  const me = await requireStaff("/admin");
  const supabase = await createClient();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();

  // head:true + count = just count the rows, don't download them.
  const orders = () => supabase.from("orders").select("id", { count: "exact", head: true });
  const stores = () => supabase.from("stores").select("id", { count: "exact", head: true }).eq("active", true);
  const [check, handover, refund, rider, newEnquiries, storesOut, storesReported, week] = await Promise.all([
    orders().eq("status", "pending_payment").not("momo_claimed_at", "is", null),
    orders().eq("status", "preparing"),
    orders().eq("status", "cancelled").not("refund_due_minor", "is", null).is("refunded_at", null),
    orders().eq("status", "paid"),
    supabase.from("bulk_enquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
    stores().eq("in_stock", false),
    stores().eq("in_stock", true).not("out_reported_at", "is", null),
    // This week's sales: paid orders (anything after payment, not cancelled).
    supabase.from("orders").select("total_minor, currency, status").gte("created_at", weekAgo)
      .in("status", ["paid", "preparing", "out_for_delivery", "delivered"]),
  ]);

  // Things someone should do now. Red = a supermarket has no kilishi (or a customer says so).
  const todo: Card[] = [
    { label: "Supermarkets out of kilishi", count: storesOut.count ?? 0, href: "/stock", icon: "🔴", red: true },
    { label: "Customer says a supermarket is out", count: storesReported.count ?? 0, href: "/stock", icon: "⚠️", red: true },
    { label: "MoMo payments to check", count: check.count ?? 0, href: "/admin/orders?tab=check", icon: "💸" },
    { label: "Ready to hand to a rider", count: handover.count ?? 0, href: "/admin/orders?tab=handover", icon: "📦" },
    { label: "Refunds to send", count: refund.count ?? 0, href: "/admin/orders?tab=refund", icon: "↩️" },
    { label: "New bulk enquiries", count: newEnquiries.count ?? 0, href: "/admin/enquiries?status=new", icon: "📨" },
  ].filter((c) => c.count > 0);

  const sales = new Map<Currency, number>();
  for (const o of (week.data ?? []) as { total_minor: number; currency: Currency }[]) {
    sales.set(o.currency, (sales.get(o.currency) ?? 0) + o.total_minor);
  }
  const firstName = (me.fullName ?? "").split(" ")[0];
  const today = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Lagos" }).format(now);

  return (
    <div className="max-w-5xl space-y-8">
      {/* Welcome banner */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-stone-900 via-stone-900 to-orange-900 p-6 text-white shadow-lg sm:p-8">
        <p className="text-sm text-orange-300">{today}</p>
        <h1 className="mt-1 text-3xl font-extrabold">{greeting(now)}{firstName ? `, ${firstName}` : ""} 👋</h1>
        <p className="mt-2 text-stone-300">
          {todo.length === 0
            ? "All clear. Nothing needs you right now."
            : `${todo.reduce((n, c) => n + c.count, 0)} thing${todo.reduce((n, c) => n + c.count, 0) === 1 ? "" : "s"} need${todo.reduce((n, c) => n + c.count, 0) === 1 ? "s" : ""} you now.`}
        </p>
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Paid orders (7 days)" value={String(week.data?.length ?? 0)} />
          <Stat label="Sales Ghana (7 days)" value={formatMoney(sales.get("GHS") ?? 0, "GHS")} />
          <Stat label="Booking their rider" value={String(rider.count ?? 0)} />
          <Stat label="Supermarkets out" value={String(storesOut.count ?? 0)} alert={(storesOut.count ?? 0) > 0} />
        </dl>
      </section>

      {/* To do */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-stone-900">Needs you now</h2>
        {todo.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-center text-stone-500">✅ Nothing to do. Well done!</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {todo.map((c) => (
              <li key={c.label}>
                <Link href={c.href}
                  className={`flex items-center gap-4 rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                    c.red ? "border-red-400 ring-2 ring-red-200" : "border-orange-300"
                  }`}>
                  <span className={`grid size-12 shrink-0 place-items-center rounded-xl text-2xl ${c.red ? "bg-red-50" : "bg-orange-50"}`} aria-hidden>{c.icon}</span>
                  <span>
                    <span className={`block text-3xl font-extrabold tabular-nums ${c.red ? "text-red-700" : "text-stone-900"}`}>{c.count}</span>
                    <span className="text-sm text-stone-600">{c.label} →</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Shortcuts */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-stone-900">Shortcuts</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          {[
            ["🧾 All orders", "/admin/orders"],
            ["🏪 Supermarket stock", "/stock"],
            ["🛵 Ghana pickup details", "/admin/delivery"],
            ["👀 See the shop as customers do", "/"],
          ].map(([label, href]) => (
            <Link key={href} href={href} className="rounded-full bg-white px-4 py-2 font-medium text-stone-800 shadow-sm ring-1 ring-stone-200 hover:ring-orange-400">
              {label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={`rounded-2xl px-4 py-3 ${alert ? "bg-red-600/90" : "bg-white/10"}`}>
      <dt className="text-xs text-stone-300">{label}</dt>
      <dd className="mt-1 text-xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}
