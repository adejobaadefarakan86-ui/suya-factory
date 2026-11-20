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
 * Bolt Send (6M+ Nigerian deliveries in 2026), Chowdeck Relay (packages across town).
 * Left out: Uber (left Nigeria on 2 Sep 2026), Kwik Delivery (reported bankrupt, May 2025).
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
    id: "chowdeck",
    name: "Chowdeck",
    url: "https://chowdeck.com/relay",
    note: "Choose “Relay” (send a package).",
    ios: "https://apps.apple.com/ng/app/id1530676376",
    androidScheme: "chowdeck",
  },
  {
    id: "indrive",
    name: "inDrive",
    url: "https://indrive.com",
    note: "Choose “Courier”. You agree the price with the rider.",
    android: "sinet.startup.inDriver",
    androidScheme: "indriver",
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
    // Documented at developer.uber.com (deep links): opens the Uber app, or m.uber.com in the browser.
    const spot = (p: Point) => JSON.stringify({ latitude: p.lat, longitude: p.lng, ...(p.label ? { addressLine1: p.label } : {}) });
    const q = new URLSearchParams({ pickup: spot(pickup) });
    if (dropoff) q.set("drop[0]", spot(dropoff));
    return `https://m.uber.com/looking?${q.toString()}`;
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
