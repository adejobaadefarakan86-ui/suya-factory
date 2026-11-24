import Link from "next/link";
import { Suspense } from "react";
import { BUSINESS, SOCIAL } from "@/lib/business";
import { getCountry } from "@/lib/country";
import { navLinks } from "@/lib/nav";
import { ThemeSwitcher } from "@/components/theme";
import { Flame } from "@/components/doodles";
import { LogoMark } from "@/components/logo-mark";

// Phones: a compact, app-like footer (logo, slogan, social icons, one row of
// links). Computers: the full footer with columns.
export function SiteFooter() {
  return (
    <footer className="site-footer rounded-t-[2rem] border-t border-white/10 bg-night text-on-night shadow-[0_-24px_60px_-34px_rgba(226,64,47,0.55)]">
      {/* Phones */}
      <div className="flex flex-col items-center px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-10 text-center md:hidden">
        <LogoMark gid="sf-heat-foot-m" className="h-11 w-11 text-on-night" />
        <p className="mt-3 flex items-center gap-2 font-display text-xl">
          No rules, just bite.
          <Flame className="h-5 w-4 text-accent" />
        </p>
        <Suspense fallback={<div className="mt-6 h-11" />}>
          <SocialIcons />
        </Suspense>
        <nav aria-label="Footer" className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-on-night/80">
          <Link href="/settings" className="transition hover:text-on-night">Settings</Link>
          <Link href="/terms" className="transition hover:text-on-night">Terms</Link>
          <Link href="/privacy" className="transition hover:text-on-night">Privacy</Link>
          <a href={`mailto:${BUSINESS.email}`} className="transition hover:text-on-night">Email us</a>
        </nav>
        <p className="mt-6 text-xs text-night-muted">{BUSINESS.legalName} · {BUSINESS.rcNumber}</p>
      </div>

      {/* Computers */}
      <div className="hidden md:block">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr] md:grid-cols-2">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <LogoMark gid="sf-heat-foot" className="h-12 w-12 text-on-night" />
              <span className="font-display text-xl font-semibold">Suya Factory</span>
            </Link>
            <p className="mt-4 flex items-center gap-2 font-display text-2xl text-on-night">
              No rules, just bite.
              <Flame className="h-6 w-5 text-accent" />
            </p>
          </div>

          <Suspense fallback={<div />}><ShopLinks /></Suspense>
          <FooterLinks title="Help" links={[["Settings", "/settings"], ["My account", "/account"], ["Terms of sale", "/terms"], ["Privacy", "/privacy"]]} />

          <div className="space-y-5">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-night-muted">Follow us</h2>
              {/* Social links depend on the visitor's country (a cookie), so they stream in. */}
              <Suspense fallback={<div className="mt-3 h-11" />}>
                <SocialIcons align="start" />
              </Suspense>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-night-muted">Theme</h2>
              <div className="mt-3"><ThemeSwitcher tone="night" /></div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-5 text-xs text-night-muted">
            <p>{BUSINESS.legalName} · {BUSINESS.rcNumber} · {BUSINESS.publicAddress}</p>
            <a href={`mailto:${BUSINESS.email}`} className="transition hover:text-on-night">{BUSINESS.email}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/** The shop links for the visitor's country ("Where to buy" only where we sell in supermarkets). */
async function ShopLinks() {
  const links = navLinks(await getCountry()).map((l): [string, string] => [l.href === "/shop" ? "Beef kilishi" : l.label, l.href]);
  return <FooterLinks title="Shop" links={links} />;
}

function FooterLinks({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-night-muted">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map(([label, href]) => (
          <li key={href}><Link href={href} className="text-on-night/85 transition hover:text-sun">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}

/** Simple line icons for the social pages. */
const ICONS: Record<string, React.ReactNode> = {
  Instagram: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="5" />
      <circle cx="12" cy="12" r="3.6" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  TikTok: <path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5M14 4c.6 2.4 2.3 4 5 4.2" />,
  Facebook: <path d="M14.5 8H17V4.5h-2.5c-2.5 0-4 1.6-4 4.1V11H8v3.5h2.5V20H14v-5.5h2.6L17 11h-3V8.9c0-.6.4-.9.5-.9z" />,
};

async function SocialIcons({ align = "center" }: { align?: "center" | "start" }) {
  const country = await getCountry();
  return (
    <ul className={`appear mt-6 flex gap-3 md:mt-3 ${align === "center" ? "justify-center" : ""}`}>
      {SOCIAL[country].map((s) => (
        <li key={s.name}>
          <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.name} title={s.name}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/30 bg-white/5 text-on-night/90 transition hover:border-accent hover:bg-accent hover:text-white">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {ICONS[s.name]}
            </svg>
          </a>
        </li>
      ))}
    </ul>
  );
}
