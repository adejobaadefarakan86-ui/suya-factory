// Suya Factory's own loader: little orange and yellow spice particles swirl,
// gather in the middle and fade. Pure CSS (globals.css), no JavaScript.
const PARTICLES = [
  { a: 0, r: 30, s: 8, c: "var(--accent)", d: 0 },
  { a: 40, r: 26, s: 5, c: "var(--sun)", d: 0.08 },
  { a: 80, r: 32, s: 6, c: "var(--accent)", d: 0.16 },
  { a: 125, r: 24, s: 7, c: "var(--sun)", d: 0.05 },
  { a: 165, r: 30, s: 5, c: "var(--accent-strong)", d: 0.12 },
  { a: 205, r: 28, s: 8, c: "var(--accent)", d: 0.2 },
  { a: 245, r: 32, s: 5, c: "var(--sun)", d: 0.1 },
  { a: 285, r: 25, s: 6, c: "var(--accent-strong)", d: 0.02 },
  { a: 325, r: 31, s: 7, c: "var(--sun)", d: 0.14 },
];

export function SpiceLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="spice-loader" role="status" aria-label={label}>
      {PARTICLES.map((p) => (
        <span key={p.a} style={{
          "--a": `${p.a}deg`, "--r": `${p.r}px`, "--s": `${p.s}px`, "--c": p.c, "--d": `${p.d}s`,
        } as React.CSSProperties} />
      ))}
    </div>
  );
}
