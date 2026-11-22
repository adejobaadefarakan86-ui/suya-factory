import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminNav, type NavItem } from "./admin-nav";
import { LogoMark } from "@/components/logo-mark";
import { BackButton } from "@/components/back-button";

// The admin "frame": a dark control-room sidebar. The ACCESS CHECK is not done
// here: layouts don't re-run when you move between pages, so every admin page
// checks requireStaff() itself. This layout only shows who is logged in.
const NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "🏠" },
  { href: "/admin/orders", label: "Orders", icon: "🧾" },
  { href: "/admin/stores", label: "Supermarkets", icon: "🏪" },
  { href: "/admin/enquiries", label: "Custom orders", icon: "📦" },
  { href: "/admin/products", label: "Products", icon: "🥩" },
  { href: "/admin/delivery", label: "Pickup & delivery", icon: "🛵" },
  { href: "/admin/team", label: "Team", icon: "👥" },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    // data-theme-lock: the admin keeps its light look even when a visitor picks the dark theme.
    <div data-theme-lock="" className="flex min-h-screen flex-1 flex-col bg-stone-100 md:flex-row">
      <aside className="bg-stone-950 px-4 py-5 text-stone-100 md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:overflow-y-auto">
        <div className="flex items-center gap-1">
        <Suspense fallback={null}><BackButton tone="night" /></Suspense>
        <Link href="/admin" className="flex items-center gap-3">
          <LogoMark gid="sf-heat-admin" className="h-11 w-11 shrink-0 text-white" />
          <span>
            <span className="block text-base font-extrabold leading-tight">Suya Factory</span>
            <span className="block text-xs font-semibold uppercase tracking-widest text-orange-400">Control room</span>
          </span>
        </Link>
        </div>

        <div className="mt-5 rounded-xl bg-white/5 px-3 py-2 text-xs text-stone-300">
          <Suspense fallback="…"><WhoAmI /></Suspense>
        </div>

        <div className="mt-5">
          {/* The menu highlights the current page (known only in the browser), so it streams in. */}
          <Suspense fallback={<PlainNav />}>
            <AdminNav items={NAV} badges={NAV.map((item) =>
              item.href === "/admin/stores" ? <Suspense key={item.href} fallback={null}><StockSignal /></Suspense> : null)} />
          </Suspense>
        </div>

        <div className="mt-6 hidden border-t border-white/10 pt-4 text-sm md:block">
          <Link href="/" className="block rounded-xl px-3 py-2 text-stone-400 hover:bg-white/10 hover:text-white">👀 See the shop as customers do</Link>
          <Link href="/account" className="block rounded-xl px-3 py-2 text-stone-400 hover:bg-white/10 hover:text-white">⚙️ My account</Link>
        </div>
      </aside>
      <div className="min-w-0 flex-1 px-4 py-8 md:px-10">{children}</div>
    </div>
  );
}

/** The same menu without the highlight, shown for a moment while the page loads. */
function PlainNav() {
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col" aria-label="Admin">
      {NAV.map((item) => (
        <Link key={item.href} href={item.href} className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-stone-300">
          <span className="text-base" aria-hidden>{item.icon}</span>
          <span className="flex-1">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

/** Red count of supermarkets that are out of kilishi (or reported out by a customer). */
async function StockSignal() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await (await createClient())
    .from("stores").select("in_stock, out_reported_at").eq("active", true);
  const n = (data ?? []).filter((s) => !s.in_stock || s.out_reported_at).length;
  return n > 0
    ? <span className="rounded-full bg-red-600 px-2 text-xs font-bold text-white" aria-label={`${n} need attention`}>{n}</span>
    : null;
}

async function WhoAmI() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <>
      <span className="block font-semibold text-white">{user.fullName ?? user.email}</span>
      <span className="text-orange-300">{user.role === "admin" ? "Admin · full access" : "Staff"}</span>
    </>
  );
}
