import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

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

// Lazy-loaded Supabase clients with error handling
function getSupabase() {
  try {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, using placeholder client')
    }
    return createClient(supabaseUrl, supabaseAnonKey)
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    throw new Error('Supabase client initialization failed')
  }
}

function getSupabaseAdmin() {
  try {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, using placeholder admin client')
    }
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  } catch (error) {
    console.error('Failed to create Supabase admin client:', error)
    throw new Error('Supabase admin client initialization failed')
  }
}

// Export clients
export const supabase = getSupabase()
export const supabaseAdmin = getSupabaseAdmin()

// Wrapper function for safe database operations
export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<{ data: T | null; error: string | null }> {
  try {
    const result = await operation()
    return { data: result, error: null }
  } catch (error) {
    console.error(`Database operation failed: ${operationName}`, error)
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown database error' 
    }
  }
}

// Wrapper for Supabase queries with error handling and input validation
export async function safeQuery<T>(
  query: () => Promise<{ data: T | null; error: any }>,
  operationName: string,
  inputValidation?: (input: any) => boolean
): Promise<{ data: T | null; error: string | null }> {
  try {
    // Input validation if provided
    if (inputValidation && !inputValidation(query)) {
      return { 
        data: null, 
        error: 'Invalid input parameters for database query' 
      }
    }

    const result = await query()
    if (result.error) {
      console.error(`Supabase query error in ${operationName}:`, result.error)
      return { data: null, error: result.error.message || 'Database query failed' }
    }
    return { data: result.data, error: null }
  } catch (error) {
    console.error(`Database query failed: ${operationName}`, error)
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown database error' 
    }
  }
}

// Input validation helpers for common database operations
export function validateBusinessId(businessId: any): boolean {
  return typeof businessId === 'string' && businessId.length > 0 && businessId.length < 100
}

export function validateUserId(userId: any): boolean {
  return typeof userId === 'string' && userId.length > 0 && userId.length < 100
}

export function validateEmail(email: any): boolean {
  return typeof email === 'string' && email.includes('@') && email.length < 254
}

export function validatePhoneNumber(phone: any): boolean {
  return typeof phone === 'string' && phone.length > 0 && phone.length < 20
}
