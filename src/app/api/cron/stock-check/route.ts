// Morning stock check: every day the bot posts the supermarket list with tap
// buttons and asks staff to check with the supermarkets.
// Run by Vercel Cron (vercel.json), which sends "Authorization: Bearer <CRON_SECRET>".
import { postStockList } from "@/lib/stock-telegram";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("forbidden", { status: 403 });
  }
  const sent = await postStockList(
    "☀️ <b>Good morning! Stock check</b>\nPlease check with the supermarkets today, then tap any that have finished or restocked:",
  );
  return Response.json({ sent });
}
