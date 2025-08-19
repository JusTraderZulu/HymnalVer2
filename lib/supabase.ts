import { createClient } from "@supabase/supabase-js"

// Support demo-suffixed envs in addition to standard names
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.SUPABASE_URL_DEMO

// Prefer server-side secret/service role; accept several common var names and demo-suffixed variants
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY_DEMO ||
  process.env.SUPABASE_SECRET_DEMO ||
  process.env.SUPABASE_SERVICE_KEY_DEMO ||
  process.env.SUPABASE_KEY_DEMO ||
  ""

export const hasSupabaseEnv = Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY)

export const supabaseAdmin = hasSupabaseEnv
  ? createClient(SUPABASE_URL as string, SUPABASE_SERVICE_KEY as string, {
      auth: { persistSession: false },
    })
  : null


