/**
 * Timeout constants for various operations
 * Centralized timeout management for consistent behavior
 */

export const TIMEOUTS = {
  // API timeouts
  API_REQUEST: 30000, // 30 seconds
  API_RETRY: 5000, // 5 seconds
  API_TIMEOUT: 10000, // 10 seconds
  
  // Database timeouts
  DB_QUERY: 15000, // 15 seconds
  DB_CONNECTION: 10000, // 10 seconds
  DB_TRANSACTION: 30000, // 30 seconds
  
  // External service timeouts
  RETELL_API: 20000, // 20 seconds
  STRIPE_API: 15000, // 15 seconds
  TELNYX_API: 15000, // 15 seconds
  CALENDAR_API: 20000, // 20 seconds
  EMAIL_API: 10000, // 10 seconds
  
  // WebSocket timeouts
  WEBSOCKET_CONNECT: 5000, // 5 seconds
  WEBSOCKET_PING: 30000, // 30 seconds
  WEBSOCKET_PONG: 10000, // 10 seconds
  
  // UI timeouts
  DEBOUNCE: 300, // 300ms
  TOAST_DURATION: 5000, // 5 seconds
  LOADING_TIMEOUT: 10000, // 10 seconds
  
  // Cache timeouts
  CACHE_TTL: 300000, // 5 minutes
  CACHE_REFRESH: 60000, // 1 minute
  CACHE_STALE: 300000, // 5 minutes
} as const;

export const RETRY_DELAYS = {
  // Exponential backoff delays (in milliseconds)
  INITIAL: 1000, // 1 second
  MAX: 30000, // 30 seconds
  MULTIPLIER: 2, // Double each retry
  JITTER: 0.1, // 10% jitter
} as const;

export const RATE_LIMITS = {
  // Rate limiting timeouts
  WINDOW: 60000, // 1 minute
  BURST: 1000, // 1 second
  COOLDOWN: 5000, // 5 seconds
} as const;














