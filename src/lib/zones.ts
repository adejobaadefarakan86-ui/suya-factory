// Delivery zones and their fees. The same for every visitor, so cached
// and shared like the catalogue. (Admin edits will clear the "zones" tag.)
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { CountryCode } from "@/lib/countries";

export type Zone = {
  id: string;
  country: CountryCode;
  name: string;
  feeMinor: number;
  estimatedTime: string | null;
};

export async function getZones(): Promise<Zone[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("zones");

  // RLS already hides inactive zones from the public.
  const { data, error } = await createPublicClient()
    .from("delivery_zones")
    .select("id, country, name, fee_minor, estimated_time")
    .order("sort_order");

  if (error) throw new Error(`Could not load delivery zones: ${error.message}`);

  return (data ?? []).map((z) => ({
    id: z.id,
    country: z.country,
    name: z.name,
    feeMinor: z.fee_minor,
    estimatedTime: z.estimated_time,
  }));
}
