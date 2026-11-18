// Shared order wording and types (safe for server and browser code).
import type { Currency } from "@/lib/money";
import type { CountryCode } from "@/lib/countries";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export const ORDER_STATUS: Record<OrderStatus, { label: string; className: string }> = {
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
    zone_name: string;
  };
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
};

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
