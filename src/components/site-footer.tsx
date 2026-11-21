import Link from "next/link";
import { Suspense } from "react";
import { BUSINESS, SOCIAL } from "@/lib/business";
import { getCountry } from "@/lib/country";
import { ThemeSwitcher } from "@/components/theme";
import { Flame } from "@/components/doodles";
import { LogoMark } from "@/components/logo-mark";

export function SiteFooter() {
  return (
    <footer className="site-footer mt-auto bg-night text-on-night">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
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

        <FooterLinks title="Shop" links={[["Beef kilishi", "/shop"], ["Where to buy", "/where-to-buy"], ["Custom orders", "/bulk-orders"]]} />
        <FooterLinks title="Help" links={[["Settings", "/settings"], ["My account", "/account"], ["Terms of sale", "/terms"], ["Privacy", "/privacy"]]} />

        <div className="space-y-5">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-night-muted">Follow us</h2>
            {/* Social links depend on the visitor's country (a cookie), so they stream in. */}
            <Suspense fallback={<p className="mt-3 h-5" />}>
              <SocialLinks />
            </Suspense>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-night-muted">Theme</h2>
            <div className="mt-3"><ThemeSwitcher tone="night" /></div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-night-muted sm:flex-row sm:items-center sm:justify-between">
          <p>{BUSINESS.legalName} · {BUSINESS.rcNumber} · {BUSINESS.publicAddress}</p>
          <a href={`mailto:${BUSINESS.email}`} className="transition hover:text-on-night">{BUSINESS.email}</a>
        </div>
      </div>
    </footer>
  );
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

async function SocialLinks() {
  const country = await getCountry();
  return (
    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
      {SOCIAL[country].map((s) => (
        <li key={s.name}>
          <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-on-night/85 transition hover:text-sun">{s.name}</a>
        </li>
      ))}
    </ul>
  );
}
