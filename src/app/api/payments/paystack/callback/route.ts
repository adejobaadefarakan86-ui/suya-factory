// Paystack sends the customer here after they pay (or give up).
// We NEVER trust the link itself: settlePaystackPayment() asks Paystack directly.
import { NextResponse, type NextRequest } from "next/server";
import { settlePaystackPayment } from "@/lib/payments";
import { isOrderToken } from "@/lib/orders";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const token = searchParams.get("order") ?? "";
  const reference = searchParams.get("reference") ?? searchParams.get("trxref") ?? "";

  if (!isOrderToken(token)) return NextResponse.redirect(new URL("/", origin));

  let outcome = "error";
  if (reference) {
    try {
      outcome = await settlePaystackPayment(reference);
    } catch (e) {
      console.error("Paystack callback:", e);
    }
  }

  return NextResponse.redirect(new URL(`/orders/${token}?payment=${outcome}`, origin));
}
