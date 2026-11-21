"use client";
// Pieces for the glass login / sign-up card: frosted inputs, the cream button,
// and the full-screen spice loader shown while we sign someone in.
import type { InputHTMLAttributes } from "react";
import { SpiceLoader } from "@/components/spice-loader";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; hint?: string };

export function GlassField({ label, name, hint, ...input }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-white/90">{label}</span>
      <input name={name}
        className="w-full rounded-xl border border-white/35 bg-white/15 px-3.5 py-3 text-white outline-none transition placeholder:text-white/55 focus:border-white focus:bg-white/25 focus:ring-2 focus:ring-white/40"
        {...input} />
      {hint && <span className="mt-1 block text-xs text-white/70">{hint}</span>}
    </label>
  );
}

export function GlassButton({ children, pending }: { children: React.ReactNode; pending: boolean }) {
  return (
    <button type="submit" disabled={pending}
      className="btn w-full bg-[#fff6ea] py-3.5 text-base font-semibold text-[#7a2a06] shadow-[0_10px_30px_-12px_rgba(60,15,0,0.6)] hover:bg-white disabled:opacity-70">
      {children}
    </button>
  );
}

export function GlassError({ children }: { children: React.ReactNode }) {
  return <p role="alert" className="rounded-xl border border-white/40 bg-[#5a1503]/45 p-3 text-sm text-white">{children}</p>;
}

/** Full-screen spice loader while the account is being opened. */
export function SigningIn({ show, text }: { show: boolean; text: string }) {
  if (!show) return null;
  return (
    <div role="status" aria-live="polite"
      className="fixed inset-0 z-[90] grid place-items-center bg-[#17120e]/70 backdrop-blur-md">
      <div className="flex flex-col items-center gap-5 text-white">
        <SpiceLoader label={text} />
        <p className="font-display text-lg">{text}</p>
      </div>
    </div>
  );
}
