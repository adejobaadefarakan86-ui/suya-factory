// Talking to Paystack. Server only: it uses the SECRET key.
// Docs: https://paystack.com/docs/api/transaction/
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://api.paystack.co";

function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set (see .env.local).");
  return key;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: T } | null;
  if (!res.ok || !body?.status || body.data === undefined) {
    throw new Error(`Paystack ${path} failed (${res.status}): ${body?.message ?? "no reply"}`);
  }
  return body.data;
}

/** Start a payment. Returns the Paystack page to send the customer to. */
export function initializeTransaction(input: {
  email: string;
  amountMinor: number; // kobo
  currency: string;
  reference: string;
  callbackUrl: string; // where Paystack sends the customer afterwards
  cancelUrl: string; // where the "cancel" button on Paystack's page goes
  orderNumber: string;
}) {
  return call<{ authorization_url: string; reference: string }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: input.amountMinor,
      currency: input.currency,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: { order_number: input.orderNumber, cancel_action: input.cancelUrl },
    }),
  });
}

export type PaystackTransaction = {
  reference: string;
  status: string; // "success" | "failed" | "abandoned" | "ongoing" | "pending" | ...
  amount: number; // kobo
  currency: string;
  [key: string]: unknown;
};

/** Ask Paystack directly what happened to a payment. Never trust the browser for this. */
export function verifyTransaction(reference: string) {
  return call<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

/** Was this webhook really sent by Paystack? (They sign the body with our secret key.) */
export function isValidWebhookSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const expected = createHmac("sha512", secretKey()).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  // timingSafeEqual: compare without leaking hints through timing.
  return a.length === b.length && timingSafeEqual(a, b);
}
