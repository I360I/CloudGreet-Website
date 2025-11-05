// CloudGreet Platform Configuration
// Centralized configuration for all magic numbers and business logic

export const CONFIG = {
  // Business Metrics
  BUSINESS: {
    AVERAGE_TICKET: 500,
    MONTHLY_COST: 200,
    PER_BOOKING_FEE: 50,
    CLOSE_RATE: 0.35, // 35%
    CONVERSION_RATE: 0.15, // 15%
  },

  // Call Quality Metrics
  CALL_QUALITY: {
    AUDIO_QUALITY_THRESHOLD: 95,
    RESPONSE_TIME_THRESHOLD: 2000, // 2 seconds
    DROP_RATE_THRESHOLD: 0.05, // 5%
    SATISFACTION_THRESHOLD: 4.0, // out of 5
  },

  // Retell AI Configuration
  RETELL: {
    CONFIDENCE_THRESHOLD: 0.5,
    PREFIX_PADDING_MS: 300,
    SILENCE_DURATION_MS: 500,
    MAX_CALL_DURATION: 1800, // 30 minutes
  },

  // API Limits
  API: {
    DEFAULT_PAGE_SIZE: 50,
    MAX_PAGE_SIZE: 100,
    RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    AUTH_RATE_LIMIT: 5, // 5 attempts per window
    API_RATE_LIMIT: 100, // 100 requests per window
    STRICT_RATE_LIMIT: 10, // 10 requests per window
  },

  // UI Configuration
  UI: {
    ANIMATION_DURATION: 300,
    DEBOUNCE_DELAY: 500,
    TOAST_DURATION: 3000,
    SKELETON_ROWS: 5,
  },

  // Timeframes
  TIMEFRAMES: {
    DEFAULT_DAYS: 30,
    MAX_DAYS: 90,
    MIN_DAYS: 7,
  },

  // Lead Scoring
  LEAD_SCORING: {
    HOT_THRESHOLD: 80,
    WARM_THRESHOLD: 50,
    COLD_THRESHOLD: 20,
    MAX_SCORE: 100,
  },

  // Cache Configuration
  CACHE: {
    DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
    LONG_TTL: 30 * 60 * 1000, // 30 minutes
    SHORT_TTL: 60 * 1000, // 1 minute
  },
} as const

// Type-safe config access
export type ConfigKey = keyof typeof CONFIG
export type BusinessConfig = typeof CONFIG.BUSINESS
export type CallQualityConfig = typeof CONFIG.CALL_QUALITY
export type RetellConfig = typeof CONFIG.RETELL
export type APIConfig = typeof CONFIG.API
export type UIConfig = typeof CONFIG.UI
export type TimeframesConfig = typeof CONFIG.TIMEFRAMES
export type LeadScoringConfig = typeof CONFIG.LEAD_SCORING
export type CacheConfig = typeof CONFIG.CACHE

