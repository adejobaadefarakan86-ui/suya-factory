// One order, opened with its secret link code (works for guests too).
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { formatMoney } from "@/lib/money";
import {
  DELIVERY_STAGES, ORDER_JOURNEY, ORDER_STATUS, formatOrderDate, isOrderToken, type OrderView,
} from "@/lib/orders";
import { telLink, toInternationalDigits, whatsappLink } from "@/lib/contacts";
import { AutoRefresh } from "@/components/auto-refresh";
import { PhoneText } from "@/components/phone-text";
import { cancelOrder, claimMomoPayment, payWithPaystack, requestNewQuote, setOwnRider } from "./actions";
import { OwnRiderStep } from "./own-rider";
import { type DetailRow } from "@/components/delivery-details";
import { localPhone } from "@/lib/contacts";
import { GH_DELIVERY_COMPANIES } from "@/lib/delivery-companies";
import { GH_PICKUP } from "@/lib/dawurobo";
import { after } from "next/server";
import { GH_MOMO, syncCourierIfStale } from "@/lib/ghana-orders";
import { PayButton } from "./pay-button";
import { ConfirmButton } from "./confirm-button";

// Private page: keep it out of search engines.
export const metadata = { title: "Your order · Suya Factory", robots: { index: false, follow: false } };

const STEP_LABELS = ["Order placed", "Delivery price", "Paid", "Being prepared", "Out for delivery", "Delivered"];

const PAYMENT_MESSAGES: Record<string, { text: string; className: string }> = {
  failed: { text: "Your payment didn't go through, so you haven't been charged. Please try again.", className: "bg-red-50 text-red-900" },
  pending: { text: "Your payment is still being processed (this can happen with bank transfers). Refresh this page in a minute or two.", className: "bg-blue-50 text-blue-900" },
  unavailable: { text: "We couldn't reach the payment service just now. Please try again in a moment.", className: "bg-red-50 text-red-900" },
  error: { text: "Something went wrong checking your payment. If money left your account, don't worry: it will show here once confirmed. Otherwise, please try again.", className: "bg-red-50 text-red-900" },
  too_many_attempts: { text: "There have been too many payment attempts for this order. Please contact us and we'll help.", className: "bg-red-50 text-red-900" },
  accept_delivery: { text: "Please tick the box to accept the delivery fee before paying.", className: "bg-amber-50 text-amber-900" },
  quote_expired: { text: "The delivery price has expired. Please ask for a new one below.", className: "bg-amber-50 text-amber-900" },
  rider_name: { text: "Please enter your rider's name.", className: "bg-red-50 text-red-900" },
  rider_phone: { text: "Please enter your rider's phone number (7 to 15 digits).", className: "bg-red-50 text-red-900" },
  cannot_cancel: { text: "This order can't be cancelled here any more. Please contact us.", className: "bg-red-50 text-red-900" },
};

