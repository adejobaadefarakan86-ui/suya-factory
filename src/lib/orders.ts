// Shared order wording and types (safe for server and browser code).
import type { Currency } from "@/lib/money";
import type { CountryCode } from "@/lib/countries";

export type OrderStatus =
  | "awaiting_quote"
  | "pending_payment"
  | "paid"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export const ORDER_STATUS: Record<OrderStatus, { label: string; className: string }> = {
  awaiting_quote: { label: "Checking delivery price", className: "bg-sky-100 text-sky-900" },
  pending_payment: { label: "Waiting for payment", className: "bg-amber-100 text-amber-900" },
  paid: { label: "Paid", className: "bg-green-100 text-green-900" },
  preparing: { label: "Being prepared", className: "bg-blue-100 text-blue-900" },
  out_for_delivery: { label: "Out for delivery", className: "bg-indigo-100 text-indigo-900" },
  delivered: { label: "Delivered", className: "bg-stone-200 text-stone-800" },
  cancelled: { label: "Cancelled", className: "bg-red-100 text-red-900" },
};

/** What get_order_by_token() returns. */
export type OrderView = {
  order_number: string;
  status: OrderStatus;
  created_at: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  country: CountryCode;
  currency: Currency;
  delivery_address: {
    line1: string;
    line2: string | null;
    city: string;
    landmark: string | null;
    zone_name?: string; // only on orders from before the map pin
    lat?: number;
    lng?: number;
    accuracy_m?: number | null;
  };
  delivery_quote_minor: number | null;
  delivery_quote_note: string | null;
  delivery_quoted_at: string | null;
  quote_expires_at: string | null;
  quote_expired: boolean;
  can_cancel: boolean;
  /** Ghana: customer tapped "I've paid" (MoMo) and staff haven't checked yet. */
  momo_claimed_at: string | null;
  /** Ghana: staff couldn't find the MoMo payment. */
  momo_claim_rejected_at: string | null;
  /** Ghana: the MoMo number the customer says they paid from (refunds go only to the paying number). */
  momo_paid_from: string | null;
  /** Cancelled after paying: amount to refund, and when it was sent. */
  refund_due_minor: number | null;
  refunded_at: string | null;
  courier: "dawurobo" | null;
  courier_eta: string | null;
  courier_tracking_url: string | null;
  /** Ghana: the customer books and pays their own rider. */
  own_rider: boolean;
  /** 4 digits the customer's rider says at pickup. */
  pickup_code: string | null;
  booked_rider: { name: string; phone: string; plate: string | null; company: string | null } | null;
  rider: { name: string; phone: string; tracking_url: string | null; stage: DeliveryStage | null } | null;
  notes: string | null;
  subtotal_minor: number;
  delivery_fee_minor: number;
  total_minor: number;
  items: {
    product_name: string;
    variant_label: string;
    unit_price_minor: number;
    quantity: number;
    line_total_minor: number;
  }[];
  /** from_status === status means a note (e.g. "rider almost there"), not a status change. */
  events: { from_status: OrderStatus | null; status: OrderStatus; stage: DeliveryStage | null; at: string }[];
};

export type DeliveryStage = "on_the_way" | "almost_there" | "arrived";

export const DELIVERY_STAGES: { stage: DeliveryStage; label: string; icon: string }[] = [
  { stage: "on_the_way", label: "On the way", icon: "🛵" },
  { stage: "almost_there", label: "Almost there", icon: "📍" },
  { stage: "arrived", label: "Arrived", icon: "🏁" },
];

/** The normal journey of an order, in order (used for the customer's timeline). */
export const ORDER_JOURNEY: OrderStatus[] = [
  "awaiting_quote", "pending_payment", "paid", "preparing", "out_for_delivery", "delivered",
];

/** Simple next steps (a single button). Quotes and sending out have their own forms. */
export const NEXT_STEP: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  paid: { to: "preparing", label: "Start preparing" },
  out_for_delivery: { to: "delivered", label: "Mark as delivered" },
};

/** Admins only: undo one step. */
export const PREVIOUS_STEP: Partial<Record<OrderStatus, OrderStatus>> = {
  preparing: "paid",
  out_for_delivery: "preparing",
  delivered: "out_for_delivery",
};

export const CANCELLABLE: OrderStatus[] = ["awaiting_quote", "pending_payment", "paid", "preparing", "out_for_delivery"];

/** "Open in Google Maps" for an exact pin. */
export function mapsLink(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export const PAYMENT_METHODS = {
  mobile_money: "Mobile money",
  bank_transfer: "Bank transfer",
  cash: "Cash",
  other: "Other",
} as const;
export type PaymentMethod = keyof typeof PAYMENT_METHODS;

/** Friendly versions of the database's 'SF:<code>' errors for admin actions. */
export const ADMIN_ERRORS: Record<string, string> = {
  not_allowed: "You don't have permission to do that.",
  admin_only: "Only admins can do that.",
  bad_transition: "That change isn't allowed from the order's current status. Refresh the page and try again.",
  order_not_found: "Order not found.",
  not_payable: "This order isn't waiting for payment any more.",
  bad_method: "Please choose a payment method.",
  reference_required: "Please enter the payment reference (e.g. the mobile money transaction ID).",
  too_long: "That text is too long. Please shorten it.",
  bad_amount: "Please enter a valid delivery price.",
  quote_locked: "The delivery price can only be set before the customer pays.",
  use_send_out: "Use the 'Send out for delivery' form (it needs the rider's details).",
  rider_name: "Please enter the rider's name.",
  rider_phone: "Please enter the rider's phone number (7 to 15 digits).",
  tracking_url: "The tracking link must start with https://",
  user_not_found: "No account with that email. Ask them to sign up on the website first.",
  not_self: "You can't remove your own admin access.",
  last_admin: "You can't remove the last admin.",
};

export function adminErrorMessage(error: { message: string } | null) {
  if (!error) return null;
  const code = error.message.startsWith("SF:") ? error.message.slice(3) : "";
  return ADMIN_ERRORS[code] ?? "Something went wrong. Please try again.";
}

/** "18 Nov 2026, 17:55" in the order's own country time. */
export function formatOrderDate(iso: string, country: CountryCode) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: country === "NG" ? "Africa/Lagos" : "Africa/Accra",
  }).format(new Date(iso));
}

/** The secret order link codes are UUIDs; anything else can't be a real order. */
export function isOrderToken(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
