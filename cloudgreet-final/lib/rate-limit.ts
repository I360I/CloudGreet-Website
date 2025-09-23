// Rate limiting utilities for CloudGreet
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export const rateLimit = {
  // Check if request is within rate limit
  check: (key: string, limit: number = 100, windowMs: number = 15 * 60 * 1000): boolean => {
    const now = Date.now()
    const record = rateLimitMap.get(key)
    
    if (!record || now > record.resetTime) {
      // Reset or create new record
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
      return true
    }
    
    if (record.count >= limit) {
      return false
    }
    
    record.count++
    return true
  },
  
  // Get remaining requests
  remaining: (key: string, limit: number = 100): number => {
    const record = rateLimitMap.get(key)
    if (!record) return limit
    
    return Math.max(0, limit - record.count)
  },
  
  // Get reset time
  resetTime: (key: string): number => {
    const record = rateLimitMap.get(key)
    return record?.resetTime || 0
  }
}
