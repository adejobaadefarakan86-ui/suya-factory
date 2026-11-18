"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { adminErrorMessage } from "@/lib/orders";

export type TeamState = { error?: string; ok?: string } | undefined;

const ROLE_WORDS = { customer: "a customer (no admin access)", staff: "staff", admin: "an admin" } as const;

/** Admins only (the database function checks this too). */
export async function setRole(_prev: TeamState, formData: FormData): Promise<TeamState> {
  const me = await requireStaff("/admin/team");
  if (me.role !== "admin") return { error: "Only admins can manage the team." };

  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "");
  if (!email.includes("@")) return { error: "Please enter their email address." };
  if (!(role in ROLE_WORDS)) return { error: "Please choose a role." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_user_role", { p_email: email, p_role: role });
  if (error) return { error: adminErrorMessage(error)! };

  revalidatePath("/admin/team");
  const who = (data as string | null) || email;
  return { ok: `${who} is now ${ROLE_WORDS[role as keyof typeof ROLE_WORDS]}.` };
}
