"use client";
import { useActionState } from "react";
import { setRole, type TeamState } from "./actions";

const input = "rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm";

/** Add someone to the team, change their role, or remove them (role: customer). */
export function RoleForm({ email, role, compact }: { email?: string; role?: string; compact?: boolean }) {
  const [state, action, pending] = useActionState<TeamState, FormData>(setRole, undefined);
  return (
    <form action={action} className={compact ? "flex flex-wrap items-center gap-2" : "space-y-3"}>
      {email ? (
        <input type="hidden" name="email" value={email} />
      ) : (
        <input name="email" type="email" required placeholder="Their email (they must sign up first)" className={`${input} w-full`} />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <select name="role" defaultValue={role ?? "staff"} className={input}>
          <option value="staff">Staff: orders, delivery, enquiries</option>
          <option value="admin">Admin: everything, incl. cancel, payments, team</option>
          <option value="customer">Remove from team (customer)</option>
        </select>
        <button disabled={pending} className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Saving…" : email ? "Change" : "Add to team"}
        </button>
      </div>
      {state?.ok && <p role="status" className="text-sm text-green-700">{state.ok}</p>}
      {state?.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
    </form>
  );
}
