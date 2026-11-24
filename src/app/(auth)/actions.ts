"use server";
// Server Actions: these run ONLY on the server, even though forms in the
// browser call them. Passwords go straight to Supabase and are never stored by us.
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type AuthState =
  | { error?: string; message?: string; email?: string; fullName?: string; phone?: string }
  | undefined;

/** A one-minute note for the welcome message ("Welcome back, Daniel"), shown once by components/welcome.tsx. */
async function noteWelcome(kind: "back" | "new", fullName: unknown) {
  const first = typeof fullName === "string" ? fullName.trim().split(/s+/)[0].slice(0, 40) : "";
  (await cookies()).set("sf_welcome", JSON.stringify({ kind, name: first }), { path: "/", maxAge: 60, sameSite: "lax" });
}

// Only allow redirects to pages on OUR site (stops "?next=https://evil.com" tricks).
function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
    ? next
    : "/account";
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Please enter your email and password.", email };
  }

  const supabase = await createClient();
  const { data: signedIn, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Please confirm your email first. Check your inbox for our link.", email };
    }
    // Same message for "no such user" and "wrong password", so attackers can't
    // find out which emails have accounts.
    return { error: "Wrong email or password.", email };
  }

  await noteWelcome("back", signedIn.user?.user_metadata?.full_name);
  // No page asked for: the team goes to the control room, customers to their account.
  const asked = formData.get("next");
  if ((!asked || asked === "/account") && signedIn.user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", signedIn.user.id).single();
    if (profile?.role === "staff" || profile?.role === "admin") redirect("/admin");
  }
  redirect(safeNext(formData.get("next")));
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const keep = { email, fullName, phone }; // refill the form if there's an error

  if (!fullName) return { error: "Please enter your name.", ...keep };
  if (!email.includes("@")) return { error: "Please enter a valid email address.", ...keep };
  if (password.length < 8) return { error: "Password must be at least 8 characters.", ...keep };
  if (password !== confirm) return { error: "The two passwords don't match.", ...keep };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Saved into the new profile by the database trigger (role is always 'customer').
      data: { full_name: fullName, phone: phone || null },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/account`,
    },
  });

  if (error) {
    if (error.code === "weak_password") {
      return { error: "That password is too easy to guess. Try a longer one.", ...keep };
    }
    return { error: "We couldn't create your account. Please try again.", ...keep };
  }

  // If email confirmation is switched off, the user is logged in straight away.
  if (data.session) {
    await noteWelcome("new", fullName);
    redirect("/account");
  }

  return { message: `Almost done! We've sent a link to ${email}. Click it to activate your account.` };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
