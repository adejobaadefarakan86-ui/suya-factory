// Telegram sends the staff chat's messages and button taps here (once the
// webhook is set: scripts/telegram-webhook.mjs). Staff keep supermarket stock
// up to date:
//   /stock (or /stores)  the stock list with a tap button per supermarket
//   tap "❌ Mark OUT" / "✅ Mark IN" under the list
//   /out 3, /in 3        the same by typing, for supermarket #3
// Only the staff chat (TELEGRAM_CHAT_ID) is obeyed, and only requests carrying
// our secret (TELEGRAM_WEBHOOK_SECRET) are accepted.
import { timingSafeEqual } from "node:crypto";
import { esc, sendTelegram, telegramApi } from "@/lib/telegram";
import { storeTitle } from "@/lib/stores";
import { parseStockButton, postStockList, setStockByNumber, STOCK_REFRESH, stockList } from "@/lib/stock-telegram";
import { answerMomoAlert, handleMomoButton, parseMomoButton } from "@/lib/ghana-orders";

type TgUser = { first_name?: string; last_name?: string; username?: string };
type Update = {
  message?: { text?: string; chat?: { id: number }; from?: TgUser };
  callback_query?: { id: string; data?: string; from?: TgUser; message?: { message_id: number; chat?: { id: number } } };
};

function secretOk(got: string | null) {
  const want = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!want || !got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

const isStaffChat = (chatId: number | undefined) => chatId !== undefined && String(chatId) === process.env.TELEGRAM_CHAT_ID;

function nameOf(u: TgUser | undefined) {
  const name = [u?.first_name, u?.last_name].filter(Boolean).join(" ") || (u?.username ? `@${u.username}` : "Staff");
  return `${name} (Telegram)`;
}

export async function POST(request: Request) {
  if (!secretOk(request.headers.get("x-telegram-bot-api-secret-token"))) {
    return new Response("forbidden", { status: 403 });
  }
  const update = (await request.json().catch(() => null)) as Update | null;

  try {
    if (update?.callback_query) await onButton(update.callback_query);
    else if (update?.message) await onMessage(update.message);
  } catch (e) {
    console.error("telegram update failed:", e);
  }
  // Always 200, or Telegram keeps re-sending the same update.
  return Response.json({ ok: true });
}

// --- Button taps --------------------------------------------------------------

async function onButton(q: NonNullable<Update["callback_query"]>) {
  const chatId = q.message?.chat?.id;
  if (!isStaffChat(chatId) || !q.message) {
    await telegramApi("answerCallbackQuery", { callback_query_id: q.id, text: "Not allowed here." });
    return;
  }

  // Ghana MoMo check: "✅ Payment received" / "❌ Not received"
  const momo = parseMomoButton(q.data ?? "");
  if (momo) {
    const result = await handleMomoButton(momo.orderNumber, momo.ok, nameOf(q.from));
    await answerMomoAlert(chatId!, q.message.message_id, result);
    await telegramApi("answerCallbackQuery", { callback_query_id: q.id, text: momo.ok ? "Payment confirmed" : "Marked not received" });
    return;
  }

  let toast = "Updated";
  const tap = parseStockButton(q.data ?? "");
  if (tap) {
    const store = await setStockByNumber(tap.storeNo, tap.inStock, nameOf(q.from));
    toast = store
      ? `${storeTitle(store)}: ${tap.inStock ? "has kilishi ✅" : "finished ❌"}`
      : "That supermarket no longer exists.";
  } else if (q.data !== STOCK_REFRESH) {
    toast = "That button is out of date. Send /stock for a new list.";
  }

  // Show the change straight away in the same message, for everyone in the chat.
  const { html, buttons } = await stockList();
  await telegramApi("editMessageText", {
    chat_id: chatId,
    message_id: q.message.message_id,
    text: html,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: buttons },
  });
  await telegramApi("answerCallbackQuery", { callback_query_id: q.id, text: toast.slice(0, 190) });
}

// --- Typed commands -------------------------------------------------------------

async function onMessage(msg: NonNullable<Update["message"]>) {
  if (!msg.text || !isStaffChat(msg.chat?.id)) return;
  // "/out@suyafactory_alerts_bot 3" -> ["out", "3"]
  const match = /^\/(\w+)(?:@\w+)?\s*([\s\S]*)$/.exec(msg.text.trim());
  if (!match) return;
  const command = match[1].toLowerCase();
  const arg = match[2].trim();

  if (command === "stock" || command === "stores") await postStockList();
  else if (command === "in" || command === "out" || command === "restock") await typedStock(arg, command !== "out", msg.from);
  else if (command === "help" || command === "start") await help();
}

async function help() {
  await sendTelegram(
    [
      "<b>Supermarket stock</b>",
      "/stock: the list with a button for each supermarket. Tap to mark it finished or restocked.",
      "",
      "You can also type /out 3 or /in 3 (the numbers are in Admin → Supermarkets).",
    ].join("\n"),
  );
}

async function typedStock(arg: string, inStock: boolean, from: TgUser | undefined) {
  const no = Number(arg.replace("#", ""));
  if (!Number.isInteger(no) || no <= 0) {
    await postStockList("Which supermarket? Just tap a button:");
    return;
  }
  const store = await setStockByNumber(no, inStock, nameOf(from));
  if (!store) {
    await postStockList(`There's no supermarket #${no}. Tap one of these instead:`);
    return;
  }
  await sendTelegram(
    inStock
      ? `🟢 ${esc(storeTitle(store))} is marked <b>in stock</b>. Customers will see it again.`
      : `🔴 ${esc(storeTitle(store))} is marked <b>finished</b>. Customers will be sent to the next nearest supermarket.`,
  );
}
