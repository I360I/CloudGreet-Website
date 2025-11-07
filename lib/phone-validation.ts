// lib/phone-validation.ts
// Phone number validation and formatting utilities

import { logger } from '@/lib/monitoring'

/**
 * Validates and formats phone numbers to E.164 format
 * @param phone - Phone number string
 * @returns Formatted phone number or null if invalid
 */
export function validateAndFormatPhone(phone: string): string | null {
  try {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '')
    
    // Check if it's a valid length
    /**

     * if - Add description here

     * 

     * @param {...any} args - Method parameters

     * @returns {Promise<any>} Method return value

     * @throws {Error} When operation fails

     * 

     * @example

     * ```typescript

     * await this.if(param1, param2)

     * ```

     */

    if (digits.length < 10 || digits.length > 15) {
      return null
    }
    
    // Handle US/Canada numbers (10 digits)
    /**

     * if - Add description here

     * 

     * @param {...any} args - Method parameters

     * @returns {Promise<any>} Method return value

     * @throws {Error} When operation fails

     * 

     * @example

     * ```typescript

     * await this.if(param1, param2)

     * ```

     */

    if (digits.length === 10) {
      return `+1${digits}`
    }
    
    // Handle numbers with country code
    /**

     * if - Add description here

     * 

     * @param {...any} args - Method parameters

     * @returns {Promise<any>} Method return value

     * @throws {Error} When operation fails

     * 

     * @example

     * ```typescript

     * await this.if(param1, param2)

     * ```

     */

    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`
    }
    
    // Handle international numbers
    /**

     * if - Add description here

     * 

     * @param {...any} args - Method parameters

     * @returns {Promise<any>} Method return value

     * @throws {Error} When operation fails

     * 

     * @example

     * ```typescript

     * await this.if(param1, param2)

     * ```

     */

    if (digits.length > 11) {
      return `+${digits}`
    }
    
    return null
  } catch (error) {
    logger.error('Phone validation error', { error: error instanceof Error ? error.message : 'Unknown error', phone })
    return null
  }
}

/**
 * Checks if phone number is valid US/Canada format
 * @param phone - Phone number string
 * @returns true if valid
 */
export function isValidUSPhone(phone: string): boolean {
  const formatted = validateAndFormatPhone(phone)
  /**

   * if - Add description here

   * 

   * @param {...any} args - Method parameters

   * @returns {Promise<any>} Method return value

   * @throws {Error} When operation fails

   * 

   * @example

   * ```typescript

   * await this.if(param1, param2)

   * ```

   */

  if (!formatted) return false
  
  // Check if it's US/Canada (+1)
  /**

   * if - Add description here

   * 

   * @param {...any} args - Method parameters

   * @returns {Promise<any>} Method return value

   * @throws {Error} When operation fails

   * 

   * @example

   * ```typescript

   * await this.if(param1, param2)

   * ```

   */

  if (!formatted.startsWith('+1')) return false
  
  // Check if it's exactly 12 characters (+1 + 10 digits)
  /**

   * if - Add description here

   * 

   * @param {...any} args - Method parameters

   * @returns {Promise<any>} Method return value

   * @throws {Error} When operation fails

   * 

   * @example

   * ```typescript

   * await this.if(param1, param2)

   * ```

   */

  if (formatted.length !== 12) return false
  
  // Check if area code is valid (not starting with 0 or 1)
  const areaCode = formatted.substring(2, 5)
  /**

   * if - Add description here

   * 

   * @param {...any} args - Method parameters

   * @returns {Promise<any>} Method return value

   * @throws {Error} When operation fails

   * 

   * @example

   * ```typescript

   * await this.if(param1, param2)

   * ```

   */

  if (areaCode.startsWith('0') || areaCode.startsWith('1')) return false
  
  return true
}

/**
 * Checks if phone number is toll-free
 * @param phone - Phone number string
 * @returns true if toll-free
 */
export function isTollFree(phone: string): boolean {
  const formatted = validateAndFormatPhone(phone)
  /**

   * if - Add description here

   * 

   * @param {...any} args - Method parameters

   * @returns {Promise<any>} Method return value

   * @throws {Error} When operation fails

   * 

   * @example

   * ```typescript

   * await this.if(param1, param2)

   * ```

   */

  if (!formatted) return false
  
  const tollFreePrefixes = ['800', '888', '877', '866', '855', '844', '833']
  const areaCode = formatted.substring(2, 5)
  
  return tollFreePrefixes.includes(areaCode)
}

/**
 * Formats phone number for display
 * @param phone - Phone number string
 * @returns Formatted display string (e.g., "(555) 123-4567")
 */
export function formatPhoneForDisplay(phone: string): string {
  const formatted = validateAndFormatPhone(phone)
  /**

   * if - Add description here

   * 

   * @param {...any} args - Method parameters

   * @returns {Promise<any>} Method return value

   * @throws {Error} When operation fails

   * 

   * @example

   * ```typescript

   * await this.if(param1, param2)

   * ```

   */

  if (!formatted) return phone
  
  // US/Canada format
  /**

   * if - Add description here

   * 

   * @param {...any} args - Method parameters

   * @returns {Promise<any>} Method return value

   * @throws {Error} When operation fails

   * 

   * @example

   * ```typescript

   * await this.if(param1, param2)

   * ```

   */

  if (formatted.startsWith('+1') && formatted.length === 12) {
    const areaCode = formatted.substring(2, 5)
    const prefix = formatted.substring(5, 8)
    const lineNumber = formatted.substring(8, 12)
    return `(${areaCode}) ${prefix}-${lineNumber}`
  }
  
  // International format
  return formatted
}

/**
 * Checks if phone number already exists in database
 * @param phone - Phone number string
 * @param supabaseAdmin - Supabase admin client
 * @returns true if exists
 */
export async function phoneNumberExists(phone: string, supabaseAdmin: any): Promise<boolean> {
  try {
    const formatted = validateAndFormatPhone(phone)
    /**

     * if - Add description here

     * 

     * @param {...any} args - Method parameters

     * @returns {Promise<any>} Method return value

     * @throws {Error} When operation fails

     * 

     * @example

     * ```typescript

     * await this.if(param1, param2)

     * ```

     */

    if (!formatted) return false
    
    const { data, error } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('phone_number', formatted)
      .limit(1)
    
    /**

    
     * if - Add description here

    
     * 

    
     * @param {...any} args - Method parameters

    
     * @returns {Promise<any>} Method return value

    
     * @throws {Error} When operation fails

    
     * 

    
     * @example

    
     * ```typescript

    
     * await this.if(param1, param2)

    
     * ```

    
     */

    
    if (error) {
      logger.error('Phone number check error', { error, phone: formatted })
      return false
    }
    
    return data && data.length > 0
  } catch (error) {
    logger.error('Phone number exists check failed', { error: error instanceof Error ? error.message : 'Unknown error', phone })
    return false
  }
}

/**
 * Validates phone number with detailed error message
 * @param phone - Phone number string
 * @returns Object with isValid and error message
 */
export function validatePhoneWithError(phone: string): { isValid: boolean; error?: string } {
  /**

   * if - Add description here

   * 

   * @param {...any} args - Method parameters

   * @returns {Promise<any>} Method return value

   * @throws {Error} When operation fails

   * 

   * @example

   * ```typescript

   * await this.if(param1, param2)

   * ```

   */

  if (!phone || phone.trim() === '') {
    return { isValid: false, error: 'Phone number is required' }
  }
  
  const digits = phone.replace(/\D/g, '')
  
  /**

  
   * if - Add description here

  
   * 

  
   * @param {...any} args - Method parameters

  
   * @returns {Promise<any>} Method return value

  
   * @throws {Error} When operation fails

  
   * 

  
   * @example

  
   * ```typescript

  
   * await this.if(param1, param2)

  
   * ```

  
   */

  
  if (digits.length < 10) {
    return { isValid: false, error: 'Phone number is too short' }
  }
  
  /**

  
   * if - Add description here

  
   * 

  
   * @param {...any} args - Method parameters

  
   * @returns {Promise<any>} Method return value

  
   * @throws {Error} When operation fails

  
   * 

  
   * @example

  
   * ```typescript

  
   * await this.if(param1, param2)

  
   * ```

  
   */

  
  if (digits.length > 15) {
    return { isValid: false, error: 'Phone number is too long' }
  }
  
  const formatted = validateAndFormatPhone(phone)
  /**

   * if - Add description here

   * 

   * @param {...any} args - Method parameters

   * @returns {Promise<any>} Method return value

   * @throws {Error} When operation fails

   * 

   * @example

   * ```typescript

   * await this.if(param1, param2)

   * ```

   */

  if (!formatted) {
    return { isValid: false, error: 'Invalid phone number format' }
  }
  
  // Check for obviously fake numbers (555, 000, etc.)
  const fakePatterns = [
    /^\+?1?555\d{7}$/,  // 555 numbers
    /^\+?1?000\d{7}$/,  // 000 numbers
    /^\+?1?111\d{7}$/,  // 111 numbers
    /^\+?1?222\d{7}$/,  // 222 numbers
    /^\+?1?333\d{7}$/,  // 333 numbers
    /^\+?1?444\d{7}$/   // 444 numbers
  ];
  
  const isFake = fakePatterns.some(pattern => pattern.test(phone));
  /**

   * if - Add description here

   * 

   * @param {...any} args - Method parameters

   * @returns {Promise<any>} Method return value

   * @throws {Error} When operation fails

   * 

   * @example

   * ```typescript

   * await this.if(param1, param2)

   * ```

   */

  if (isFake) {
    return { isValid: false, error: 'Please enter a valid phone number' }
  }
  
  /**

  
   * if - Add description here

  
   * 

  
   * @param {...any} args - Method parameters

  
   * @returns {Promise<any>} Method return value

  
   * @throws {Error} When operation fails

  
   * 

  
   * @example

  
   * ```typescript

  
   * await this.if(param1, param2)

  
   * ```

  
   */

  
  if (digits === '0000000000' || digits === '1111111111' || digits === '1234567890') {
    return { isValid: false, error: 'Please enter a valid phone number' }
  }
  
  return { isValid: true }
}

