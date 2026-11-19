"use client";
import { useActionState, useState } from "react";
import { LocationPicker, type PickedLocation } from "@/app/checkout/location-picker";
import { saveDeliverySettings, type DeliverySettingsState } from "./actions";

const input = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900";

export type SettingsRow = {
  auto_price: boolean;
  pickup_lat: number | null;
  pickup_lng: number | null;
  pickup_label: string | null;
  pickup_phone: string | null;
  base_minor: number;
  per_km_minor: number;
  road_factor: number;
};

/** Same sum as the database's delivery_fee(): base + per km, rounded UP to the next ₦100. */
function example(base: number, perKm: number, km: number) {
  return Math.ceil((base + perKm * km) / 100) * 100;
}

export function DeliverySettingsForm({ row }: { row: SettingsRow }) {
  const [state, action, pending] = useActionState<DeliverySettingsState, FormData>(saveDeliverySettings, undefined);
  const [pickup, setPickup] = useState<PickedLocation | null>(
    row.pickup_lat !== null && row.pickup_lng !== null
      ? { lat: row.pickup_lat, lng: row.pickup_lng, accuracy: null, name: row.pickup_label ?? "Pickup point", address: "", city: "" }
      : null,
  );
  const [base, setBase] = useState(row.base_minor / 100);
  const [perKm, setPerKm] = useState(row.per_km_minor / 100);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="lat" value={pickup?.lat ?? ""} />
      <input type="hidden" name="lng" value={pickup?.lng ?? ""} />

      <div>
        <p className="mb-1 text-sm font-medium text-stone-700">Pickup point (where riders collect orders)</p>
        <LocationPicker country="NG" value={pickup} onChange={setPickup} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Pickup name / address</span>
          <input name="label" defaultValue={pickup?.name ?? row.pickup_label ?? ""} maxLength={200} className={input} placeholder="e.g. Suya Factory, 12 Ijaiye Road" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Phone the rider calls at pickup</span>
          <input name="phone" type="tel" defaultValue={row.pickup_phone ?? ""} maxLength={20} className={input} placeholder="0803 000 0000" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Base fee (₦)</span>
          <input name="base" type="number" min={0} step={50} value={base} onChange={(e) => setBase(Number(e.target.value))} className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Price per km (₦)</span>
          <input name="perKm" type="number" min={0} step={10} value={perKm} onChange={(e) => setPerKm(Number(e.target.value))} className={input} />
        </label>
      </div>

      <div className="rounded-lg bg-stone-50 p-3 text-sm text-stone-700">
        <p className="font-medium">What customers will pay for delivery:</p>
        <p className="mt-1 tabular-nums">
          2 km → ₦{example(base, perKm, 2).toLocaleString()} · 5 km → ₦{example(base, perKm, 5).toLocaleString()} ·
          10 km → ₦{example(base, perKm, 10).toLocaleString()} · 20 km → ₦{example(base, perKm, 20).toLocaleString()}
        </p>
        <p className="mt-1 text-xs text-stone-500">
          Distance = straight line from the pickup point × {row.road_factor} (roads aren&apos;t straight), rounded up to the next ₦100.
        </p>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="autoPrice" defaultChecked={row.auto_price} className="mt-0.5 h-4 w-4 accent-orange-700" />
        <span>
          <strong>Automatic delivery price at checkout</strong> (customers pay kilishi + delivery online). Untick to go back to
          staff entering each delivery price by hand.
        </span>
      </label>

      <button disabled={pending} className="rounded-lg bg-stone-900 px-4 py-2.5 font-semibold text-white disabled:opacity-60">
        {pending ? "Saving…" : "Save delivery settings"}
      </button>
      {state?.ok && <p role="status" className="text-sm text-green-700">{state.ok}</p>}
      {state?.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
    </form>
  );
}
