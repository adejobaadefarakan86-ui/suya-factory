// Adds / updates the Nigerian supermarkets that stock our kilishi.
//
//   node scripts/seed-stores.mjs          -> TEST mode: Call/WhatsApp go to OUR business number,
//                                             so nobody bothers the supermarkets before they agree
//   node scripts/seed-stores.mjs --real   -> switch every store to its real phone/WhatsApp
//
// Safe to run again: stores are matched by name and updated, not duplicated.
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY from .env.local.
import { readFileSync } from "node:fs";

const TEST_NUMBER = "2349132654740"; // Suya Factory NG business line (src/lib/contacts.ts)
const HOURS = "8am – 8pm (to be confirmed)";

// Addresses = each store's registered Google Maps listing. lat/lng: APPROXIMATE (street level) – fix the pin in Admin -> Supermarkets when someone is there.
const STORES = [
  {
    name: "Qwik Supermarket",
    branch: "Anthony Village",
    address: "30 Oseni Street (adjacent GTBank), Anthony Village, Lagos",
    lat: 6.5593, lng: 3.3682,
    realPhone: "2348121023991",
  },
  {
    name: "Golden Choice Supermarket",
    branch: "Ikeja",
    address: "10 John Olugbo Street, Oregun, Ikeja, Lagos",
    lat: 6.5994, lng: 3.3471,
    realPhone: "2347069641232",
  },
  {
    name: "La Royale Hotel",
    branch: "Agege",
    address: "La Royale Hotel & Event Centre, Amusan Street, Agege, Lagos",
    lat: 6.6658, lng: 3.3117,
    realPhone: "2348120638938",
  },
  // YK Supermarket (real phone 2348163222827): not on the map yet – add when we have its address.
];

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const base = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`;
const headers = {
  apikey: env.SUPABASE_SECRET_KEY,
  Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};
const real = process.argv.includes("--real");

async function api(path, init = {}) {
  const res = await fetch(`${base}/${path}`, { headers, ...init });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

// Packs + prices = the same Nigerian sizes and prices as the app.
const products = await api(
  "products?select=product_variants(size_label,weight_grams,is_active,variant_prices(currency,amount_minor))&is_active=eq.true",
);
const variants = products
  .flatMap((p) => p.product_variants)
  .filter((v) => v.is_active)
  .sort((a, b) => (a.weight_grams ?? 0) - (b.weight_grams ?? 0));
const seen = new Map();
for (const v of variants) {
  const ngn = v.variant_prices.find((p) => p.currency === "NGN");
  if (ngn && !seen.has(v.size_label)) seen.set(v.size_label, ngn.amount_minor / 100);
}
// "Small pack · 50g" -> "Small pack (50g) ₦2,500"
const packs = [...seen]
  .map(([size, naira]) => `${size.replace(/ · (.+)$/, " ($1)")} ₦${naira.toLocaleString("en-NG")}`)
  .join(" · ");
console.log("Packs:", packs || "(none found)");

for (const s of STORES) {
  const number = real ? s.realPhone : TEST_NUMBER;
  const row = {
    name: s.name, branch: s.branch, address: s.address, lat: s.lat, lng: s.lng,
    phone: number, whatsapp: number, opening_hours: HOURS, packs: packs || null, active: true, country: "NG",
  };
  const found = await api(`stores?select=id&name=eq.${encodeURIComponent(s.name)}`);
  if (found.length) {
    await api(`stores?id=eq.${found[0].id}`, { method: "PATCH", body: JSON.stringify(row) });
    console.log("Updated:", s.name, real ? "(real number)" : "(test number)");
  } else {
    await api("stores", { method: "POST", body: JSON.stringify(row) });
    console.log("Added:  ", s.name, real ? "(real number)" : "(test number)");
  }
}
