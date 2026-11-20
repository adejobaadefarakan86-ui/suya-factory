// Dawurobo delivery (Ghana): price check, booking a rider, order status.
// Docs: https://docs.dawurobo.com. Server only (uses the signing secret).
//
// Keys live in .env.local (Partner Hub -> API Keys):
//   DAWUROBO_API_KEY         pk_staging_... (test) or pk_production_... (live)
//   DAWUROBO_SIGNING_SECRET  sk_...  signs every request
//   DAWUROBO_WEBHOOK_SECRET  checks Dawurobo's status messages (Partner Hub -> Apps)
import "server-only";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const BASE = "https://delivery.dawurobo.com";

/** Where riders collect Ghana orders (Gloria). Also in delivery_settings for GH. */
export const GH_PICKUP = {
  contactPerson: "Gloria Okai",
  contactPhone: "0530515656",
  address: "1st Addogono Ave (GPS GZ-046-1754), Accra",
  lat: 5.610095,
  lng: -0.089863,
};

export function dawuroboConfigured() {
  return Boolean(process.env.DAWUROBO_API_KEY && process.env.DAWUROBO_SIGNING_SECRET);
}

export class DawuroboError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

/** One signed request: HMAC-SHA256 over METHOD \n PATH \n QUERY \n SHA256(body) \n TIMESTAMP \n NONCE. */
async function call<T>(operation: string, payload: Record<string, unknown>): Promise<T> {
  const key = process.env.DAWUROBO_API_KEY;
  const secret = process.env.DAWUROBO_SIGNING_SECRET;
  if (!key || !secret) throw new DawuroboError(0, "not_configured", "Dawurobo keys are not set in .env.local");

  const path = `/api/v1/delivery/${operation}`;
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomUUID();
  const canonical = ["POST", path, "", createHash("sha256").update(body).digest("hex"), timestamp, nonce].join("\n");
  const signature = createHmac("sha256", secret).update(canonical).digest("hex");

  const res = await fetch(BASE + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": key,
      "X-Signature": signature,
      "X-Timestamp": timestamp,
      "X-Nonce": nonce,
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const json = (await res.json().catch(() => null)) as
    | { status?: string; message?: string; code?: string; error?: { code?: string; message?: string }; data?: T }
    | null;
  if (!res.ok || json?.status !== "success") {
    const code = json?.error?.code ?? json?.code ?? String(res.status);
    const message = json?.error?.message ?? json?.message ?? `HTTP ${res.status}`;
    throw new DawuroboError(res.status, code, message);
  }
  return json.data as T;
}

/** Ghana numbers the way Dawurobo wants them: "0244000000". */
export function localGhanaPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("233")) return "0" + d.slice(3);
  if (d.length === 9) return "0" + d;
  return d;
}

export type DawuroboEstimate = { feeMinor: number; when: string };

/** Delivery price + timing from our pickup point to a pin (GH₵ -> pesewas). */
export async function estimateDelivery(lat: number, lng: number): Promise<DawuroboEstimate> {
  const data = await call<{
    estimated_price: number;
    pickup_description?: string;
    dropoff_description?: string;
    location_coverage?: { delivery_available?: boolean };
  }>("orders.estimate", {
    pickup_location: { coordinates: { lat: GH_PICKUP.lat, lng: GH_PICKUP.lng } },
    delivery_location: { coordinates: { lat, lng } },
  });
  if (data.location_coverage?.delivery_available === false) {
    throw new DawuroboError(200, "not_covered", "Dawurobo doesn't deliver to this location");
  }
  const price = Number(data.estimated_price);
  if (!Number.isFinite(price) || price < 0) throw new DawuroboError(200, "bad_price", "No price in Dawurobo's answer");
  return { feeMinor: Math.round(price * 100), when: pickupDayText() };
}

export type DawuroboBooking = { orderId: string; eta: string; trackingUrl: string | null };

