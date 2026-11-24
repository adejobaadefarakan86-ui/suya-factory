import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { CartLink } from "@/components/cart-link";
import { MobileMenu } from "@/components/mobile-menu";
import { LogoMark } from "@/components/logo-mark";
import { BackButton } from "@/components/back-button";
import { AdminLink } from "@/components/view-switch";
import { navLinks } from "@/lib/nav";
import { getCountry } from "@/lib/country";
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
  if (!user) return null;
  return (
    <>
      {isStaff(user) && (
        <AdminLink title="Back to the control room"
          className="appear flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-ink px-3 text-sm font-semibold text-bg transition hover:bg-accent hover:text-on-accent">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
          Admin
        </AdminLink>
      )}
    </>
  );
}

/** Always visible (phones too): "Log in" with a person icon, or your initials once logged in. */
async function AccountButton() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Link href="/login" data-tour="account" aria-label="Log in"
        className="appear flex h-10 items-center gap-1.5 rounded-xl border border-line px-2.5 text-sm font-medium text-ink transition hover:border-ink sm:px-3">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" />
        </svg>
        <span className="hidden sm:inline">Log in</span>
      </Link>
    );
  }
  const initials = (user.fullName ?? user.email ?? "?").split(/[\s@]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  return (
    <Link href="/account" data-tour="account" aria-label="My account" title={user.fullName ?? "My account"}
      className="appear grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-accent to-[color-mix(in_srgb,var(--accent)_55%,var(--sun))] font-display text-sm font-semibold text-white shadow-sm ring-2 ring-bg transition hover:brightness-110">
      {initials}
    </Link>
  );
}

/** Computer: the main links (they depend on the visitor's country). */
async function MainNav() {
  return navLinks(await getCountry()).map((l) => (
    <Link key={l.href} href={l.href} className="text-sm font-medium text-muted transition hover:text-ink">{l.label}</Link>
  ));
}

/** Phone menu with the links for the visitor's country. */
async function MobileMenuForCountry() {
  return <MobileMenu links={navLinks(await getCountry())} />;
}

/** The Menu button as it looks before the page is ready (phones only). */
function MenuPlaceholder() {
  return (
    <span className="grid h-10 w-10 place-items-center rounded-xl border border-line text-ink md:hidden" aria-hidden="true">☰</span>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header sticky top-0 z-40 border-b border-line bg-bg">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center gap-1">
          {/* Phones: back arrow on every page except home (it knows the page, so it streams in). */}
          <Suspense fallback={null}><BackButton /></Suspense>
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <LogoMark gid="sf-heat-top" className="h-10 w-10 text-ink" />
            <span className="font-display text-lg font-semibold tracking-tight text-ink max-[380px]:hidden">Suya Factory</span>
          </Link>
        </div>

        {/* Computer: simple links in the middle */}
        <nav data-tour="nav" className="hidden items-center gap-7 md:flex" aria-label="Main">
          <Suspense fallback={null}><MainNav /></Suspense>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-4 md:flex">
            <Link href="/settings" data-tour="settings" aria-label="Settings" title="Settings"
              className="grid h-9 w-9 place-items-center rounded-xl text-muted transition hover:bg-cream hover:text-ink">
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
              </svg>
            </Link>
          </div>
          {/* Team accounts: a button back to the control room (phones too). */}
          <Suspense fallback={null}><UserLinks /></Suspense>
          <Suspense fallback={<CartLink />}><CartForCustomers /></Suspense>
          <Suspense fallback={<span className="h-10 w-10" />}><AccountButton /></Suspense>
          {/* Phone: everything else lives in the menu (it knows the current page, so it streams in). */}
          <Suspense fallback={<MenuPlaceholder />}>
          <MobileMenuForCountry />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
