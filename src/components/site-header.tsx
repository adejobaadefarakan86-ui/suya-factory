import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { CartLink } from "@/components/cart-link";
import { CountrySwitcher } from "@/components/country-switcher";
import { MobileMenu } from "@/components/mobile-menu";
import { LogoMark } from "@/components/logo-mark";
import { NAV_LINKS } from "@/lib/nav";
import { getCatalog } from "@/lib/catalog";

// The cart icon needs to know what's still for sale (the catalogue is cached, so this is quick).
async function CartLinkWithCatalog() {
  const catalog = await getCatalog();
  return <CartLink validIds={catalog.flatMap((p) => p.variants.map((v) => v.id))} />;
}

// Team accounts don't buy, so no cart for them.
async function CartForCustomers() {
  if (isStaff(await getCurrentUser())) return null;
  return <CartLinkWithCatalog />;
}

// Parts that depend on the visitor (login, country) sit in their own
// <Suspense>, so the rest of the page can load without waiting for them.
async function UserLinks() {
  const user = await getCurrentUser();
  if (!user) {
    return <Link href="/login" className="text-sm font-medium text-muted transition hover:text-ink">Log in</Link>;
  }
  return (
    <>
      {isStaff(user) && (
        <Link href="/admin" title="You're signed in with a team account: you see the shop like a customer, without buying."
          className="shrink-0 rounded-lg bg-ink px-2.5 py-1 text-xs font-medium text-bg transition hover:bg-accent hover:text-on-accent">
          Team view · Admin
        </Link>
      )}
      <Link href="/account" className="text-sm font-medium text-muted transition hover:text-ink">Account</Link>
    </>
  );
}

/** The Menu button as it looks before the page is ready (phones only). */
function MenuPlaceholder() {
  return (
    <span className="flex h-10 items-center rounded-xl border border-line px-3 text-sm font-medium text-ink md:hidden">Menu</span>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header sticky top-0 z-40 border-b border-line bg-bg">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <LogoMark gid="sf-heat-top" className="h-10 w-10 text-ink" />
          <span className="font-display text-lg font-semibold tracking-tight text-ink">Suya Factory</span>
        </Link>

        {/* Computer: simple links in the middle */}
        <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-medium text-muted transition hover:text-ink">{l.label}</Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-4 md:flex">
            <Suspense fallback={<span className="w-20" />}><CountrySwitcher /></Suspense>
            <Suspense fallback={<span className="w-12" />}><UserLinks /></Suspense>
            <Link href="/settings" aria-label="Settings" title="Settings"
              className="grid h-9 w-9 place-items-center rounded-xl text-muted transition hover:bg-cream hover:text-ink">
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
              </svg>
            </Link>
          </div>
          <Suspense fallback={<CartLink />}><CartForCustomers /></Suspense>
          {/* Phone: everything else lives in the menu (it knows the current page, so it streams in). */}
          <Suspense fallback={<MenuPlaceholder />}>
          <MobileMenu>
            <Suspense fallback={<span className="w-20" />}><CountrySwitcher /></Suspense>
            <div className="flex items-center gap-4">
              <Suspense fallback={<span className="w-12" />}><UserLinks /></Suspense>
            </div>
          </MobileMenu>
          </Suspense>
        </div>
      </div>
    </header>
  );
}
