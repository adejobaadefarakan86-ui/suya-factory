// Suya Factory service worker (keeps the app usable on weak connections).
// - Pages always come fresh from the internet (prices, orders and accounts are
//   never stored). If there's no connection, the "You're offline" page shows.
// - Things that never change (built styles/scripts, fonts, icons, photos) are
//   kept on the phone after the first visit, so later opens load faster.
// Change VERSION to throw away everything stored and start again.
const VERSION = "sf-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll([OFFLINE, "/icons/icon-192.png"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Built files have unique names per version, so keeping them is always safe. */
function isStatic(url) {
  return url.pathname.startsWith("/_next/static/")
    || url.pathname.startsWith("/icons/")
    || url.pathname.startsWith("/images/")
    || /\.(?:woff2?|png|jpe?g|webp|svg)$/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // payments, database, maps: untouched

  // Opening a page: always from the internet; offline page if there's no connection.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
    return;
  }

  // Unchanging files: from the phone if we have them, otherwise fetch and keep a copy.
  if (isStatic(url)) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })),
    );
  }
});
