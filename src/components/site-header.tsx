import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser, isStaff } from "@/lib/auth";

// The login check lives in its own small component inside <Suspense>,
// so the rest of the page can load without waiting for it.
async function UserLinks() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <>
        <Link href="/login" className="hover:text-orange-700">Log in</Link>
        <Link href="/signup" className="rounded-lg bg-orange-700 px-3 py-1.5 font-semibold text-white hover:bg-orange-800">
          Sign up
        </Link>
      </>
    );
  }

  return (
    <>
      {isStaff(user) && <Link href="/admin" className="hover:text-orange-700">Admin</Link>}
      <Link href="/account" className="hover:text-orange-700">My account</Link>
    </>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-extrabold text-orange-700">
          Suya Factory
        </Link>
        <nav className="flex items-center gap-4 text-sm text-stone-700">
          <Suspense fallback={<span className="text-stone-400">…</span>}>
            <UserLinks />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
