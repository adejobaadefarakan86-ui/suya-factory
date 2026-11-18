import Link from "next/link";
import { Suspense } from "react";
import { isStaff, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, type Currency } from "@/lib/money";
import { ORDER_STATUS, formatOrderDate, type OrderStatus } from "@/lib/orders";
import type { CountryCode } from "@/lib/countries";
import { signOut } from "../(auth)/actions";

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
      <h2 className="text-xl font-semibold text-stone-900">My orders</h2>
      {orders.length === 0 ? (
        <p className="mt-2 text-sm text-stone-500">
          No orders yet. <Link href="/shop" className="text-orange-700 hover:underline">Visit the shop</Link>
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
          {orders.map((o) => (
            <li key={o.order_number}>
              <Link href={`/orders/${o.access_token}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4 hover:bg-stone-50">
                <span className="font-semibold text-stone-900">{o.order_number}</span>
                <span className="text-sm text-stone-500">{formatOrderDate(o.created_at, o.country)}</span>
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
      <Suspense fallback={<p className="text-stone-400">Loading your account…</p>}>
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
      <h1 className="text-3xl font-bold text-stone-900">
        Hello{user.fullName ? `, ${user.fullName.split(" ")[0]}` : ""} 👋
      </h1>

      {error === "not-staff" && (
        <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          That page is for Suya Factory staff only.
        </p>
      )}

      <dl className="mt-6 grid grid-cols-[8rem_1fr] gap-y-2 rounded-2xl border border-stone-200 bg-white p-6 text-sm">
        <dt className="text-stone-500">Name</dt>
        <dd className="text-stone-900">{user.fullName ?? "—"}</dd>
        <dt className="text-stone-500">Email</dt>
        <dd className="break-all text-stone-900">{user.email ?? "—"}</dd>
        <dt className="text-stone-500">Account type</dt>
        <dd className="capitalize text-stone-900">{user.role}</dd>
      </dl>

      <MyOrders userId={user.id} />

      <div className="mt-8 flex flex-wrap gap-3">
        {isStaff(user) && (
          <Link
            href="/admin"
            className="rounded-lg bg-stone-900 px-4 py-2 font-semibold text-white hover:bg-stone-700"
          >
            Go to admin
          </Link>
        )}
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 font-semibold text-stone-700 hover:bg-stone-100"
          >
            Log out
          </button>
        </form>
      </div>
    </>
  );
}