export default function OrderPage(props: PageProps<"/orders/[token]">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-stone-200" />}>
        <OrderDetails params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

type OrderPageProps = PageProps<"/orders/[token]">;

async function OrderDetails({ params, searchParams }: Pick<OrderPageProps, "params" | "searchParams">) {
  const { token } = await params;
  if (!isOrderToken(token)) notFound();

  const { data, error } = await createPublicClient().rpc("get_order_by_token", { p_token: token });
  if (error) throw new Error(`Could not load the order: ${error.message}`);
  if (!data) notFound();

  const order = data as OrderView;
  const status = ORDER_STATUS[order.status];
  const money = (n: number) => formatMoney(n, order.currency);
  const when = (iso: string) => formatOrderDate(iso, order.country);
  const a = order.delivery_address;
  const firstName = order.contact_name.split(" ")[0];
  // Nigeria pays online (Paystack); Ghana sends MoMo to our number for now.
  const canPayOnline = order.currency === "NGN";
  // Ghana + Dawurobo: fetch the latest delivery status in the background (at most once a minute).
  if (order.courier && (order.status === "preparing" || order.status === "out_for_delivery")) {
    after(() => syncCourierIfStale(order.order_number));
  }
  const quote = order.delivery_quote_minor;
  // Delivery paid online with the kilishi (automatic price) vs. paid to the rider.
  const deliveryOnline = order.delivery_fee_minor > 0;

  // Result of an action, passed back in the link (?payment=...). Display only.
  const { payment } = await searchParams;
  const message = PAYMENT_MESSAGES[String(payment)];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">{when(order.created_at)}</p>
          <h1 className="text-3xl font-bold text-stone-900">Order {order.order_number}</h1>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${status.className}`}>{status.label}</span>
      </div>

      {order.status !== "cancelled" && <Timeline order={order} />}

      {/* Keep the status up to date by itself until the order is finished. */}
      {order.status !== "delivered" && order.status !== "cancelled" && <AutoRefresh seconds={30} />}

      {message && (order.status === "pending_payment" || order.status === "awaiting_quote" || payment === "cannot_cancel"
        || ((order.status === "paid" || order.status === "preparing") && order.own_rider)) && (
        <p role="status" className={`mt-6 rounded-2xl p-4 text-sm ${message.className}`}>{message.text}</p>
      )}

      {/* 1. Waiting for staff to check the delivery price */}
      {order.status === "awaiting_quote" && (
        <div className="mt-6 rounded-2xl bg-sky-50 p-5 text-sky-950">
          <p className="font-semibold">Thank you, {firstName}! We&apos;re checking the delivery price to your location.</p>
          <p className="mt-1 text-sm">
            This page updates by itself as soon as the price is ready. You&apos;ll see it <strong>before</strong> you pay
            anything. Keep this page open, or bookmark it and come back.
          </p>
        </div>
      )}

      {/* 2. Price ready: accept & pay, ask for a new price, or cancel */}
      {order.status === "pending_payment" && quote !== null && (
        <div className="mt-6 space-y-4 rounded-2xl border-2 border-orange-200 bg-orange-50 p-5 text-orange-950">
          {order.own_rider ? (
            <div>
              <p className="text-sm">To pay by MoMo</p>
              <p className="text-3xl font-bold tabular-nums">{money(order.total_minor)}</p>
              <p className="text-sm">After we confirm it, you book your own rider (Bolt, Uber, Yango, Qargo…) to collect it from us.</p>
            </div>
          ) : (
          <div>
            <p className="text-sm">{deliveryOnline ? "Total to pay" : "Delivery fee to your location"}</p>
            <p className="text-3xl font-bold tabular-nums">{money(deliveryOnline ? order.total_minor : quote)}</p>
            <p className="text-sm">
              {deliveryOnline
                ? `Kilishi ${money(order.subtotal_minor)} + delivery ${money(order.delivery_fee_minor)}.`
                : `Paid to the rider when they arrive.${order.delivery_quote_note ? ` ${order.delivery_quote_note}` : ""}`}
            </p>
            {order.quote_expires_at && !order.quote_expired && (
              <p className="mt-1 text-xs text-orange-900/70">Price valid until {when(order.quote_expires_at)}.</p>
            )}
          </div>
          )}

          {order.quote_expired ? (
            <form action={requestNewQuote.bind(null, token)}>
              <p className="mb-2 text-sm">This price has expired, because delivery prices change during the day.</p>
              <button className="rounded-lg bg-orange-700 px-4 py-2.5 font-semibold text-white hover:bg-orange-800">
                Get a new delivery price
              </button>
            </form>
          ) : canPayOnline ? (
            <form action={payWithPaystack.bind(null, token)} className="space-y-3">
              {deliveryOnline ? (
                <input type="hidden" name="acceptDelivery" value="yes" />
              ) : (
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" name="acceptDelivery" value="yes" required className="mt-0.5 h-4 w-4 accent-orange-700" />
                  <span>I accept the delivery fee of <strong>{money(quote)}</strong>, which I&apos;ll pay to the rider on arrival.</span>
                </label>
              )}
              <PayButton label={deliveryOnline ? `Pay ${money(order.total_minor)}` : `Pay ${money(order.total_minor)} for my kilishi`} />
              <p className="text-xs">Card, bank transfer or USSD, securely through Paystack.</p>
            </form>
          ) : order.momo_claimed_at ? (
            <div className="rounded-xl bg-white/70 p-4 text-sm">
              <p className="font-semibold">⏳ Thanks! We&apos;re checking your MoMo payment.</p>
              <p className="mt-1">
                This usually takes a few minutes during the day. As soon as we see it,{" "}
                {order.own_rider ? "this page shows you where to send your rider." : "we book your Dawurobo rider and this page updates by itself."}
              </p>
            </div>
          ) : (
            <MomoPay order={order} token={token} quote={quote} />
          )}
        </div>
      )}

      {order.can_cancel && (
        <form action={cancelOrder.bind(null, token)} className="mt-3 text-right">
          <ConfirmButton label="Cancel this order" confirmText="Cancel this order? You can order again any time."
            className="text-sm font-medium text-stone-600 underline hover:text-red-700" />
        </form>
      )}

      {order.status === "cancelled" && (
        <div className="mt-6 rounded-2xl bg-stone-100 p-5 text-stone-800">
          <p className="font-semibold">This order was cancelled.</p>
          <p className="mt-1 text-sm">Whenever you&apos;re ready, you can <Link href="/shop" className="font-medium text-orange-700 underline">order again</Link>.</p>
        </div>
      )}

      {/* 3a. Ghana, own rider: book it, then show the pickup code */}
      {order.own_rider && (order.status === "paid" || order.status === "preparing") && (
        <OwnRiderSection order={order} token={token} />
      )}

      {/* 3. Paid / being prepared */}
      {!order.own_rider && (order.status === "paid" || order.status === "preparing") && (
        <div className="mt-6 rounded-2xl bg-green-50 p-5 text-green-950">
          <p className="font-semibold">Payment received. Thank you, {firstName}!</p>
          <p className="mt-1 text-sm">
            {order.courier
              ? <>A Dawurobo rider is booked to collect your kilishi.{order.courier_eta ? <> {order.courier_eta}.</> : null}</>
              : order.status === "paid" ? "We're getting your order ready." : "Your kilishi is being packed."} You&apos;ll see your
            rider&apos;s details here once it&apos;s on the way.
            {quote !== null && !deliveryOnline && <> Delivery fee to pay the rider: <strong>{money(quote)}</strong>.</>}
          </p>
        </div>
      )}

      {order.courier_tracking_url && (order.status === "paid" || order.status === "preparing") && (
        <a href={order.courier_tracking_url} target="_blank" rel="noopener noreferrer"
          className="mt-3 inline-block rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800">
          🗺️ Track your delivery
        </a>
      )}

      {/* 4. Rider on the way */}
      {order.status === "out_for_delivery" && order.rider && <RiderCard order={order} />}

      {order.status === "delivered" && (
        <div className="mt-6 rounded-2xl bg-green-50 p-5 text-green-950">
          <p className="font-semibold">Delivered. Enjoy your kilishi, {firstName}! 🎉</p>
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
          {order.delivery_fee_minor > 0 && (
            // Delivery paid online (automatic price, or older zone-based orders).
            <div className="flex justify-between"><dt>Delivery{a.zone_name ? ` (${a.zone_name})` : ""}</dt><dd className="tabular-nums">{money(order.delivery_fee_minor)}</dd></div>
          )}
          <div className="flex justify-between pt-1 text-lg font-bold"><dt>{order.currency === "GHS" ? "Kilishi (pay by MoMo)" : "Paid online"}</dt><dd className="tabular-nums">{money(order.total_minor)}</dd></div>
          {order.own_rider ? (
            <div className="flex justify-between text-stone-600"><dt>Delivery</dt><dd>Your own rider (you pay them)</dd></div>
          ) : order.delivery_fee_minor === 0 && (
            <div className="flex justify-between text-stone-600">
              <dt>Delivery fee (pay the rider)</dt>
              <dd className="tabular-nums">{quote !== null ? money(quote) : "Being checked…"}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="mt-6 grid gap-6 rounded-2xl border border-stone-200 bg-white p-6 text-sm sm:grid-cols-2">
        <div>
          <h2 className="mb-2 text-lg font-semibold text-stone-900">Delivering to</h2>
          <p>{order.contact_name}</p>
          <p>{a.line1}</p>
          {a.line2 && <p>{a.line2}</p>}
          <p>{[a.city, a.zone_name].filter(Boolean).join(" · ")}</p>
          {a.landmark && <p className="text-stone-500">Near {a.landmark}</p>}
          {a.lat !== undefined && <p className="mt-1 text-green-700">📍 Exact location pinned</p>}
        </div>
        <div>
          <h2 className="mb-2 text-lg font-semibold text-stone-900">Contact</h2>
          <p className="break-all">{order.contact_email}</p>
          <p><PhoneText value={order.contact_phone} /></p>
          {order.notes && <p className="mt-3 text-stone-600">Note: {order.notes}</p>}
        </div>
      </section>

      <Link href="/shop" className="mt-8 inline-block text-sm font-medium text-orange-700 hover:underline">
        ← Continue shopping
      </Link>
    </>
  );
}

/** Order placed → Delivery price → Paid → Being prepared → Out for delivery → Delivered, with times. */
function Timeline({ order }: { order: OrderView }) {
  const current = ORDER_JOURNEY.indexOf(order.status);
  const reachedAt = new Map(order.events.filter((e) => e.from_status !== e.status).map((e) => [e.status, e.at]));
  return (
    <ol className="mt-6 grid grid-cols-6 gap-1 text-center text-[11px] sm:text-xs" aria-label="Order progress">
      {ORDER_JOURNEY.map((step, i) => {
        const done = i <= current;
        const at = done ? reachedAt.get(step) : undefined;
        return (
          <li key={step} aria-current={i === current ? "step" : undefined}>
            <div className={`mx-auto mb-1 h-2 rounded-full ${done ? "bg-orange-600" : "bg-stone-200"}`} />
            <span className={done ? "font-semibold text-stone-900" : "text-stone-400"}>{i === 1 && order.own_rider ? "Confirmed" : STEP_LABELS[i]}</span>
            {at && <span className="block text-stone-500">{formatOrderDate(at, order.country)}</span>}
          </li>
        );
      })}
    </ol>
  );
}

/** Rider's name, contact and progress: On the way → Almost there → Arrived. */
function RiderCard({ order }: { order: OrderView }) {
  const rider = order.rider!;
  const digits = toInternationalDigits(rider.phone, order.country);
  const current = DELIVERY_STAGES.findIndex((s) => s.stage === rider.stage);
  const stageAt = new Map(order.events.filter((e) => e.stage).map((e) => [e.stage!, e.at]));

  return (
    <section className="mt-6 rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-5 text-indigo-950">
      <p className="text-sm">Your rider</p>
      <p className="text-2xl font-bold">{rider.name}</p>

      <ol className="mt-4 grid grid-cols-3 gap-2 text-center text-sm" aria-label="Delivery progress">
        {DELIVERY_STAGES.map((s, i) => {
          const done = i <= current;
          const at = done ? stageAt.get(s.stage) : undefined;
          return (
            <li key={s.stage} aria-current={i === current ? "step" : undefined}
              className={`rounded-xl p-2 ${done ? "bg-indigo-600 text-white" : "bg-white text-stone-400"}`}>
              <span className="block text-xl">{s.icon}</span>
              <span className="font-semibold">{s.label}</span>
              {at && <span className="block text-xs opacity-80">{formatOrderDate(at, order.country).split(", ")[1]}</span>}
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex flex-wrap gap-2">
        <a href={telLink(digits)} className="rounded-lg bg-white px-4 py-2 font-semibold text-indigo-900 ring-1 ring-indigo-200 hover:bg-indigo-100">
          📞 Call rider <span className="font-normal"><PhoneText value={rider.phone} /></span>
        </a>
        <a href={whatsappLink(digits, `Hi ${rider.name}, I'm expecting a Suya Factory delivery (order ${order.order_number}).`)}
          target="_blank" rel="noopener noreferrer"
          className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700">💬 WhatsApp rider</a>
        {rider.tracking_url && (
          <a href={rider.tracking_url} target="_blank" rel="noopener noreferrer"
            className="rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white hover:bg-indigo-800">🗺️ Track on map</a>
        )}
      </div>
      {order.delivery_quote_minor !== null && !order.own_rider && (
        <p className="mt-3 text-sm">Delivery fee to pay the rider: <strong>{formatMoney(order.delivery_quote_minor, order.currency)}</strong></p>
      )}
    </section>
  );
}

