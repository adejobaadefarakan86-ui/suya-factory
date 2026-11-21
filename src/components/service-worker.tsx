"use client";
// Turns on public/sw.js (offline page + faster repeat visits) on the live site only.
// Not during development, where stored files would get in the way of changes.
import { useEffect } from "react";

export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => { /* not critical */ });
  }, []);
  return null;
}
