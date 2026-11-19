// Supermarket stock in the staff Telegram chat: a list with a tap button per
// supermarket ("Mark OUT ❌" / "Mark IN ✅"). Used by the chat commands, the
// button taps, the morning reminder and the staff stock page. Server only.
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { storeTitle } from "@/lib/stores";
import { esc, sendTelegram, telegramConfigured, type Buttons } from "@/lib/telegram";

type StockRow = {
  store_no: number;
  name: string;
  branch: string | null;
  in_stock: boolean;
  stock_updated_at: string;
  stock_updated_by: string | null;
  out_reported_at: string | null;
};

/** "20 Nov, 2:15 pm" in Lagos time. */
export function shortTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));
}

/** Button data: "stk:<store no>:<1 = in, 0 = out>" or "stk:refresh". */
export const STOCK_REFRESH = "stk:refresh";
export function parseStockButton(data: string): { storeNo: number; inStock: boolean } | null {
  const m = /^stk:(\d+):([01])$/.exec(data);
  return m ? { storeNo: Number(m[1]), inStock: m[2] === "1" } : null;
}

/** The current list as Telegram HTML + buttons. */
export async function stockList(intro = "📦 <b>Supermarket stock</b>: tap a button to change it") {
  const { data, error } = await createAdminClient()
    .from("stores")
    .select("store_no, name, branch, in_stock, stock_updated_at, stock_updated_by, out_reported_at")
    .eq("active", true)
    .order("store_no");
  if (error) throw error;
  const rows = (data ?? []) as StockRow[];
  if (rows.length === 0) {
    return { html: "No supermarkets yet. Add them in Admin → Supermarkets.", buttons: [] as Buttons };
  }

  const lines = rows.map((s) => {
    const status = s.in_stock ? "🟢" : "🔴";
    const who = s.stock_updated_by ? `${esc(s.stock_updated_by)}, ` : "";
    const warn = s.in_stock && s.out_reported_at ? "\n     ⚠️ a customer said they're out, please check" : "";
    return `${status} <b>${esc(storeTitle(s))}</b>\n     ${s.in_stock ? "has kilishi" : "finished"} · ${who}${shortTime(s.stock_updated_at)}${warn}`;
  });

  const buttons: Buttons = rows.map((s) => [
    {
      text: `${s.in_stock ? "❌ Mark OUT" : "✅ Mark IN"}: ${storeTitle(s)}`.slice(0, 60),
      callback_data: `stk:${s.store_no}:${s.in_stock ? 0 : 1}`,
    },
  ]);
  buttons.push([{ text: "🔄 Refresh", callback_data: STOCK_REFRESH }]);

  return { html: `${intro}\n\n${lines.join("\n")}`, buttons };
}

/** Post a fresh list to the staff chat. */
export async function postStockList(intro?: string) {
  if (!telegramConfigured()) return false;
  const { html, buttons } = await stockList(intro);
  return sendTelegram(html, buttons.length ? buttons : undefined);
}

/** Change stock by store number (Telegram buttons and /in /out). Returns the store, or null if there's no such number. */
export async function setStockByNumber(storeNo: number, inStock: boolean, by: string) {
  const { data, error } = await createAdminClient()
    .from("stores")
    .update({
      in_stock: inStock,
      stock_updated_at: new Date().toISOString(),
      stock_updated_by: by.slice(0, 100),
      out_reported_at: null,
    })
    .eq("store_no", storeNo)
    .select("name, branch");
  if (error) throw error;
  return data?.[0] ?? null;
}

/** Someone changed stock on the website: tell the chat. */
export async function announceStockChange(storeId: string) {
  if (!telegramConfigured()) return;
  const { data } = await createAdminClient()
    .from("stores")
    .select("name, branch, in_stock, stock_updated_by")
    .eq("id", storeId)
    .single();
  if (!data) return;
  const who = data.stock_updated_by ? ` by ${esc(data.stock_updated_by)}` : "";
  await sendTelegram(
    data.in_stock
      ? `🟢 <b>${esc(storeTitle(data))}</b> has kilishi again (marked${who} on the stock page).`
      : `🔴 <b>${esc(storeTitle(data))}</b> has finished their kilishi (marked${who} on the stock page). Customers are sent to the next nearest supermarket.`,
  );
}
