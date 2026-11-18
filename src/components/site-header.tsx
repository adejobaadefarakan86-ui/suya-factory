import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { CartLink } from "@/components/cart-link";
import { CountrySwitcher } from "@/components/country-switcher";

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
      {isStaff(user) && <Link href="/admin" className="hidden hover:text-orange-700 sm:inline">Admin</Link>}
      <Link href="/account" className="hover:text-orange-700">Account</Link>
    </>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-extrabold text-orange-700">
          Suya Factory
        </Link>
        <nav className="flex items-center gap-3 text-sm text-stone-700 sm:gap-5">
          <Link href="/shop" className="hover:text-orange-700">Shop</Link>
          <Suspense fallback={<span className="w-20" />}>
            <CountrySwitcher />
          </Suspense>
          <Suspense fallback={<span className="text-stone-400">…</span>}>
            <UserLinks />
          </Suspense>
          <CartLink />
        </nav>
      </div>
    </header>
  );
}
