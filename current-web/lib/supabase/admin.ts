import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Admin Supabase client using the service role key.
 * Bypasses Row Level Security — use ONLY in server-side API routes
 * where authentication has already been verified.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY

  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_SECRET_KEY or NEXT_PUBLIC_SUPABASE_URL. ' +
      'Check your .env.local file.'
    )
  }

  return createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
