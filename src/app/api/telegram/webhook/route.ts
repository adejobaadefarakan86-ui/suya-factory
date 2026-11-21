// Telegram sends the staff chat's button taps here (webhook: scripts/telegram-webhook.mjs):
// Ghana orders' ✅ payment received / ❌ not received, 📦 handed to rider, 💸 refund sent.
// (Supermarket stock is kept in the app only: /stock.)
// Only the staff chat (TELEGRAM_CHAT_ID) is obeyed, and only requests carrying
// our secret (TELEGRAM_WEBHOOK_SECRET) are accepted.
import { timingSafeEqual } from "node:crypto";
import { sendTelegram, telegramApi } from "@/lib/telegram";
import {
  answerMomoAlert, handleHandover, handleMomoButton, handleRefunded, parseHandButton, parseMomoButton, parseRefundButton,
} from "@/lib/ghana-orders";

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

  // Ghana own rider: "📦 Handed to rider"
  const handed = parseHandButton(q.data ?? "");
  if (handed) {
    await answerMomoAlert(chatId!, q.message.message_id, await handleHandover(handed, nameOf(q.from)));
    await telegramApi("answerCallbackQuery", { callback_query_id: q.id, text: "Handed over" });
    return;
  }

  // Cancelled order: "💸 Refunded"
  const refunded = parseRefundButton(q.data ?? "");
  if (refunded) {
    await answerMomoAlert(chatId!, q.message.message_id, await handleRefunded(refunded, nameOf(q.from)));
    await telegramApi("answerCallbackQuery", { callback_query_id: q.id, text: "Marked refunded" });
    return;
  }

  // Old stock-list buttons (stock is now kept in the app only).
  await telegramApi("answerCallbackQuery", {
    callback_query_id: q.id,
    text: "Supermarket stock is now updated in the app: Admin → Stock check.",
  });
}

// --- Typed commands -------------------------------------------------------------

async function onMessage(msg: NonNullable<Update["message"]>) {
  if (!msg.text || !isStaffChat(msg.chat?.id)) return;
  // "/help@suyafactory_alerts_bot" -> "help"
  const match = /^\/(\w+)(?:@\w+)?/.exec(msg.text.trim());
  if (!match) return;
  const command = match[1].toLowerCase();

  if (command === "help" || command === "start") await help();
}

async function help() {
  await sendTelegram(
    [
      "<b>Suya Factory order alerts</b>",
      "Tap the buttons under each alert: ✅ payment received, 📦 handed to rider, 💸 refund sent.",
      "Supermarket stock is updated in the app: Admin → Stock check.",
    ].join("\n"),
  );
}
