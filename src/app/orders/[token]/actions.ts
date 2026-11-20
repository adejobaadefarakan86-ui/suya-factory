"use server";
// Customer actions on their order page (allowed by holding the order's secret link).
import { redirect } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { startPaystackPayment } from "@/lib/start-payment";
import { isOrderToken } from "@/lib/orders";
import { after } from "next/server";
import { alertMomoClaim, autoQuoteGhanaOrder } from "@/lib/ghana-orders";

/** "Pay": record a pending payment, then go to Paystack. */
export async function payWithPaystack(token: string, formData: FormData) {
  if (!isOrderToken(token)) redirect("/");

  // Delivery paid to the rider: the customer must tick "I accept the delivery fee" first.
  // (Automatic, paid-online delivery prices send acceptDelivery=yes with the button.)
  if (formData.get("acceptDelivery") !== "yes") redirect(`/orders/${token}?payment=accept_delivery`);

  const result = await startPaystackPayment(token);
  // redirect() works by throwing, so it stays outside any try/catch.
  redirect("url" in result ? result.url : `/orders/${token}?payment=${result.error}`);
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
  const db = createPublicClient();
  const { error } = await db.rpc("request_new_quote_by_token", { p_token: token });
  if (error) console.error("request_new_quote_by_token:", error.message);
  else {
    // Ghana: ask Dawurobo again straight away (staff are asked if that fails).
    const { data } = await db.rpc("get_order_by_token", { p_token: token });
    const order = data as { order_number: string; country: string; status: string } | null;
    if (order?.country === "GH" && order.status === "awaiting_quote") await autoQuoteGhanaOrder(order.order_number);
  }
  redirect(`/orders/${token}`);
}

/** Ghana: "I've sent the MoMo". Staff get a Telegram message to check it. */
export async function claimMomoPayment(token: string, formData: FormData) {
  if (!isOrderToken(token)) redirect("/");
  if (formData.get("acceptDelivery") !== "yes") redirect(`/orders/${token}?payment=accept_delivery`);
  const reference = String(formData.get("reference") ?? "").trim().slice(0, 100);
  const { data, error } = await createPublicClient().rpc("claim_momo_payment_by_token", {
    p_token: token,
    p_reference: reference,
  });
  if (error) {
    console.error("claim_momo_payment_by_token:", error.message);
    redirect(`/orders/${token}?payment=error`);
  }
  if (typeof data === "string") after(() => alertMomoClaim(data));
  redirect(`/orders/${token}`);
}
