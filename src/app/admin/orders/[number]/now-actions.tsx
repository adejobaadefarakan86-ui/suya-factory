"use client";
// The buttons in the "What to do now" box (same steps as the Telegram buttons).
import { useActionState } from "react";
import { confirmMomo, handOver, markRefunded, type ActionState } from "../actions";

function Result({ state }: { state: ActionState }) {
  if (state?.error) return <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-800">{state.error}</p>;
  if (state?.ok) return <p role="status" className="rounded-lg bg-green-50 p-2 text-sm text-green-800">{state.ok}</p>;
  return null;
}

const big = "w-full rounded-xl px-4 py-3 text-lg font-bold text-white disabled:opacity-60";

export function MomoButtons({ orderNumber, amount }: { orderNumber: string; amount: string }) {
  const [state, action, pending] = useActionState(confirmMomo, undefined);
  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <form action={action}
          onSubmit={(e) => { if (!confirm(`Confirm you RECEIVED ${amount} on MoMo?`)) e.preventDefault(); }}>
          <input type="hidden" name="orderNumber" value={orderNumber} />
          <input type="hidden" name="ok" value="yes" />
          <button disabled={pending} className={`${big} bg-green-700 hover:bg-green-800`}>✅ Payment received</button>
        </form>
        <form action={action}>
          <input type="hidden" name="orderNumber" value={orderNumber} />
          <input type="hidden" name="ok" value="no" />
          <button disabled={pending} className={`${big} bg-stone-600 hover:bg-stone-700`}>❌ Not received</button>
        </form>
      </div>
      <Result state={state} />
    </div>
  );
}

export function HandOverButton({ orderNumber, rider }: { orderNumber: string; rider: string }) {
  const [state, action, pending] = useActionState(handOver, undefined);
  return (
    <form action={action} className="space-y-2"
      onSubmit={(e) => { if (!confirm(`Handed to ${rider}? Only after they said the right code.`)) e.preventDefault(); }}>
      <input type="hidden" name="orderNumber" value={orderNumber} />
      <button disabled={pending} className={`${big} bg-orange-700 hover:bg-orange-800`}>📦 Handed to rider</button>
      <Result state={state} />
    </form>
  );
}

export function RefundedButton({ orderNumber, amount }: { orderNumber: string; amount: string }) {
  const [state, action, pending] = useActionState(markRefunded, undefined);
  return (
    <form action={action} className="space-y-2"
      onSubmit={(e) => { if (!confirm(`Have you SENT the ${amount} refund?`)) e.preventDefault(); }}>
      <input type="hidden" name="orderNumber" value={orderNumber} />
      <button disabled={pending} className={`${big} bg-green-700 hover:bg-green-800`}>💸 Refund sent</button>
      <Result state={state} />
    </form>
  );
}
