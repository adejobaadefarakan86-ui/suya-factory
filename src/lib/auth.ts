// "Data Access Layer" for logins: the ONE place that answers
// "who is this user and what are they allowed to do?".
// Every protected page calls requireUser() or requireStaff() itself.
// The database's RLS rules are the final guard; these checks decide what to SHOW.
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "customer" | "staff" | "admin";

export type CurrentUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: Role;
};

// cache() = if several components ask during the same page load,
// only talk to Supabase once.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();

  // getClaims() verifies the login token's signature. Never trust getSession() on the server.
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;

  const userId = data.claims.sub;
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", userId)
    .single();

  return {
    id: userId,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
    fullName: profile?.full_name ?? null,
    role: (profile?.role ?? "customer") as Role,
  };
});

export function isStaff(user: CurrentUser | null) {
  return user?.role === "staff" || user?.role === "admin";
}

/** Logged-in users only. Others go to the login page and come back afterwards. */
export async function requireUser(returnTo = "/account") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}

/** Staff and admins only. Customers are sent to their account page. */
export async function requireStaff(returnTo = "/admin") {
  const user = await requireUser(returnTo);
  if (!isStaff(user)) redirect("/account?error=not-staff");
  return user;
}
