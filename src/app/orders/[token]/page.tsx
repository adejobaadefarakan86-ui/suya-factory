// One order, opened with its secret link code (works for guests too).
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS, formatOrderDate, isOrderToken, type OrderView } from "@/lib/orders";

// Private page: keep it out of search engines.
export const metadata = { title: "Your order · Suya Factory", robots: { index: false, follow: false } };

export default function OrderPage(props: PageProps<"/orders/[token]">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-stone-200" />}>
        <OrderDetails params={props.params} />
      </Suspense>
    </main>
  );
}

async function OrderDetails({ params }: { params: PageProps<"/orders/[token]">["params"] }) {
  const { token } = await params;
  if (!isOrderToken(token)) notFound();

  const { data, error } = await createPublicClient().rpc("get_order_by_token", { p_token: token });
  if (error) throw new Error(`Could not load the order: ${error.message}`);
  if (!data) notFound();

  const order = data as OrderView;
  const status = ORDER_STATUS[order.status];
  const money = (n: number) => formatMoney(n, order.currency);
  const a = order.delivery_address;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">{formatOrderDate(order.created_at, order.country)}</p>
          <h1 className="text-3xl font-bold text-stone-900">Order {order.order_number}</h1>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${status.className}`}>{status.label}</span>
      </div>

      {order.status === "pending_payment" && (
        <div className="mt-6 rounded-2xl bg-orange-50 p-5 text-orange-950">
          <p className="font-semibold">Thank you, {order.contact_name.split(" ")[0]}! We&apos;ve received your order.</p>
          <p className="mt-1 text-sm">
            Online payment is coming soon. We&apos;ll start preparing your suya once payment is confirmed.
          </p>
          <p className="mt-2 text-sm">
            <strong>Bookmark this page:</strong> its link is private to you and shows your order&apos;s progress.
          </p>
        </div>
      )}

      <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-stone-900">Items</h2>
        <ul className="mt-2 divide-y divide-stone-100 text-sm">
          {order.items.map((item, i) => (
            <li key={i} className="flex justify-between gap-3 py-2">
              <span>
                <span className="font-medium text-stone-900">{item.quantity} × {item.product_name}</span>
                <span className="block text-stone-500">{item.variant_label} · {money(item.unit_price_minor)} each</span>
              </span>
              <span className="tabular-nums">{money(item.line_total_minor)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-2 space-y-1 border-t border-stone-200 pt-3 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{money(order.subtotal_minor)}</dd></div>
          <div className="flex justify-between"><dt>Delivery ({a.zone_name})</dt><dd className="tabular-nums">{money(order.delivery_fee_minor)}</dd></div>
          <div className="flex justify-between pt-2 text-lg font-bold"><dt>Total</dt><dd className="tabular-nums">{money(order.total_minor)}</dd></div>
        </dl>
      </section>

      <section className="mt-6 grid gap-6 rounded-2xl border border-stone-200 bg-white p-6 text-sm sm:grid-cols-2">
        <div>
          <h2 className="mb-2 text-lg font-semibold text-stone-900">Delivering to</h2>
          <p>{order.contact_name}</p>
          <p>{a.line1}</p>
          {a.line2 && <p>{a.line2}</p>}
          <p>{a.city} · {a.zone_name}</p>
          {a.landmark && <p className="text-stone-500">Near {a.landmark}</p>}
        </div>
        <div>
          <h2 className="mb-2 text-lg font-semibold text-stone-900">Contact</h2>
          <p className="break-all">{order.contact_email}</p>
          {/* Some browsers turn phone numbers into links; that's harmless here. */}
          <p suppressHydrationWarning>{order.contact_phone}</p>
          {order.notes && <p className="mt-3 text-stone-600">Note: {order.notes}</p>}
        </div>
      </section>

      <Link href="/shop" className="mt-8 inline-block text-sm font-medium text-orange-700 hover:underline">
        ← Continue shopping
      </Link>
    </>
  );
}
