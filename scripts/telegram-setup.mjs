// Connects the staff Telegram group. Run:  node scripts/telegram-setup.mjs
//
// 1. Needs TELEGRAM_BOT_TOKEN in .env.local (from @BotFather).
// 2. Add the bot to your staff group and send any message in the group
//    (or, with no group, open the bot yourself and tap Start).
// 3. Run this: it finds the group, saves TELEGRAM_CHAT_ID in .env.local and
//    sends a test message. The token itself is never printed.
import { readFileSync, writeFileSync } from "node:fs";

const ENV = ".env.local";
const env = readFileSync(ENV, "utf8");
const token = /^TELEGRAM_BOT_TOKEN=(.+)$/m.exec(env)?.[1]?.trim();
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is missing in .env.local. Get one from @BotFather first.");
  process.exit(1);
}

async function call(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`${method}: ${json.description}`);
  return json.result;
}

const me = await call("getMe");
console.log(`Bot: @${me.username}`);

const updates = await call("getUpdates");
const groups = new Map();
const privateChats = new Map();
for (const u of updates) {
  const chat = (u.message ?? u.my_chat_member ?? u.channel_post)?.chat;
  if (!chat) continue;
  if (chat.type === "private") {
    privateChats.set(chat.id, [chat.first_name, chat.last_name].filter(Boolean).join(" ") || "private chat");
  } else {
    groups.set(chat.id, chat.title);
  }
}

// No group (e.g. the Telegram account can't create one): fall back to a
// one-to-one chat with the bot. Re-run later after adding the bot to a group
// to move the alerts there.
if (groups.size === 0 && privateChats.size === 1) {
  const [[id, name]] = [...privateChats];
  groups.set(id, `${name} (private chat)`);
}

if (groups.size === 0) {
  if (privateChats.size > 1) {
    console.log("Several people have messaged the bot and there's no group. Set TELEGRAM_CHAT_ID by hand:");
    for (const [id, name] of privateChats) console.log(`  ${name}: ${id}`);
  } else {
    console.log("No chat found yet. Add the bot to your staff group and send a message there (or open the bot and tap Start), then run this again.");
  }
  process.exit(0);
}
if (groups.size > 1) {
  console.log("The bot is in more than one group:");
  for (const [id, title] of groups) console.log(`  ${title}: ${id}`);
  console.log("Remove it from the extra groups (or set TELEGRAM_CHAT_ID by hand), then run this again.");
  process.exit(0);
}

const [[chatId, title]] = [...groups];
const updated = /^TELEGRAM_CHAT_ID=.*$/m.test(env)
  ? env.replace(/^TELEGRAM_CHAT_ID=.*$/m, `TELEGRAM_CHAT_ID=${chatId}`)
  : `${env.replace(/\s*$/, "")}\nTELEGRAM_CHAT_ID=${chatId}\n`;
writeFileSync(ENV, updated);
console.log(`Group "${title}" saved as TELEGRAM_CHAT_ID.`);

await call("sendMessage", {
  chat_id: chatId,
  text: "✅ Suya Factory alerts are connected. New paid orders, orders needing a delivery price, and bulk enquiries will appear here.",
});
console.log("Test message sent to the group. Restart the dev server so the app picks up the new settings.");
