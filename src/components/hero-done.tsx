"use client";
// The home page's opening animation plays on the first open only. Once it has
// finished (or you leave the page), it's marked done, so coming back to the
// home page shows the headline already in place: no replay, no jump.
import { useEffect } from "react";

export function HeroDone() {
  useEffect(() => {
    const html = document.documentElement;
    const done = () => { html.dataset.heroDone = "1"; };
    const shownAt = Date.now();
    const t = setTimeout(done, html.dataset.introSeen ? 2500 : 5500);
    // Leaving the page also marks it done (but not the instant test re-mount React does in development).
    return () => { clearTimeout(t); if (Date.now() - shownAt > 800) done(); };
  }, []);
  return null;
}
