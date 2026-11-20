"use client";
// Ghana: after we confirm the MoMo payment, the customer books their own rider
// (Bolt / Yango) from our pickup point, then tells us who's coming.
import { useState, useSyncExternalStore } from "react";
import { appLink, type DeliveryCompany } from "@/lib/delivery-companies";

const noop = () => () => {};
import { PayButton } from "./pay-button";

const input = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900";

export function OwnRiderStep({
  action,
  pickup,
  companies,
  current,
  dropoff,
}: {
  action: (formData: FormData) => void | Promise<void>;
  pickup: { text: string; mapLink: string; contact: string; lat: number; lng: number; label: string };
  dropoff: { lat: number; lng: number; label: string } | null;
  companies: DeliveryCompany[];
  current: { name: string; phone: string; plate: string | null; company: string | null } | null;
}) {
  const [copied, setCopied] = useState(false);
  const [company, setCompany] = useState(current?.company ?? "");
  // Which phone this is decides the link (app on Android, App Store on iPhone). "" while rendering on the server.
  const userAgent = useSyncExternalStore(noop, () => navigator.userAgent, () => "");

  async function copyPickup() {
    try {
      await navigator.clipboard.writeText(pickup.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy the pickup address:", pickup.text);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <section className="rounded-2xl border-2 border-orange-200 bg-white p-5">
        <h2 className="text-lg font-bold text-stone-900">{current ? "Change your rider" : "Now book your rider"}</h2>
        <p className="mt-1 text-sm text-stone-600">
          In Bolt or Yango, use this as the <strong>pickup</strong> and your own address as the drop-off. You pay the
          rider in the app or in cash.
        </p>
        <div className="mt-3 rounded-xl bg-stone-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Pickup</p>
          <p className="mt-1 font-medium text-stone-900">{pickup.text}</p>
          <p className="mt-1 text-sm text-stone-600">{pickup.contact}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <button type="button" onClick={copyPickup} aria-live="polite"
              className="rounded-lg bg-stone-900 px-3 py-2 font-medium text-white hover:bg-stone-800">
              {copied ? "✓ Copied" : "Copy pickup address"}
            </button>
            <a href={pickup.mapLink} target="_blank" rel="noopener noreferrer"
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 font-medium text-stone-800 hover:bg-stone-50">Show on map</a>
          </div>
        </div>
        <p className="mt-4 text-sm font-medium text-stone-700">Open your app:</p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-3">
          {companies.map((c) => (
            <li key={c.id}>
              <a href={appLink(c, userAgent, pickup, dropoff)} onClick={() => setCompany(c.name)}
                // Phones: open the app in place (Android app links don't work from a new tab). Computers: new tab.
                {...(/Android|iPhone|iPad|iPod/i.test(userAgent) ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                className={`block h-full rounded-xl border p-3 hover:border-orange-400 ${company === c.name ? "border-orange-600 bg-orange-50" : "border-stone-200"}`}>
                <span className="block font-semibold text-stone-900">{c.name} ↗</span>
                <span className="mt-0.5 block text-xs text-stone-600">{c.note}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <form action={action} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
        <div>
          <h2 className="text-lg font-bold text-stone-900">Booked? Tell us who&apos;s coming</h2>
          <p className="mt-1 text-sm text-stone-600">We only hand your kilishi to this rider. You&apos;ll get a pickup code for them.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-sm font-medium text-stone-700">Rider&apos;s name</span>
            <input name="riderName" required maxLength={100} defaultValue={current?.name} className={input} /></label>
          <label className="block"><span className="mb-1 block text-sm font-medium text-stone-700">Rider&apos;s phone</span>
            <input name="riderPhone" required type="tel" maxLength={20} defaultValue={current?.phone} className={input} placeholder="024 000 0000" /></label>
          <label className="block"><span className="mb-1 block text-sm font-medium text-stone-700">Bike / car number <span className="font-normal text-stone-500">(if shown)</span></span>
            <input name="riderPlate" maxLength={20} defaultValue={current?.plate ?? ""} className={input} placeholder="e.g. GR 1234-24" /></label>
          <label className="block"><span className="mb-1 block text-sm font-medium text-stone-700">App</span>
            <select name="riderCompany" value={company} onChange={(e) => setCompany(e.target.value)} className={input}>
              <option value="">Choose…</option>
              {companies.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              <option value="Other">Other</option>
            </select></label>
        </div>
        <PayButton label={current ? "Update rider" : "Send rider details"} pendingLabel="Sending…" />
      </form>
    </div>
  );
}
