"use client";
// Settings kept on this device (localStorage), applied to <html> straight away.
// THEME_SCRIPT re-applies them before the page paints on every visit.
import { useEffect, useState } from "react";
import { useTransition } from "react";
import { cart, useCartLines } from "@/lib/cart";
import { changeCountry } from "@/app/actions/country";
import { COUNTRIES, type CountryCode } from "@/lib/countries";

function read(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function save(key: string, value: string | null) {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* private mode */ }
}

/** Two-option switch styled like the theme switch. */
function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl border border-line bg-surface p-1 text-sm">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-1.5 font-medium transition ${o.value === value ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function TextSize() {
  const [v, setV] = useState<"normal" | "large">("normal");
  useEffect(() => { setV(read("sf-text") === "large" ? "large" : "normal"); }, []); // eslint-disable-line react-hooks/set-state-in-effect -- localStorage is browser-only
  return (
    <Segmented label="Text size" value={v} options={[{ value: "normal", label: "Normal" }, { value: "large", label: "Large" }]}
      onChange={(next) => {
        setV(next);
        save("sf-text", next === "large" ? "large" : null);
        if (next === "large") document.documentElement.dataset.text = "large";
        else delete document.documentElement.dataset.text;
      }} />
  );
}

export function Motion() {
  const [v, setV] = useState<"on" | "off">("on");
  useEffect(() => { setV(read("sf-motion") === "reduce" ? "off" : "on"); }, []); // eslint-disable-line react-hooks/set-state-in-effect -- localStorage is browser-only
  return (
    <Segmented label="Animations" value={v} options={[{ value: "on", label: "On" }, { value: "off", label: "Off" }]}
      onChange={(next) => {
        setV(next);
        save("sf-motion", next === "off" ? "reduce" : null);
        if (next === "off") document.documentElement.dataset.motion = "reduce";
        else delete document.documentElement.dataset.motion;
      }} />
  );
}

export function ClearCart() {
  const count = useCartLines().reduce((n, l) => n + l.quantity, 0);
  const [done, setDone] = useState(false);
  if (count === 0) return <span className="text-sm text-muted">{done ? "Cart cleared" : "Your cart is empty"}</span>;
  return (
    <button type="button" onClick={() => { cart.clear(); setDone(true); }} className="btn btn-ghost px-4 py-2 text-sm">
      Empty cart ({count})
    </button>
  );
}

/** Change country, for when the detected one was wrong. Asks first; empties the cart (prices differ). */
export function ChangeCountry({ current }: { current: CountryCode }) {
  const other: CountryCode = current === "NG" ? "GH" : "NG";
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();

  if (!asking) {
    return (
      <span className="flex items-center gap-3">
        <span className="text-sm font-medium text-ink">{COUNTRIES[current].name}</span>
        <button type="button" onClick={() => setAsking(true)} className="btn btn-ghost px-4 py-2 text-sm">Change</button>
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-ink">Switch to {COUNTRIES[other].name}?</span>
      <button type="button" disabled={pending} className="btn btn-primary px-4 py-2 text-sm"
        onClick={() => start(async () => { cart.clear(); await changeCountry(other); location.reload(); })}>
        {pending ? "Switching…" : "Yes, switch"}
      </button>
      <button type="button" disabled={pending} onClick={() => setAsking(false)} className="btn btn-ghost px-4 py-2 text-sm">Cancel</button>
    </span>
  );
}
