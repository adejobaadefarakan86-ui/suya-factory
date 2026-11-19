// Turns on the staff chat commands (/stores, /out 3, /in 3) once the site is
// live on the internet. Run:  node scripts/telegram-webhook.mjs https://your-site.com
//
// - Creates TELEGRAM_WEBHOOK_SECRET in .env.local if it's missing. The live
//   site needs the same value in its environment settings.
// - Tells Telegram to send the chat's messages to <site>/api/telegram/webhook.
// To turn it off again (e.g. to re-run telegram-setup.mjs, which can't work
// while a webhook is set):  node scripts/telegram-webhook.mjs --off
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const ENV = ".env.local";
let env = readFileSync(ENV, "utf8");
const get = (k) => new RegExp(`^${k}=(.+)$`, "m").exec(env)?.[1]?.trim();

const token = get("TELEGRAM_BOT_TOKEN");
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is missing in .env.local. Run telegram-setup.mjs first.");
  process.exit(1);
}

async function call(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`${method}: ${json.description}`);
  return json.result;
}

const arg = process.argv[2];
if (arg === "--off") {
  await call("deleteWebhook");
  console.log("Webhook removed. Chat commands are off.");
  process.exit(0);
}
if (!arg || !/^https:\/\//.test(arg)) {
  console.error("Usage: node scripts/telegram-webhook.mjs https://your-live-site.com   (must be https)");
  process.exit(1);
}

let secret = get("TELEGRAM_WEBHOOK_SECRET");
if (!secret) {
  secret = randomBytes(24).toString("hex");
  env = `${env.replace(/\s*$/, "")}\nTELEGRAM_WEBHOOK_SECRET=${secret}\n`;
  writeFileSync(ENV, env);
  console.log("Created TELEGRAM_WEBHOOK_SECRET in .env.local (add the same value to the live site's settings).");
}

const url = `${arg.replace(/\/$/, "")}/api/telegram/webhook`;
await call("setWebhook", { url, secret_token: secret, allowed_updates: ["message"] });
await call("setMyCommands", {
  commands: [
    { command: "stores", description: "List supermarkets and their stock" },
    { command: "out", description: "Mark a supermarket out of stock, e.g. /out 3" },
    { command: "in", description: "Mark a supermarket restocked, e.g. /in 3" },
  ],
});
console.log(`Chat commands are on. Telegram will send messages to ${url}`);
