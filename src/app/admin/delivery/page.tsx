import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth";
import { getGhPickup } from "@/lib/gh-pickup";
import { GhPickupForm } from "./settings-form";

export const metadata = { title: "Delivery settings · Admin · Suya Factory" };

export default function DeliverySettingsPage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-stone-900">Delivery settings</h1>
      <p className="mt-1 max-w-2xl text-sm text-stone-600">
        Customers book and pay their own rider, so there are no delivery prices here. This is only what customers copy into
        their ride app.
      </p>
      <Suspense fallback={<p className="mt-4 text-sm text-stone-400">Loading…</p>}>
        <Settings />
      </Suspense>
    </>
  );
}

async function Settings() {
  const me = await requireStaff("/admin/delivery");
  if (me.role !== "admin") redirect("/admin");
  const pickup = await getGhPickup();

  return (
    <div className="mt-6 grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section className="min-w-0 rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="mb-1 font-semibold text-stone-900">🇬🇭 Ghana pickup point</h2>
        <p className="mb-4 text-sm text-stone-600">Where customers send their rider (Bolt, Uber, Yango, Qargo…).</p>
        <GhPickupForm pickup={pickup} />
      </section>
      <section className="h-fit rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-600">
        <h2 className="mb-2 font-semibold text-stone-900">🇳🇬 Nigeria</h2>
        <p>Customers buy at a supermarket and send their rider there. Each supermarket&apos;s address, map pin and phone are on the{" "}
          <Link href="/admin/stores" className="font-medium text-orange-700 underline">Supermarkets</Link> page.</p>
      </section>
    </div>
  );
}
