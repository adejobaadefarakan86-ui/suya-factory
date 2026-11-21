"use client";
// Admin menu with the current page highlighted.
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; icon: string };

export function AdminNav({ items, badges }: { items: NavItem[]; badges: React.ReactNode[] }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible" aria-label="Admin">
      {items.map((item, i) => {
        const active = item.href === "/admin" ? path === "/admin" : path.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
              active ? "bg-orange-600 text-white shadow" : "text-stone-300 hover:bg-white/10 hover:text-white"
            }`}>
            <span className="text-base" aria-hidden>{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {badges[i]}
          </Link>
        );
      })}
    </nav>
  );
}
