"use client";
// The buttons and forms on an admin order page.
import { useActionState } from "react";
import {
  CANCELLABLE, NEXT_STEP, ORDER_STATUS, PAYMENT_METHODS, PREVIOUS_STEP, type OrderStatus,
} from "@/lib/orders";
import { changeStatus, markPaidManually, saveNotes, type ActionState } from "../actions";

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

/** The big "next step" button, plus admin extras (undo, cancel). */
export function StatusActions({ status, isAdmin, ...ids }: Ids & { status: OrderStatus; isAdmin: boolean }) {
  const [state, action, pending] = useActionState(changeStatus, undefined);
  const next = NEXT_STEP[status];
  const back = PREVIOUS_STEP[status];
  const canCancel = isAdmin && CANCELLABLE.includes(status);

  return (
    <div className="space-y-3">
      {next && (
        <form action={action} className="space-y-2">
          <Hidden {...ids} />
          <input type="hidden" name="status" value={next.to} />
          <input name="note" maxLength={500} placeholder="Note (optional), e.g. rider's name" className={input} />
          <button disabled={pending} className="w-full rounded-lg bg-orange-700 px-4 py-2.5 font-semibold text-white hover:bg-orange-800 disabled:opacity-60">
            {pending ? "Saving…" : `${next.label} →`}
          </button>
        </form>
      )}
      {!next && status === "pending_payment" && (
        <p className="text-sm text-stone-600">Waiting for the customer to pay.{isAdmin ? " If they paid another way, record it below." : ""}</p>
      )}
      {!next && (status === "delivered" || status === "cancelled") && (
        <p className="text-sm text-stone-600">This order is {ORDER_STATUS[status].label.toLowerCase()}. Nothing more to do.</p>
      )}

      {isAdmin && (back || canCancel) && (
        <details className="rounded-lg border border-stone-200 p-3 text-sm">
          <summary className="cursor-pointer font-medium text-stone-700">Admin: undo or cancel</summary>
          <div className="mt-3 space-y-3">
            {back && (
              <form action={action} className="flex flex-wrap gap-2">
                <Hidden {...ids} />
                <input type="hidden" name="status" value={back} />
                <input name="note" required maxLength={500} placeholder="Why? (required)" className={`${input} flex-1`} />
                <button disabled={pending} className="rounded-lg border border-stone-300 bg-white px-3 py-2 font-medium hover:bg-stone-50">
                  Back to &quot;{ORDER_STATUS[back].label}&quot;
                </button>
              </form>
            )}
            {canCancel && (
              <form action={action} className="flex flex-wrap gap-2"
                onSubmit={(e) => { if (!confirm("Cancel this order? This can't be undone.")) e.preventDefault(); }}>
                <Hidden {...ids} />
                <input type="hidden" name="status" value="cancelled" />
                <input name="note" required maxLength={500} placeholder="Reason for cancelling (required)" className={`${input} flex-1`} />
                <button disabled={pending} className="rounded-lg bg-red-700 px-3 py-2 font-medium text-white hover:bg-red-800">
                  Cancel order
                </button>
              </form>
            )}
            {canCancel && status !== "pending_payment" && (
              <p className="text-xs text-amber-800">This order was paid: refund the customer in the Paystack dashboard (or by the way they paid).</p>
            )}
          </div>
        </details>
      )}
      <Result state={state} />
    </div>
  );
}

/** Admins: record a payment made outside the website (e.g. Ghana mobile money). */
export function ManualPayment(ids: Ids & { amount: string }) {
  const [state, action, pending] = useActionState(markPaidManually, undefined);
  return (
    <form action={action} className="space-y-2"
      onSubmit={(e) => { if (!confirm(`Confirm you have RECEIVED ${ids.amount} for this order?`)) e.preventDefault(); }}>
      <Hidden {...ids} />
      <div className="grid gap-2 sm:grid-cols-2">
        <select name="method" required defaultValue="" className={input}>
          <option value="" disabled>Payment method…</option>
          {Object.entries(PAYMENT_METHODS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input name="reference" maxLength={100} placeholder="Transaction ID / reference" className={input} />
      </div>
      <input name="note" maxLength={500} placeholder="Note (optional)" className={input} />
      <button disabled={pending} className="w-full rounded-lg bg-green-700 px-4 py-2 font-semibold text-white hover:bg-green-800 disabled:opacity-60">
        {pending ? "Saving…" : `Mark as paid (${ids.amount})`}
      </button>
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
        placeholder="Only staff see these notes, e.g. 'Customer asked for delivery after 5pm'" />
      <button disabled={pending} className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-stone-50">
        {pending ? "Saving…" : "Save notes"}
      </button>
      <Result state={state} />
    </form>
  );
}
