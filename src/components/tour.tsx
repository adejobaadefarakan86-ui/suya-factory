"use client";
// Guided tour: dims the screen, spotlights one control at a time and explains
// it in a short card (Back / Next / Skip). Two tours: the shop (home page) and
// the control room (admin). Start one with startTour("shop" | "admin"); it moves
// to the right page first if needed. Targets are elements with data-tour="…";
// a step whose target isn't on screen (e.g. hidden on phones) uses its fallback
// target, or shows the card in the middle.
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";

type Step = { targets: string[]; title: string; text: string };
type TourName = "shop" | "admin";

const TOURS: Record<TourName, { path: string; steps: Step[] }> = {
  shop: {
    path: "/",
    steps: [
      { targets: [], title: "A quick look around", text: "Six short steps to the things you'll use most. You can skip at any time." },
      { targets: ["order"], title: "Start here", text: "Order your kilishi in Ghana, or find the nearest supermarket that has it in Nigeria." },
      { targets: ["nav", "menu"], title: "Menu", text: "Shop, Where to buy and Custom orders (1kg and up). On a phone, they're behind this button, with the Nigeria / Ghana switch." },
      { targets: ["cart"], title: "Your cart", text: "Everything you add waits here. Check out when you're ready, no account needed." },
      { targets: ["account"], title: "Your account", text: "Log in to track your orders and check out faster." },
      { targets: ["settings", "menu"], title: "Settings", text: "Choose light or dark, bigger text, or fewer animations. Find this tour there too." },
    ],
  },
  admin: {
    path: "/admin",
    steps: [
      { targets: [], title: "Welcome to the control room", text: "A quick tour of the places you'll use to run Suya Factory day to day." },
      { targets: ["admin-today"], title: "Needs you now", text: "Anything waiting for you shows here: MoMo to check, orders to hand over, refunds, supermarkets out of stock." },
      { targets: ["nav-orders"], title: "Orders", text: "Each order shows one clear next step: confirm the MoMo, hand it to the customer's rider (they say a 4-digit code), or send a refund." },
      { targets: ["nav-stores"], title: "Supermarkets", text: "Call or WhatsApp each store and mark it in or out of stock. Customers are sent to the nearest one that has kilishi." },
      { targets: ["nav-delivery"], title: "Pickup & delivery", text: "The Ghana pickup address, contact and hours that customers copy into their ride app." },
      { targets: ["nav-team"], title: "Team", text: "Give a new person admin or staff access once they've signed up." },
      { targets: [], title: "Telegram alerts", text: "New payments, riders, cancellations and refunds also arrive in the “Suya Factory Orders” Telegram group, with the same buttons. Tap there or here." },
    ],
  },
};

const PENDING = "sf-tour-pending";

/** Start a tour from anywhere (a button, the welcome screen, the first admin visit). */
export function startTour(name: TourName) {
  try { sessionStorage.setItem(PENDING, name); } catch { /* fine */ }
  window.dispatchEvent(new CustomEvent("sf-tour", { detail: name }));
}

function visible(el: Element | null): el is HTMLElement {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
}

function findTarget(names: string[]) {
  for (const n of names) {
    const el = [...document.querySelectorAll(`[data-tour="${n}"]`)].find(visible);
    if (el) return el as HTMLElement;
  }
  return null;
}

