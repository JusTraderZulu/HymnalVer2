import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.SUPABASE_URL
// Prefer service role; allow SUPABASE_KEY alias for convenience
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ""

export const hasSupabaseEnv = Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY)

export const supabaseAdmin = hasSupabaseEnv
  ? createClient(SUPABASE_URL as string, SUPABASE_SERVICE_KEY as string, {
      auth: { persistSession: false },
    })
  : null


