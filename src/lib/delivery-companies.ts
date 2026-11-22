// Delivery apps customers book their own rider with. Buttons open the app
// (appLink below); the customer copies the pickup address from our page.
// Order = how they're shown. Only the most used apps that fit.
export type DeliveryCompany = {
  id: string;
  name: string;
  url: string; // website (computers, or when nothing better is known)
  note: string;
  /** Google Play package id (its Play Store page when the app isn't installed). */
  android?: string;
  /**
   * The app's own link name ("scheme") on Android: with it, the button opens the app directly.
   * Only set ones TESTED on a real phone (apps don't publish them). Without it: the Play Store page.
   */
  androidScheme?: string;
  /** App Store page: on iPhone it shows "Open" when the app is installed. */
  ios?: string;
  /** Uber only: its documented link that opens the app with pickup + drop-off filled in. */
  uberLink?: boolean;
};

/**
 * Nigeria (Lagos): from the supermarket to the customer's door. Checked 2026-11-20:
 * Bolt Send (6M+ Nigerian deliveries in 2026) and inDrive Courier only (owner: keep it simple).
 * Any other app: "Other app…", and the rider details are still required.
 * Left out: Uber (left Nigeria on 2 Sep 2026), Kwik Delivery (reported bankrupt, May 2025),
 * Chowdeck (does not book a rider the way Bolt / inDrive do), GIGGo (too many steps: wallet top-up first).
 */
export const DELIVERY_COMPANIES: DeliveryCompany[] = [
  {
    id: "bolt",
    name: "Bolt",
    url: "https://bolt.eu/en-ng/",
    note: "Choose “Send” (parcel delivery).",
    android: "ee.mtakso.client",
    androidScheme: "bolt",
    ios: "https://apps.apple.com/ng/app/id675033630",
  },
  {
    id: "indrive",
    name: "inDrive",
    url: "https://indrive.com",
    note: "Choose “Courier”. You agree the price with the rider.",
    android: "sinet.startup.inDriver",
    androidScheme: "indriver",
    ios: "https://apps.apple.com/ng/app/id780125801",
  },
];

/**
 * Ghana: apps customers book their own rider with, from Gloria (our pickup
 * point) to their door. They pay the rider in the app or in cash.
 * Checked 2026-11-20 on the App Store / Play Store and each company's Ghana page:
 * Bolt ("Send"), Uber ("Send a package"), Yango ("Delivery") work in Ghana; Qargo is a Ghanaian
 * courier our team uses. Any other app: the customer picks "Other app…" and types its name.
 * Only the most used apps that fit (customer books a parcel rider now and pays them). Checked and
 * left out: inDrive, Shaxi (rides only in Ghana), Chowdeck GH (food only), Swoove (business/next-day),
 * ShaQ Express (small, unsure it still runs), OyaMove (closed: domain for sale, not in the stores).
 */
export const GH_DELIVERY_COMPANIES: DeliveryCompany[] = [
  {
    id: "bolt",
    name: "Bolt",
    url: "https://bolt.eu/en-gh/rides/features/bolt-send/",
    note: "Choose “Send” (parcel delivery).",
    android: "ee.mtakso.client",
    androidScheme: "bolt",
    ios: "https://apps.apple.com/gh/app/id675033630",
  },
  {
    id: "uber",
    name: "Uber",
    url: "https://www.uber.com/gh/en/",
    note: "Opens with our pickup and your address filled in. Choose “Send a package” if offered.",
    android: "com.ubercab",
    ios: "https://apps.apple.com/gh/app/id368677368",
    uberLink: true,
  },
  {
    id: "yango",
    name: "Yango",
    url: "https://delivery.yango.com/gh-en",
    note: "Choose “Delivery” (courier for packages).",
    android: "com.yandex.yango",
    ios: "https://apps.apple.com/gh/app/id1437157286",
  },
  {
    // Ghanaian courier our team uses. App Store: 4.7★ from 1.3k ratings, actively updated (Nov 2026).
    id: "qargo",
    name: "Qargo",
    url: "https://orderqargo.com/",
    note: "Ghanaian courier. Choose express delivery.",
    android: "com.orderqargo",
    ios: "https://apps.apple.com/gh/app/id1637942622",
  },
];

type Point = { lat: number; lng: number; label?: string };

/** The best link for this phone: the app itself where possible, else its store page, else the website. */
export function appLink(c: DeliveryCompany, userAgent: string, pickup: Point, dropoff: Point | null) {
  if (c.uberLink) {
    // Uber's universal link (developer.uber.com, deep links): opens the Uber app with pickup and
    // drop-off set, or Uber in the browser. Checked 2026-11-23: the older m.uber.com/looking link
    // now leads to an error page; this one still opens the app.
    const q = new URLSearchParams({ action: "setPickup" });
    q.set("pickup[latitude]", String(pickup.lat));
    q.set("pickup[longitude]", String(pickup.lng));
    if (pickup.label) q.set("pickup[nickname]", pickup.label);
    if (dropoff) {
      q.set("dropoff[latitude]", String(dropoff.lat));
      q.set("dropoff[longitude]", String(dropoff.lng));
      if (dropoff.label) q.set("dropoff[nickname]", dropoff.label);
    }
    return `https://m.uber.com/ul/?${q.toString()}`;
  }
  if (/Android/i.test(userAgent)) {
    const store = c.android ? `https://play.google.com/store/apps/details?id=${c.android}` : c.url;
    // Chrome only opens an app through a link name the app registered; otherwise straight to its store page.
    if (c.androidScheme) {
      const pkg = c.android ? `package=${c.android};` : "";
      return `intent://open#Intent;scheme=${c.androidScheme};${pkg}S.browser_fallback_url=${encodeURIComponent(store)};end`;
    }
    return store;
  }
  if (/iPhone|iPad|iPod/i.test(userAgent) && c.ios) return c.ios;
  return c.url;
}
