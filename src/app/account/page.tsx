import Link from "next/link";
import { Suspense } from "react";
import { isStaff, requireUser } from "@/lib/auth";
import { signOut } from "../(auth)/actions";

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

      <p className="mt-4 text-sm text-stone-500">Your orders will appear here once the shop opens.</p>

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
