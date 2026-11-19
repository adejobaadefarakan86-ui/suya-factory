import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DeliverySettingsForm, type SettingsRow } from "./settings-form";

export const metadata = { title: "Delivery settings · Admin · Suya Factory" };

export default function DeliverySettingsPage() {
  return (
    <>
      <h1 className="text-2xl font-bold text-stone-900">Delivery settings</h1>
      <p className="mt-1 max-w-2xl text-sm text-stone-600">
        Nigeria: the delivery price is worked out automatically from the distance between the pickup point and the
        customer&apos;s pin, and paid online together with the kilishi.
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

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("delivery_settings")
    .select("auto_price, pickup_lat, pickup_lng, pickup_label, pickup_phone, base_minor, per_km_minor, road_factor")
    .eq("country", "NG")
    .single();
  if (error || !data) return <p className="mt-4 text-red-700">Couldn&apos;t load delivery settings: {error?.message}</p>;

  const row: SettingsRow = {
    ...data,
    pickup_lat: data.pickup_lat === null ? null : Number(data.pickup_lat),
    pickup_lng: data.pickup_lng === null ? null : Number(data.pickup_lng),
    road_factor: Number(data.road_factor),
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-stone-900">🇳🇬 Nigeria (Lagos)</h2>
        <DeliverySettingsForm row={row} />
      </section>
      <section className="h-fit rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-600">
        <h2 className="mb-2 font-semibold text-stone-900">🇬🇭 Ghana (Accra)</h2>
        <p>
          Staff still enter each delivery price, paid to the rider. Online payment in Ghana needs a separate
          Paystack Ghana account (GHS and mobile money); once that&apos;s set up, Ghana can work the same way.
        </p>
      </section>
    </div>
  );
}
