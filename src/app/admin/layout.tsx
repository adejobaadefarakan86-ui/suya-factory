import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";

// The admin "frame" (sidebar). The ACCESS CHECK is not done here: layouts
// don't re-run when you move between pages, so every admin page checks
// requireStaff() itself. This layout only shows who is logged in.
const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/enquiries", label: "Bulk enquiries" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/team", label: "Team (admins)" },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="border-b border-stone-200 bg-stone-900 px-4 py-4 text-stone-100 md:w-56 md:border-r md:border-b-0">
        <p className="text-lg font-bold">Suya Factory</p>
        <p className="mb-4 text-xs text-stone-400">
          Admin ·{" "}
          <Suspense fallback="…">
            <WhoAmI />
          </Suspense>
        </p>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm md:flex-col md:gap-2">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-orange-300">{item.label}</Link>
          ))}
          <span className="text-stone-500" title="Coming in a later phase">Kitchen &amp; stock</span>
          <Link href="/account" className="hover:text-orange-300">My account</Link>
        </nav>
      </aside>
      <div className="min-w-0 flex-1 px-4 py-8 md:px-8">{children}</div>
    </div>
  );
}

async function WhoAmI() {
  const user = await getCurrentUser();
  return user ? `${user.fullName ?? user.email} (${user.role})` : null;
}
