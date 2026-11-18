"use server";
// Customer actions on their order page (allowed by holding the order's secret link).
import { redirect } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { initializeTransaction } from "@/lib/paystack";
import { isOrderToken } from "@/lib/orders";

/** "Accept delivery price & pay": record a pending payment, then go to Paystack. */
export async function payWithPaystack(token: string, formData: FormData) {
  if (!isOrderToken(token)) redirect("/");

  // The customer must tick "I accept the delivery fee" first.
  if (formData.get("acceptDelivery") !== "yes") redirect(`/orders/${token}?payment=accept_delivery`);

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

/** Customer cancels before paying (e.g. the delivery price is too high). */
export async function cancelOrder(token: string) {
  if (!isOrderToken(token)) redirect("/");
  const { error } = await createPublicClient().rpc("cancel_order_by_token", { p_token: token });
  if (error) console.error("cancel_order_by_token:", error.message);
  redirect(`/orders/${token}${error ? "?payment=cannot_cancel" : ""}`);
}

/** The delivery price expired (prices change): ask staff for a fresh one. */
export async function requestNewQuote(token: string) {
  if (!isOrderToken(token)) redirect("/");
  const { error } = await createPublicClient().rpc("request_new_quote_by_token", { p_token: token });
  if (error) console.error("request_new_quote_by_token:", error.message);
  redirect(`/orders/${token}`);
}
