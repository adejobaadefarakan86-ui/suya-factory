"use client";
// In-app back: keeps its own list of the pages visited in this app (this tab),
// so "back" always lands somewhere sensible. It ignores in-page jumps like
// "Order now", never leaves the app, and when there's no earlier page it goes
// to the page's parent (product > shop, order > account, admin order > orders).
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const KEY = "sf-trail";

function readTrail(): string[] {
  try { return JSON.parse(sessionStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
function saveTrail(t: string[]) {
  try { sessionStorage.setItem(KEY, JSON.stringify(t.slice(-30))); } catch { /* private mode */ }
}

/** Where "back" goes when there is no earlier page. */
export function parentOf(path: string) {
  if (path.startsWith("/shop/")) return "/shop";
  if (path.startsWith("/orders/")) return "/account";
  if (/^\/admin\/orders\/.+/.test(path)) return "/admin/orders";
  if (path.startsWith("/admin/")) return "/admin";
  return "/";
}

/** Records each page visited (mounted once, in the app frame). Also marks
 *  <html data-area="admin"> in the control room, so the shop's top bar and footer
 *  hide there and come back as soon as you leave (globals.css). */
export function TrailRecorder() {
  const path = usePathname();
  useEffect(() => {
    if (path.startsWith("/admin")) document.documentElement.dataset.area = "admin";
    else delete document.documentElement.dataset.area;
    const t = readTrail();
    if (t.length >= 2 && t[t.length - 2] === path) t.pop(); // went back
    else if (t[t.length - 1] !== path) t.push(path);
    saveTrail(t);
  }, [path]);
  return null;
}

export function BackButton({ tone = "page" }: { tone?: "page" | "night" }) {
  const path = usePathname();
  const router = useRouter();
  // Not on the two "home" pages: the shop's home, and the control room's overview.
  if (path === "/" || path === "/admin") return null;

  function goBack() {
    const t = readTrail();
    const here = t[t.length - 1] === path ? t.length - 1 : t.length;
    const previous = here > 0 ? t[here - 1] : undefined;
    router.push(previous && previous !== path ? previous : parentOf(path));
  }

  return (
    <button type="button" aria-label="Go back" onClick={goBack}
      className={`-ml-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl transition md:hidden ${tone === "night" ? "text-white hover:bg-white/10" : "text-ink hover:bg-cream"}`}>
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 5l-7 7 7 7" />
      </svg>
    </button>
  );
}
