"use client";
import { useFormStatus } from "react-dom";
import { buttonClass } from "@/components/field";

/** Goes inside the <form>; shows a waiting state while we contact Paystack. */
export function PayButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${buttonClass} sm:w-auto sm:px-8`}>
      {pending ? "Taking you to Paystack…" : label}
    </button>
  );
}
