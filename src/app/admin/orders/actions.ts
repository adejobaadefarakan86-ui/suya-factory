"use server";
// Admin order actions. The DATABASE functions do the real permission checks
// (staff vs admin, allowed steps); these just pass the request on.
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { adminErrorMessage, type OrderStatus } from "@/lib/orders";
import { after } from "next/server";
import { handleHandover, handleMomoButton, handleRefunded } from "@/lib/ghana-orders";
import { sendTelegram } from "@/lib/telegram";

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

// --- Ghana own-rider orders: the same steps as the Telegram buttons ------------------

async function staffName() {
  const me = await requireStaff("/admin/orders");
  return `${me.fullName ?? me.email} (admin page)`;
}

/** Tell the Telegram chat what was done here, so nobody does it twice. */
function tellChat(html: string) {
  after(() => sendTelegram(html));
}

const plain = (html: string) => html.replace(/<[^>]+>/g, "");

export async function confirmMomo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const by = await staffName();
  const orderNumber = text(formData, "orderNumber");
  const result = await handleMomoButton(orderNumber, formData.get("ok") === "yes", by);
  tellChat(result);
  revalidatePath(`/admin/orders/${orderNumber}`);
  return { ok: plain(result) };
}

export async function handOver(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const by = await staffName();
  const orderNumber = text(formData, "orderNumber");
  const result = await handleHandover(orderNumber, by);
  tellChat(result);
  revalidatePath(`/admin/orders/${orderNumber}`);
  return { ok: plain(result) };
}

export async function markRefunded(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const by = await staffName();
  const orderNumber = text(formData, "orderNumber");
  const result = await handleRefunded(orderNumber, by);
  tellChat(result);
  revalidatePath(`/admin/orders/${orderNumber}`);
  return { ok: plain(result) };
}
