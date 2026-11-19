// Starting a Paystack payment for an order (by its secret link token).
// Used by the order page's "Pay" button and right after checkout.
import "server-only";
import { createPublicClient } from "@/lib/supabase/public";
import { initializeTransaction } from "@/lib/paystack";

/** Returns Paystack's payment page, or an error code for the order page (?payment=<code>). */
export async function startPaystackPayment(token: string): Promise<{ url: string } | { error: string }> {
  const site = process.env.NEXT_PUBLIC_SITE_URL;

  // The amount comes from the ORDER in the database, never from the browser.
  const { data, error } = await createPublicClient().rpc("begin_payment", {
    p_token: token,
    p_provider: "paystack",
  });
  const payment = (data as { reference: string; amount_minor: number; currency: string; email: string; order_number: string }[] | null)?.[0];

  if (error || !payment) {
    const code = error?.message.startsWith("SF:") ? error.message.slice(3) : "error";
    if (code === "error") console.error("begin_payment failed:", error);
    return { error: code };
  }

  try {
    const tx = await initializeTransaction({
      email: payment.email,
      amountMinor: payment.amount_minor,
      currency: payment.currency,
      reference: payment.reference,
      callbackUrl: `${site}/api/payments/paystack/callback?order=${token}`,
      cancelUrl: `${site}/orders/${token}`,
      orderNumber: payment.order_number,
    });
    return { url: tx.authorization_url };
  } catch (e) {
    console.error(e);
    return { error: "unavailable" };
  }
}
