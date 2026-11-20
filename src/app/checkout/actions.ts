"use server";
import { after } from "next/server";
// Sends the order to the database's place_order() function.
// We pass only WHAT the customer wants; the database works out every price.
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { COUNTRIES, isCountry } from "@/lib/countries";
import { SELLS_VIA_SUPERMARKETS } from "@/lib/stores";
import { alertNeedsDeliveryPrice } from "@/lib/staff-alerts";
import { dawuroboConfigured, estimateDelivery } from "@/lib/dawurobo";
import { autoQuoteGhanaOrder, GH_DELIVERY } from "@/lib/ghana-orders";
import { isInServiceArea } from "@/lib/service-areas";

export type CheckoutValues = {
  name: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  landmark: string;
  notes: string;
};

export type CheckoutState =
  | { error: string; values: CheckoutValues }
  | { token: string; orderNumber: string; payNow: boolean }
  | undefined;

/**
 * feeMinor + km: automatic price, paid online with the kilishi (Nigeria).
 * payRider: the courier's price (Dawurobo, Ghana), paid to the rider on arrival.
 */
export type DeliveryQuote = { feeMinor: number; km: number | null; payRider?: boolean; ownRider?: boolean; when?: string } | null;

/**
 * The automatic delivery price to a pin, worked out by the database (the same
 * function place_order uses, so what's shown is exactly what's charged).
 * null = no automatic price in this country (staff quote it after ordering).
 */
export async function quoteDelivery(country: string, lat: number, lng: number): Promise<DeliveryQuote> {
  if (!isCountry(country) || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  // Ghana: Dawurobo's own price (paid to their rider). If they can't answer, staff price it after ordering.
  if (country === "GH") {
    // The customer books and pays their own rider after paying: nothing to price.
    if (GH_DELIVERY === "own_rider") return { feeMinor: 0, km: null, payRider: true, ownRider: true };
    if (!dawuroboConfigured() || !isInServiceArea("GH", lat, lng)) return null;
    try {
      const est = await estimateDelivery(lat, lng);
      return { feeMinor: est.feeMinor, km: null, payRider: true, when: est.when };
    } catch (e) {
      console.error("Dawurobo estimate failed:", e);
      return null;
    }
  }
  const supabase = createPublicClient();
  const [fee, km] = await Promise.all([
    supabase.rpc("delivery_fee", { p_country: country, p_lat: lat, p_lng: lng }),
    supabase.rpc("delivery_km", { p_country: country, p_lat: lat, p_lng: lng }),
  ]);
  if (fee.error || km.error) throw new Error(`delivery quote failed: ${fee.error?.message ?? km.error?.message}`);
  if (fee.data === null || km.data === null) return null;
  return { feeMinor: Number(fee.data), km: Number(km.data) };
}

// The database raises 'SF:<code>'; these are the friendly versions.
const MESSAGES: Record<string, string> = {
  name: "Please enter your name.",
  email: "Please enter a valid email address.",
  phone: "Please enter a valid phone number (7 to 15 digits).",
  address: "Please enter your street address and city.",
  too_long: "One of the fields is too long. Please shorten it.",
  outside_area:
    "We only deliver regular orders inside Lagos State (Nigeria) and Greater Accra (Ghana). For anywhere else, please send us a bulk order request.",
  bulk: "Orders of 1kg or more are bulk orders with special pricing. Please send us a bulk order request.",
  empty: "Your cart is empty.",
  too_many: "That's a lot of different items! Please split it into two orders.",
  quantity: "You can order up to 20 of each item.",
  unavailable: "Something in your cart is no longer available. Please check your cart.",
  bad_items: "Something went wrong with your cart. Please check your cart.",
  price_changed:
    "Prices changed while you were checking out. Please refresh the page to see the latest total.",
  location: "Please set your exact delivery location on the map (or tap “Use my current location”).",
  location_country: "Your map pin is outside the country you're ordering in. Please move the pin, or switch country at the top of the page.",
};

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

export async function placeOrder(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const values: CheckoutValues = {
    name: text(formData, "name"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    line1: text(formData, "line1"),
    line2: text(formData, "line2"),
    city: text(formData, "city"),
    landmark: text(formData, "landmark"),
    notes: text(formData, "notes"),
  };
  const fail = (error: string): CheckoutState => ({ error, values });

  const country = formData.get("country");
  if (!isCountry(country)) return fail("Please choose your country again.");
  if (SELLS_VIA_SUPERMARKETS[country]) {
    return fail(`In ${COUNTRIES[country].name}, our kilishi is sold in supermarkets. Please use “Where to buy” to find one near you.`);
  }

  let items: unknown;
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return fail(MESSAGES.bad_items);
  }

  const expectedTotal = Number(formData.get("expectedTotal"));
  if (!Number.isSafeInteger(expectedTotal)) return fail(MESSAGES.price_changed);

  // The login-aware client: if the customer is logged in, the order is linked to them.
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_order", {
    p_country: country,
    p_contact_name: values.name,
    p_contact_email: values.email,
    p_contact_phone: values.phone,
    p_address: {
      line1: values.line1, line2: values.line2, city: values.city, landmark: values.landmark,
      // Exact pin from the map / GPS (checked again by the database).
      lat: text(formData, "lat"), lng: text(formData, "lng"), accuracy: text(formData, "accuracy"),
    },
    p_notes: values.notes,
    p_items: items,
    p_expected_total_minor: expectedTotal,
  });

  if (error) {
    const code = error.message.startsWith("SF:") ? error.message.slice(3) : "";
    if (!MESSAGES[code]) console.error("place_order failed:", error);
    return fail(MESSAGES[code] ?? "We couldn't place your order. Please try again.");
  }

  const order = (data as { order_number: string; access_token: string }[] | null)?.[0];
  if (!order) return fail("We couldn't place your order. Please try again.");

  // Automatic delivery price: the database checked that the total we sent
  // included exactly its own fee, so the order is ready to pay right away.
  const payNow = Number(formData.get("deliveryFee")) > 0;
  // Ghana: ask Dawurobo for the delivery price now, so the customer can pay straight away
  // (if Dawurobo doesn't answer, staff are asked to price it, as before).
  if (!payNow && country === "GH") await autoQuoteGhanaOrder(order.order_number);
  // No automatic price anywhere else: staff must price the delivery, so tell them now.
  // (Paid orders are announced when the payment succeeds.)
  else if (!payNow) after(() => alertNeedsDeliveryPrice(order.order_number));
  return { token: order.access_token, orderNumber: order.order_number, payNow };
}
