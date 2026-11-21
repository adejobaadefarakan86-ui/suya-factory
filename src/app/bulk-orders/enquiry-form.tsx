"use client";
import { useActionState } from "react";
import { Field, buttonClass } from "@/components/field";
import { BULK_MIN_KG } from "@/lib/contacts";
import type { CountryCode } from "@/lib/countries";
import { sendEnquiry, type EnquiryState } from "./actions";

const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

export function EnquiryForm({ country, defaults }: {
  country: CountryCode;
  defaults: { name: string; email: string; phone: string };
}) {
  const [state, action, pending] = useActionState<EnquiryState, FormData>(sendEnquiry, undefined);

  if (state && "sent" in state) {
    return (
      <div role="status" className="rounded-2xl bg-green-50 p-6 text-green-950">
        <p className="text-lg font-semibold">Thanks! Your enquiry has been sent.</p>
        <p className="mt-1 text-sm">We&apos;ll contact you within 1 working day to discuss your order.</p>
      </div>
    );
  }

  const v = state && "error" in state ? state.values : undefined;

  return (
    <form action={action} className="space-y-4">
      {/* Honeypot: hidden from people, irresistible to spam bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Website <input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <Field label="Your name" name="name" autoComplete="name" required maxLength={100} defaultValue={v?.name ?? defaults.name} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" name="phone" type="tel" autoComplete="tel" required maxLength={20}
          defaultValue={v?.phone ?? defaults.phone} hint="We'll call or WhatsApp you on this number." />
        <Field label="Email (optional)" name="email" type="email" autoComplete="email" maxLength={200}
          defaultValue={v?.email ?? defaults.email} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">Country</span>
          <select name="country" defaultValue={v?.country ?? country} className={inputClass}>
            <option value="NG">Nigeria</option>
            <option value="GH">Ghana</option>
          </select>
        </label>
        <Field label="Quantity (kg)" name="quantityKg" type="number" inputMode="decimal" required
          min={BULK_MIN_KG} step={0.5} placeholder="e.g. 5" defaultValue={v?.quantityKg}
          hint={`Minimum ${BULK_MIN_KG}kg.`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Needed by (optional)" name="neededBy" type="date" defaultValue={v?.neededBy} />
        <Field label="Delivery city / area" name="location" required maxLength={200}
          placeholder="e.g. Ikeja, Lagos" defaultValue={v?.location} />
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink">Tell us more (optional)</span>
        <textarea name="message" rows={4} maxLength={1000} defaultValue={v?.message} className={inputClass}
          placeholder="What's it for? Any custom packaging, labelling or pack sizes?" />
      </label>

      {state && "error" in state && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{state.error}</p>
      )}

      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  );
}
