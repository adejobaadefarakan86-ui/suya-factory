"use server";
// "Pay now": record a pending payment, then send the customer to Paystack.
import { redirect } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { initializeTransaction } from "@/lib/paystack";
import { isOrderToken } from "@/lib/orders";

export async function payWithPaystack(token: string) {
  if (!isOrderToken(token)) redirect("/");

  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const orderUrl = `${site}/orders/${token}`;

  // The amount comes from the ORDER in the database, never from the browser.
  const { data, error } = await createPublicClient().rpc("begin_payment", {
    p_token: token,
    p_provider: "paystack",
  });
  const payment = (data as { reference: string; amount_minor: number; currency: string; email: string; order_number: string }[] | null)?.[0];

  if (error || !payment) {
    const code = error?.message.startsWith("SF:") ? error.message.slice(3) : "error";
    if (code === "error") console.error("begin_payment failed:", error);
    redirect(`/orders/${token}?payment=${code}`);
  }

  let paystackUrl: string;
  try {
    const tx = await initializeTransaction({
      email: payment.email,
      amountMinor: payment.amount_minor,
      currency: payment.currency,
      reference: payment.reference,
      callbackUrl: `${site}/api/payments/paystack/callback?order=${token}`,
      cancelUrl: orderUrl,
      orderNumber: payment.order_number,
    });
    paystackUrl = tx.authorization_url;
  } catch (e) {
    console.error(e);
    redirect(`/orders/${token}?payment=unavailable`);
  }

  // redirect() works by throwing, so it must stay outside try/catch.
  redirect(paystackUrl);
}
