// Opening screen each time the app is opened (or after 30+ minutes away), not
// while moving between pages: on brand orange, the logo draws itself, then
// "Suya Factory", "Kilishi" and the tagline rise in, and it fades into the page
// (about 2.5 seconds). Pure CSS (globals.css). With "reduce animations" it shows
// standing still for a moment. Never in the admin.
import { LogoMark } from "@/components/logo-mark";

export function Splash() {
  return (
    <div className="splash" aria-hidden="true">
      <div className="flex flex-col items-center px-6 text-center">
        <LogoMark draw mono gid="sf-heat-splash" className="h-24 w-24 text-white" />
        <p className="splash-in mt-5 font-display text-4xl font-semibold tracking-tight text-white" style={{ "--d": "0.55s" } as React.CSSProperties}>
          Suya Factory
        </p>
        <p className="splash-in mt-1 text-sm font-semibold uppercase tracking-[0.35em] text-[#ffe3b0]" style={{ "--d": "0.8s" } as React.CSSProperties}>
          Kilishi
        </p>
        <p className="splash-in mt-5 max-w-xs text-white/85" style={{ "--d": "1.05s" } as React.CSSProperties}>
          The best kilishi export in Nigeria
        </p>
      </div>
    </div>
  );
}
