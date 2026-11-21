"use client";
// "Details for your app": what Bolt / inDrive / Yango ask for when sending a
// parcel, each with a Copy button. Kept short on purpose: the main lines use
// the apps' own words in the label ("From", "To"); the rest is folded under
// "More details".
import { useState } from "react";

export type DetailRow = {
  /** Short label in the apps' words, e.g. "From (pickup)". */
  label: string;
  value: string;
  /** Not copyable, just information (e.g. "Your address"). */
  info?: boolean;
  /** Folded under "More details". */
  more?: boolean;
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

export function DeliveryDetails({ rows }: { rows: DetailRow[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(key: string, text: string) {
    if (await copyText(text)) {
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    }
  }

  const all = rows.filter((r) => !r.info).map((r) => `${r.label}: ${r.value}`).join("\n");

  const line = (r: DetailRow) => (
    <li key={r.label} className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-muted">{r.label}</p>
        <p className={`break-words ${r.info ? "text-muted" : "font-medium text-ink"}`}>{r.value}</p>
      </div>
      {!r.info && (
        <button type="button" onClick={() => copy(r.label, r.value)} aria-label={`Copy ${r.label}`}
          className="shrink-0 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:border-ink">
          {copied === r.label ? "✓" : "Copy"}
        </button>
      )}
    </li>
  );

  const main = rows.filter((r) => !r.more);
  const extra = rows.filter((r) => r.more);

  return (
    <div className="rounded-xl border border-line bg-cream px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-ink">Details for your app</p>
        <button type="button" onClick={() => copy("__all", all)}
          className="rounded-lg bg-night px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-800">
          {copied === "__all" ? "✓ Copied" : "Copy all"}
        </button>
      </div>
      <ul className="mt-1 divide-y divide-line">{main.map(line)}</ul>
      {extra.length > 0 && (
        <details className="mt-1">
          <summary className="cursor-pointer py-1 text-sm font-medium text-accent-strong">More details</summary>
          <ul className="divide-y divide-line">{extra.map(line)}</ul>
        </details>
      )}
    </div>
  );
}
