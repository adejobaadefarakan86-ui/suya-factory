// Talking to the staff Telegram chat. Server only (uses the bot token).
// Setup: see scripts/telegram-setup.mjs. If the bot isn't configured, alerts are
// skipped quietly so the shop keeps working.
import "server-only";

export function telegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

/** Escape text for Telegram's HTML mode. */
export function esc(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Tap buttons under a message: rows of [label, callback data]. */
export type Buttons = { text: string; callback_data: string }[][];

/** Call any Telegram Bot API method. Never throws; returns null on failure. */
export async function telegramApi(method: string, body: Record<string, unknown>): Promise<unknown> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn(`Telegram ${method} skipped: TELEGRAM_BOT_TOKEN not set.`);
    return null;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; result?: unknown; description?: string } | null;
    if (!json?.ok) {
      // Editing a message to the exact same content isn't a real failure.
      if (!json?.description?.includes("message is not modified")) {
        console.error(`Telegram ${method} failed:`, res.status, json?.description ?? "");
      }
      return null;
    }
    return json.result ?? true;
  } catch (e) {
    console.error(`Telegram ${method} failed:`, e);
    return null;
  }
}

/** Send one message (Telegram HTML) to the staff chat, optionally with buttons. Never throws. */
export async function sendTelegram(html: string, buttons?: Buttons): Promise<boolean> {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) {
    console.warn("Telegram alert skipped: TELEGRAM_CHAT_ID not set.");
    return false;
  }
  const result = await telegramApi("sendMessage", {
    chat_id: chatId,
    text: html,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(buttons ? { reply_markup: { inline_keyboard: buttons } } : {}),
  });
  return result !== null;
}
