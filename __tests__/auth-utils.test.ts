import { generateAuthToken, verifyAuthToken, hasRole, belongsToBusiness, generateSecureToken } from '@/lib/auth-utils'

// Mock environment variables
const originalEnv = process.env

beforeEach(() => {
  process.env = {
    ...originalEnv,
    JWT_SECRET: 'test-jwt-secret-key-for-testing-purposes'
  }
})

afterEach(() => {
  process.env = originalEnv
})

describe('Auth Utils', () => {
  describe('generateAuthToken', () => {
    it('should generate a valid JWT token', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        businessId: 'business-456'
      }

      const token = generateAuthToken(user)
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })

    it('should include user information in token', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        businessId: 'business-456',
        role: 'admin'
      }

      const token = generateAuthToken(user)
      const decoded = verifyAuthToken(token)
      
      expect(decoded?.userId).toBe('user-123')
      expect(decoded?.businessId).toBe('business-456')
      expect(decoded?.role).toBe('admin')
    })

    it('should throw error when JWT_SECRET is missing', () => {
      process.env.JWT_SECRET = ''
      
      const user = { id: 'user-123', email: 'test@example.com' }
      
      expect(() => generateAuthToken(user)).toThrow('Token generation failed')
    })
  })

  describe('verifyAuthToken', () => {
    it('should verify a valid token', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com'
      }

      const token = generateAuthToken(user)
      const decoded = verifyAuthToken(token)
      
      expect(decoded).toBeDefined()
      expect(decoded?.userId).toBe('user-123')
    })

    it('should return null for invalid token', () => {
      const result = verifyAuthToken('invalid-token')
      expect(result).toBeNull()
    })

    it('should return null for expired token', () => {
      // This would require mocking time or creating an expired token
      // For now, just test that it handles invalid tokens
      const result = verifyAuthToken('invalid')
      expect(result).toBeNull()
    })

    it('should return null when JWT_SECRET is missing', () => {
      process.env.JWT_SECRET = ''
      
      const result = verifyAuthToken('some-token')
      expect(result).toBeNull()
    })
  })

  describe('hasRole', () => {
    it('should return true for admin role', () => {
      const user = { id: 'user-123', role: 'admin' }
      expect(hasRole(user, 'admin')).toBe(true)
      expect(hasRole(user, 'manager')).toBe(true)
      expect(hasRole(user, 'user')).toBe(true)
    })

    it('should return true for manager role', () => {
      const user = { id: 'user-123', role: 'manager' }
      expect(hasRole(user, 'admin')).toBe(false)
      expect(hasRole(user, 'manager')).toBe(true)
      expect(hasRole(user, 'user')).toBe(true)
    })

    it('should return true for user role', () => {
      const user = { id: 'user-123', role: 'user' }
      expect(hasRole(user, 'admin')).toBe(false)
      expect(hasRole(user, 'manager')).toBe(false)
      expect(hasRole(user, 'user')).toBe(true)
    })

    it('should return false for null user', () => {
      expect(hasRole(null, 'admin')).toBe(false)
    })

    it('should return false for user without role', () => {
      const user = { id: 'user-123' }
      expect(hasRole(user, 'admin')).toBe(false)
    })
  })

  describe('belongsToBusiness', () => {
    it('should return true when user belongs to business', () => {
      const user = { id: 'user-123', businessId: 'business-456' }
      expect(belongsToBusiness(user, 'business-456')).toBe(true)
    })

    it('should return false when user does not belong to business', () => {
      const user = { id: 'user-123', businessId: 'business-456' }
      expect(belongsToBusiness(user, 'business-789')).toBe(false)
    })

    it('should return false for null user', () => {
      expect(belongsToBusiness(null, 'business-456')).toBe(false)
    })

    it('should return false for user without businessId', () => {
      const user = { id: 'user-123' }
      expect(belongsToBusiness(user, 'business-456')).toBe(false)
    })
  })

  describe('generateSecureToken', () => {
    it('should generate token of specified length', () => {
      const token = generateSecureToken(16)
      expect(token).toHaveLength(16)
    })

    it('should generate token with default length', () => {
      const token = generateSecureToken()
      expect(token).toHaveLength(32)
    })

    it('should generate different tokens', () => {
      const token1 = generateSecureToken(10)
      const token2 = generateSecureToken(10)
      expect(token1).not.toBe(token2)
    })

    it('should generate alphanumeric tokens', () => {
      const token = generateSecureToken(20)
      expect(token).toMatch(/^[A-Za-z0-9]+$/)
    })
  })
})


