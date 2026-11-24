"use client";
// Phone menu: a "Menu" button that opens a panel under the top bar with the
// links. Closes itself when you go to another page.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { NavLink } from "@/lib/nav";

export function MobileMenu({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]); // eslint-disable-line react-hooks/set-state-in-effect -- close on navigation

  return (
    <div className="md:hidden">
      <button type="button" data-tour="menu" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"} className="grid h-10 w-10 place-items-center rounded-xl border border-line text-ink">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h10" />}
        </svg>
      </button>
      <div id="mobile-menu" hidden={!open}
        className="absolute inset-x-0 top-full border-b border-line bg-bg px-4 pb-6 pt-2 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.35)]">
        <nav className="flex flex-col" aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} href={l.href}
              className={`border-b border-line py-3.5 font-display text-xl ${path.startsWith(l.href) ? "text-accent" : "text-ink"}`}>
              {l.label}
            </Link>
          ))}
        </nav>
        <Link href="/settings" className="flex items-center justify-between border-b border-line py-3.5 font-display text-xl text-ink">
          Settings
        </Link>
      </div>
    </div>
  );
}
