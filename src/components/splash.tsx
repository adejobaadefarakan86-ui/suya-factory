// Opening screen, once per visit: the logo draws itself, then "Suya Factory",
// "Kilishi" and the line from the boss appear, and it all fades into the home
// page (about 2.5 seconds). Pure CSS (globals.css). Skipped for visitors who
// asked for less motion, on later pages of the same visit, and in the admin.
import { LogoMark } from "@/components/logo-mark";

export function Splash() {
  return (
    <div className="splash" aria-hidden="true">
      <div className="flex flex-col items-center px-6 text-center">
        <LogoMark draw gid="sf-heat-splash" className="h-24 w-24 text-ink" />
        <p className="splash-in mt-5 font-display text-4xl font-semibold tracking-tight text-ink" style={{ "--d": "0.55s" } as React.CSSProperties}>
          Suya Factory
        </p>
        <p className="splash-in mt-1 text-sm font-semibold uppercase tracking-[0.35em] text-accent" style={{ "--d": "0.8s" } as React.CSSProperties}>
          Kilishi
        </p>
        <p className="splash-in mt-5 max-w-xs text-muted" style={{ "--d": "1.05s" } as React.CSSProperties}>
          The best kilishi export in Nigeria
        </p>
      </div>
    </div>
  );
}