/** Ghana: send MoMo to our number, then tap "I've paid". */
function MomoPay({ order, token, quote }: { order: OrderView; token: string; quote: number }) {
  const money = (n: number) => formatMoney(n, order.currency);
  return (
    <form action={claimMomoPayment.bind(null, token)} className="space-y-3">
      {order.momo_claim_rejected_at && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">
          We couldn&apos;t find your MoMo payment yet. Please check the number and amount below, then try again, or call
          us on {GH_MOMO.number}.
        </p>
      )}
      <div className="rounded-xl bg-white p-4 text-stone-800 ring-2 ring-orange-300">
        <p className="font-semibold text-stone-900">Pay for your kilishi by Mobile Money</p>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">Send</dt>
            <dd className="text-2xl font-extrabold text-stone-900 tabular-nums">{money(order.total_minor)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">To this MoMo number</dt>
            <dd className="text-2xl font-extrabold tracking-wide text-orange-800 tabular-nums">
              {GH_MOMO.number.replace(/^(\d{3})(\d{3})(\d{4})$/, "$1 $2 $3")}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">Name on the account</dt>
            <dd className="text-lg font-extrabold text-stone-900">
              {GH_MOMO.names[0]} <span className="font-medium text-stone-500">or</span> {GH_MOMO.names[1]}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-sm">
          Check the name before you confirm. If your MoMo asks for a reference, put <strong>{order.order_number}</strong>.
        </p>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">MoMo transaction ID or the number you paid from (optional)</span>
        <input name="reference" maxLength={100} placeholder="e.g. 0241234567 or the ID in your MoMo SMS"
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900" />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="acceptDelivery" value="yes" required className="mt-0.5 h-4 w-4 accent-orange-700" />
        {order.own_rider
          ? <span>I&apos;ll book and pay my own rider (Bolt, Uber, Yango, Qargo or any app) once my payment is confirmed.</span>
          : <span>I accept the Dawurobo delivery fee of <strong>{money(quote)}</strong>, which I&apos;ll pay to the rider on arrival.</span>}
      </label>
      <PayButton label={`I've sent ${money(order.total_minor)} by MoMo`} pendingLabel="Sending…" />
      <p className="text-xs">
        {order.own_rider
          ? "We check the payment, then this page shows where to send your rider."
          : "We check the payment, then book your rider straight away. Deliveries Monday to Saturday."}
      </p>
    </form>
  );
}

