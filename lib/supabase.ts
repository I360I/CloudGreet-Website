import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'

// Check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder') &&
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('placeholder') &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder')
  )
}

// Lazy-loaded Supabase clients
function getSupabase() {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, using placeholder client')
  }
  return createClient(supabaseUrl, supabaseAnonKey)
}

function getSupabaseAdmin() {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, using placeholder admin client')
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Export clients
export const supabase = getSupabase()
export const supabaseAdmin = getSupabaseAdmin()
