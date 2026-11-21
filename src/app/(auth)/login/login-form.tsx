"use client";
// "use client" = this part runs in the browser, so it can show the loader and
// error messages without reloading the page.
import { useActionState } from "react";
import { login, type AuthState } from "../actions";
import { GlassButton, GlassError, GlassField, SigningIn } from "../glass";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, undefined);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <GlassField label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" defaultValue={state?.email} required />
      <GlassField label="Password" name="password" type="password" autoComplete="current-password" placeholder="Your password" required />
      {state?.error && <GlassError>{state.error}</GlassError>}
      <GlassButton pending={pending}>{pending ? "Logging in…" : "Log in"}</GlassButton>
      <SigningIn show={pending} text="Signing you in…" />
    </form>
  );
}
