import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { CartLink } from "@/components/cart-link";
import { CountrySwitcher } from "@/components/country-switcher";
import { MobileMenu } from "@/components/mobile-menu";
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
    <header className="sticky top-0 z-40 border-b border-line bg-bg">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Image src="/images/logo-mark.png" alt="" width={36} height={36} className="rounded-lg" priority />
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
