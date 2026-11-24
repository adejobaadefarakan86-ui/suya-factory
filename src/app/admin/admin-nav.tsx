"use client";
// Admin menu with the current page highlighted.
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; icon: string };

export function AdminNav({ items, badges }: { items: NavItem[]; badges: React.ReactNode[] }) {
  const path = usePathname();
  return (
    <nav className="grid grid-cols-2 gap-1 md:flex md:flex-col" aria-label="Admin">
      {items.map((item, i) => {
        const active = item.href === "/admin" ? path === "/admin" : path.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} data-tour={"nav-" + (item.href.split("/")[2] ?? "overview")} aria-current={active ? "page" : undefined}
            className={`flex min-w-0 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
              active ? "bg-ember text-white shadow-[0_8px_20px_-10px_rgba(226,64,47,0.8)]" : "text-stone-300 hover:bg-white/10 hover:text-white"
            }`}>
            <span className="text-base" aria-hidden>{item.icon}</span>
            <span className="flex-1 truncate">{item.label}</span>
            {badges[i]}
          </Link>
        );
      })}
    </nav>
  );
}
