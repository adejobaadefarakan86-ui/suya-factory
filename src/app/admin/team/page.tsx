import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatOrderDate } from "@/lib/orders";
import { RoleForm } from "./role-form";

export const metadata = { title: "Team · Admin · Suya Factory" };

type Member = { user_id: string; email: string; full_name: string | null; role: "staff" | "admin"; joined_at: string };

export default function TeamPage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-stone-900">Team</h1>
      <Suspense fallback={<p className="mt-4 text-sm text-stone-400">Loading team…</p>}>
        <Team />
      </Suspense>
    </>
  );
}

async function Team() {
  const me = await requireStaff("/admin/team");
  if (me.role !== "admin") redirect("/admin");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_team");
  if (error) return <p className="mt-4 text-red-700">Couldn&apos;t load the team: {error.message}</p>;
  const members = (data ?? []) as Member[];

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_24rem]">
      <section className="rounded-2xl border border-stone-200 bg-white">
        <ul className="divide-y divide-stone-100">
          {members.map((m) => (
            <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold text-stone-900">
                  {m.full_name || m.email}
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${m.role === "admin" ? "bg-stone-900 text-white" : "bg-orange-100 text-orange-900"}`}>
                    {m.role}
                  </span>
                  {m.user_id === me.id && <span className="ml-2 text-xs text-stone-500">(you)</span>}
                </p>
                <p className="text-sm text-stone-500">{m.email} · joined {formatOrderDate(m.joined_at, "NG").split(",")[0]}</p>
              </div>
              {m.user_id !== me.id && <RoleForm email={m.email} role={m.role} compact />}
            </li>
          ))}
        </ul>
      </section>

      <section className="h-fit rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="mb-1 font-semibold text-stone-900">Add someone</h2>
        <p className="mb-3 text-sm text-stone-600">
          Ask them to <strong>sign up on the website</strong> first, then enter the email they used.
        </p>
        <RoleForm />
        <div className="mt-4 rounded-lg bg-stone-50 p-3 text-xs text-stone-600">
          <p><strong>Staff</strong> can: confirm MoMo payments, hand orders to the customer&apos;s rider, mark refunds as sent, update supermarket stock, add notes, and handle bulk enquiries.</p>
          <p className="mt-1"><strong>Only admins</strong> can also: cancel orders, change pickup details and supermarkets, and manage this team.</p>
        </div>
      </section>
    </div>
  );
}
