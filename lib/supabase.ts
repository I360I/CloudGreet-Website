import { createClient, PostgrestError } from '@supabase/supabase-js'
import { logger } from '@/lib/monitoring'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Check if Supabase is properly configured
/**
 * isSupabaseConfigured - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await isSupabaseConfigured(param1, param2)
 * ```
 */
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
      logger.warn('Supabase not configured, using placeholder client')
    }
    return createClient(supabaseUrl, supabaseAnonKey)
  } catch (error) {
    logger.error('Failed to create Supabase client:', { error: error instanceof Error ? error.message : 'Unknown error' })
    throw new Error('Supabase client initialization failed')
  }
}

function getSupabaseAdmin() {
  try {
    if (!isSupabaseConfigured()) {
      logger.warn('Supabase not configured, using placeholder admin client')
    }
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  } catch (error) {
    logger.error('Failed to create Supabase admin client:', { error: error instanceof Error ? error.message : 'Unknown error' })
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
    logger.error(`Database operation failed: ${operationName}`, { error: error instanceof Error ? error.message : 'Unknown error' })
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown database error' 
    }
  }
}

// Wrapper for Supabase queries with error handling and input validation
export async function safeQuery<T>(
  query: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  operationName: string,
  inputValidation?: (input: unknown) => boolean
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
      logger.error(`Supabase query error in ${operationName}:`, { 
        error: result.error.message || 'Database query failed',
        code: result.error.code,
        details: result.error.details,
        hint: result.error.hint
      })
      return { data: null, error: result.error.message || 'Database query failed' }
    }
    return { data: result.data, error: null }
  } catch (error) {
    logger.error(`Database query failed: ${operationName}`, { error: error instanceof Error ? error.message : 'Unknown error' })
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown database error' 
    }
  }
}

// Input validation helpers for common database operations
/**
 * validateBusinessId - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await validateBusinessId(param1, param2)
 * ```
 */
export function validateBusinessId(businessId: unknown): boolean {
  return typeof businessId === 'string' && businessId.length > 0 && businessId.length < 100
}

/**
 * validateUserId - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await validateUserId(param1, param2)
 * ```
 */
export function validateUserId(userId: unknown): boolean {
  return typeof userId === 'string' && userId.length > 0 && userId.length < 100
}

/**
 * validateEmail - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await validateEmail(param1, param2)
 * ```
 */
export function validateEmail(email: unknown): boolean {
  return typeof email === 'string' && email.includes('@') && email.length < 254
}

/**
 * validatePhoneNumber - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await validatePhoneNumber(param1, param2)
 * ```
 */
export function validatePhoneNumber(phone: unknown): boolean {
  return typeof phone === 'string' && phone.length > 0 && phone.length < 20
}
