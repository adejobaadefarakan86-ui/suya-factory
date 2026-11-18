"use client";
import { useActionState } from "react";
import { updateEnquiry } from "./actions";

const LABELS = { new: "New", contacted: "Contacted", converted: "Converted to order", closed: "Closed" };

export function EnquiryEditor({ id, status, staffNotes }: { id: string; status: string; staffNotes: string | null }) {
  const [state, action, pending] = useActionState(updateEnquiry, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <select name="status" defaultValue={status}
        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">
        {Object.entries(LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <textarea name="staffNotes" rows={2} maxLength={2000} defaultValue={staffNotes ?? ""}
        placeholder="Notes, e.g. 'Quoted N45,000 for 10kg; calling back Friday'"
        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm" />
      <div className="flex items-center gap-3">
        <button disabled={pending} className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Saving…" : "Save"}
        </button>
        {state?.ok && <span role="status" className="text-sm text-green-700">{state.ok}</span>}
        {state?.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
      </div>
    </form>
  );
}
