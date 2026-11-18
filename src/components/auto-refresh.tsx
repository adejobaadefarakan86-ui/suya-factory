"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Re-fetches the page's server data (without a full reload, and keeping scroll
 * position) so status changes show up by themselves:
 *  - every `seconds` while the tab is visible,
 *  - as soon as the visitor comes back to the tab,
 *  - when they arrive via the Back button (the browser's saved copy may be old).
 * Renders nothing.
 */
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(refresh, seconds * 1000);
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) refresh(); };

    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [router, seconds]);

  return null;
}
