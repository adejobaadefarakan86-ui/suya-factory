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
  const countOrders = (status: string) =>
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", status);
  const [toPrepare, preparing, outForDelivery, unpaid, newEnquiries] = await Promise.all([
    countOrders("paid"),
    countOrders("preparing"),
    countOrders("out_for_delivery"),
    countOrders("pending_payment"),
    supabase.from("bulk_enquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);

  const cards = [
    { label: "Paid, to prepare", count: toPrepare.count, href: "/admin/orders?status=paid", urgent: true },
    { label: "Being prepared", count: preparing.count, href: "/admin/orders?status=preparing" },
    { label: "Out for delivery", count: outForDelivery.count, href: "/admin/orders?status=out_for_delivery" },
    { label: "New bulk enquiries", count: newEnquiries.count, href: "/admin/enquiries?status=new", urgent: true },
    { label: "Waiting for payment", count: unpaid.count, href: "/admin/orders?status=pending_payment" },
  ];

  return (
    <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <li key={c.label}>
          <Link
            href={c.href}
            className={`block rounded-2xl border p-5 hover:shadow-md ${
              c.urgent && (c.count ?? 0) > 0 ? "border-orange-300 bg-orange-50" : "border-stone-200 bg-white"
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
