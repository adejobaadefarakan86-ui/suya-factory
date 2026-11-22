// Loading animation built from the Suya Factory grill: the three steam curls
// rise and fade like real steam, a warm glow breathes behind the bowl, and a
// small ember circles it. Pure CSS (globals.css, "logo loader").
export function LogoLoader({ label = "Loading", tone = "page" }: { label?: string; tone?: "page" | "night" }) {
  const ink = tone === "night" ? "#ffffff" : "currentColor";
  return (
    <div role="status" aria-label={label} className={`logo-loader ${tone === "night" ? "text-white" : "text-ink"}`}>
      <span className="ll-glow" aria-hidden="true" />
      <span className="ll-orbit" aria-hidden="true"><span /></span>
      <svg viewBox="0 -3 64 64" className="ll-mark" aria-hidden="true">
        <defs>
          <linearGradient id="ll-heat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e2402f" />
            <stop offset="1" stopColor="#f2892e" />
          </linearGradient>
        </defs>
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {[24, 32, 40].map((x, i) => (
            <path key={x} className="ll-steam" style={{ animationDelay: `${i * 0.22}s` }}
              stroke="url(#ll-heat)" strokeWidth={2.6} d={`M${x} 4c-1.8 1.4-1.8 3 0 4.4s1.8 3 0 4.4`} />
          ))}
          <path stroke={ink} strokeWidth={3} d="M12.5 17l2.5 1.6h34l2.5-1.6" />
          <path stroke={ink} strokeWidth={3} d="M18.5 22h27v1.5c0 7-5.8 11.5-13.5 11.5s-13.5-4.5-13.5-11.5z" />
          <path stroke="url(#ll-heat)" strokeWidth={3} d="M23 49.5l5.5-12 3.5 6 3.5-6 5.5 12" />
          <path stroke="url(#ll-heat)" strokeWidth={2.6} d="M19.5 54c0-2.8 1.5-4.4 3.5-4.4s3.5 1.6 3.5 4.4" />
          <path stroke="url(#ll-heat)" strokeWidth={2.6} d="M37.5 54c0-2.8 1.5-4.4 3.5-4.4s3.5 1.6 3.5 4.4" />
        </g>
      </svg>
    </div>
  );
}
