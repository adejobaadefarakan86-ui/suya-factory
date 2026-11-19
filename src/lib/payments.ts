// The ONE place that decides a payment's result.
// Used by both the customer's return from Paystack and Paystack's webhook.
import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTransaction } from "@/lib/paystack";
import { alertPaidOrder } from "@/lib/staff-alerts";

export type PaymentOutcome = "success" | "failed" | "pending";

const FINAL = new Set(["success", "failed", "abandoned"]);

export async function settlePaystackPayment(reference: string): Promise<PaymentOutcome> {
  // 1. Ask Paystack itself (with our secret key) what happened.
  const tx = await verifyTransaction(reference);
  if (tx.reference !== reference) throw new Error(`Paystack returned a different reference for ${reference}`);

  // Still in progress (e.g. bank transfer not landed yet): the webhook will finish it.
  if (!FINAL.has(tx.status)) return "pending";

  // 2. Record it. The database double-checks amount and currency.
  const { data, error } = await createAdminClient().rpc("confirm_payment", {
    p_reference: reference,
    p_status: tx.status,
    p_amount_minor: tx.amount,
    p_currency: tx.currency,
    p_raw: tx,
  });
  if (error) throw new Error(`confirm_payment failed for ${reference}: ${error.message}`);

  const result = data as { payment_status: string; problem?: string };
  if (result.problem) console.error(`Payment ${reference} problem: ${result.problem}`, { amount: tx.amount, currency: tx.currency });
  if (result.payment_status !== "success") return "failed";

  // Tell the staff on Telegram (once per order), after the response is sent.
  after(() => alertPaidOrder(reference));
  return "success";
}
