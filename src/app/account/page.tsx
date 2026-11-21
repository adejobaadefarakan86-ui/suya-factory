import Link from "next/link";
import { Suspense } from "react";
import { isStaff, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, type Currency } from "@/lib/money";
import { ORDER_STATUS, formatOrderDate, type OrderStatus } from "@/lib/orders";
import type { CountryCode } from "@/lib/countries";
import { signOut } from "../(auth)/actions";
import { ThemeSwitcher } from "@/components/theme";

type OrderRow = {
  order_number: string;
  status: OrderStatus;
  total_minor: number;
  currency: Currency;
  country: CountryCode;
  created_at: string;
  access_token: string;
};

// The customer's own orders (the database's RLS rules only return theirs).
async function MyOrders({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("order_number, status, total_minor, currency, country, created_at, access_token")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  const orders = (data ?? []) as OrderRow[];

  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold text-ink">My orders</h2>
      {orders.length === 0 ? (
        <p className="mt-2 text-sm text-muted">
          No orders yet. <Link href="/shop" className="text-accent-strong hover:underline">Visit the shop</Link>
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface">
          {orders.map((o) => (
            <li key={o.order_number}>
              <Link href={`/orders/${o.access_token}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4 hover:bg-cream">
                <span className="font-semibold text-ink">{o.order_number}</span>
                <span className="text-sm text-muted">{formatOrderDate(o.created_at, o.country)}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ORDER_STATUS[o.status].className}`}>
                  {ORDER_STATUS[o.status].label}
                </span>
                <span className="ml-auto font-semibold tabular-nums">{formatMoney(o.total_minor, o.currency)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export const metadata = { title: "My account · Suya Factory" };

export default function AccountPage(props: PageProps<"/account">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <Suspense fallback={<p className="text-muted">Loading your account…</p>}>
        <AccountDetails searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function AccountDetails({ searchParams }: { searchParams: PageProps<"/account">["searchParams"] }) {
  const user = await requireUser("/account");
  const { error } = await searchParams;

  return (
    <>
      <h1 className="text-3xl font-bold text-ink">
        Hello{user.fullName ? `, ${user.fullName.split(" ")[0]}` : ""} 👋
      </h1>

      {error === "not-staff" && (
        <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          That page is for Suya Factory staff only.
        </p>
      )}

      <dl className="mt-6 grid grid-cols-[8rem_1fr] gap-y-2 rounded-2xl border border-line bg-surface p-6 text-sm">
        <dt className="text-muted">Name</dt>
        <dd className="text-ink">{user.fullName ?? "—"}</dd>
        <dt className="text-muted">Email</dt>
        <dd className="break-all text-ink">{user.email ?? "—"}</dd>
        <dt className="text-muted">Account type</dt>
        <dd className="capitalize text-ink">{user.role}</dd>
      </dl>

      <MyOrders userId={user.id} />

      {/* Settings: the look of the site on this device. */}
      <section className="mt-8 rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-xl font-semibold text-ink">Settings</h2>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">Theme · <span className="text-ink">Auto</span> follows your phone or computer.</p>
          <ThemeSwitcher />
        </div>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        {isStaff(user) && (
          <Link
            href="/admin"
            className="btn bg-ink text-bg hover:bg-accent hover:text-on-accent"
          >
            Go to admin
          </Link>
        )}
        <form action={signOut}>
          <button
            type="submit"
            className="btn btn-ghost"
          >
            Log out
          </button>
        </form>
      </div>
    </>
  );
}
