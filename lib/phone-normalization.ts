// lib/phone-normalization.ts
// Centralized phone number normalization utilities
// Ensures consistent phone number formats across the entire system

import { logger } from '@/lib/monitoring'
import { validateAndFormatPhone } from './phone-validation'

/**
 * Normalize phone number for database lookups
 * Converts any phone format to E.164 format for consistent database queries
 * 
 * @param phone - Phone number in any format (E.164, digits-only, formatted, etc.)
 * @returns Normalized E.164 format (+18005551234) or null if invalid
 * 
 * @example
 * normalizePhoneForLookup('8005551234') => '+18005551234'
 * normalizePhoneForLookup('+18005551234') => '+18005551234'
 * normalizePhoneForLookup('(800) 555-1234') => '+18005551234'
 */
export function normalizePhoneForLookup(phone: string | null | undefined): string | null {
  if (!phone) {
    return null
  }

  try {
    // Use existing validation function which returns E.164 format
    const normalized = validateAndFormatPhone(phone)
    
    if (!normalized) {
      logger.warn('Phone normalization failed for lookup', { 
        originalPhone: phone,
        reason: 'Invalid format'
      })
      return null
    }

    return normalized
  } catch (error) {
    logger.error('Error normalizing phone for lookup', {
      error: error instanceof Error ? error.message : 'Unknown error',
      originalPhone: phone
    })
    return null
  }
}

/**
 * Normalize phone number for database storage
 * Ensures all phone numbers are stored in consistent E.164 format
 * 
 * @param phone - Phone number in any format
 * @returns Normalized E.164 format (+18005551234) or null if invalid
 * 
 * @example
 * normalizePhoneForStorage('8005551234') => '+18005551234'
 * normalizePhoneForStorage('+18005551234') => '+18005551234'
 */
export function normalizePhoneForStorage(phone: string | null | undefined): string | null {
  // Same as lookup - both use E.164 format
  return normalizePhoneForLookup(phone)
}

/**
 * Normalize phone number for SIP URI formatting
 * Strips all non-digit characters for use in SIP URIs
 * 
 * @param phone - Phone number in any format
 * @returns Digits-only format (8005551234) for SIP URI
 * 
 * @example
 * normalizePhoneForSIP('+18005551234') => '8005551234'
 * normalizePhoneForSIP('(800) 555-1234') => '8005551234'
 */
export function normalizePhoneForSIP(phone: string | null | undefined): string {
  if (!phone) {
    return ''
  }

  try {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '')
    
    // Remove leading 1 if present (US country code)
    const cleaned = digits.startsWith('1') && digits.length === 11 
      ? digits.substring(1) 
      : digits

    if (cleaned.length < 10) {
      logger.warn('Phone number too short for SIP URI', {
        originalPhone: phone,
        cleanedDigits: cleaned
      })
      return digits // Return original digits if too short
    }

    return cleaned
  } catch (error) {
    logger.error('Error normalizing phone for SIP', {
      error: error instanceof Error ? error.message : 'Unknown error',
      originalPhone: phone
    })
    // Fallback: return digits only
    return phone.replace(/\D/g, '')
  }
}

/**
 * Normalize multiple phone numbers for batch operations
 * 
 * @param phones - Array of phone numbers in various formats
 * @returns Array of normalized E.164 phone numbers (nulls filtered out)
 */
export function normalizePhonesForLookup(phones: (string | null | undefined)[]): string[] {
  return phones
    .map(phone => normalizePhoneForLookup(phone))
    .filter((phone): phone is string => phone !== null)
}

/**
 * Check if two phone numbers are equivalent (same after normalization)
 * 
 * @param phone1 - First phone number
 * @param phone2 - Second phone number
 * @returns true if numbers are equivalent after normalization
 */
export function arePhonesEquivalent(phone1: string | null | undefined, phone2: string | null | undefined): boolean {
  const normalized1 = normalizePhoneForLookup(phone1)
  const normalized2 = normalizePhoneForLookup(phone2)
  
  if (!normalized1 || !normalized2) {
    return false
  }

  return normalized1 === normalized2
}

