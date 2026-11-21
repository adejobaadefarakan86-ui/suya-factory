"use client";
// Light / dark theme. The customer's choice is kept in this browser
// (localStorage "sf-theme": "light" | "dark" | "system"). "System" follows the
// phone or computer setting. THEME_SCRIPT runs before the page paints, so
// there's no white flash for dark-theme visitors.
import { useEffect, useState } from "react";

const KEY = "sf-theme";
export type ThemeChoice = "system" | "light" | "dark";

/** Runs in <head> before anything shows: sets data-theme, the customer settings, and
 *  whether the opening screen plays (yes when the app was opened fresh or after 30+
 *  minutes away; no while moving around an app that is already open). */
export const THEME_SCRIPT = `(function(){var d=document.documentElement;d.classList.add("js");try{var t=localStorage.getItem("${KEY}");var dark=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);d.dataset.theme=dark?"dark":"light";if(localStorage.getItem("sf-motion")==="reduce")d.dataset.motion="reduce";if(localStorage.getItem("sf-text")==="large")d.dataset.text="large";var last=+sessionStorage.getItem("sf-intro")||0,now=Date.now();if(now-last<18e5)d.dataset.introSeen="1";var mark=function(){try{sessionStorage.setItem("sf-intro",String(Date.now()))}catch(e){}};mark();document.addEventListener("visibilitychange",mark)}catch(e){d.dataset.theme="light"}})();`;

function apply(choice: ThemeChoice) {
  const dark = choice === "dark" || (choice === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

function readChoice(): ThemeChoice {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

const OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/** "Auto / Light / Dark" switch. `tone="night"` for dark backgrounds (footer). */
export function ThemeSwitcher({ tone = "page" }: { tone?: "page" | "night" }) {
  const [choice, setChoice] = useState<ThemeChoice>("system");

  // Read the saved choice once in the browser, and follow the device while on "Auto".
  useEffect(() => {
    const saved = readChoice();
    setChoice(saved); // eslint-disable-line react-hooks/set-state-in-effect -- localStorage is only readable in the browser
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => { if (readChoice() === "system") apply("system"); };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  function pick(value: ThemeChoice) {
    setChoice(value);
    try { localStorage.setItem(KEY, value); } catch { /* private mode: still applies for this visit */ }
    apply(value);
  }

  const night = tone === "night";
  return (
    <div role="radiogroup" aria-label="Theme"
      className={`inline-flex rounded-xl p-1 text-sm ${night ? "bg-white/10" : "border border-line bg-surface"}`}>
      {OPTIONS.map((o) => {
        const active = o.value === choice;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={active} onClick={() => pick(o.value)}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${
              active
                ? night ? "bg-on-night text-night" : "bg-ink text-bg"
                : night ? "text-night-muted hover:text-on-night" : "text-muted hover:text-ink"
            }`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
