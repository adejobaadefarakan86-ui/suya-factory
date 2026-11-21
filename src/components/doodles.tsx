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

/** A chilli pepper: wide at the stem, curling to a point. */
export function Chilli({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path {...line} d="M13 13c6-2 11 0 13 5 3 8 6 15 15 20 2 1 1 3-1 3-11 0-22-6-27-16-2-5-3-10 0-12z" />
      <path {...line} d="M10 15c1-3 3-4.5 6-4.5 1.5 0 3 .7 4 1.8" />
      <path {...line} d="M13 11c-1-3 0-6 3-8" />
      <path {...line} d="M17 24c2 4 5 8 9 10" opacity="0.5" />
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

/** A friendly cow head in line art (our beef), same stroke style as the logo. */
export function Cow({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {/* horns */}
      <path {...line} d="M19 17c-5-2-7-7-5-11" />
      <path {...line} d="M45 17c5-2 7-7 5-11" />
      {/* ears */}
      <path {...line} d="M18 22c-6-1-11 1-12 4 4 3 9 2 13-1" />
      <path {...line} d="M46 22c6-1 11 1 12 4-4 3-9 2-13-1" />
      {/* head */}
      <path {...line} d="M19 18c8-5 18-5 26 0 2 7 2 14-1 20" />
      <path {...line} d="M19 18c-2 7-2 14 1 20" />
      {/* tuft */}
      <path {...line} d="M27 16c1.5 3 5 3.5 6.5 0 1 2.5 3.5 3 5 .5" />
      {/* eyes */}
      <circle cx="25.5" cy="28" r="1.6" fill="currentColor" />
      <circle cx="38.5" cy="28" r="1.6" fill="currentColor" />
      {/* muzzle + nostrils */}
      <path {...line} d="M20 40c0-4 5-6 12-6s12 2 12 6-5 9-12 9-12-5-12-9z" />
      <circle cx="27" cy="41.5" r="1.4" fill="currentColor" />
      <circle cx="37" cy="41.5" r="1.4" fill="currentColor" />
    </svg>
  );
}
