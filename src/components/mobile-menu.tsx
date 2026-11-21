"use client";
// Phone menu: a "Menu" button that opens a panel under the top bar with the
// links and the country choice. Closes itself when you go to another page.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_LINKS } from "@/lib/nav";

export function MobileMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]); // eslint-disable-line react-hooks/set-state-in-effect -- close on navigation

  return (
    <div className="md:hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-menu"
        className="flex h-10 items-center gap-2 rounded-xl border border-line px-3 text-sm font-medium text-ink">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h10" />}
        </svg>
        Menu
      </button>
      <div id="mobile-menu" hidden={!open}
        className="absolute inset-x-0 top-full border-b border-line bg-bg px-4 pb-6 pt-2 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.35)]">
        <nav className="flex flex-col" aria-label="Main">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href}
              className={`border-b border-line py-3.5 font-display text-xl ${path.startsWith(l.href) ? "text-accent" : "text-ink"}`}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">{children}</div>
      </div>
    </div>
  );
}
