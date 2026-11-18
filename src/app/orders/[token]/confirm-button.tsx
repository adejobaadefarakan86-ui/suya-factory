"use client";
import { useFormStatus } from "react-dom";

/** A submit button that asks "are you sure?" first (e.g. cancelling an order). */
export function ConfirmButton({ label, confirmText, className }: { label: string; confirmText: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}
      onClick={(e) => { if (!confirm(confirmText)) e.preventDefault(); }}>
      {pending ? "Please wait…" : label}
    </button>
  );
}
