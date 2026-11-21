"use client";
import { useActionState, useState } from "react";
import { LocationPicker, type PickedLocation } from "@/app/checkout/location-picker";
import type { GhPickup } from "@/lib/gh-pickup";
import { saveGhPickup, type DeliverySettingsState } from "./actions";

const input = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900";

/** Ghana pickup: address, map pin, who hands it over, their phone, pickup hours. */
export function GhPickupForm({ pickup }: { pickup: GhPickup }) {
  const [state, action, pending] = useActionState<DeliverySettingsState, FormData>(saveGhPickup, undefined);
  const [pin, setPin] = useState<PickedLocation | null>({
    lat: pickup.lat, lng: pickup.lng, accuracy: null, name: pickup.address, address: "", city: "",
  });

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="lat" value={pin?.lat ?? ""} />
      <input type="hidden" name="lng" value={pin?.lng ?? ""} />

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">Pickup address (customers copy this)</span>
        <input name="address" required defaultValue={pickup.address} maxLength={200} className={input} />
      </label>

      <div>
        <p className="mb-1 text-sm font-medium text-stone-700">Map pin (riders are sent here)</p>
        <LocationPicker country="GH" value={pin} onChange={setPin} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Who hands it over (sender name)</span>
          <input name="contact" required defaultValue={pickup.contactPerson} maxLength={100} className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Their phone (sender phone)</span>
          <input name="phone" type="tel" required defaultValue={pickup.contactPhone} maxLength={20} className={input} />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-stone-700">Pickup hours (optional)</span>
          <input name="hours" defaultValue={pickup.hours} maxLength={100} className={input} placeholder="e.g. Mon–Sat, 9am – 6pm" />
        </label>
      </div>

      <button disabled={pending} className="rounded-lg bg-stone-900 px-4 py-2.5 font-semibold text-white disabled:opacity-60">
        {pending ? "Saving…" : "Save"}
      </button>
      {state?.ok && <p role="status" className="text-sm text-green-700">{state.ok}</p>}
      {state?.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
    </form>
  );
}
