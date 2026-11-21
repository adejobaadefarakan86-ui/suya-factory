"use client";
// Ghana: after we confirm the MoMo payment, the customer books their own rider
// (Bolt / Yango) from our pickup point, then tells us who's coming.
import { useState, useSyncExternalStore } from "react";
import { appLink, type DeliveryCompany } from "@/lib/delivery-companies";
import { DeliveryDetails, type DetailRow } from "@/components/delivery-details";
import { PayButton } from "./pay-button";

const noop = () => () => {};

const input = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink";

export function OwnRiderStep({
  action,
  pickup,
  companies,
  current,
  dropoff,
  details,
}: {
  details: DetailRow[];
  action: (formData: FormData) => void | Promise<void>;
  pickup: { text: string; mapLink: string; contact: string; lat: number; lng: number; label: string };
  dropoff: { lat: number; lng: number; label: string } | null;
  companies: DeliveryCompany[];
  current: { name: string; phone: string; plate: string | null; company: string | null } | null;
}) {
  const [company, setCompany] = useState(current?.company ?? "");
  // "Other app…": the customer types the app's name.
  const [otherMode, setOtherMode] = useState(false);
  const isListed = companies.some((c) => c.name === company);
  // Which phone this is decides the link (app on Android, App Store on iPhone). "" while rendering on the server.
  const userAgent = useSyncExternalStore(noop, () => navigator.userAgent, () => "");

  return (
    <div className="mt-6 space-y-4">
      <section className="rounded-2xl border-2 border-accent/40 bg-surface p-5">
        <h2 className="text-lg font-bold text-ink">{current ? "Change your rider" : "Now book your rider"}</h2>
        <p className="mt-1 text-sm text-muted">
          Send it as a <strong>parcel</strong> from us to you. You pay the rider in the app or in cash.
        </p>
        <p className="mt-4 text-sm font-semibold text-ink">1. Copy these into your app</p>
        <div className="mt-2">
          <DeliveryDetails rows={details} />
          <a href={pickup.mapLink} target="_blank" rel="noopener noreferrer"
            className="mt-2 inline-block text-sm font-medium text-accent-strong underline">See the pickup point on a map</a>
        </div>
        <p className="mt-5 text-sm font-semibold text-ink">2. Open your app</p>
        <p className="mt-1 text-xs text-muted">If a store page opens, tap <strong>Open</strong>.</p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {companies.map((c) => (
            <li key={c.id}>
              <a href={appLink(c, userAgent, pickup, dropoff)} onClick={() => setCompany(c.name)}
                // Phones: open the app in place (Android app links don't work from a new tab). Computers: new tab.
                {...(/Android|iPhone|iPad|iPod/i.test(userAgent) ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                className={`block h-full rounded-xl border p-3 hover:border-accent ${company === c.name ? "border-accent bg-accent-soft" : "border-line"}`}>
                <span className="block font-semibold text-ink">{c.name} ↗</span>
                <span className="mt-0.5 block text-xs text-muted">{c.note}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <form action={action} className="space-y-4 rounded-2xl border border-line bg-surface p-5">
        <div>
          <h2 className="text-lg font-bold text-ink">3. Booked? Tell us who&apos;s coming</h2>
          <p className="mt-1 text-sm text-muted">We only hand your kilishi to this rider. You&apos;ll get a pickup code for them.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-sm font-medium text-ink">Rider&apos;s name</span>
            <input name="riderName" required maxLength={100} defaultValue={current?.name} className={input} /></label>
          <label className="block"><span className="mb-1 block text-sm font-medium text-ink">Rider&apos;s phone</span>
            <input name="riderPhone" required type="tel" maxLength={20} defaultValue={current?.phone} className={input} placeholder="024 000 0000" /></label>
          <label className="block"><span className="mb-1 block text-sm font-medium text-ink">Bike / car number <span className="font-normal text-muted">(if shown)</span></span>
            <input name="riderPlate" maxLength={20} defaultValue={current?.plate ?? ""} className={input} placeholder="e.g. GR 1234-24" /></label>
          <label className="block"><span className="mb-1 block text-sm font-medium text-ink">App</span>
            <select value={isListed ? company : company === "" && !otherMode ? "" : "Other"}
              onChange={(e) => {
                const v = e.target.value;
                setOtherMode(v === "Other");
                setCompany(v === "Other" ? "" : v);
              }} className={input}>
              <option value="">Choose…</option>
              {companies.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              <option value="Other">Other app…</option>
            </select></label>
          {!isListed && (otherMode || company !== "") && (
            <label className="block sm:col-span-2"><span className="mb-1 block text-sm font-medium text-ink">Which app?</span>
              <input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={50} required
                className={input} placeholder="e.g. the name of the delivery app you used" /></label>
          )}
          {/* What's sent: the app picked from the list, or the name typed for "Other". */}
          <input type="hidden" name="riderCompany" value={company} />
        </div>
        <PayButton label={current ? "Update rider" : "Send rider details"} pendingLabel="Sending…" />
      </form>
    </div>
  );
}
