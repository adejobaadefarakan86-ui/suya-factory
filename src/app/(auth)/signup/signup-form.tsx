"use client";
import { useActionState } from "react";
import { Field, buttonClass } from "@/components/field";
import { signup, type AuthState } from "../actions";

export function SignupForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signup, undefined);

  if (state?.message) {
    return (
      <p role="status" className="rounded-lg bg-green-50 p-4 text-green-900">
        {state.message}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <Field label="Full name" name="fullName" autoComplete="name" defaultValue={state?.fullName} required />
      <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={state?.email} required />
      <Field
        label="Phone (optional)"
        name="phone"
        type="tel"
        autoComplete="tel"
        defaultValue={state?.phone}
        hint="We'll only use it for delivery updates."
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        hint="At least 8 characters"
        required
      />
      <Field label="Confirm password" name="confirm" type="password" autoComplete="new-password" required />

      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
