"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type DeliverySettingsState = { error?: string; ok?: string } | undefined;

/** Admins only (row-level security on delivery_settings checks this too). */
export async function saveGhPickup(_prev: DeliverySettingsState, formData: FormData): Promise<DeliverySettingsState> {
  const me = await requireStaff("/admin/delivery");
  if (me.role !== "admin") return { error: "Only admins can change delivery settings." };

  const text = (k: string, max: number) => String(formData.get(k) ?? "").trim().slice(0, max);
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  const address = text("address", 200);
  const contact = text("contact", 100);
  const phone = text("phone", 20);
  const hours = text("hours", 100);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0) return { error: "Please set the pickup pin on the map." };
  if (!address) return { error: "Please enter the pickup address." };
  if (!contact) return { error: "Please enter who hands the orders over." };
  if (!/^[0-9+()\s-]{7,20}$/.test(phone)) return { error: "Please enter a valid phone number." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("delivery_settings")
    .update({
      pickup_lat: lat,
      pickup_lng: lng,
      pickup_label: address,
      pickup_contact: contact,
      pickup_phone: phone,
      pickup_hours: hours || null,
    })
    .eq("country", "GH");
  if (error) return { error: `Couldn't save: ${error.message}` };

  revalidatePath("/admin/delivery");
  return { ok: "Saved. Customers see the new details straight away." };
}
