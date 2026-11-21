"use client";
// Staff notes and (admins) cancelling, folded away at the bottom of an admin order page.
import { useActionState } from "react";
import { changeStatus, saveNotes, type ActionState } from "../actions";

const input = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-200";

function Result({ state }: { state: ActionState }) {
  if (state?.error) return <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-800">{state.error}</p>;
  if (state?.ok) return <p role="status" className="rounded-lg bg-green-50 p-2 text-sm text-green-800">{state.ok}</p>;
  return null;
}

type Ids = { orderId: string; orderNumber: string };

function Hidden({ orderId, orderNumber }: Ids) {
  return (
    <>
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="orderNumber" value={orderNumber} />
    </>
  );
}

/** Admins: cancel an order (with a reason). */
export function CancelOrder({ paid, ...ids }: Ids & { paid: boolean }) {
  const [state, action, pending] = useActionState(changeStatus, undefined);
  return (
    <form action={action} className="space-y-2"
      onSubmit={(e) => { if (!confirm("Cancel this order? This can't be undone.")) e.preventDefault(); }}>
      <Hidden {...ids} />
      <input type="hidden" name="status" value="cancelled" />
      <p className="font-medium text-stone-900">Cancel this order</p>
      {paid && <p className="text-xs text-amber-800">They paid: refund them to the MoMo number the money came from.</p>}
      <div className="flex flex-wrap gap-2">
        <input name="note" required maxLength={500} placeholder="Reason (required)" className={`${input} flex-1`} />
        <button disabled={pending} className="rounded-lg bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800">
          Cancel order
        </button>
      </div>
      <Result state={state} />
    </form>
  );
}

export function StaffNotes({ notes, ...ids }: Ids & { notes: string | null }) {
  const [state, action, pending] = useActionState(saveNotes, undefined);
  return (
    <form action={action} className="space-y-2">
      <Hidden {...ids} />
      <textarea name="notes" rows={3} maxLength={2000} defaultValue={notes ?? ""} className={input}
        placeholder="Only staff see these notes" />
      <button disabled={pending} className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-stone-50">
        {pending ? "Saving…" : "Save notes"}
      </button>
      <Result state={state} />
    </form>
  );
}
