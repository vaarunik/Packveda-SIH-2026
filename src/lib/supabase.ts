// Supabase client — PackVeda (anon/publishable key, RLS-enforced).
//
// Credentials live in .env.local (server env → inlined by Next.js at build):
//   NEXT_PUBLIC_SUPABASE_URL=https://bvbkqfoxzoxlfzlbflza.supabase.co
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
//
// Security rules:
// - This anon/publishable key is PUBLIC by design: row-level security (RLS)
//   governs what it can read/write. Never replace it with the service-role
//   key here — service-role belongs in server-side API routes only.
// - Import { supabase } anywhere (client or server) — the same RLS-scoped
//   client is reused, so browser and server share one session cache.
//
// Schema prep for this project: supabase/schema.sql (run in the SQL editor).

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase is not configured — add NEXT_PUBLIC_SUPABASE_URL and " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local (see supabase/schema.sql)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = true;
