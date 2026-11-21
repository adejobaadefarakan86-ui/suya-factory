"use client";
import Link from "next/link";
import { GH_HOURS_TEXT, ghPickupStatus } from "@/lib/gh-hours";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { cart, useCartLines, usePruneCart } from "@/lib/cart";
import { formatMoney, type Currency } from "@/lib/money";
import type { CountryCode } from "@/lib/countries";
import { isInServiceArea, SERVICE_AREAS } from "@/lib/service-areas";
import { BulkNotice, BULK_MIN_GRAMS, cartGrams } from "@/components/bulk-notice";
import { Field, buttonClass } from "@/components/field";
import type { CartItemInfo } from "../cart/cart-view";
import { placeOrder, quoteDelivery, type CheckoutState, type DeliveryQuote } from "./actions";
import { LocationPicker, type PickedLocation } from "./location-picker";

// "KFC Ikeja, 12 Obafemi Awolowo Way, Ikeja": the place name plus Google's address.
function addressLine(loc: PickedLocation) {
  const line = loc.address.startsWith(loc.name) ? loc.address : `${loc.name}, ${loc.address}`;
  return line.slice(0, 200);
}

type QuoteState =
  | { status: "none" }                         // no address yet
  | { status: "loading" }
  | { status: "ready"; quote: DeliveryQuote }  // quote null = staff will price it after ordering
  | { status: "error" };

const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

