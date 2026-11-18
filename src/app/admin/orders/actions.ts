"use server";
// Admin order actions. The DATABASE functions do the real permission checks
// (staff vs admin, allowed steps); these just pass the request on.
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { adminErrorMessage, PAYMENT_METHODS, type OrderStatus } from "@/lib/orders";

export type ActionState = { error?: string; ok?: string } | undefined;

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function changeStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStaff("/admin/orders");
  const orderNumber = text(formData, "orderNumber");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_order_status", {
    p_order_id: text(formData, "orderId"),
    p_status: text(formData, "status") as OrderStatus,
    p_note: text(formData, "note") || null,
  });
  if (error) return { error: adminErrorMessage(error)! };
  revalidatePath(`/admin/orders/${orderNumber}`);
  return { ok: "Status updated." };
}

export async function markPaidManually(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStaff("/admin/orders");
  const method = text(formData, "method");
  if (!(method in PAYMENT_METHODS)) return { error: "Please choose a payment method." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_order_paid_manually", {
    p_order_id: text(formData, "orderId"),
    p_method: method,
    p_reference: text(formData, "reference"),
    p_note: text(formData, "note") || null,
  });
  if (error) return { error: adminErrorMessage(error)! };
  revalidatePath(`/admin/orders/${text(formData, "orderNumber")}`);
  return { ok: "Payment recorded. The order is now paid." };
}

export async function saveNotes(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStaff("/admin/orders");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_order_notes", {
    p_order_id: text(formData, "orderId"),
    p_notes: text(formData, "notes"),
  });
  if (error) return { error: adminErrorMessage(error)! };
  revalidatePath(`/admin/orders/${text(formData, "orderNumber")}`);
  return { ok: "Notes saved." };
}

/** "2,300" or "2300.50" (naira/cedis) -> 230000 / 230050 (kobo/pesewas). */
function toMinor(value: string) {
  const clean = value.replace(/[,\s]/g, "");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}

export async function setDeliveryQuote(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStaff("/admin/orders");
  const amount = toMinor(text(formData, "amount"));
  if (amount === null) return { error: "Please enter the delivery price as a number, e.g. 2300." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_delivery_quote", {
    p_order_id: text(formData, "orderId"),
    p_amount_minor: amount,
    p_note: text(formData, "note") || null,
  });
  if (error) return { error: adminErrorMessage(error)! };
  revalidatePath(`/admin/orders/${text(formData, "orderNumber")}`);
  return { ok: "Delivery price sent. The customer's page shows it now. Let them know on WhatsApp." };
}

export async function sendOutForDelivery(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStaff("/admin/orders");
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_out_for_delivery", {
    p_order_id: text(formData, "orderId"),
    p_rider_name: text(formData, "riderName"),
    p_rider_phone: text(formData, "riderPhone"),
    p_tracking_url: text(formData, "trackingUrl") || null,
    p_note: text(formData, "note") || null,
  });
  if (error) return { error: adminErrorMessage(error)! };
  revalidatePath(`/admin/orders/${text(formData, "orderNumber")}`);
  return { ok: "Rider details saved. The customer can see them now." };
}

export async function setDeliveryStage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStaff("/admin/orders");
  const stage = text(formData, "stage");
  if (!["on_the_way", "almost_there", "arrived"].includes(stage)) return { error: "Unknown stage." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_delivery_stage", {
    p_order_id: text(formData, "orderId"),
    p_stage: stage,
    p_note: text(formData, "note") || null,
  });
  if (error) return { error: adminErrorMessage(error)! };
  revalidatePath(`/admin/orders/${text(formData, "orderNumber")}`);
  return { ok: "Updated. The customer sees it now." };
}
