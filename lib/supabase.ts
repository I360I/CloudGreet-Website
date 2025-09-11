import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'

console.log('🔍 Supabase Config Check:')
console.log('URL:', supabaseUrl)
console.log('Anon Key exists:', !!supabaseAnonKey)
console.log('Service Key exists:', !!supabaseServiceKey)

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
export const isUsingPlaceholderConfig = false

export async function checkDatabaseSetup() {
  try {
    // Check if users table exists
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1)

    if (usersError) {
      return {
        isSetup: false,
        error: `Users table error: ${usersError.message}`
      }
    }

    // Check if calls table exists
    const { data: calls, error: callsError } = await supabase
      .from('calls')
      .select('id')
      .limit(1)

    if (callsError) {
      return {
        isSetup: false,
        error: `Calls table error: ${callsError.message}`
      }
    }

    return {
      isSetup: true,
      error: null
    }
  } catch (error) {
    return {
      isSetup: false,
      error: error instanceof Error ? error.message : 'Unknown database error'
    }
  }
}