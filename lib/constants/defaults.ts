/**
 * Default values for application configuration
 * Centralized default value management
 */

export const DEFAULTS = {
  // User defaults
  USER_ROLE: 'user',
  USER_STATUS: 'active',
  USER_TIMEZONE: 'UTC',
  
  // Business defaults
  BUSINESS_STATUS: 'active',
  BUSINESS_TIMEZONE: 'America/New_York',
  BUSINESS_CURRENCY: 'USD',
  BUSINESS_LANGUAGE: 'en',
  
  // Appointment defaults
  APPOINTMENT_STATUS: 'scheduled',
  APPOINTMENT_DURATION: 60, // minutes
  APPOINTMENT_BUFFER: 15, // minutes
  
  // Lead defaults
  LEAD_STATUS: 'new',
  LEAD_SOURCE: 'website',
  LEAD_PRIORITY: 'medium',
  LEAD_SCORE: 0,
  
  // Campaign defaults
  CAMPAIGN_STATUS: 'draft',
  CAMPAIGN_TYPE: 'email',
  CAMPAIGN_FREQUENCY: 'daily',
  
  // Notification defaults
  NOTIFICATION_TYPE: 'info',
  NOTIFICATION_PRIORITY: 'normal',
  NOTIFICATION_STATUS: 'unread',
  
  // AI defaults
  AI_MODEL: 'gpt-4',
  AI_TEMPERATURE: 0.7,
  AI_MAX_TOKENS: 1000,
  AI_CONFIDENCE_THRESHOLD: 0.8,
  
  // Calendar defaults
  CALENDAR_PROVIDER: 'google',
  CALENDAR_SYNC_INTERVAL: 15, // minutes
  CALENDAR_DEFAULT_VIEW: 'week',
  
  // SMS/Voice defaults
  SMS_PROVIDER: 'telnyx',
  VOICE_PROVIDER: 'retell',
  SMS_TEMPLATE: 'default',
  VOICE_AGENT: 'default',
  
  // Payment defaults
  PAYMENT_METHOD: 'card',
  PAYMENT_CURRENCY: 'USD',
  PAYMENT_INTERVAL: 'monthly',
  
  // Security defaults
  PASSWORD_POLICY: 'standard',
  SESSION_TIMEOUT: 30, // minutes
  MFA_REQUIRED: false,
  
  // Performance defaults
  CACHE_TTL: 300, // seconds
  CACHE_SIZE: 1000, // items
  CACHE_STRATEGY: 'lru',
  
  // Monitoring defaults
  LOG_LEVEL: 'info',
  METRICS_INTERVAL: 60, // seconds
  ALERT_THRESHOLD: 0.95, // 95%
  
  // Feature flags
  FEATURES: {
    AI_AGENT: true,
    SMS_AUTOMATION: true,
    VOICE_CALLS: true,
    CALENDAR_SYNC: true,
    LEAD_SCORING: true,
    APPOINTMENT_BOOKING: true,
    PAYMENT_PROCESSING: true,
    ANALYTICS: true,
    NOTIFICATIONS: true,
    MULTI_TENANT: true,
  },
} as const;

export const CONFIG_DEFAULTS = {
  // Database configuration
  DB_POOL_SIZE: 10,
  DB_POOL_MIN: 2,
  DB_POOL_MAX: 20,
  DB_POOL_IDLE: 10000,
  
  // Redis configuration
  REDIS_TTL: 3600, // 1 hour
  REDIS_MAX_RETRIES: 3,
  REDIS_RETRY_DELAY: 1000,
  
  // API configuration
  API_VERSION: 'v1',
  API_RATE_LIMIT: 100,
  API_TIMEOUT: 30000,
  
  // WebSocket configuration
  WS_HEARTBEAT_INTERVAL: 30000,
  WS_RECONNECT_DELAY: 5000,
  WS_MAX_RECONNECT_ATTEMPTS: 5,
  
  // File upload configuration
  UPLOAD_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  UPLOAD_ALLOWED_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
  UPLOAD_DESTINATION: 'uploads',
  
  // Email configuration
  EMAIL_FROM: 'noreply@cloudgreet.com',
  EMAIL_REPLY_TO: 'support@cloudgreet.com',
  EMAIL_TEMPLATE_DIR: 'templates/email',
  
  // SMS configuration
  SMS_FROM: 'CloudGreet',
  SMS_TEMPLATE_DIR: 'templates/sms',
  SMS_RATE_LIMIT: 1000,
  
  // Voice configuration
  VOICE_LANGUAGE: 'en-US',
  VOICE_GENDER: 'female',
  VOICE_SPEED: 1.0,
  VOICE_PITCH: 1.0,
} as const;