export function CheckoutForm({
  items,
  country,
  countryName,
  currency,
  defaults,
  loggedIn,
}: {
  items: Record<string, CartItemInfo>;
  country: CountryCode;
  countryName: string;
  currency: Currency;
  defaults: { name: string; email: string; phone: string };
  loggedIn: boolean;
}) {
  const router = useRouter();
  const lines = useCartLines();
  usePruneCart(Object.keys(items)); // remove discontinued items from the browser's cart
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [quote, setQuote] = useState<QuoteState>({ status: "none" });
  const quoteFor = useRef<PickedLocation | null>(null); // ignore answers for an older pin
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrder, undefined);

  const placed = state && "token" in state ? state : null;
  const failed = state && "error" in state ? state : null;

  // Order saved: empty the cart, then straight to payment (automatic delivery
  // price) or to the order page (staff will price the delivery first).
  useEffect(() => {
    if (!placed) return;
    cart.clear();
    // A full page load on purpose: /pay is a route handler that redirects to Paystack.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (placed.payNow) window.location.assign(`/orders/${placed.token}/pay`);
    else router.replace(`/orders/${placed.token}`);
  }, [placed, router]);

  // New pin: ask the database for the delivery price to it.
  function chooseLocation(loc: PickedLocation) {
    setLocation(loc);
    quoteFor.current = loc;
    if (!isInServiceArea(country, loc.lat, loc.lng)) {
      setQuote({ status: "none" });
      return;
    }
    setQuote({ status: "loading" });
    quoteDelivery(country, loc.lat, loc.lng).then(
      (q) => quoteFor.current === loc && setQuote({ status: "ready", quote: q }),
      () => quoteFor.current === loc && setQuote({ status: "error" }),
    );
  }

  if (placed) {
    return (
      <p role="status" className="mt-6 text-muted">
        Order {placed.orderNumber} placed! {placed.payNow ? "Taking you to payment…" : "Taking you to it…"}
      </p>
    );
  }

  const rows = lines
    .map((line) => ({ ...line, info: items[line.variantId] }))
    .filter((row) => row.info !== undefined);

  if (rows.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-line bg-surface p-8 text-center">
        <p className="text-muted">Your cart is empty.</p>
        <Link href="/shop" className="mt-4 inline-block rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:bg-accent-strong">
          Browse the shop
        </Link>
      </div>
    );
  }

  if (rows.some((r) => r.info.price === null)) {
    return (
      <div className="mt-6 rounded-2xl bg-amber-50 p-6 text-amber-900">
        Some items in your cart aren&apos;t available in {countryName}.{" "}
        <Link href="/cart" className="font-semibold underline">Go back to your cart</Link> to remove them.
      </div>
    );
  }

  // 1kg+ is a bulk order: nothing to fill in here.
  const grams = cartGrams(rows);
  if (grams >= BULK_MIN_GRAMS) {
    return (
      <div className="mt-6 max-w-xl space-y-3">
        <BulkNotice reason="weight" grams={grams} />
        <Link href="/cart" className="inline-block text-sm text-muted hover:text-accent-strong">← Back to cart</Link>
      </div>
    );
  }

  // Regular orders are delivered inside our home region only (Lagos State / Greater Accra).
  const outsideArea = location !== null && !isInServiceArea(country, location.lat, location.lng);
  const subtotal = rows.reduce((sum, r) => sum + (r.info.price ?? 0) * r.quantity, 0);
  // Automatic delivery price (Nigeria): paid online with the kilishi.
  const autoFee = quote.status === "ready" && quote.quote && !quote.quote.payRider ? quote.quote : null;
  // Courier's price (Ghana, Dawurobo): shown now, paid to the rider on arrival.
  const riderFee = quote.status === "ready" && quote.quote?.payRider ? quote.quote : null;
  const total = subtotal + (autoFee?.feeMinor ?? 0);
  const ready = location !== null && !outsideArea && quote.status === "ready";
  const v = failed?.values;

  return (
    <form action={action} className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem]">
      {/* What we send besides the visible fields */}
      <input type="hidden" name="country" value={country} />
      <input type="hidden" name="items" value={JSON.stringify(rows.map(({ variantId, quantity }) => ({ variant_id: variantId, quantity })))} />
      <input type="hidden" name="expectedTotal" value={total} />
      <input type="hidden" name="deliveryFee" value={autoFee?.feeMinor ?? 0} />
      <input type="hidden" name="lat" value={location?.lat ?? ""} />
      <input type="hidden" name="lng" value={location?.lng ?? ""} />
      <input type="hidden" name="accuracy" value={location?.accuracy ?? ""} />
      {/* Filled in from the place the customer picked on the map */}
      <input type="hidden" name="line1" value={location ? addressLine(location) : ""} />
      <input type="hidden" name="city" value={location ? location.city || location.address.split(",").at(-2)?.trim() || countryName : ""} />

      <div className="space-y-6">
        <fieldset className="space-y-4 rounded-2xl border border-line bg-surface p-6">
          <legend className="px-1 text-lg font-semibold text-ink">Your details</legend>
          {!loggedIn && (
            <p className="text-sm text-muted">
              Checking out as a guest.{" "}
              <Link href="/login?next=/checkout" className="font-medium text-accent-strong hover:underline">Log in</Link>{" "}
              to keep track of your orders.
            </p>
          )}
          <Field label="Full name" name="name" autoComplete="name" defaultValue={v?.name ?? defaults.name} required maxLength={100} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={v?.email ?? defaults.email} required maxLength={200} />
            <Field label="Phone" name="phone" type="tel" autoComplete="tel" defaultValue={v?.phone ?? defaults.phone} required maxLength={20}
              hint="Our rider will call this number on delivery." />
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-2xl border border-line bg-surface p-6">
          <legend className="px-1 text-lg font-semibold text-ink">Delivery in {countryName}</legend>
          <LocationPicker country={country} value={location} onChange={chooseLocation} />
          {outsideArea && <BulkNotice reason="outside_area" area={SERVICE_AREAS[country].name} />}
          {location && !outsideArea && (
            <>
              <Field label="House / flat number, estate (optional)" name="line2" autoComplete="address-line2" defaultValue={v?.line2} maxLength={200}
                placeholder="e.g. Flat 3B, Block 4" />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink">Notes for the rider (optional)</span>
                <textarea name="notes" rows={2} maxLength={500} defaultValue={v?.notes} className={inputClass}
                  placeholder="e.g. Blue gate opposite the pharmacy" />
              </label>
            </>
          )}
        </fieldset>
      </div>

      <aside className="h-fit space-y-4 rounded-2xl border border-line bg-surface p-6 lg:sticky lg:top-6">
        <h2 className="text-lg font-semibold text-ink">Your order</h2>
        <ul className="divide-y divide-line text-sm">
          {rows.map(({ variantId, quantity, info }) => (
            <li key={variantId} className="flex justify-between gap-3 py-2">
              <span>
                <span className="font-medium text-ink">{quantity} × {info.productName}</span>
                <span className="block text-muted">{info.label}</span>
              </span>
              <span className="tabular-nums">{formatMoney((info.price ?? 0) * quantity, currency)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1.5 border-t border-line pt-3 text-sm">
          <div className="flex justify-between"><dt>Kilishi</dt><dd className="tabular-nums">{formatMoney(subtotal, currency)}</dd></div>
          <div className="flex justify-between gap-3">
            <dt>Delivery{autoFee?.km ? <span className="text-muted"> · {autoFee.km} km</span> : null}{riderFee && !riderFee.ownRider ? <span className="text-muted"> · pay the rider</span> : null}</dt>
            <dd className="text-right tabular-nums">
              {quote.status === "none" && <span className="text-muted">{outsideArea ? "—" : "Add your address"}</span>}
              {quote.status === "loading" && <span className="inline-block h-4 w-16 animate-pulse rounded bg-cream align-middle" />}
              {quote.status === "error" && (
                <button type="button" onClick={() => location && chooseLocation(location)} className="text-accent-strong underline">
                  Try again
                </button>
              )}
              {quote.status === "ready" && (autoFee ? formatMoney(autoFee.feeMinor, currency)
                : riderFee?.ownRider ? <span className="text-muted">Your own rider</span>
                : riderFee ? <span className="text-muted">{formatMoney(riderFee.feeMinor, currency)}</span>
                : <span className="text-muted">After you order</span>)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-lg font-bold">
            <dt>{riderFee ? "To pay now (MoMo)" : "Total"}</dt><dd className="tabular-nums">{formatMoney(total, currency)}</dd>
          </div>
        </dl>
        {quote.status === "error" && (
          <p role="alert" className="text-sm text-red-700">We couldn&apos;t work out the delivery price. Please try again.</p>
        )}
        {riderFee?.ownRider && (
          <div className="rounded-lg bg-sky-50 p-3 text-sm text-sky-950">
            <p className="font-semibold">You book your own rider (Bolt, Uber, Yango, Qargo…)</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5">
              <li>Pay for your kilishi by Mobile Money.</li>
              <li>Once we confirm it, book a delivery in your app from our pickup point (we show you the address).</li>
              <li>Pay the rider in the app or in cash, like any ride.</li>
            </ol>
            <p className="mt-2 text-xs">Pickup hours: {GH_HOURS_TEXT}</p>
            {(() => {
              const s = ghPickupStatus();
              return s.open ? null : <p className="mt-1 font-semibold">⏰ Pickup is closed now. You can still order: your rider can collect {s.opens}.</p>;
            })()}
          </div>
        )}
        {riderFee && !riderFee.ownRider && (
          <div className="rounded-lg bg-sky-50 p-3 text-sm text-sky-950">
            <p className="font-semibold">Delivered by Dawurobo: {formatMoney(riderFee.feeMinor, currency)}, paid to the rider</p>
            <p className="mt-1">
              {riderFee.when ? <><strong>{riderFee.when}.</strong> </> : null}You pay for your kilishi now by Mobile Money,
              and the delivery fee to the rider when they arrive.
            </p>
          </div>
        )}
        {quote.status === "ready" && !autoFee && !riderFee && (
          <div className="rounded-lg bg-sky-50 p-3 text-sm text-sky-950">
            <p className="font-semibold">Delivery fee: confirmed after you order</p>
            <p className="mt-1">
              We check the delivery price to your pin and show it to you <strong>before you pay</strong>. You pay the
              rider on arrival. Not happy with the price? You can cancel for free.
            </p>
          </div>
        )}

        {failed && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{failed.error}</p>
        )}

        <button type="submit" disabled={pending || !ready} className={buttonClass}>
          {pending ? "Placing order…" : autoFee ? `Pay ${formatMoney(total, currency)}` : riderFee ? "Place order and pay by MoMo" : "Place order"}
        </button>
        <p className="text-xs text-muted">
          {!location
            ? "Add your delivery address to continue."
            : autoFee
              ? "Card, bank transfer or USSD, securely through Paystack."
              : riderFee
                ? "Next you'll see our MoMo number and your order code."
                : "Nothing is charged yet."}
        </p>
        <Link href="/cart" className="block text-center text-sm text-muted hover:text-accent-strong">← Back to cart</Link>
      </aside>
    </form>
  );
}
