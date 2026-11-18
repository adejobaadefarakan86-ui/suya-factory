"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type EnquiryActionState = { error?: string; ok?: string } | undefined;

const STATUSES = ["new", "contacted", "converted", "closed"];

/** Staff update an enquiry's status and/or notes. (The database's RLS only lets staff do this.) */
export async function updateEnquiry(_prev: EnquiryActionState, formData: FormData): Promise<EnquiryActionState> {
  await requireStaff("/admin/enquiries");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const notes = String(formData.get("staffNotes") ?? "").trim();
  if (!STATUSES.includes(status)) return { error: "Please choose a status." };
  if (notes.length > 2000) return { error: "Notes are too long." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bulk_enquiries")
    .update({ status, staff_notes: notes || null })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    if (error) console.error("update enquiry failed:", error);
    return { error: "Couldn't save. Please refresh and try again." };
  }
  revalidatePath("/admin/enquiries");
  return { ok: "Saved." };
}
