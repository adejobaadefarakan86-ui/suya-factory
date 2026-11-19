// Telegram alerts to the staff group: new paid order, a Ghana order that needs a
// delivery price, and new bulk enquiries. Server only.
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney, type Currency } from "@/lib/money";
import { esc, sendTelegram, telegramConfigured } from "@/lib/telegram";

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "";

type OrderForAlert = {
  id: string;
  order_number: string;
  country: string;
  currency: Currency;
  contact_name: string;
  contact_phone: string;
  subtotal_minor: number;
  delivery_fee_minor: number;
  total_minor: number;
  notes: string | null;
  delivery_address: { line1?: string; line2?: string | null; lat?: number; lng?: number };
  order_items: { product_name: string; variant_label: string; quantity: number }[];
};

const ORDER_FIELDS =
  "id, order_number, country, currency, contact_name, contact_phone, subtotal_minor, delivery_fee_minor, total_minor, notes, delivery_address, order_items(product_name, variant_label, quantity)";

function orderLines(o: OrderForAlert) {
  const money = (m: number) => formatMoney(m, o.currency);
  const a = o.delivery_address;
  const lines = [
    ...o.order_items.map((i) => `• ${i.quantity} × ${esc(i.product_name)} (${esc(i.variant_label)})`),
    "",
    `👤 ${esc(o.contact_name)} · 📞 ${esc(o.contact_phone)}`,
    `📍 ${esc(a.line1 ?? "")}${a.line2 ? `, ${esc(a.line2)}` : ""}`,
  ];
  if (o.notes) lines.push(`📝 ${esc(o.notes)}`);
  if (a.lat !== undefined && a.lng !== undefined) {
    lines.push(`🗺 <a href="https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lng}">Open pin in Google Maps</a>`);
  }
  if (o.delivery_fee_minor > 0) lines.push(`💰 Kilishi ${money(o.subtotal_minor)} + delivery ${money(o.delivery_fee_minor)}`);
  lines.push(`🔗 <a href="${site()}/admin/orders/${o.order_number}">Open in admin</a>`);
  return lines.join("\n");
}

/**
 * A payment succeeded: tell the staff ONCE per order. Paystack confirms twice
 * (customer's return + webhook), so the first caller "claims" the alert by
 * stamping paid_alert_sent_at; everyone after that finds it already set.
 */
export async function alertPaidOrder(paymentReference: string) {
  if (!telegramConfigured()) return;
  const db = createAdminClient();

  const { data: payment } = await db.from("payments").select("order_id").eq("reference", paymentReference).single();
  if (!payment) return;

  const { data: claimed } = await db
    .from("orders")
    .update({ paid_alert_sent_at: new Date().toISOString() })
    .eq("id", payment.order_id)
    .is("paid_alert_sent_at", null)
    // Only if the database really marked it paid (e.g. not on a wrong-amount payment).
    .in("status", ["paid", "preparing", "out_for_delivery", "delivered"])
    .select(ORDER_FIELDS);
  const order = (claimed as OrderForAlert[] | null)?.[0];
  if (!order) return; // already alerted

  const sent = await sendTelegram(
    `🟢 <b>New paid order ${esc(order.order_number)}</b> · ${formatMoney(order.total_minor, order.currency)}\n\n${orderLines(order)}`,
  );
  // Didn't go through: release the claim so the next confirmation tries again.
  if (!sent) await db.from("orders").update({ paid_alert_sent_at: null }).eq("id", order.id);
}

/** An order without an automatic delivery price (Ghana, for now): staff must enter one. */
export async function alertNeedsDeliveryPrice(orderNumber: string) {
  if (!telegramConfigured()) return;
  const { data } = await createAdminClient().from("orders").select(ORDER_FIELDS).eq("order_number", orderNumber).single();
  const order = data as OrderForAlert | null;
  if (!order) return;
  await sendTelegram(
    `🟡 <b>New order ${esc(order.order_number)}: needs a delivery price</b> · kilishi ${formatMoney(order.subtotal_minor, order.currency)}\n\n${orderLines(order)}`,
  );
}

export async function alertBulkEnquiry(e: {
  name: string;
  phone: string;
  country: string;
  quantityKg: number;
  location: string;
  neededBy: string;
  message: string;
}) {
  if (!telegramConfigured()) return;
  const lines = [
    `📦 <b>New bulk enquiry: ${e.quantityKg}kg</b> (${e.country === "GH" ? "Ghana" : "Nigeria"})`,
    "",
    `👤 ${esc(e.name)} · 📞 ${esc(e.phone)}`,
    `📍 ${esc(e.location)}`,
  ];
  if (e.neededBy) lines.push(`📅 Needed by ${esc(e.neededBy)}`);
  if (e.message) lines.push(`📝 ${esc(e.message)}`);
  lines.push(`🔗 <a href="${site()}/admin/enquiries">Open enquiries</a>`);
  await sendTelegram(lines.join("\n"));
}
