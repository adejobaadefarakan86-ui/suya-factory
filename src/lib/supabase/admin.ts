// ⚠️ MASTER-KEY CLIENT. It ignores all security rules (RLS).
// "server-only" makes the build FAIL if browser code ever imports this file.
// Its only jobs: record payment results after the provider has confirmed them
// (src/lib/payments.ts) and read orders for staff Telegram alerts
// (src/lib/staff-alerts.ts) and supermarket stock from staff Telegram commands
// and Ghana MoMo confirmation + Dawurobo bookings
// (src/lib/ghana-orders.ts). Don't use it for anything else.
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set (see .env.local).");

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
