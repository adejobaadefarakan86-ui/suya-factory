"use client";
// The buttons and forms on an admin order page.
import { useActionState, useState } from "react";
import {
  CANCELLABLE, DELIVERY_STAGES, NEXT_STEP, ORDER_STATUS, PAYMENT_METHODS, PREVIOUS_STEP,
  type DeliveryStage, type OrderStatus,
} from "@/lib/orders";
import {
  changeStatus, markPaidManually, saveNotes, sendOutForDelivery, setDeliveryQuote, setDeliveryStage,
  type ActionState,
} from "../actions";

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
          <input name="note" maxLength={500} placeholder="Note (optional)" className={input} />
          <button disabled={pending} className="w-full rounded-lg bg-orange-700 px-4 py-2.5 font-semibold text-white hover:bg-orange-800 disabled:opacity-60">
            {pending ? "Saving…" : `${next.label} →`}
          </button>
        </form>
      )}
      {status === "awaiting_quote" && (
        <p className="text-sm font-medium text-sky-900">Check the delivery price in your delivery app, then enter it below.</p>
      )}
      {status === "pending_payment" && (
        <p className="text-sm text-stone-600">Waiting for the customer to accept the delivery price and pay.{isAdmin ? " If they paid another way, record it below." : ""}</p>
      )}
      {status === "preparing" && (
        <p className="text-sm font-medium text-indigo-900">When the rider picks it up, fill in their details below to send it out.</p>
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

/** Staff: enter the delivery price from the delivery app. */
export function DeliveryQuoteForm({ currencySymbol, current, ...ids }: Ids & { currencySymbol: string; current: number | null }) {
  const [state, action, pending] = useActionState(setDeliveryQuote, undefined);
  return (
    <form action={action} className="space-y-2">
      <Hidden {...ids} />
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-stone-700">Delivery price ({currencySymbol})</span>
        <input name="amount" inputMode="decimal" required placeholder="e.g. 2300" defaultValue={current !== null ? String(current / 100) : ""}
          className={`${input} text-lg font-semibold`} />
      </label>
      <input name="note" maxLength={300} placeholder="Note for the customer (optional), e.g. 'Bolt, about 35 min'" className={input} />
      <button disabled={pending} className="w-full rounded-lg bg-sky-700 px-4 py-2.5 font-semibold text-white hover:bg-sky-800 disabled:opacity-60">
        {pending ? "Saving…" : current !== null ? "Update delivery price" : "Send delivery price to customer"}
      </button>
      <Result state={state} />
    </form>
  );
}

/** Staff: rider picked it up. Name + phone (+ tracking link from the delivery app). */
export function SendOutForm({ rider, ...ids }: Ids & { rider: { name: string | null; phone: string | null; trackingUrl: string | null } | null }) {
  const [state, action, pending] = useActionState(sendOutForDelivery, undefined);
  const editing = Boolean(rider?.name);
  return (
    <form action={action} className="space-y-2">
      <Hidden {...ids} />
      <div className="grid gap-2 sm:grid-cols-2">
        <input name="riderName" required maxLength={100} placeholder="Rider's name" defaultValue={rider?.name ?? ""} className={input} />
        <input name="riderPhone" type="tel" required maxLength={20} placeholder="Rider's phone" defaultValue={rider?.phone ?? ""} className={input} />
      </div>
      <input name="trackingUrl" type="url" maxLength={500} placeholder="Tracking link from the app (optional, https://…)"
        defaultValue={rider?.trackingUrl ?? ""} className={input} />
      {!editing && <input name="note" maxLength={300} placeholder="Note (optional), e.g. 'Bolt, red bike'" className={input} />}
      <button disabled={pending} className="w-full rounded-lg bg-indigo-700 px-4 py-2.5 font-semibold text-white hover:bg-indigo-800 disabled:opacity-60">
        {pending ? "Saving…" : editing ? "Update rider details" : "Send out for delivery →"}
      </button>
      <Result state={state} />
    </form>
  );
}

/** Staff: On the way → Almost there → Arrived. */
export function StageButtons({ stage, ...ids }: Ids & { stage: DeliveryStage | null }) {
  const [state, action, pending] = useActionState(setDeliveryStage, undefined);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {DELIVERY_STAGES.map((s) => (
          <form key={s.stage} action={action}>
            <Hidden {...ids} />
            <input type="hidden" name="stage" value={s.stage} />
            <button disabled={pending || s.stage === stage}
              className={`w-full rounded-lg px-2 py-2 text-sm font-semibold ${
                s.stage === stage ? "bg-indigo-600 text-white" : "border border-indigo-300 bg-white text-indigo-900 hover:bg-indigo-50"
              } disabled:cursor-default`}>
              {s.icon} {s.label}
            </button>
          </form>
        ))}
      </div>
      <Result state={state} />
    </div>
  );
}

/** Copies text (e.g. map coordinates) to the clipboard. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }
        catch { window.prompt("Copy this:", value); }
      }}
      className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold hover:bg-stone-50">
      {copied ? "✓ Copied" : label}
    </button>
  );
}
