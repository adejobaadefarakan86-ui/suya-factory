"use client";
// "Details for your delivery app": everything Bolt / inDrive / GIGGo / Yango ask
// for when sending a parcel (pickup, sender phone, recipient, item...), each
// with its own Copy button, so customers don't have to type or guess.
import { useState } from "react";

export type DetailRow = {
  /** What we call it, e.g. "Sender phone (pickup)". */
  label: string;
  /** Where to paste it, in the apps' own words, e.g. "inDrive: From · Bolt: Pickup". */
  pasteInto?: string;
  /** Extra explanation, shown small. */
  hint?: string;
  value: string;
  /** Not copyable, just information (e.g. "Your own address"). */
  info?: boolean;
};

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    window.prompt("Copy this:", text);
    return false;
  }
}

export function DeliveryDetails({ rows, tips }: { rows: DetailRow[]; tips?: string[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(key: string, text: string) {
    if (await copyText(text)) {
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    }
  }

  const all = rows.filter((r) => !r.info).map((r) => `${r.label}: ${r.value}`).join("\n");

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-stone-900">Details for your delivery app</p>
        <button type="button" onClick={() => copy("__all", all)}
          className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-800">
          {copied === "__all" ? "✓ Copied all" : "Copy all"}
        </button>
      </div>
      <p className="mt-1 text-xs text-stone-600">Tap Copy, then paste into the matching box in the app.</p>
      <ul className="mt-3 divide-y divide-stone-200">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{r.label}</p>
              <p className={`break-words ${r.info ? "text-stone-600" : "font-medium text-stone-900"}`}>{r.value}</p>
              {r.pasteInto && (
                <p className="mt-0.5 text-xs font-semibold text-orange-800">👉 Paste into: {r.pasteInto}</p>
              )}
              {r.hint && <p className="text-xs text-stone-500">{r.hint}</p>}
            </div>
            {!r.info && (
              <button type="button" onClick={() => copy(r.label, r.value)} aria-label={`Copy ${r.label}`}
                className="shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-800 hover:border-stone-500">
                {copied === r.label ? "✓" : "Copy"}
              </button>
            )}
          </li>
        ))}
      </ul>
      {tips && tips.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-stone-200 pt-3 text-xs text-stone-600">
          {tips.map((t) => <li key={t}>💡 {t}</li>)}
        </ul>
      )}
    </div>
  );
}
