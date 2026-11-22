"use client";
// First-open welcome: right after the opening screen, new visitors on the home
// page are invited to log in, create an account, or continue as a guest.
// Never shown to someone logged in, or on a phone where someone has logged in
// before, or once a choice has been made. Same look as the login page.
import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/logo-mark";

const SEEN = "sf-onboard-seen";   // a choice was made on this device
const MEMBER = "sf-has-account";  // someone has logged in on this device

function flag(key: string, set = false) {
  try {
    if (set) localStorage.setItem(key, "1");
    return localStorage.getItem(key) === "1";
  } catch {
    return true; // storage blocked: don't risk showing it on every visit
  }
}

export function Onboarding({ loggedIn }: { loggedIn: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loggedIn) { flag(MEMBER, true); return; }
    if (location.pathname !== "/" || flag(MEMBER) || flag(SEEN)) return;
    const html = document.documentElement;
    const splashPlaying = !html.dataset.introSeen;
    const lessMotion = html.dataset.motion === "reduce" || matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Wait for the opening screen to finish, then show.
    const wait = splashPlaying ? (lessMotion ? 1900 : 3350) : 350;
    const t = setTimeout(() => setOpen(true), wait);
    return () => clearTimeout(t);
  }, [loggedIn]);

  // While open: no page scrolling behind it, and Esc closes it.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") choose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open]);

  function choose() {
    flag(SEEN, true);
    setOpen(false);
  }

  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="onboard-title"
      className="onboard-in bg-ember fixed inset-0 z-[95] flex items-center justify-center overflow-y-auto px-4 py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-gold/30 blur-3xl" />
        <div className="absolute -right-16 bottom-0 h-96 w-96 rounded-full bg-crimson/50 blur-3xl" />
      </div>

      <div className="onboard-card relative w-full max-w-sm rounded-[1.75rem] border border-white/30 bg-white/15 p-7 text-center text-white shadow-[0_30px_80px_-30px_rgba(60,10,5,0.7)] backdrop-blur-xl sm:p-9">
        <button type="button" onClick={choose} aria-label="Close and continue as a guest"
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-white/70 transition hover:bg-white/15 hover:text-white">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-white/30 bg-white/15">
          <LogoMark mono gid="sf-heat-onboard" className="h-12 w-12 text-white" />
        </span>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-white/75">Welcome</p>
        <h2 id="onboard-title" className="mt-2 font-display text-3xl font-semibold tracking-tight">Suya Factory</h2>
        <p className="mx-auto mt-3 max-w-[17rem] text-sm leading-relaxed text-white/80">
          Sign in to track your orders and check out faster. Or carry on as a guest.
        </p>

        <div className="mt-8 space-y-3">
          <Link href="/login" onClick={() => flag(SEEN, true)}
            className="btn w-full bg-white py-3.5 text-base font-semibold text-crimson shadow-[0_10px_30px_-12px_rgba(60,10,5,0.65)] hover:bg-[#fff4ec]">
            Log in
          </Link>
          <Link href="/signup" onClick={() => flag(SEEN, true)}
            className="btn w-full border border-white/50 bg-white/10 py-3.5 text-base font-semibold text-white hover:bg-white/20">
            Create an account
          </Link>
        </div>
        <button type="button" onClick={choose}
          className="mt-5 text-sm font-medium text-white/80 underline-offset-4 transition hover:text-white hover:underline">
          Continue as guest
        </button>
      </div>
    </div>
  );
}
