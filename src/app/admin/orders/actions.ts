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
