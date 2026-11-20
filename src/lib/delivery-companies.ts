// Delivery companies customers can book a rider with, from the supermarket
// to their door. The links open each company's website; on a phone that has
// the app installed, the app usually opens instead.
//
// None of them let another app pre-fill the pickup address, so the customer
// copies it from our page and pastes it in.
//
// ⚠️ To confirm: which of these really do parcel pickups in Lagos today, and
// their app links. Edit this list: order = how they're shown.
export type DeliveryCompany = {
  id: string;
  name: string;
  url: string; // website (computers, or when nothing better is known)
  note: string;
  /** Google Play package id: on Android the app opens if installed, otherwise its Play Store page. */
  android?: string;
  /** App Store page: on iPhone it shows "Open" when the app is installed. */
  ios?: string;
  /** Uber only: its documented link that opens the app with pickup + drop-off filled in. */
  uberLink?: boolean;
};

export const DELIVERY_COMPANIES: DeliveryCompany[] = [
  {
    id: "chowdeck",
    name: "Chowdeck",
    url: "https://chowdeck.com",
    note: "In the Chowdeck app, choose “Send a package”.",
  },
  {
    id: "indrive",
    name: "inDrive",
    url: "https://indrive.com",
    note: "In the inDrive app, choose “Courier”. You agree the price with the rider.",
  },
  {
    id: "kwik",
    name: "Kwik Delivery",
    url: "https://kwik.delivery",
    note: "Same-day parcel delivery in Lagos.",
  },
];

/**
 * Ghana: apps customers book their own rider with, from Gloria (our pickup
 * point) to their door. They pay the rider in the app or in cash.
 * Checked 2026-11-20 on the App Store / Play Store and each company's Ghana page:
 * Bolt ("Send"), Uber ("Send a package"), Yango ("Delivery") work in Ghana.
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
  if (/Android/i.test(userAgent) && c.android) {
    const store = `https://play.google.com/store/apps/details?id=${c.android}`;
    return `intent://#Intent;package=${c.android};S.browser_fallback_url=${encodeURIComponent(store)};end`;
  }
  if (/iPhone|iPad|iPod/i.test(userAgent) && c.ios) return c.ios;
  return c.url;
}
