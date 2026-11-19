"use client";
import { useActionState, useState } from "react";
import { LocationPicker, type PickedLocation } from "@/app/checkout/location-picker";
import { saveStore, type StoreFormState } from "./actions";

const input = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900";

export type StoreFormRow = {
  id: string;
  name: string;
  branch: string | null;
  address: string;
  lat: number;
  lng: number;
  phone: string | null;
  whatsapp: string | null;
  openingHours: string | null;
  packs: string | null;
  active: boolean;
};

/** Add a supermarket (no row) or edit one. */
export function StoreForm({ row }: { row?: StoreFormRow }) {
  const [state, action, pending] = useActionState<StoreFormState, FormData>(saveStore, undefined);
  const [pin, setPin] = useState<PickedLocation | null>(
    row ? { lat: row.lat, lng: row.lng, accuracy: null, name: row.name, address: row.address, city: "" } : null,
  );
  const [address, setAddress] = useState(row?.address ?? "");

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={row?.id ?? ""} />
      <input type="hidden" name="lat" value={pin?.lat ?? ""} />
      <input type="hidden" name="lng" value={pin?.lng ?? ""} />

      <div>
        <p className="mb-1 text-sm font-medium text-stone-700">Location (where riders pick up)</p>
        <LocationPicker
          country="NG"
          value={pin}
          onChange={(p) => {
            setPin(p);
            if (!address) setAddress(p.address);
          }}
          emptyTitle="Set the supermarket's location"
          emptyHint="Search its name, or stand there and use your location"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Supermarket name</span>
          <input name="name" required maxLength={100} defaultValue={row?.name ?? ""} className={input} placeholder="e.g. Shoprite" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Branch</span>
          <input name="branch" maxLength={100} defaultValue={row?.branch ?? ""} className={input} placeholder="e.g. Ikeja City Mall" />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-stone-700">Address (riders see this)</span>
          <input name="address" required maxLength={300} value={address} onChange={(e) => setAddress(e.target.value)} className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Phone</span>
          <input name="phone" type="tel" maxLength={25} defaultValue={row?.phone ? `+${row.phone}` : ""} className={input} placeholder="0803 000 0000" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">WhatsApp</span>
          <input name="whatsapp" type="tel" maxLength={25} defaultValue={row?.whatsapp ? `+${row.whatsapp}` : ""} className={input} placeholder="0803 000 0000" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Opening hours</span>
          <input name="openingHours" maxLength={200} defaultValue={row?.openingHours ?? ""} className={input} placeholder="e.g. Mon–Sat 8am–9pm, Sun 12–8pm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Packs and prices</span>
          <input name="packs" maxLength={300} defaultValue={row?.packs ?? ""} className={input} placeholder="e.g. 50g ₦1,500 · 100g ₦2,800" />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={row?.active ?? true} className="h-4 w-4 accent-orange-700" />
        Show this supermarket to customers
      </label>

      <button disabled={pending} className="rounded-lg bg-stone-900 px-4 py-2.5 font-semibold text-white disabled:opacity-60">
        {pending ? "Saving…" : row ? "Save changes" : "Add supermarket"}
      </button>
      {state?.ok && <p role="status" className="text-sm text-green-700">{state.ok}</p>}
      {state?.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
    </form>
  );
}
