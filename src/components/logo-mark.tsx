// The Suya Factory mark as clean lines (no black box): three steam curls, the
// bowl, and the "M" legs with their fork feet, like a grill. The bowl uses the
// text colour, so it fits light and dark; steam and legs keep the brand's
// red-to-orange. `draw` makes the lines draw themselves (splash screen).
// `gid`: a different name per place on the page (top bar, footer, splash), so each
// copy finds its own colour gradient even when another copy is hidden.
export function LogoMark({ className = "", draw = false, gid = "sf-heat", mono = false }: {
  className?: string; draw?: boolean; gid?: string;
  /** All lines in the text colour (e.g. white on the orange opening screen). */
  mono?: boolean;
}) {
  const heat = mono ? "currentColor" : `url(#${gid})`;
  const s = { fill: "none", strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <svg viewBox="0 -3 64 64" className={`${draw ? "logo-draw" : ""} ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e2402f" />
          <stop offset="1" stopColor="#f2892e" />
        </linearGradient>
      </defs>
      {/* steam */}
      {[24, 32, 40].map((x) => (
        <path key={x} {...s} stroke={heat} strokeWidth={2.6} d={`M${x} 4c-1.8 1.4-1.8 3 0 4.4s1.8 3 0 4.4`} />
      ))}
      {/* bowl: rim with turned-up ends, then the round body */}
      <path {...s} stroke="currentColor" strokeWidth={3} d="M12.5 17l2.5 1.6h34l2.5-1.6" />
      <path {...s} stroke="currentColor" strokeWidth={3} d="M18.5 22h27v1.5c0 7-5.8 11.5-13.5 11.5s-13.5-4.5-13.5-11.5z" />
      {/* the M legs with fork feet */}
      <path {...s} stroke={heat} strokeWidth={3} d="M23 49.5l5.5-12 3.5 6 3.5-6 5.5 12" />
      <path {...s} stroke={heat} strokeWidth={2.6} d="M19.5 54c0-2.8 1.5-4.4 3.5-4.4s3.5 1.6 3.5 4.4" />
      <path {...s} stroke={heat} strokeWidth={2.6} d="M37.5 54c0-2.8 1.5-4.4 3.5-4.4s3.5 1.6 3.5 4.4" />
    </svg>
  );
}
