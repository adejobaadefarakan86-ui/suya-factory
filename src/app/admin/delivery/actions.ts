"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type DeliverySettingsState = { error?: string; ok?: string } | undefined;

const naira = (formData: FormData, key: string) => {
  const n = Number(String(formData.get(key) ?? "").replace(/[,\s₦]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null; // to kobo
};

/** Admins only (row-level security on delivery_settings checks this too). */
export async function saveDeliverySettings(_prev: DeliverySettingsState, formData: FormData): Promise<DeliverySettingsState> {
  const me = await requireStaff("/admin/delivery");
  if (me.role !== "admin") return { error: "Only admins can change delivery settings." };

  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  const base = naira(formData, "base");
  const perKm = naira(formData, "perKm");
  const label = String(formData.get("label") ?? "").trim().slice(0, 200);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 20);
  const autoPrice = formData.get("autoPrice") === "on";

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0) return { error: "Please set the pickup location on the map." };
  if (base === null || base > 100_000_000) return { error: "Please enter a valid base fee." };
  if (perKm === null || perKm > 10_000_000) return { error: "Please enter a valid price per km." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("delivery_settings")
    .update({
      pickup_lat: lat,
      pickup_lng: lng,
      pickup_label: label || null,
      pickup_phone: phone || null,
      base_minor: base,
      per_km_minor: perKm,
      auto_price: autoPrice,
    })
    .eq("country", "NG");
  if (error) return { error: `Couldn't save: ${error.message}` };

  revalidatePath("/admin/delivery");
  return { ok: "Saved. New orders use these settings straight away." };
}