/** Book a rider: collect from Gloria, deliver to the customer, customer pays the fee on arrival. */
export async function createDelivery(o: {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  notes: string | null;
  item: string;
  valueGhs: number;
  feeGhs: number | null;
}): Promise<DawuroboBooking> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const data = await call<{
    order_details: { order_id: string | null; estimated_delivery: string; pickup_date?: string | null; deferred?: { reason?: string } | null };
  }>("orders.create", {
    order_reference: o.orderNumber,
    customer: { name: o.customerName, phone: localGhanaPhone(o.customerPhone) },
    delivery: {
      address: o.address.slice(0, 300),
      city: o.city.slice(0, 100) || "Accra",
      region: "Greater Accra",
      coordinates: { lat: o.lat, lng: o.lng },
      ...(o.notes ? { notes: o.notes.slice(0, 300) } : {}),
    },
    item: o.item.slice(0, 300),
    pickup: {
      address: GH_PICKUP.address,
      contact_person: GH_PICKUP.contactPerson,
      contact_phone: GH_PICKUP.contactPhone,
      coordinates: { lat: GH_PICKUP.lat, lng: GH_PICKUP.lng },
    },
    // Customer pays the rider the delivery fee; the kilishi is already paid (MoMo).
    payment: { payer: "recipient", is_paid: true, ...(o.feeGhs !== null ? { amount: o.feeGhs } : {}) },
    declared_value_ghs: Math.min(Math.max(o.valueGhs, 0), 100000),
    special_instructions: `Suya Factory order ${o.orderNumber}. Food item (kilishi), handle with care.`,
    // Only an https site can receive status updates (not the local dev server).
    ...(site.startsWith("https://") ? { webhook_url: `${site}/api/dawurobo/webhook` } : {}),
  });
  const d = data.order_details;
  if (!d.order_id) throw new DawuroboError(201, "no_order_id", "Dawurobo didn't return an order id");
  const eta = [d.pickup_date ? `Pickup ${friendlyDay(d.pickup_date)}` : "", friendlyEta(d.estimated_delivery)]
    .filter(Boolean)
    .join(", ");
  return { orderId: d.order_id, eta, trackingUrl: `${BASE}/track?order_id=${encodeURIComponent(d.order_id)}` };
}

/**
 * Dawurobo collects orders booked before 08:30 (Accra) the same day, Monday to
 * Saturday; later ones the next working day. Their price check doesn't say so,
 * so we work it out ourselves. Payment still has to be confirmed first.
 */
export function pickupDayText(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Africa/Accra" })
      .formatToParts(now).map((p) => [p.type, p.value]),
  );
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  const sameDay = parts.weekday !== "Sun" && minutes < 8 * 60 + 30;
  if (sameDay) return "Pay before 8:30am and it usually arrives today";
  return parts.weekday === "Sat" || parts.weekday === "Sun" ? "Usually arrives Monday" : "Usually arrives tomorrow";
}

/** "2026-11-21" -> "Sat 21 Nov" */
function friendlyDay(value: string) {
  const t = Date.parse(value + "T12:00:00Z");
  if (Number.isNaN(t)) return value;
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Accra" }).format(t);
}

/** "2026-11-21T00:00:00.000Z" -> "Delivery Sat 21 Nov"; text windows pass through. */
function friendlyEta(value: string) {
  const t = Date.parse(value);
  if (Number.isNaN(t) || !/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
  return "Delivery " + new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Accra" }).format(t);
}

export type DawuroboStatus = { status: string; trackingUrl: string | null };

export async function getDelivery(orderId: string): Promise<DawuroboStatus> {
  const data = await call<{ status: string; tracking_url?: string }>("orders.get", { order_id: orderId });
  return { status: data.status, trackingUrl: data.tracking_url ?? null };
}

/** Dawurobo's many statuses -> what it means for our order. */
export function stageOf(status: string): "picked_up" | "delivered" | "problem" | "other" {
  const s = status.toLowerCase();
  if (/deliver(ed|y_complete)|completed/.test(s) && !/fail|not/.test(s)) return "delivered";
  if (/cancel|reject|return|fail/.test(s)) return "problem";
  if (/pick(ed)?_?up|in_?transit|on_?the_?way|out_?for/.test(s)) return "picked_up";
  return "other";
}

/** Dawurobo signs each status message: HMAC-SHA256 (hex) of the raw body with the webhook secret. */
export function webhookSignatureOk(rawBody: string, signature: string | null) {
  const secret = process.env.DAWUROBO_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const want = createHmac("sha256", secret).update(rawBody).digest("hex");
  const got = signature.replace(/^sha256=/, "").trim().toLowerCase();
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}
