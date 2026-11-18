// Paystack's server tells OUR server about payments here: the backup in case
// the customer closes their browser before coming back to the site.
// Set this address in Paystack: Settings → API Keys & Webhooks → Webhook URL
//   https://<your-site>/api/payments/paystack/webhook
import { NextResponse, type NextRequest } from "next/server";
import { isValidWebhookSignature } from "@/lib/paystack";
import { settlePaystackPayment } from "@/lib/payments";

export async function POST(request: NextRequest) {
  // Read the body as plain text: the signature is calculated on the exact bytes.
  const raw = await request.text();
  if (!isValidWebhookSignature(raw, request.headers.get("x-paystack-signature"))) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }

  const reference = event.data?.reference;
  if (event.event === "charge.success" && reference) {
    try {
      // Even a signed message is double-checked by asking Paystack directly.
      await settlePaystackPayment(reference);
    } catch (e) {
      const unknown = e instanceof Error && e.message.includes("SF:unknown_reference");
      console.error("Paystack webhook:", e);
      // Unknown reference = not one of ours; anything else = ask Paystack to retry later.
      if (!unknown) return new NextResponse("Try again later", { status: 500 });
    }
  }

  // Tell Paystack "received" so it stops resending.
  return NextResponse.json({ received: true });
}
