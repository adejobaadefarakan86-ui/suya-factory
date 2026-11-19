// Straight from checkout to Paystack: /orders/<token>/pay
// (Orders with an automatic delivery price are ready to pay the moment they're placed.)
import { NextResponse, type NextRequest } from "next/server";
import { isOrderToken } from "@/lib/orders";
import { startPaystackPayment } from "@/lib/start-payment";

export async function GET(request: NextRequest, ctx: RouteContext<"/orders/[token]/pay">) {
  const { token } = await ctx.params;
  const { origin } = request.nextUrl;
  if (!isOrderToken(token)) return NextResponse.redirect(new URL("/", origin), 303);

  const result = await startPaystackPayment(token);
  return NextResponse.redirect("url" in result ? result.url : new URL(`/orders/${token}?payment=${result.error}`, origin), 303);
}
