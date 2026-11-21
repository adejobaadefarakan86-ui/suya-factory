// Hand-drawn details: thin lines in currentColor, used sparingly.
// A small set on purpose (flame, chilli, swirl, sparks, squiggle) so they
// read as Suya Factory's own marks rather than random icons.
type Props = { className?: string };

const line = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** A small flame, like the orange legs of the logo. */
export function Flame({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 32 40" className={className} aria-hidden="true">
      <path {...line} d="M16 38c-7 0-12-5-12-11.5 0-5.5 4-8.5 6-12.5 1 3 3 4.5 4 4.5C14 12 16 6 21 2c-1 6 7 10.5 7 19.5C28 31 23.5 38 16 38z" />
      <path {...line} d="M16 33c-3 0-5-2.2-5-5 0-2.6 2-4 3-6 1 2.4 2.6 2.6 3.5 2.6C18 22 19 20 20.5 18.5 21 21.5 22 23.5 22 26.5 22 30.5 19.5 33 16 33z" />
    </svg>
  );
}

/** A chilli pepper. */
export function Chilli({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 48 32" className={className} aria-hidden="true">
      <path {...line} d="M8 10c10 1 20 4 27 12 3 3.5 2 7-1.5 6.5C22 27 12 21 6.5 14.5 4.5 12 5.5 9.5 8 10z" />
      <path {...line} d="M7.5 10.5C6 7 7 4 10 3" />
      <path {...line} d="M5 6.5c2-1 4.5-.5 5.5 1" />
    </svg>
  );
}

/** A loose swirl, like rising steam. */
export function Swirl({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 120 60" className={className} aria-hidden="true">
      <path {...line} d="M4 44c14-2 22-14 34-14 10 0 12 12 3 14-8 2-10-10-1-17 11-9 30-6 40 4 8 8 18 10 36 4" />
    </svg>
  );
}

/** Three little sparks. */
export function Sparks({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <path {...line} d="M20 4v8M20 28v8M4 20h8M28 20h8" />
      <path {...line} d="M9 9l4 4M27 27l4 4" opacity="0.6" />
    </svg>
  );
}

/** A hand-drawn underline. */
export function Squiggle({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 200 16" preserveAspectRatio="none" className={className} aria-hidden="true">
      <path {...line} strokeWidth={3} d="M3 10c20-8 34 6 52 0s30-8 48 0 32 6 50-1 28-6 44 1" />
    </svg>
  );
}
