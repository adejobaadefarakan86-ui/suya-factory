// Ghana orders. Server only.
//   Customer pays MoMo to our number -> staff tap "Payment received" in Telegram ->
//   the customer books their OWN rider (Bolt / Yango) with our pickup address and
//   pays the rider -> they enter the rider's details -> Gloria gets them with a
//   pickup code and taps "Handed to rider".
// The Dawurobo route (we book their rider) is kept below, switched off with GH_DELIVERY.
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney, type Currency } from "@/lib/money";
import { esc, sendTelegram, telegramApi, telegramConfigured, type Buttons } from "@/lib/telegram";
import { alertNeedsDeliveryPrice } from "@/lib/staff-alerts";
import {
  createDelivery, DawuroboError, dawuroboConfigured, estimateDelivery, getDelivery, stageOf,
} from "@/lib/dawurobo";

/** "own_rider": the customer books and pays their own rider. "dawurobo": we book Dawurobo (next-day). */
export const GH_DELIVERY: "own_rider" | "dawurobo" = "own_rider";

/** Ghana MoMo: where customers send money for the kilishi. */
export const GH_MOMO = {
  number: "0530515656",
  names: ["SUYA FACTORY", "Gloria Okai"],
};

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "";

type GhOrder = {
  id: string;
  order_number: string;
  status: string;
  currency: Currency;
  contact_name: string;
  contact_phone: string;
  subtotal_minor: number;
  total_minor: number;
  notes: string | null;
  delivery_quote_minor: number | null;
  momo_claim_ref: string | null;
  momo_claimed_at: string | null;
  momo_paid_from: string | null;
  refund_due_minor: number | null;
  refunded_at: string | null;
  courier_order_id: string | null;
  courier_status: string | null;
  courier_synced_at: string | null;
  own_rider: boolean;
  pickup_code: string | null;
  rider_name: string | null;
  rider_phone: string | null;
  rider_plate: string | null;
  rider_company: string | null;
  delivery_address: { line1?: string; line2?: string | null; city?: string; landmark?: string | null; lat?: number; lng?: number };
  order_items: { product_name: string; variant_label: string; quantity: number }[];
};

const FIELDS =
  "id, order_number, status, currency, contact_name, contact_phone, subtotal_minor, total_minor, notes, delivery_quote_minor, momo_claim_ref, momo_claimed_at, momo_paid_from, refund_due_minor, refunded_at, courier_order_id, courier_status, courier_synced_at, own_rider, pickup_code, rider_name, rider_phone, rider_plate, rider_company, delivery_address, order_items(product_name, variant_label, quantity)";

async function loadOrder(match: { id?: string; order_number?: string }) {
  let q = createAdminClient().from("orders").select(FIELDS).eq("country", "GH");
  if (match.id) q = q.eq("id", match.id);
  if (match.order_number) q = q.eq("order_number", match.order_number);
  const { data } = await q.maybeSingle();
  return data as GhOrder | null;
}

// --- 1. Delivery price at order time ---------------------------------------------

/**
 * Straight after ordering. Own rider: no delivery price, straight to payment.
 * Dawurobo: price the delivery with them (falls back to staff pricing it).
 */
export async function autoQuoteGhanaOrder(orderNumber: string) {
  const order = await loadOrder({ order_number: orderNumber });
  if (!order || order.status !== "awaiting_quote") return;
  if (GH_DELIVERY === "own_rider") {
    const { error } = await createAdminClient().rpc("set_own_rider_delivery", { p_order_id: order.id });
    if (error) {
      console.error(`set_own_rider_delivery ${orderNumber}:`, error.message);
      await alertNeedsDeliveryPrice(orderNumber);
    }
    return;
  }
  const { lat, lng } = order.delivery_address;
  try {
    if (!dawuroboConfigured() || lat === undefined || lng === undefined) throw new Error("no Dawurobo keys or pin");
    const est = await estimateDelivery(Number(lat), Number(lng));
    const { error } = await createAdminClient().rpc("set_courier_quote", {
      p_order_id: order.id,
      p_amount_minor: est.feeMinor,
      p_note: `Dawurobo: ${est.when}`,
    });
    if (error) throw new Error(error.message);
  } catch (e) {
    console.error(`Dawurobo price for ${orderNumber} failed:`, e);
    await alertNeedsDeliveryPrice(orderNumber); // staff price it by hand, as before
  }
}

// --- 2. "I've paid" -> staff check ---------------------------------------------------

export const momoButtons = (orderNumber: string): Buttons => [
  [
    { text: "✅ Payment received", callback_data: `momo:ok:${orderNumber}` },
    { text: "❌ Not received", callback_data: `momo:no:${orderNumber}` },
  ],
];

