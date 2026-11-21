import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { CartLink } from "@/components/cart-link";
import { CountrySwitcher } from "@/components/country-switcher";
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
    return (
      <Link href="/login" className="hover:text-orange-700">Log in</Link>
    );
  }

  return (
    <>
      {isStaff(user) && (
        <Link href="/admin" className="rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold text-white hover:bg-orange-700"
          title="You're signed in with a team account: you see the shop like a customer, without buying.">
          👀 Team view · Admin
        </Link>
      )}
      <Link href="/account" className="hover:text-orange-700">Account</Link>
    </>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-extrabold text-stone-900">
          <Image src="/images/logo-mark.png" alt="" width={36} height={36} className="rounded-lg" priority />
          <span className="hidden sm:inline">Suya Factory</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm text-stone-700 sm:gap-5">
          <Link href="/shop" className="hover:text-orange-700">Shop</Link>
          <Link href="/where-to-buy" className="hover:text-orange-700"><span className="hidden sm:inline">Where to buy</span><span className="sm:hidden">Stores</span></Link>
          <Link href="/bulk-orders" className="hover:text-orange-700">Bulk<span className="hidden sm:inline"> orders</span></Link>
          <Suspense fallback={<span className="w-20" />}>
            <CountrySwitcher />
          </Suspense>
          <Suspense fallback={<span className="text-stone-400">…</span>}>
            <UserLinks />
          </Suspense>
          <Suspense fallback={<CartLink />}>
            <CartForCustomers />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
