// ⚠️ MASTER-KEY CLIENT. It ignores all security rules (RLS).
// "server-only" makes the build FAIL if browser code ever imports this file.
// Its only job: record payment results after the provider has confirmed them
// (see src/lib/payments.ts). Don't use it for anything else.
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set (see .env.local).");

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