export function parseMomoButton(data: string) {
  const m = /^momo:(ok|no):([\w-]{1,40})$/.exec(data);
  return m ? { ok: m[1] === "ok", orderNumber: m[2] } : null;
}

export async function alertMomoClaim(orderNumber: string) {
  if (!telegramConfigured()) return;
  const o = await loadOrder({ order_number: orderNumber });
  if (!o) return;
  const money = (m: number) => formatMoney(m, o.currency);
  await sendTelegram(
    [
      `💸 <b>${esc(o.order_number)}: customer says they sent MoMo</b>`,
      "",
      `Check the MoMo for <b>${money(o.total_minor)}</b> on ${GH_MOMO.number}`,
      `From: ${esc(o.contact_name)} · 📞 ${esc(o.contact_phone)}`,
      `Paid from MoMo number: <b>${esc(o.momo_paid_from ?? "not given")}</b>`,
      ...(o.momo_claim_ref ? [`Reference they gave: <b>${esc(o.momo_claim_ref)}</b>`] : []),
      "",
      ...o.order_items.map((i) => `• ${i.quantity} × ${esc(i.product_name)} (${esc(i.variant_label)})`),
      "",
      o.own_rider
        ? "Received it? Tap ✅. The customer is then asked to book their own rider to collect from Gloria."
        : "Received it? Tap ✅ and the Dawurobo rider is booked automatically.",
      `🔗 <a href="${site()}/admin/orders/${o.order_number}">Open in admin</a>`,
    ].join("\n"),
    momoButtons(o.order_number),
  );
}

/** Staff tapped a MoMo button. Returns the text to show in the chat. */
export async function handleMomoButton(orderNumber: string, ok: boolean, by: string): Promise<string> {
  const db = createAdminClient();
  const current = await loadOrder({ order_number: orderNumber });
  if (current?.status === "cancelled") {
    return `🚫 ${orderNumber} was cancelled by the customer.` + (current.refund_due_minor !== null && !current.refunded_at
      ? " If the money arrived, refund it (see the cancel message)."
      : "");
  }
  if (!ok) {
    const { data } = await db.rpc("reject_momo_claim", { p_order_number: orderNumber, p_by: by });
    return data
      ? `❌ ${orderNumber}: marked <b>not received</b> by ${esc(by)}. The customer is asked to check and try again.`
      : `${orderNumber}: nothing to change (already paid or cancelled).`;
  }
  const { data: orderId, error } = await db.rpc("confirm_momo_payment", { p_order_number: orderNumber, p_confirmed_by: by });
  if (error) return `⚠️ ${orderNumber}: couldn't confirm (${esc(error.message)}).`;
  if (!orderId) return `${orderNumber}: already confirmed earlier.`;
  return `✅ ${orderNumber}: payment confirmed by ${esc(by)}.\n${await afterGhanaPayment(String(orderId))}`;
}

/** A Ghana order was just paid: book Dawurobo, or wait for the customer's own rider. Line for the staff chat. */
export async function afterGhanaPayment(orderId: string): Promise<string> {
  const o = await loadOrder({ id: orderId });
  if (o?.own_rider) return "🛵 The customer is now booking their own rider. You'll get the rider's details here.";
  return bookCourier(orderId);
}

// --- Own rider: the customer tells us who's coming --------------------------------

export const handButton = (orderNumber: string): Buttons => [
  [{ text: "📦 Handed to rider", callback_data: `hand:${orderNumber}` }],
];

export function parseHandButton(data: string) {
  const m = /^hand:([\w-]{1,40})$/.exec(data);
  return m ? m[1] : null;
}

export async function alertRiderBooked(orderNumber: string) {
  if (!telegramConfigured()) return;
  const o = await loadOrder({ order_number: orderNumber });
  if (!o?.rider_name) return;
  await sendTelegram(
    [
      `🛵 <b>${esc(o.order_number)}: rider coming to Gloria</b>`,
      "",
      `Rider: <b>${esc(o.rider_name)}</b> · 📞 ${esc(o.rider_phone ?? "")}`,
      ...(o.rider_plate || o.rider_company
        ? [[o.rider_plate ? `Plate ${esc(o.rider_plate)}` : "", o.rider_company ? esc(o.rider_company) : ""].filter(Boolean).join(" · ")]
        : []),
      `Pickup code: <b>${esc(o.pickup_code ?? "")}</b> (the rider should say it)`,
      "",
      ...o.order_items.map((i) => `• ${i.quantity} × ${esc(i.product_name)} (${esc(i.variant_label)})`),
      `For: ${esc(o.contact_name)} · 📞 ${esc(o.contact_phone)}`,
      "",
      "Tap 📦 when you've handed it over.",
    ].join("\n"),
    handButton(o.order_number),
  );
}

