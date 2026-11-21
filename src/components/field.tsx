import type { InputHTMLAttributes } from "react";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  hint?: string;
};

/** A labelled text input, styled the same everywhere. */
export function Field({ label, name, hint, ...input }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <input
        name={name}
        className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent-soft"
        {...input}
      />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

/** The main action button on forms (same look as .btn-primary everywhere). */
export const buttonClass = "btn btn-primary w-full py-3 text-base";
