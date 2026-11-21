import Link from "next/link";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AutoRefresh } from "@/components/auto-refresh";

export const metadata = { title: "Overview · Admin · Suya Factory" };

export default function AdminOverviewPage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-stone-900">Overview</h1>
      <AutoRefresh seconds={60} />
      <Suspense fallback={<p className="mt-4 text-sm text-stone-400">Loading…</p>}>
        <Counts />
      </Suspense>
    </>
  );
}

async function Counts() {
  await requireStaff("/admin");
  const supabase = await createClient();

  // head:true + count = just count the rows, don't download them.
  const orders = () => supabase.from("orders").select("id", { count: "exact", head: true });
  const stores = () => supabase.from("stores").select("id", { count: "exact", head: true }).eq("active", true);
  const [check, handover, refund, rider, newEnquiries, storesOut, storesReported] = await Promise.all([
    orders().eq("status", "pending_payment").not("momo_claimed_at", "is", null),
    orders().eq("status", "preparing"),
    orders().eq("status", "cancelled").not("refund_due_minor", "is", null).is("refunded_at", null),
    orders().eq("status", "paid"),
    supabase.from("bulk_enquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
    stores().eq("in_stock", false),
    stores().eq("in_stock", true).not("out_reported_at", "is", null),
  ]);

  // Red = a supermarket has no kilishi (or a customer says so): restock or check it.
  const cards: { label: string; count: number | null; href: string; urgent?: boolean; red?: boolean }[] = [
    { label: "🔴 Supermarkets out of kilishi", count: storesOut.count, href: "/stock", red: true },
    { label: "⚠️ Customer says a supermarket is out", count: storesReported.count, href: "/stock", red: true },
    { label: "💸 MoMo payments to check", count: check.count, href: "/admin/orders?tab=check", urgent: true },
    { label: "📦 Ready to hand to a rider", count: handover.count, href: "/admin/orders?tab=handover", urgent: true },
    { label: "↩️ Refunds to send", count: refund.count, href: "/admin/orders?tab=refund", urgent: true },
    { label: "🛵 Customers booking their rider", count: rider.count, href: "/admin/orders?tab=rider" },
    { label: "New bulk enquiries", count: newEnquiries.count, href: "/admin/enquiries?status=new", urgent: true },
  ];

  return (
    <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <li key={c.label}>
          <Link
            href={c.href}
            className={`block rounded-2xl border p-5 hover:shadow-md ${
              c.red && (c.count ?? 0) > 0 ? "border-red-400 bg-red-50 ring-2 ring-red-200"
                : c.urgent && (c.count ?? 0) > 0 ? "border-orange-300 bg-orange-50" : "border-stone-200 bg-white"
            }`}
          >
            <p className="text-3xl font-bold tabular-nums text-stone-900">{c.count ?? "?"}</p>
            <p className="mt-1 text-sm text-stone-600">{c.label} →</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
