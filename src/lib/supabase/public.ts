// A Supabase client that ignores logins: it sees exactly what an anonymous
// visitor sees. Used for the public catalogue so the result can be cached
// once and shared by everyone (cached code isn't allowed to read cookies).
import { createClient } from "@supabase/supabase-js";

export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}
