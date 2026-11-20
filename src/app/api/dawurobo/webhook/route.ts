// Dawurobo sends delivery updates here (rider accepted, picked up, delivered...).
// Registered in Partner Hub as https://suyafactory.vercel.app/api/dawurobo/webhook.
// Every message is signed: X-Webhook-Signature = HMAC-SHA256(raw body, DAWUROBO_WEBHOOK_SECRET).
// Forged or unsigned messages get 401; anything we can't use still gets 200 so
// Dawurobo doesn't keep re-sending it.
import { webhookSignatureOk } from "@/lib/dawurobo";
import { applyCourierStatus, findByCourierOrder } from "@/lib/ghana-orders";

type Payload = {
  event_type?: string;
  order_data?: {
    external_order_reference?: string;
    internal_order_id?: string;
    status?: string;
    rider_info?: { name?: string; phone?: string } | null;
    tracking_url?: string;
  };
};

export async function POST(request: Request) {
  const raw = await request.text();
  if (!webhookSignatureOk(raw, request.headers.get("x-webhook-signature"))) {
    return new Response("invalid signature", { status: 401 });
  }

  let payload: Payload;
  try {
    payload = JSON.parse(raw) as Payload;
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const d = payload.order_data;
  if (d?.internal_order_id && d.status) {
    try {
      const order = await findByCourierOrder(d.internal_order_id, d.external_order_reference);
      if (order) {
        await applyCourierStatus(
          order,
          d.status,
          { name: d.rider_info?.name, phone: d.rider_info?.phone },
          d.tracking_url?.startsWith("https://") ? d.tracking_url : null,
        );
      }
    } catch (e) {
      console.error("Dawurobo webhook failed:", e);
      return new Response("error", { status: 500 }); // Dawurobo retries 5xx
    }
  }
  return Response.json({ ok: true });
}
