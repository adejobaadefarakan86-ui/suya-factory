// My account: a warm profile card (initials, name, email), quick shortcuts,
// then the customer's orders. Team members also get a way into the admin.
import Link from "next/link";
import { Suspense } from "react";
import { isStaff, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, type Currency } from "@/lib/money";
import { ORDER_STATUS, formatOrderDate, statusLabel, type OrderStatus } from "@/lib/orders";
import type { CountryCode } from "@/lib/countries";
import { signOut } from "../(auth)/actions";
import { SpiceLoader } from "@/components/spice-loader";
import { Flame, Sparks } from "@/components/doodles";

type OrderRow = {
  order_number: string;
  status: OrderStatus;
  own_rider: boolean;
  total_minor: number;
  currency: Currency;
  country: CountryCode;
  created_at: string;
  access_token: string;
};

export const metadata = { title: "My account · Suya Factory" };

export default function AccountPage(props: PageProps<"/account">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
      <Suspense fallback={<div className="grid place-items-center py-24"><SpiceLoader label="Loading your account" /></div>}>
        <AccountDetails searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

const initialsOf = (name: string) =>
  name.split(/[\s@]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

async function AccountDetails({ searchParams }: { searchParams: PageProps<"/account">["searchParams"] }) {
  const user = await requireUser("/account");
  const { error } = await searchParams;
  const name = user.fullName ?? user.email ?? "there";
  const first = name.split(" ")[0];
  const staff = isStaff(user);

  return (
    <div className="space-y-8">
      {error === "not-staff" && (
        <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">That page is for Suya Factory staff only.</p>
      )}

      {/* Profile card: brand orange, frosted like the login page */}
      <section className="relative overflow-hidden rounded-[1.75rem] p-6 text-white shadow-[0_30px_60px_-35px_rgba(90,25,5,0.8)] sm:p-8"
        style={{ background: "radial-gradient(circle at 15% 10%, rgba(255,205,100,0.5), transparent 45%), radial-gradient(circle at 90% 100%, rgba(140,35,8,0.55), transparent 55%), linear-gradient(150deg, #f2852f, #e4570f 55%, #c2410c)" }}>
        <Sparks className="absolute right-6 top-6 h-9 w-9 text-white/45" />
        <Flame className="absolute -bottom-2 right-10 h-20 w-16 text-white/15" />
        <div className="relative flex items-center gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/40 bg-white/20 font-display text-2xl font-semibold backdrop-blur-md">
            {initialsOf(name)}
          </span>
          <div className="min-w-0">
            <p className="text-sm text-white/80">Welcome back</p>
            <h1 className="truncate font-display text-3xl font-semibold tracking-tight sm:text-4xl">{first}</h1>
          </div>
        </div>
        <dl className="relative mt-6 grid gap-3 rounded-2xl border border-white/25 bg-white/10 p-4 text-sm backdrop-blur-md sm:grid-cols-2">
          <div className="min-w-0"><dt className="text-white/70">Name</dt><dd className="truncate font-medium">{user.fullName ?? "—"}</dd></div>
          <div className="min-w-0"><dt className="text-white/70">Email</dt><dd className="truncate font-medium">{user.email ?? "—"}</dd></div>
        </dl>
      </section>

      {/* Shortcuts */}
      <nav aria-label="Shortcuts" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ...(staff ? [["Go to admin", "/admin", "Control room"]] : [["Shop", "/shop", "Spicy beef kilishi"]]),
          ["Custom orders", "/bulk-orders", "1kg and up"],
          ["Settings", "/settings", "Theme, text size"],
          ["Help", "/terms", "Terms & refunds"],
        ].map(([label, href, hint]) => (
          <Link key={href} href={href}
            className="rounded-2xl border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:border-accent">
            <span className="block font-display font-semibold text-ink">{label}</span>
            <span className="mt-0.5 block text-xs text-muted">{hint}</span>
          </Link>
        ))}
      </nav>

      <MyOrders userId={user.id} />

      <form action={signOut} className="flex justify-center pt-2">
        <button type="submit" className="btn btn-ghost px-6">Log out</button>
      </form>
    </div>
  );
}

// The customer's own orders (the database's rules only return theirs).
async function MyOrders({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("order_number, status, own_rider, total_minor, currency, country, created_at, access_token")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  const orders = (data ?? []) as OrderRow[];

  return (
    <section>
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">My orders</h2>
      {orders.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
          <p className="text-muted">No orders yet.</p>
          <Link href="/shop" className="btn btn-primary mt-4 px-6">Find your first pack</Link>
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {orders.map((o) => (
            <li key={o.order_number}>
              <Link href={`/orders/${o.access_token}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4 transition hover:bg-cream">
                <span className="font-display font-semibold text-ink">{o.order_number}</span>
                <span className="text-sm text-muted">{formatOrderDate(o.created_at, o.country)}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ORDER_STATUS[o.status].className}`}>
                  {statusLabel(o.status, o.own_rider)}
                </span>
                <span className="ml-auto font-semibold tabular-nums text-ink">{formatMoney(o.total_minor, o.currency)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
