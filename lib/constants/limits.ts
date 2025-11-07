/**
 * Application limits and constraints
 * Centralized limit management for consistent behavior
 */

export const LIMITS = {
  // Pagination limits
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 1,
  
  // API limits
  MAX_REQUESTS_PER_MINUTE: 100,
  MAX_REQUESTS_PER_HOUR: 1000,
  MAX_REQUESTS_PER_DAY: 10000,
  
  // File upload limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES_PER_UPLOAD: 5,
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  
  // Text limits
  MAX_TEXT_LENGTH: 10000,
  MAX_DESCRIPTION_LENGTH: 5000,
  MAX_COMMENT_LENGTH: 1000,
  MAX_TITLE_LENGTH: 200,
  
  // Database limits
  MAX_RECORDS_PER_QUERY: 1000,
  MAX_BATCH_SIZE: 100,
  MAX_CONCURRENT_QUERIES: 10,
  
  // Memory limits
  MAX_MEMORY_USAGE: 512 * 1024 * 1024, // 512MB
  MAX_CACHE_SIZE: 100 * 1024 * 1024, // 100MB
  
  // Business limits
  MAX_APPOINTMENTS_PER_DAY: 50,
  MAX_LEADS_PER_CAMPAIGN: 1000,
  MAX_CAMPAIGNS_PER_BUSINESS: 10,
  MAX_USERS_PER_BUSINESS: 20,
  
  // AI limits
  MAX_AI_REQUESTS_PER_HOUR: 100,
  MAX_AI_TOKENS_PER_REQUEST: 4000,
  MAX_AI_CONVERSATION_LENGTH: 50,
  
  // SMS/Voice limits
  MAX_SMS_PER_DAY: 1000,
  MAX_CALLS_PER_DAY: 100,
  MAX_SMS_LENGTH: 160,
  MAX_VOICE_DURATION: 300, // 5 minutes
  
  // Security limits
  MAX_LOGIN_ATTEMPTS: 5,
  MAX_PASSWORD_LENGTH: 128,
  MIN_PASSWORD_LENGTH: 8,
  MAX_SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  
  // Rate limiting
  RATE_LIMIT_WINDOW: 60 * 1000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 100,
  RATE_LIMIT_BURST: 10,
} as const;

export const VALIDATION_LIMITS = {
  // Input validation limits
  MIN_STRING_LENGTH: 1,
  MAX_STRING_LENGTH: 1000,
  MIN_NUMBER: 0,
  MAX_NUMBER: 999999999,
  
  // Email validation
  MAX_EMAIL_LENGTH: 254,
  MIN_EMAIL_LENGTH: 5,
  
  // Phone validation
  MIN_PHONE_LENGTH: 10,
  MAX_PHONE_LENGTH: 15,
  
  // URL validation
  MAX_URL_LENGTH: 2048,
  MIN_URL_LENGTH: 10,
  
  // Date validation
  MIN_DATE: new Date('1900-01-01'),
  MAX_DATE: new Date('2100-12-31'),
} as const;










