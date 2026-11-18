import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, type Currency } from "@/lib/money";
import { ORDER_STATUS, PAYMENT_METHODS, formatOrderDate, type OrderStatus, type PaymentMethod } from "@/lib/orders";
import { telLink, toInternationalDigits, whatsappLink } from "@/lib/contacts";
import type { CountryCode } from "@/lib/countries";
import { PhoneText } from "@/components/phone-text";
import { ManualPayment, StaffNotes, StatusActions } from "./order-actions";

export const metadata = { title: "Order · Admin · Suya Factory" };

type Order = {
  id: string;
  order_number: string;
  status: OrderStatus;
  created_at: string;
  user_id: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  country: CountryCode;
  currency: Currency;
  delivery_address: { line1: string; line2: string | null; city: string; landmark: string | null; zone_name: string };
  notes: string | null;
  staff_notes: string | null;
  subtotal_minor: number;
  delivery_fee_minor: number;
  total_minor: number;
  access_token: string;
  order_items: { id: string; product_name: string; variant_label: string; unit_price_minor: number; quantity: number; line_total_minor: number }[];
  payments: { id: string; provider: string; reference: string; amount_minor: number; currency: Currency; status: string; created_at: string; verified_at: string | null; raw_response: { method?: PaymentMethod; reference?: string } | null }[];
  order_events: { id: number; from_status: OrderStatus | null; to_status: OrderStatus; note: string | null; actor_name: string | null; created_at: string }[];
};

export default function AdminOrderPage(props: PageProps<"/admin/orders/[number]">) {
  return (
    <>
      <Link href="/admin/orders" className="text-sm text-stone-600 hover:text-orange-700">← All orders</Link>
      <Suspense fallback={<p className="mt-4 text-sm text-stone-400">Loading order…</p>}>
        <OrderDetail params={props.params} />
      </Suspense>
    </>
  );
}

