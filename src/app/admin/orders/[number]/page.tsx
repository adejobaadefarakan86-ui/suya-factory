import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, type Currency } from "@/lib/money";
import {
  ORDER_STATUS, PAYMENT_METHODS, formatOrderDate, mapsLink,
  type DeliveryStage, type OrderStatus, type PaymentMethod,
} from "@/lib/orders";
import { telLink, toInternationalDigits, whatsappLink } from "@/lib/contacts";
import { COUNTRIES, type CountryCode } from "@/lib/countries";
import { PhoneText } from "@/components/phone-text";
import {
  CopyButton, DeliveryQuoteForm, ManualPayment, SendOutForm, StaffNotes, StageButtons, StatusActions,
} from "./order-actions";

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
  delivery_address: {
    line1: string; line2: string | null; city: string; landmark: string | null; zone_name?: string; // only on orders from before the map pin
    lat?: number; lng?: number; accuracy_m?: number | null;
  };
  notes: string | null;
  staff_notes: string | null;
  delivery_quote_minor: number | null;
  delivery_quote_note: string | null;
  delivery_quoted_at: string | null;
  rider_name: string | null;
  rider_phone: string | null;
  tracking_url: string | null;
  delivery_stage: DeliveryStage | null;
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
  const customerPage = `${process.env.NEXT_PUBLIC_SITE_URL}/orders/${o.access_token}`;
  const hasPin = typeof a.lat === "number" && typeof a.lng === "number";

  // A ready-written WhatsApp message that fits where the order is.
  const waMessage =
    o.status === "pending_payment" && o.delivery_quote_minor !== null
      ? `Hi ${firstName}, this is Suya Factory. The delivery fee for your order ${o.order_number} is ${money(o.delivery_quote_minor)}${o.delivery_fee_minor > 0 ? "" : " (paid to the rider on arrival)"}. You can accept and pay here: ${customerPage}`
      : o.status === "out_for_delivery" && o.rider_name
        ? `Hi ${firstName}, your Suya Factory order ${o.order_number} is on the way with ${o.rider_name}. Follow it here: ${customerPage}`
        : `Hi ${firstName}, this is Suya Factory about your order ${o.order_number}.`;

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
              {o.delivery_fee_minor > 0 && (
                <div className="flex justify-between"><dt>Delivery (paid online)</dt><dd className="tabular-nums">{money(o.delivery_fee_minor)}</dd></div>
              )}
              <div className="flex justify-between font-bold"><dt>Paid online</dt><dd className="tabular-nums">{money(o.total_minor)}</dd></div>
              {o.delivery_fee_minor === 0 && (
                <div className="flex justify-between text-stone-600">
                  <dt>Delivery fee (customer pays rider)</dt>
                  <dd className="tabular-nums">{o.delivery_quote_minor !== null ? money(o.delivery_quote_minor) : "Not set yet"}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="grid gap-6 rounded-2xl border border-stone-200 bg-white p-5 text-sm sm:grid-cols-2">
            <div>
              <h2 className="mb-2 font-semibold text-stone-900">Deliver to</h2>
              <p className="font-medium">{o.contact_name}</p>
              <p>{a.line1}</p>
              {a.line2 && <p>{a.line2}</p>}
              <p>{[a.city, a.zone_name].filter(Boolean).join(" · ")}</p>
              {a.landmark && <p className="text-stone-500">Near {a.landmark}</p>}
              {hasPin ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={mapsLink(a.lat!, a.lng!)} target="_blank" rel="noopener noreferrer"
                    className="rounded-lg bg-stone-900 px-3 py-1.5 font-semibold text-white hover:bg-stone-700">📍 Open in Google Maps</a>
                  <CopyButton value={`${a.lat}, ${a.lng}`} label="Copy coordinates" />
                  {a.accuracy_m ? <span className="self-center text-xs text-stone-500">GPS accuracy about {a.accuracy_m}m</span> : <span className="self-center text-xs text-stone-500">Pin placed on map</span>}
                </div>
              ) : (
                <p className="mt-2 text-xs text-stone-500">No map pin (older order).</p>
              )}
              {o.notes && <p className="mt-2 rounded bg-amber-50 p-2 text-amber-900">Customer note: {o.notes}</p>}
            </div>
            <div>
              <h2 className="mb-2 font-semibold text-stone-900">Contact</h2>
              <p><PhoneText value={o.contact_phone} /></p>
              <p className="break-all text-stone-600">{o.contact_email}</p>
              <p className="mt-1 text-xs text-stone-500">{o.user_id ? "Registered customer" : "Guest checkout"}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={whatsappLink(phoneDigits, waMessage)}
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
                  <span className="font-medium">{e.from_status === e.to_status ? "Update" : ORDER_STATUS[e.to_status].label}</span>
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

          {(o.status === "awaiting_quote" || o.status === "pending_payment") && (
            <section className={`rounded-2xl border-2 bg-white p-5 ${o.status === "awaiting_quote" ? "border-sky-300" : "border-stone-200"}`}>
              <h2 className="mb-1 font-semibold text-stone-900">Delivery price</h2>
              <p className="mb-3 text-xs text-stone-500">
                Open the pin in your delivery app, check the price, enter it here. The customer sees it at once and decides
                whether to pay. Valid for 6 hours.
              </p>
              <DeliveryQuoteForm {...ids} currencySymbol={COUNTRIES[o.country].symbol} current={o.delivery_quote_minor} />
              {o.status === "pending_payment" && (
                <a href={whatsappLink(phoneDigits, waMessage)} target="_blank" rel="noopener noreferrer"
                  className="mt-3 block rounded-lg bg-green-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-green-700">
                  💬 Tell the customer on WhatsApp
                </a>
              )}
            </section>
          )}

          {(o.status === "preparing" || o.status === "out_for_delivery") && (
            <section className="rounded-2xl border-2 border-indigo-200 bg-white p-5">
              <h2 className="mb-3 font-semibold text-stone-900">{o.status === "preparing" ? "Send out for delivery" : "Rider"}</h2>
              {o.status === "out_for_delivery" && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-medium uppercase text-stone-500">Rider progress (customer sees this)</p>
                  <StageButtons {...ids} stage={o.delivery_stage} />
                </div>
              )}
              <SendOutForm {...ids} rider={o.rider_name ? { name: o.rider_name, phone: o.rider_phone, trackingUrl: o.tracking_url } : null} />
              {o.status === "out_for_delivery" && o.rider_phone && (
                <a href={telLink(toInternationalDigits(o.rider_phone, o.country))}
                  className="mt-3 block rounded-lg border border-stone-300 px-3 py-2 text-center text-sm font-semibold hover:bg-stone-50">
                  📞 Call the rider
                </a>
              )}
            </section>
          )}

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
