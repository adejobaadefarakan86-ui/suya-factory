"use client";
// "use client" = this part runs in the browser, so it can show
// "Logging in…" and error messages without reloading the page.
import { useActionState } from "react";
import { Field, buttonClass } from "@/components/field";
import { login, type AuthState } from "../actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, undefined);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={state?.email} required />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />

      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