async function OrderDetail({ params }: { params: PageProps<"/admin/orders/[number]">["params"] }) {
  const { number } = await params;
  const user = await requireStaff(`/admin/orders/${number}`);
  const isAdmin = user.role === "admin";
  if (!/^SF-\d+$/.test(number)) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*), payments(*), order_events(*)")
    .eq("order_number", number)
    .order("created_at", { referencedTable: "payments" })
    .order("created_at", { referencedTable: "order_events" })
    .maybeSingle();
  if (error) return <p className="mt-4 text-red-700">Couldn&apos;t load the order: {error.message}</p>;
  if (!data) notFound();

  const o = data as unknown as Order;
  const money = (n: number) => formatMoney(n, o.currency);
  const when = (iso: string) => formatOrderDate(iso, o.country);
  const a = o.delivery_address;
  const phoneDigits = toInternationalDigits(o.contact_phone, o.country);
  const firstName = o.contact_name.split(" ")[0];
  const ids = { orderId: o.id, orderNumber: o.order_number };

  return (
    <div className="mt-4 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-stone-900">Order {o.order_number}</h1>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${ORDER_STATUS[o.status].className}`}>
          {ORDER_STATUS[o.status].label}
        </span>
        <span className="text-sm text-stone-500">{o.country === "NG" ? "🇳🇬 Nigeria" : "🇬🇭 Ghana"} · placed {when(o.created_at)}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="mb-2 font-semibold text-stone-900">Items to pack</h2>
            <ul className="divide-y divide-stone-100 text-sm">
              {o.order_items.map((i) => (
                <li key={i.id} className="flex justify-between gap-3 py-2">
                  <span><span className="text-lg font-bold">{i.quantity} ×</span> {i.product_name} <span className="text-stone-500">({i.variant_label})</span></span>
                  <span className="tabular-nums">{money(i.line_total_minor)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-2 space-y-1 border-t border-stone-200 pt-2 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{money(o.subtotal_minor)}</dd></div>
              <div className="flex justify-between"><dt>Delivery ({a.zone_name})</dt><dd className="tabular-nums">{money(o.delivery_fee_minor)}</dd></div>
              <div className="flex justify-between font-bold"><dt>Total</dt><dd className="tabular-nums">{money(o.total_minor)}</dd></div>
            </dl>
          </section>

          <section className="grid gap-6 rounded-2xl border border-stone-200 bg-white p-5 text-sm sm:grid-cols-2">
            <div>
              <h2 className="mb-2 font-semibold text-stone-900">Deliver to</h2>
              <p className="font-medium">{o.contact_name}</p>
              <p>{a.line1}</p>
              {a.line2 && <p>{a.line2}</p>}
              <p>{a.city} · {a.zone_name}</p>
              {a.landmark && <p className="text-stone-500">Near {a.landmark}</p>}
              {o.notes && <p className="mt-2 rounded bg-amber-50 p-2 text-amber-900">Customer note: {o.notes}</p>}
            </div>
            <div>
              <h2 className="mb-2 font-semibold text-stone-900">Contact</h2>
              <p><PhoneText value={o.contact_phone} /></p>
              <p className="break-all text-stone-600">{o.contact_email}</p>
              <p className="mt-1 text-xs text-stone-500">{o.user_id ? "Registered customer" : "Guest checkout"}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={whatsappLink(phoneDigits, `Hi ${firstName}, this is Suya Factory about your order ${o.order_number}.`)}
                  target="_blank" rel="noopener noreferrer"
                  className="rounded-lg bg-green-600 px-3 py-1.5 font-semibold text-white hover:bg-green-700">💬 WhatsApp</a>
                <a href={telLink(phoneDigits)} className="rounded-lg border border-stone-300 px-3 py-1.5 font-semibold hover:bg-stone-50">📞 Call</a>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-5 text-sm">
            <h2 className="mb-2 font-semibold text-stone-900">History</h2>
            <ol className="space-y-2">
              {o.order_events.map((e) => (
                <li key={e.id} className="flex flex-wrap gap-x-2">
                  <span className="w-36 shrink-0 text-stone-500">{when(e.created_at)}</span>
                  <span className="font-medium">{ORDER_STATUS[e.to_status].label}</span>
                  <span className="text-stone-500">by {e.actor_name ?? "unknown"}</span>
                  {e.note && <span className="w-full pl-0 text-stone-700 sm:pl-38">“{e.note}”</span>}
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-5 text-sm">
            <h2 className="mb-2 font-semibold text-stone-900">Payment attempts</h2>
            {o.payments.length === 0 ? <p className="text-stone-500">None yet.</p> : (
              <ul className="divide-y divide-stone-100">
                {o.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span>
                      <span className="font-medium capitalize">{p.provider === "manual" ? `Manual: ${PAYMENT_METHODS[p.raw_response?.method ?? "other"]}` : p.provider}</span>
                      <span className="ml-2 font-mono text-xs text-stone-500">{p.raw_response?.reference ?? p.reference}</span>
                    </span>
                    <span className={p.status === "success" ? "font-semibold text-green-700" : "text-stone-500"}>
                      {p.status} · {formatMoney(p.amount_minor, p.currency)} · {when(p.verified_at ?? p.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border-2 border-orange-200 bg-white p-5">
            <h2 className="mb-3 font-semibold text-stone-900">Next step</h2>
            <StatusActions {...ids} status={o.status} isAdmin={isAdmin} />
          </section>

          {isAdmin && o.status === "pending_payment" && (
            <section className="rounded-2xl border border-stone-200 bg-white p-5">
              <h2 className="mb-1 font-semibold text-stone-900">Record an offline payment</h2>
              <p className="mb-3 text-xs text-stone-500">Only after the money has actually arrived (mobile money, bank transfer, cash).</p>
              <ManualPayment {...ids} amount={money(o.total_minor)} />
            </section>
          )}

          <section className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 className="mb-2 font-semibold text-stone-900">Staff notes</h2>
            <StaffNotes {...ids} notes={o.staff_notes} />
          </section>

          <Link href={`/orders/${o.access_token}`} target="_blank" className="block text-center text-sm text-stone-600 hover:text-orange-700">
            View the customer&apos;s order page ↗
          </Link>
        </aside>
      </div>
    </div>
  );
}
