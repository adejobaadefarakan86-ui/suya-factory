"use server";
// Sends the order to the database's place_order() function.
// We pass only WHAT the customer wants; the database works out every price.
import { createClient } from "@/lib/supabase/server";
import { isCountry } from "@/lib/countries";

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
  | { token: string; orderNumber: string }
  | undefined;

// The database raises 'SF:<code>'; these are the friendly versions.
const MESSAGES: Record<string, string> = {
  name: "Please enter your name.",
  email: "Please enter a valid email address.",
  phone: "Please enter a valid phone number (7 to 15 digits).",
  address: "Please enter your street address and city.",
  too_long: "One of the fields is too long. Please shorten it.",
  zone: "Please choose a delivery area.",
  empty: "Your cart is empty.",
  too_many: "That's a lot of different items! Please split it into two orders.",
  quantity: "You can order up to 20 of each item.",
  unavailable: "Something in your cart is no longer available. Please check your cart.",
  bad_items: "Something went wrong with your cart. Please check your cart.",
  price_changed:
    "Prices or delivery fees changed while you were checking out. Please refresh the page to see the latest total.",
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
    p_zone_id: text(formData, "zoneId") || null,
    p_contact_name: values.name,
    p_contact_email: values.email,
    p_contact_phone: values.phone,
    p_address: { line1: values.line1, line2: values.line2, city: values.city, landmark: values.landmark },
    p_notes: values.notes,
    p_items: items,
    p_expected_total_minor: expectedTotal,
  });

  if (error) {
    const code = error.message.startsWith("SF:") ? error.message.slice(3) : "";
    if (code === "zone" && !formData.get("zoneId")) return fail(MESSAGES.zone);
    if (!MESSAGES[code]) console.error("place_order failed:", error);
    return fail(MESSAGES[code] ?? "We couldn't place your order. Please try again.");
  }

  const order = (data as { order_number: string; access_token: string }[] | null)?.[0];
  if (!order) return fail("We couldn't place your order. Please try again.");

  return { token: order.access_token, orderNumber: order.order_number };
}
