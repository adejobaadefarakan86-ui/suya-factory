// Telegram sends staff chat messages here (once the webhook is set:
// scripts/telegram-webhook.mjs). Staff keep supermarket stock up to date:
//   /stores      list supermarkets with their numbers and stock
//   /out 3       supermarket #3 has run out
//   /in 3        supermarket #3 has kilishi again
// Only messages from the staff chat (TELEGRAM_CHAT_ID) are obeyed, and only
// requests carrying our secret (TELEGRAM_WEBHOOK_SECRET) are accepted.
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { esc, sendTelegram } from "@/lib/telegram";
import { storeTitle } from "@/lib/stores";

type Update = { message?: { text?: string; chat?: { id: number } } };

function secretOk(got: string | null) {
  const want = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!want || !got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!secretOk(request.headers.get("x-telegram-bot-api-secret-token"))) {
    return new Response("forbidden", { status: 403 });
  }

  const update = (await request.json().catch(() => null)) as Update | null;
  const msg = update?.message;
  // Always answer 200 to Telegram, or it keeps re-sending the same update.
  if (!msg?.text || String(msg.chat?.id) !== process.env.TELEGRAM_CHAT_ID) return Response.json({ ok: true });

  // "/out@suyafactory_alerts_bot 3" -> ["out", "3"]
  const match = /^\/(\w+)(?:@\w+)?\s*([\s\S]*)$/.exec(msg.text.trim());
  if (!match) return Response.json({ ok: true });
  const command = match[1].toLowerCase();
  const arg = match[2].trim();

  try {
    if (command === "stores" || command === "stock") await listStores();
    else if (command === "in" || command === "out" || command === "restock") await setStock(arg, command !== "out");
    else if (command === "help" || command === "start") await help();
  } catch (e) {
    console.error("telegram command failed:", e);
    await sendTelegram("Sorry, that didn't work. Please try again or use the admin page.");
  }
  return Response.json({ ok: true });
}

async function help() {
  await sendTelegram(
    [
      "<b>Supermarket stock commands</b>",
      "/stores – list supermarkets and their numbers",
      "/out 3 – supermarket #3 has run out",
      "/in 3 – supermarket #3 has kilishi again",
    ].join("\n"),
  );
}

async function listStores() {
  const { data, error } = await createAdminClient()
    .from("stores")
    .select("store_no, name, branch, in_stock, out_reported_at")
    .eq("active", true)
    .order("store_no");
  if (error) throw error;
  if (!data?.length) {
    await sendTelegram("No supermarkets yet. Add them in Admin → Supermarkets.");
    return;
  }
  const lines = data.map(
    (s) => `${s.in_stock ? "🟢" : "🔴"} <b>#${s.store_no}</b> ${esc(storeTitle(s))}${s.in_stock && s.out_reported_at ? " ⚠️ reported out" : ""}`,
  );
  await sendTelegram(["<b>Supermarkets</b>", ...lines, "", "Mark one: /out 3 or /in 3"].join("\n"));
}

async function setStock(arg: string, inStock: boolean) {
  const no = Number(arg.replace("#", ""));
  if (!Number.isInteger(no) || no <= 0) {
    await sendTelegram(`Which supermarket? Send e.g. <code>/${inStock ? "in" : "out"} 3</code>. /stores shows the numbers.`);
    return;
  }
  const { data, error } = await createAdminClient()
    .from("stores")
    .update({ in_stock: inStock, stock_updated_at: new Date().toISOString(), out_reported_at: null })
    .eq("store_no", no)
    .select("name, branch");
  if (error) throw error;
  const store = data?.[0];
  if (!store) {
    await sendTelegram(`There's no supermarket #${no}. /stores shows the numbers.`);
    return;
  }
  await sendTelegram(
    inStock
      ? `🟢 ${esc(storeTitle(store))} is marked <b>in stock</b>. Customers will see it again.`
      : `🔴 ${esc(storeTitle(store))} is marked <b>out of stock</b>. Customers will be sent to the next nearest supermarket.`,
  );
}
