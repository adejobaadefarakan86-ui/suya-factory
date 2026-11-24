"use client";
// First open: we detect the visitor's country (Nigeria or Ghana) and they confirm
// it with one tap. It's then saved, so each side only sees its own prices and
// ways to buy. If detection was wrong, Settings has "Change country" (with an
// "Are you sure?" step). Same look as the welcome screen. Never shown in the admin.
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { setCountry } from "@/app/actions/country";
import { LogoMark } from "@/components/logo-mark";
import { COUNTRIES, type CountryCode } from "@/lib/countries";

export const COUNTRY_CHOSEN_EVENT = "sf-country-chosen";

function Flag({ code }: { code: CountryCode }) {
  return code === "NG" ? (
    <svg viewBox="0 0 30 20" className="h-8 w-12 rounded-md shadow-sm" aria-hidden="true">
      <rect width="30" height="20" fill="#fff" />
      <rect width="10" height="20" fill="#008751" />
      <rect x="20" width="10" height="20" fill="#008751" />
    </svg>
  ) : (
    <svg viewBox="0 0 30 20" className="h-8 w-12 rounded-md shadow-sm" aria-hidden="true">
      <rect width="30" height="20" fill="#006b3f" />
      <rect width="30" height="13.34" fill="#fcd116" />
      <rect width="30" height="6.67" fill="#ce1126" />
      <path d="M15 7.2l.9 2.7h2.8l-2.3 1.7.9 2.7-2.3-1.7-2.3 1.7.9-2.7-2.3-1.7h2.8z" fill="#000" />
    </svg>
  );
}

const OPTIONS: { code: CountryCode; name: string; how: string }[] = [
  { code: "NG", name: "Nigeria", how: "Buy at a supermarket near you" },
  { code: "GH", name: "Ghana", how: "Order online, pay with MoMo" },
];

export function CountryPicker({ detected }: { detected: CountryCode }) {
  const path = usePathname();
  const [ready, setReady] = useState(false);
  const [picked, setPicked] = useState<CountryCode | null>(null);
  const [, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const inAdmin = path.startsWith("/admin");

  // Wait for the opening screen to finish, then show.
  useEffect(() => {
    if (inAdmin) return;
    const html = document.documentElement;
    const splashPlaying = !html.dataset.introSeen;
    const lessMotion = html.dataset.motion === "reduce" || matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setReady(true), splashPlaying ? (lessMotion ? 1900 : 3350) : 0);
    return () => clearTimeout(t);
  }, [inAdmin]);

  // No page scrolling behind it.
  useEffect(() => {
    if (!ready || inAdmin) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [ready, inAdmin]);

  function choose(code: CountryCode) {
    if (picked) return;
    setPicked(code);
    startTransition(async () => {
      const form = new FormData();
      form.set("country", code);
      await setCountry(form);
      // Close straight away: the page already shows this country.
      setDone(true);
      window.dispatchEvent(new Event(COUNTRY_CHOSEN_EVENT));
    });
  }

  if (!ready || inAdmin || done) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="country-title"
      className="onboard-in bg-ember fixed inset-0 z-[97] flex items-center justify-center overflow-y-auto px-4 py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-gold/30 blur-3xl" />
        <div className="absolute -right-16 bottom-0 h-96 w-96 rounded-full bg-crimson/50 blur-3xl" />
      </div>

      <div
        className="onboard-card relative w-full max-w-sm rounded-[1.75rem] border border-white/30 bg-white/15 p-7 text-center text-white shadow-[0_30px_80px_-30px_rgba(60,10,5,0.7)] backdrop-blur-xl sm:p-9">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-white/30 bg-white/15">
          <LogoMark mono gid="sf-heat-country" className="h-12 w-12 text-white" />
        </span>
        <div className="mx-auto mt-6 w-fit"><Flag code={detected} /></div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-white/75">You&apos;re in</p>
        <h2 id="country-title" className="mt-1 font-display text-3xl font-semibold tracking-tight">{COUNTRIES[detected].name}</h2>
        <p className="mt-2 text-sm text-white/80">{OPTIONS.find((o) => o.code === detected)!.how}</p>

        <button type="button" onClick={() => choose(detected)} disabled={picked !== null}
          className="btn mt-8 w-full gap-2 bg-white py-3.5 text-base font-semibold text-crimson shadow-[0_10px_30px_-12px_rgba(60,10,5,0.65)] hover:bg-[#fff4ec]">
          Continue
          {picked && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
        </button>
        <p className="mt-5 text-xs text-white/75">Wrong country? Change it in Settings.</p>
      </div>
    </div>
  );
}
