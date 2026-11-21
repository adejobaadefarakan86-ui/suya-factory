// Ghana pickup point: where customers send their own rider. Server only.
// Admins change it at /admin/delivery (stored in delivery_settings, country GH).
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { GH_PICKUP } from "@/lib/dawurobo";

export type GhPickup = {
  contactPerson: string;
  contactPhone: string;
  address: string;
  lat: number;
  lng: number;
  /** e.g. "Mon–Sat, 9am – 6pm". Empty when not set. */
  hours: string;
};

export async function getGhPickup(): Promise<GhPickup> {
  const { data } = await createAdminClient()
    .from("delivery_settings")
    .select("pickup_lat, pickup_lng, pickup_label, pickup_phone, pickup_contact, pickup_hours")
    .eq("country", "GH")
    .maybeSingle();
  return {
    contactPerson: data?.pickup_contact || GH_PICKUP.contactPerson,
    contactPhone: data?.pickup_phone || GH_PICKUP.contactPhone,
    address: data?.pickup_label || GH_PICKUP.address,
    lat: data?.pickup_lat != null ? Number(data.pickup_lat) : GH_PICKUP.lat,
    lng: data?.pickup_lng != null ? Number(data.pickup_lng) : GH_PICKUP.lng,
    hours: data?.pickup_hours ?? "",
  };
}
