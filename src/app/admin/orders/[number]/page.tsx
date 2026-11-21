// One order, for staff. Kept simple: what to do now, what to pack, who it's for.
// Ghana: customers pay by MoMo and book their own rider; our part ends when
// Gloria hands the kilishi to that rider.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, type Currency } from "@/lib/money";
import { ORDER_STATUS, formatOrderDate, mapsLink, statusLabel, type OrderStatus } from "@/lib/orders";
import { telLink, toInternationalDigits, whatsappLink } from "@/lib/contacts";
import type { CountryCode } from "@/lib/countries";
import { PhoneText } from "@/components/phone-text";
import { CancelOrder, StaffNotes } from "./order-actions";
import { HandOverButton, MomoButtons, RefundedButton } from "./now-actions";

export const metadata = { title: "Order · Admin · Suya Factory" };

type Order = {
  id: string;
  order_number: string;
  status: OrderStatus;
  created_at: string;
  contact_name: string;
  contact_phone: string;
  country: CountryCode;
  currency: Currency;
  delivery_address: { line1: string; line2: string | null; city: string; landmark: string | null; lat?: number; lng?: number };
  notes: string | null;
  staff_notes: string | null;
  total_minor: number;
  access_token: string;
  own_rider: boolean;
  momo_claimed_at: string | null;
  momo_claim_rejected_at: string | null;
  momo_paid_from: string | null;
  momo_claim_ref: string | null;
  pickup_code: string | null;
  rider_name: string | null;
  rider_phone: string | null;
  rider_plate: string | null;
  rider_company: string | null;
  refund_due_minor: number | null;
  refunded_at: string | null;
  refunded_by: string | null;
  cancel_reason: string | null;
  order_items: { id: string; product_name: string; variant_label: string; quantity: number; line_total_minor: number }[];
  payments: { status: string }[];
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
  if (!/^SF-\d+$/.test(number)) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*), payments(status)")
    .eq("order_number", number)
    .maybeSingle();
  if (error) return <p className="mt-4 text-red-700">Couldn&apos;t load the order: {error.message}</p>;
  if (!data) notFound();

  const o = data as unknown as Order;
  const money = (n: number) => formatMoney(n, o.currency);
  const a = o.delivery_address;
  const phoneDigits = toInternationalDigits(o.contact_phone, o.country);
  const firstName = o.contact_name.split(" ")[0];
  const customerPage = `${process.env.NEXT_PUBLIC_SITE_URL}/orders/${o.access_token}`;
  const handedOver = o.own_rider && (o.status === "out_for_delivery" || o.status === "delivered");

  const waMessage = handedOver
    ? `Hi ${firstName}, your Suya Factory order ${o.order_number} has been handed to your rider${o.rider_name ? ` (${o.rider_name})` : ""}. Enjoy! ${customerPage}`
    : `Hi ${firstName}, this is Suya Factory about your order ${o.order_number}: ${customerPage}`;

  return (
    <div className="mt-4 max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-stone-900">{o.order_number}</h1>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${ORDER_STATUS[o.status].className}`}>
          {statusLabel(o.status, o.own_rider)}
        </span>
        <span className="text-sm text-stone-500">{o.country === "NG" ? "🇳🇬" : "🇬🇭"} {formatOrderDate(o.created_at, o.country)}</span>
      </div>

      {/* 1. What to do now */}
      <section className="rounded-2xl border-2 border-orange-300 bg-orange-50/60 p-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-orange-800">What to do now</h2>
        <NowBox o={o} money={money} handedOver={handedOver} />
      </section>

      {/* 2. What to pack */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="mb-2 font-semibold text-stone-900">Pack</h2>
        <ul className="space-y-1">
          {o.order_items.map((i) => (
            <li key={i.id} className="text-lg">
              <span className="font-bold">{i.quantity} ×</span> {i.variant_label} <span className="text-sm text-stone-500">{i.product_name}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 border-t border-stone-100 pt-2 text-sm">Paid: <strong>{money(o.total_minor)}</strong></p>
      </section>

      {/* 3. Customer */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5 text-sm">
        <h2 className="mb-2 font-semibold text-stone-900">Customer</h2>
        <p className="text-base font-medium">{o.contact_name} · <PhoneText value={o.contact_phone} /></p>
        <p className="mt-1 text-stone-600">
          Going to: {[a.line1, a.line2, a.landmark ? `near ${a.landmark}` : ""].filter(Boolean).join(", ")}
          {typeof a.lat === "number" && typeof a.lng === "number" && (
            <> · <a href={mapsLink(a.lat, a.lng)} target="_blank" rel="noopener noreferrer" className="text-orange-700 underline">map</a></>
          )}
        </p>
        {o.notes && <p className="mt-2 rounded bg-amber-50 p-2 text-amber-900">Their note: {o.notes}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={whatsappLink(phoneDigits, waMessage)} target="_blank" rel="noopener noreferrer"
            className="rounded-lg bg-green-600 px-3 py-1.5 font-semibold text-white hover:bg-green-700">💬 WhatsApp</a>
          <a href={telLink(phoneDigits)} className="rounded-lg border border-stone-300 px-3 py-1.5 font-semibold hover:bg-stone-50">📞 Call</a>
          <Link href={`/orders/${o.access_token}`} target="_blank" className="self-center text-stone-600 hover:text-orange-700">
            Their order page ↗
          </Link>
        </div>
      </section>

      {/* 4. Extras, folded away */}
      <details className="rounded-2xl border border-stone-200 bg-white p-5 text-sm">
        <summary className="cursor-pointer font-semibold text-stone-900">Staff notes{user.role === "admin" ? " · cancel order" : ""}</summary>
        <div className="mt-3 space-y-4">
          <StaffNotes orderId={o.id} orderNumber={o.order_number} notes={o.staff_notes} />
          {user.role === "admin" && o.status !== "cancelled" && !handedOver && (
            <CancelOrder orderId={o.id} orderNumber={o.order_number} paid={o.payments.some((p) => p.status === "success")} />
          )}
        </div>
      </details>
    </div>
  );
}

function NowBox({ o, money, handedOver }: { o: Order; money: (n: number) => string; handedOver: boolean }) {
  const amount = money(o.total_minor);

  if (o.status === "cancelled") {
    const refundDue = o.refund_due_minor !== null && !o.refunded_at;
    return (
      <div className="space-y-3">
        <p className="text-lg font-semibold">🚫 Cancelled{o.cancel_reason ? <>: “{o.cancel_reason}”</> : null}</p>
        {refundDue ? (
          <>
            <p>
              <strong>Refund {money(o.refund_due_minor!)}</strong> within 2 days, ONLY to the number the money came from
              (check the MoMo statement). They said: <strong>{o.momo_paid_from ?? "not given"}</strong>.
              {!o.payments.some((p) => p.status === "success") && " Payment was never confirmed: if nothing arrived, there's nothing to refund."}
            </p>
            <RefundedButton orderNumber={o.order_number} amount={money(o.refund_due_minor!)} />
          </>
        ) : o.refunded_at ? (
          <p>✅ Refund sent by {o.refunded_by}.</p>
        ) : (
          <p>Nothing to do.</p>
        )}
      </div>
    );
  }

  if (!o.own_rider) {
    // Older orders (before customers booked their own rider).
    return <p>{statusLabel(o.status, false)}. This is an older order: nothing to do here.</p>;
  }

  if (o.status === "pending_payment" && o.momo_claimed_at) {
    return (
      <div className="space-y-3">
        <p className="text-lg">
          💸 Customer says they sent <strong>{amount}</strong> from <strong>{o.momo_paid_from ?? "their MoMo"}</strong>
          {o.momo_claim_ref ? <> (ref {o.momo_claim_ref})</> : null}. Check the MoMo.
        </p>
        <MomoButtons orderNumber={o.order_number} amount={amount} />
      </div>
    );
  }
  if (o.status === "pending_payment" || o.status === "awaiting_quote") {
    return <p>⏳ Not paid yet{o.momo_claim_rejected_at ? " (we said we didn't receive it; they're checking)" : ""}. Nothing to do.</p>;
  }
  if (o.status === "paid") {
    return <p>🛵 Paid. Waiting for the customer to book their rider. You&apos;ll get the rider&apos;s details on Telegram.</p>;
  }
  if (o.status === "preparing") {
    return (
      <div className="space-y-3">
        <p className="text-lg">
          🛵 <strong>{o.rider_name}</strong> · <PhoneText value={o.rider_phone ?? ""} />
          {o.rider_company || o.rider_plate ? <span className="text-stone-600"> · {[o.rider_company, o.rider_plate].filter(Boolean).join(" · ")}</span> : null}
        </p>
        <p>
          Pickup code: <span className="rounded-lg bg-white px-3 py-1 text-2xl font-bold tracking-[0.3em] ring-1 ring-orange-200">{o.pickup_code}</span>
        </p>
        <p className="text-sm text-stone-600">Hand it over only when the rider says this code.</p>
        <HandOverButton orderNumber={o.order_number} rider={o.rider_name ?? "the rider"} />
      </div>
    );
  }
  if (handedOver) {
    return <p className="text-lg">✅ Handed to the rider{o.rider_name ? ` (${o.rider_name})` : ""}. Done.</p>;
  }
  return <p>{statusLabel(o.status, o.own_rider)}.</p>;
}