/** Ghana: payment confirmed -> book your own rider -> pickup code. */
function OwnRiderSection({ order, token }: { order: OrderView; token: string }) {
  const rider = order.booked_rider;
  const firstName = order.contact_name.split(" ")[0];
  const pickup = {
    text: `Suya Factory (${GH_PICKUP.contactPerson.split(" ")[0]}), ${GH_PICKUP.address}`,
    mapLink: `https://www.google.com/maps/search/?api=1&query=${GH_PICKUP.lat},${GH_PICKUP.lng}`,
    contact: `Your rider can call ${GH_PICKUP.contactPerson.split(" ")[0]} on ${GH_PICKUP.contactPhone}.`,
    lat: GH_PICKUP.lat,
    lng: GH_PICKUP.lng,
    label: "Suya Factory, 1st Addogono Ave",
  };
  const a = order.delivery_address;
  const gloria = GH_PICKUP.contactPerson.split(" ")[0];
  const items = order.items.map((i) => `${i.quantity} × ${i.product_name} ${i.variant_label}`).join(", ");
  // What Bolt / inDrive / Yango / Qargo ask for, in their words.
  const details: DetailRow[] = [
    { label: "From (pickup)", value: GH_PICKUP.address },
    { label: "To (drop-off)", value: [a.line1, a.line2, a.landmark ? `near ${a.landmark}` : ""].filter(Boolean).join(", ") },
    { label: "Sender phone", value: GH_PICKUP.contactPhone },
    { label: "Your phone (recipient)", value: localPhone(order.contact_phone) },
    { label: "Sender name", value: `${gloria} (Suya Factory)`, more: true },
    { label: "Your name (recipient)", value: order.contact_name, more: true },
    { label: "Item", value: `Food: ${items} (sealed, light)`, more: true },
    { label: "Note for the rider", value: `Collect Suya Factory order ${order.order_number} for ${order.contact_name} from ${gloria}.`, more: true },
  ];
  const dropoff = a.lat !== undefined && a.lng !== undefined
    ? { lat: Number(a.lat), lng: Number(a.lng), label: [a.line1, a.line2].filter(Boolean).join(", ") }
    : null;
  return (
    <>
      <div className="mt-6 rounded-2xl bg-green-50 p-5 text-green-950">
        <p className="font-semibold">Payment received. Thank you, {firstName}!</p>
        {rider ? (
          <p className="mt-1 text-sm">
            Your rider <strong>{rider.name}</strong>{rider.company ? <> ({rider.company})</> : null} is coming to collect it.
            Tell them to say this <strong>pickup code</strong> when they arrive:
          </p>
        ) : (
          <p className="mt-1 text-sm">Your kilishi is ready for pickup. Book your rider below.</p>
        )}
        {rider && order.pickup_code && (
          <p className="mt-3 inline-block rounded-xl bg-white px-5 py-2 text-3xl font-bold tracking-[0.3em] text-green-900 ring-1 ring-green-200">
            {order.pickup_code}
          </p>
        )}
      </div>
      {rider ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-orange-700">Need a different rider?</summary>
          <OwnRiderStep action={setOwnRider.bind(null, token)} pickup={pickup} companies={GH_DELIVERY_COMPANIES} current={rider} dropoff={dropoff} details={details} />
        </details>
      ) : (
        <OwnRiderStep action={setOwnRider.bind(null, token)} pickup={pickup} companies={GH_DELIVERY_COMPANIES} current={null} dropoff={dropoff} details={details} />
      )}
    </>
  );
}
