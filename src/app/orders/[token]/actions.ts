"use server";
// Customer actions on their order page (allowed by holding the order's secret link).
import { redirect } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { startPaystackPayment } from "@/lib/start-payment";
import { isOrderToken } from "@/lib/orders";

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
  const { error } = await createPublicClient().rpc("request_new_quote_by_token", { p_token: token });
  if (error) console.error("request_new_quote_by_token:", error.message);
  redirect(`/orders/${token}`);
}