export function Tour() {
  const path = usePathname();
  const router = useRouter();
  const [name, setName] = useState<TourName | null>(null);
  const [i, setI] = useState(0);
  const [box, setBox] = useState<DOMRect | null>(null);

  // A tour was asked for: go to its page, then begin.
  const begin = useCallback((t: TourName) => {
    if (location.pathname !== TOURS[t].path) { router.push(TOURS[t].path); return; }
    try { sessionStorage.removeItem(PENDING); } catch { /* fine */ }
    setI(0);
    setName(t);
  }, [router]);

  useEffect(() => {
    const on = (e: Event) => begin((e as CustomEvent<TourName>).detail);
    window.addEventListener("sf-tour", on);
    return () => window.removeEventListener("sf-tour", on);
  }, [begin]);

  // Arrived on the tour's page after being sent there.
  useEffect(() => {
    let pending: string | null = null;
    try { pending = sessionStorage.getItem(PENDING); } catch { /* fine */ }
    if (pending === "shop" || pending === "admin") {
      const t = setTimeout(() => begin(pending as TourName), 600);
      return () => clearTimeout(t);
    }
  }, [path, begin]);

  const step = name ? TOURS[name].steps[i] : null;

  // Spotlight the step's target (scrolled into view), and follow it on scroll/resize.
  useLayoutEffect(() => {
    if (!step) return;
    const el = findTarget(step.targets);
    // Measuring where the target sits on screen is reading the page (an outside system), not derived state.
    if (!el) { setBox(null); return; } // eslint-disable-line react-hooks/set-state-in-effect
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const measure = () => setBox(el.getBoundingClientRect());
    const t = setTimeout(measure, 350);
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => { clearTimeout(t); window.removeEventListener("scroll", measure); window.removeEventListener("resize", measure); };
  }, [step]);

  const close = useCallback(() => { setName(null); setBox(null); }, []);
  useEffect(() => {
    if (!name) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [name, close]);

  if (!name || !step) return null;
  const steps = TOURS[name].steps;
  const last = i === steps.length - 1;
  const pad = 8;

  // Card goes below the spotlight when there's room, otherwise above; centred if no target.
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const below = box ? box.bottom + 220 < vh : false;
  const cardStyle: React.CSSProperties = box
    ? below ? { top: box.bottom + pad + 12 } : { bottom: vh - box.top + pad + 12 }
    : { top: "50%", transform: "translateY(-50%)" };

  return (
    <div className="tour-in fixed inset-0 z-[96]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {/* Dim everything, with a clear window around the target */}
      {box ? (
        <div aria-hidden="true" className="pointer-events-none fixed rounded-2xl ring-2 ring-white/80 transition-all duration-300 ease-out"
          style={{ top: box.top - pad, left: box.left - pad, width: box.width + pad * 2, height: box.height + pad * 2, boxShadow: "0 0 0 9999px rgba(10,8,7,0.72)" }} />
      ) : (
        <div aria-hidden="true" className="fixed inset-0 bg-[rgba(10,8,7,0.72)]" />
      )}
      {/* Clicks outside the card do nothing (Skip or Esc closes) */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      <div className="fixed inset-x-4 mx-auto max-w-sm rounded-[1.4rem] border border-white/25 bg-[#1a1514]/90 p-5 text-white shadow-2xl backdrop-blur-xl transition-all duration-300 ease-out"
        style={cardStyle}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ffb547]">{i + 1} of {steps.length}</p>
        <h2 id="tour-title" className="mt-1.5 font-display text-xl font-semibold">{step.title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-white/80">{step.text}</p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <button type="button" onClick={close} className="text-sm font-medium text-white/70 transition hover:text-white">
            {last ? "Close" : "Skip"}
          </button>
          <div className="flex gap-2">
            {i > 0 && (
              <button type="button" onClick={() => setI(i - 1)}
                className="rounded-xl border border-white/30 px-4 py-2 text-sm font-medium transition hover:bg-white/10">Back</button>
            )}
            <button type="button" onClick={() => (last ? close() : setI(i + 1))}
              className="rounded-xl bg-[#e2402f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#b8301f]">
              {last ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** "Show me around" button for a tour. */
export function TourButton({ tour, className = "", children }: { tour: TourName; className?: string; children: React.ReactNode }) {
  return <button type="button" onClick={() => startTour(tour)} className={className}>{children}</button>;
}

/** Starts the control-room tour by itself the first time someone opens the admin on this device. */
export function FirstAdminTour() {
  useEffect(() => {
    let done = false;
    try { done = localStorage.getItem("sf-admin-tour") === "1"; localStorage.setItem("sf-admin-tour", "1"); } catch { done = true; }
    if (!done) {
      const t = setTimeout(() => startTour("admin"), 900);
      return () => clearTimeout(t);
    }
  }, []);
  return null;
}
