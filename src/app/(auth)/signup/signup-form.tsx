"use client";
import { useActionState } from "react";
import { signup, type AuthState } from "../actions";
import { GlassButton, GlassError, GlassField, SigningIn } from "../glass";

export function SignupForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signup, undefined);

  if (state?.message) {
    return (
      <p role="status" className="rounded-xl border border-white/40 bg-white/20 p-4 text-white">
        {state.message}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <GlassField label="Full name" name="fullName" autoComplete="name" placeholder="Your name" defaultValue={state?.fullName} required />
      <GlassField label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" defaultValue={state?.email} required />
      <GlassField label="Phone (optional)" name="phone" type="tel" autoComplete="tel" placeholder="080… or 024…"
        defaultValue={state?.phone} hint="Only used for updates about your orders." />
      <GlassField label="Password" name="password" type="password" autoComplete="new-password" minLength={8}
        placeholder="At least 8 characters" required />
      <GlassField label="Confirm password" name="confirm" type="password" autoComplete="new-password" placeholder="Type it again" required />
      {state?.error && <GlassError>{state.error}</GlassError>}
      <GlassButton pending={pending}>{pending ? "Creating account…" : "Create account"}</GlassButton>
      <SigningIn show={pending} text="Setting up your account…" />
    </form>
  );
}
