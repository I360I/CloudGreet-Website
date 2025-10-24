/**
 * CloudGreet Application Constants
 * Centralized configuration for consistent values across the application
 */

// API Configuration
export const API_CONFIG = {
  TIMEOUT_MS: 30000,
  MAX_RETRIES: 3,
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS_PER_WINDOW: 100,
} as const

// Business Configuration
export const BUSINESS_CONFIG = {
  DEFAULT_BUSINESS_HOURS: {
    START: '08:00',
    END: '17:00',
    TIMEZONE: 'America/New_York'
  },
  DEFAULT_SERVICES: ['General Services'],
  DEFAULT_SERVICE_AREAS: ['Local Area'],
  DEFAULT_CITY: 'Unknown',
  DEFAULT_STATE: 'Unknown',
  DEFAULT_ZIP: '00000'
} as const

// AI Configuration
export const AI_CONFIG = {
  DEFAULT_TEMPERATURE: 0.7,
  MAX_TOKENS: 4000,
  RESPONSE_TIMEOUT_MS: 10000,
  CONVERSATION_TIMEOUT_MS: 30000
} as const

// Database Configuration
export const DB_CONFIG = {
  CONNECTION_TIMEOUT_MS: 10000,
  QUERY_TIMEOUT_MS: 5000,
  MAX_CONNECTIONS: 10
} as const

// Security Configuration
export const SECURITY_CONFIG = {
  JWT_EXPIRY_HOURS: 168, // 7 days
  PASSWORD_MIN_LENGTH: 6,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000 // 15 minutes
} as const

// UI Configuration
export const UI_CONFIG = {
  ANIMATION_DURATION_MS: 300,
  DEBOUNCE_DELAY_MS: 500,
  TOAST_DURATION_MS: 5000,
  LOADING_TIMEOUT_MS: 10000
} as const

// Phone Configuration
export const PHONE_CONFIG = {
  DEFAULT_COUNTRY_CODE: '+1',
  PHONE_FORMAT_REGEX: /^\+?[1-9]\d{1,14}$/,
  MAX_PHONE_LENGTH: 15
} as const

// Email Configuration
export const EMAIL_CONFIG = {
  MAX_EMAIL_LENGTH: 254,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  MAX_MESSAGE_LENGTH: 1000
} as const

// Placeholder Text
export const PLACEHOLDERS = {
  BUSINESS_NAME: 'Your Business Name',
  EMAIL: 'your@email.com',
  PHONE: '(555) 123-4567',
  ADDRESS: '123 Main St, City, State',
  PASSWORD: 'Create a password',
  MESSAGE: 'Your message...'
} as const

// Error Messages
export const ERROR_MESSAGES = {
  GENERIC: 'An unexpected error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  VALIDATION: 'Please check your input and try again.',
  AUTH: 'Authentication failed. Please log in again.',
  PERMISSION: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  RATE_LIMIT: 'Too many requests. Please wait before trying again.'
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
  REGISTRATION: 'Account created successfully!',
  LOGIN: 'Welcome back!',
  UPDATE: 'Changes saved successfully!',
  DELETE: 'Item deleted successfully!',
  SAVE: 'Data saved successfully!'
} as const
