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
  url: string;
  note: string;
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
 * ⚠️ To confirm with a real test in Accra: names of the parcel options in each app.
 */
export const GH_DELIVERY_COMPANIES: DeliveryCompany[] = [
  {
    id: "bolt",
    name: "Bolt",
    url: "https://bolt.eu/en-gh/rides/features/bolt-send/",
    note: "In the Bolt app, choose “Bolt Send” (parcels, same day).",
  },
  {
    id: "yango",
    name: "Yango",
    url: "https://delivery.yango.com/gh-en",
    note: "In the Yango app, choose “Delivery” → “Express”.",
  },
];
