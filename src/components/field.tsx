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
      <span className="mb-1 block text-sm font-medium text-stone-700">{label}</span>
      <input
        name={name}
        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-200"
        {...input}
      />
      {hint && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
    </label>
  );
}

export const buttonClass =
  "w-full rounded-lg bg-orange-700 px-4 py-2.5 font-semibold text-white hover:bg-orange-800 disabled:cursor-wait disabled:opacity-60";
