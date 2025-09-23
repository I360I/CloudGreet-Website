import { z } from 'zod'

// Registration validation
export const registerSchema = z.object({
  business_name: z.string().min(1, 'Business name is required'),
  business_type: z.string().min(1, 'Business type is required'),
  owner_name: z.string().min(1, 'Owner name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().optional(),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  address: z.string().min(1, 'Address is required'),
  website: z.string().optional(),
  services: z.array(z.string()).optional(),
  service_areas: z.array(z.string()).optional()
})

// Login validation
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

// Phone number validation
export const phoneSchema = z.string().min(10, 'Phone number must be at least 10 digits')

// Email validation
export const emailSchema = z.string().email('Invalid email address')

// Business data validation
export const businessSchema = z.object({
  business_name: z.string().min(1, 'Business name is required'),
  business_type: z.string().min(1, 'Business type is required'),
  owner_name: z.string().min(1, 'Owner name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  address: z.string().min(1, 'Address is required'),
  website: z.string().optional(),
  services: z.array(z.string()).optional(),
  service_areas: z.array(z.string()).optional()
})

export function validatePhoneNumber(phone: string): { isValid: boolean; formatted?: string; error?: string } {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')
  
  // Check if it's a valid length (10-15 digits)
  if (digits.length < 10 || digits.length > 15) {
    return { isValid: false, error: 'Phone number must be between 10-15 digits' }
  }
  
  // Format as +1 (XXX) XXX-XXXX for US numbers
  if (digits.length === 10) {
    const formatted = `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    return { isValid: true, formatted }
  }
  
  // Format as +X (XXX) XXX-XXXX for international numbers
  if (digits.length === 11 && digits.startsWith('1')) {
    const formatted = `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
    return { isValid: true, formatted }
  }
  
  // For other international numbers, just add + prefix
  const formatted = `+${digits}`
  return { isValid: true, formatted }
}

export function validateEmail(email: string): { isValid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' }
  }
  return { isValid: true }
}

export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters long' }
  }
  if (password.length > 128) {
    return { isValid: false, error: 'Password must be less than 128 characters' }
  }
  return { isValid: true }
}

export function validateBusinessName(name: string): { isValid: boolean; error?: string } {
  if (!name || name.trim().length < 2) {
    return { isValid: false, error: 'Business name must be at least 2 characters long' }
  }
  if (name.trim().length > 100) {
    return { isValid: false, error: 'Business name must be less than 100 characters' }
  }
  return { isValid: true }
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '')
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}