/** Staff tapped "Handed to rider". */
export async function handleHandover(orderNumber: string, by: string): Promise<string> {
  const { data, error } = await createAdminClient().rpc("mark_handed_to_rider", { p_order_number: orderNumber, p_by: by });
  if (error) return `⚠️ ${orderNumber}: couldn't update (${esc(error.message)}).`;
  return data
    ? `📦 ${orderNumber}: handed to the rider by ${esc(by)}. Done ✅ (the customer's page shows it).`
    : `${orderNumber}: nothing to change (already handed over, or no rider yet).`;
}

// --- Cancellations and refunds ------------------------------------------------------

export const refundButton = (orderNumber: string): Buttons => [
  [{ text: "💸 Refunded", callback_data: `refund:${orderNumber}` }],
];

export function parseRefundButton(data: string) {
  const m = /^refund:([\w-]{1,40})$/.exec(data);
  return m ? m[1] : null;
}

/** A customer cancelled: tell staff, and if money was sent, how to refund it safely. */
export async function alertCancelled(orderNumber: string) {
  if (!telegramConfigured()) return;
  const db = createAdminClient();
  const { data } = await db.from("orders")
    .select("order_number, country, currency, contact_name, contact_phone, rider_name, refund_due_minor, momo_paid_from, payments(status)")
    .eq("order_number", orderNumber).maybeSingle();
  const o = data as {
    order_number: string; country: string; currency: Currency; contact_name: string; contact_phone: string;
    rider_name: string | null; refund_due_minor: number | null; momo_paid_from: string | null; payments: { status: string }[];
  } | null;
  if (!o) return;
  const confirmed = o.payments.some((p) => p.status === "success");
  const lines = [
    `🚫 <b>${esc(o.order_number)}: cancelled by the customer</b>`,
    `${esc(o.contact_name)} · 📞 ${esc(o.contact_phone)}`,
  ];
  if (o.rider_name) lines.push("", `⚠️ Do NOT hand it to the rider (${esc(o.rider_name)}).`);
  if (o.refund_due_minor !== null) {
    lines.push(
      "",
      `💸 <b>Refund ${formatMoney(o.refund_due_minor, o.currency)} within 2 days</b>`,
      confirmed ? "Payment was confirmed." : "They said they paid, but it wasn't confirmed yet: check the MoMo first. Nothing arrived = no refund.",
      "Send it ONLY to the number the money came from, as shown on our MoMo statement.",
      `They said they paid from: <b>${esc(o.momo_paid_from ?? "not given")}</b>`,
      "Never refund to a different number, even if they ask.",
      "",
      "Tap 💸 once the refund is sent.",
    );
  }
  await sendTelegram(lines.join("\n"), o.refund_due_minor !== null ? refundButton(o.order_number) : undefined);
}

/** The customer said why they cancelled. */
export async function alertCancelReason(orderNumber: string, reason: string) {
  if (!telegramConfigured()) return;
  await sendTelegram(`📝 <b>${esc(orderNumber)}</b>: why they cancelled: “${esc(reason)}”`);
}

/** Staff tapped "Refunded". */
export async function handleRefunded(orderNumber: string, by: string): Promise<string> {
  const { data, error } = await createAdminClient().rpc("mark_refunded", { p_order_number: orderNumber, p_by: by });
  if (error) return `⚠️ ${orderNumber}: couldn't update (${esc(error.message)}).`;
  return data
    ? `💸 ${orderNumber}: refund sent by ${esc(by)}. The customer's page shows it.`
    : `${orderNumber}: nothing to change (already marked refunded).`;
}

// --- 3. Book the Dawurobo rider -------------------------------------------------

