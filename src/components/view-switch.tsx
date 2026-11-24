"use client";
// Team accounts open the app on the control room (src/lib/supabase/proxy.ts).
// These links switch between the control room and the customer view of the shop.
import Link from "next/link";

const COOKIE = "sf_view";

/** Opens the shop as customers see it (remembered until the app is closed). */
export function CustomerViewLink({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    // A full page load (not <Link>), so a remembered "/ goes to the control room" can't be reused.
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    <a href="/" className={className} onClick={() => { document.cookie = `${COOKIE}=shop; path=/; samesite=lax`; }}>
      {children}
    </a>
  );
}

/** Back to the control room (and the app opens there again). */
export function AdminLink({ className, title, children }: { className?: string; title?: string; children: React.ReactNode }) {
  return (
    <Link href="/admin" title={title} className={className} onClick={() => { document.cookie = `${COOKIE}=; path=/; max-age=0`; }}>
      {children}
    </Link>
  );
}
