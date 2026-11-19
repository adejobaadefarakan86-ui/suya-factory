"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toInternationalDigits } from "@/lib/contacts";

export type StoreFormState = { error?: string; ok?: string } | undefined;

const text = (formData: FormData, key: string, max: number) =>
  String(formData.get(key) ?? "").trim().slice(0, max);

function phoneDigits(raw: string) {
  if (!raw) return null;
  const digits = toInternationalDigits(raw, "NG");
  return /^[0-9]{8,15}$/.test(digits) ? digits : undefined; // undefined = invalid
}

/** Add or edit a supermarket. Admins only (RLS checks this too). */
export async function saveStore(_prev: StoreFormState, formData: FormData): Promise<StoreFormState> {
  const me = await requireStaff("/admin/stores");
  if (me.role !== "admin") return { error: "Only admins can add or edit supermarkets." };

  const id = text(formData, "id", 40);
  const name = text(formData, "name", 100);
  const branch = text(formData, "branch", 100);
  const address = text(formData, "address", 300);
  const openingHours = text(formData, "openingHours", 200);
  const packs = text(formData, "packs", 300);
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  const phone = phoneDigits(text(formData, "phone", 25));
  const whatsapp = phoneDigits(text(formData, "whatsapp", 25));
  const active = formData.get("active") === "on";

  if (!name) return { error: "Please enter the supermarket's name." };
  if (!address) return { error: "Please enter the address." };
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0) return { error: "Please set the location on the map." };
  if (phone === undefined) return { error: "The phone number doesn't look right." };
  if (whatsapp === undefined) return { error: "The WhatsApp number doesn't look right." };

  const row = {
    name,
    branch: branch || null,
    address,
    lat,
    lng,
    phone,
    whatsapp,
    opening_hours: openingHours || null,
    packs: packs || null,
    active,
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("stores").update(row).eq("id", id)
    : await supabase.from("stores").insert({ ...row, country: "NG" });
  if (error) return { error: `Couldn't save: ${error.message}` };

  revalidatePath("/admin/stores");
  return { ok: id ? "Saved." : "Supermarket added." };
}

/** Staff mark a store in / out of stock. */
export async function setStock(storeId: string, inStock: boolean) {
  await requireStaff("/admin/stores");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_store_stock", { p_store_id: storeId, p_in_stock: inStock });
  if (error) console.error("set_store_stock failed:", error);
  revalidatePath("/admin/stores");
}