/** Book Dawurobo for a paid Ghana order. Returns a line for the staff chat. Never throws. */
export async function bookCourier(orderId: string): Promise<string> {
  const o = await loadOrder({ id: orderId });
  if (!o) return "⚠️ Order not found for booking.";
  if (o.courier_order_id) return `🛵 Dawurobo already booked (${esc(o.courier_order_id)}).`;
  const a = o.delivery_address;
  try {
    if (!dawuroboConfigured()) throw new DawuroboError(0, "not_configured", "Dawurobo keys missing");
    if (a.lat === undefined || a.lng === undefined) throw new DawuroboError(0, "no_pin", "order has no map pin");
    const booking = await createDelivery({
      orderNumber: o.order_number,
      customerName: o.contact_name,
      customerPhone: o.contact_phone,
      address: [a.line1, a.line2, a.landmark ? `near ${a.landmark}` : ""].filter(Boolean).join(", "),
      city: a.city ?? "Accra",
      lat: Number(a.lat),
      lng: Number(a.lng),
      notes: o.notes,
      item: o.order_items.map((i) => `${i.quantity} x ${i.product_name} ${i.variant_label}`).join(", "),
      valueGhs: o.subtotal_minor / 100,
      feeGhs: o.delivery_quote_minor !== null ? o.delivery_quote_minor / 100 : null,
    });
    const { error } = await createAdminClient().rpc("set_courier_booking", {
      p_order_id: o.id,
      p_courier: "dawurobo",
      p_courier_order_id: booking.orderId,
      p_tracking_url: booking.trackingUrl,
      p_eta: booking.eta,
    });
    if (error) throw new Error(`saving booking: ${error.message}`);
    return `🛵 Dawurobo rider booked (${esc(booking.orderId)}). ${esc(booking.eta)}\nHave the kilishi ready with Gloria for pickup.`;
  } catch (e) {
    console.error(`Dawurobo booking for ${o.order_number} failed:`, e);
    const why = e instanceof Error ? e.message : String(e);
    return `⚠️ <b>Couldn't book Dawurobo automatically</b> (${esc(why)}). Please book the rider by hand and enter them in admin → Send out.`;
  }
}

// --- 4. Status updates (webhook, or a check when the order page is open) ------------

export async function applyCourierStatus(o: Pick<GhOrder, "id" | "order_number" | "courier_status">, status: string,
  rider: { name?: string; phone?: string } = {}, trackingUrl: string | null = null) {
  const stage = stageOf(status);
  const { error } = await createAdminClient().rpc("apply_courier_update", {
    p_order_id: o.id,
    p_status: status,
    p_stage: stage,
    p_rider_name: rider.name ?? null,
    p_rider_phone: rider.phone ?? null,
    p_tracking_url: trackingUrl,
  });
  if (error) {
    console.error(`apply_courier_update ${o.order_number}:`, error.message);
    return;
  }
  if (stage === "problem" && o.courier_status !== status) {
    await sendTelegram(`⚠️ <b>Dawurobo: ${esc(o.order_number)} is "${esc(status)}"</b>\nPlease check with Dawurobo (WhatsApp +233 55 517 5699) and the customer.\n🔗 <a href="${site()}/admin/orders/${o.order_number}">Open in admin</a>`);
  }
}

/** Ask Dawurobo for the latest status, at most once a minute per order. */
export async function syncCourierIfStale(orderNumber: string) {
  if (!dawuroboConfigured()) return;
  const o = await loadOrder({ order_number: orderNumber });
  if (!o?.courier_order_id || !["preparing", "out_for_delivery"].includes(o.status)) return;
  if (o.courier_synced_at && Date.now() - Date.parse(o.courier_synced_at) < 60_000) return;
  try {
    const s = await getDelivery(o.courier_order_id);
    await applyCourierStatus(o, s.status, {}, s.trackingUrl);
  } catch (e) {
    console.error(`Dawurobo status for ${orderNumber} failed:`, e);
    // Don't hammer Dawurobo while it's failing.
    await createAdminClient().from("orders").update({ courier_synced_at: new Date().toISOString() }).eq("id", o.id);
  }
}

export async function findByCourierOrder(courierOrderId: string, reference: string | undefined) {
  const db = createAdminClient();
  const { data } = await db.from("orders").select("id, order_number, courier_status")
    .eq("courier", "dawurobo").eq("courier_order_id", courierOrderId).maybeSingle();
  if (data) return data as Pick<GhOrder, "id" | "order_number" | "courier_status">;
  if (!reference) return null;
  const { data: byRef } = await db.from("orders").select("id, order_number, courier_status")
    .eq("order_number", reference).eq("courier", "dawurobo").maybeSingle();
  return byRef as Pick<GhOrder, "id" | "order_number" | "courier_status"> | null;
}

/** Remove the buttons from the alert (so nobody taps twice) and post the result under it. */
export async function answerMomoAlert(chatId: number, messageId: number, html: string) {
  await telegramApi("editMessageReplyMarkup", { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } });
  await telegramApi("sendMessage", {
    chat_id: chatId,
    text: html,
    parse_mode: "HTML",
    reply_parameters: { message_id: messageId, allow_sending_without_reply: true },
    link_preview_options: { is_disabled: true },
  });
}
