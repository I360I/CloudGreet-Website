/**
 * Unit Tests for Authentication Module
 * Tests JWT token management, authentication middleware, and user validation
 */

import { beforeAll, describe, expect, it } from '@jest/globals'
import { JWTManager } from '@/lib/jwt-manager'
import { requireAuth, verifyJWT } from '../../lib/auth-middleware'
import { NextRequest } from 'next/server'

const createMockRequest = (authorization?: string) =>
  ({
    headers: (() => {
      const headers = new Headers()
      if (authorization) {
        headers.set('authorization', authorization)
      }
      return headers
    })()
  } as unknown as NextRequest)

describe('Authentication Middleware', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only'
  })

  it('returns auth success for a valid bearer token', async () => {
    const token = JWTManager.createUserToken('user_123', 'business_456', 'test@example.com')
    const request = createMockRequest(`Bearer ${token}`)

    const result = await requireAuth(request)

    expect(result.success).toBe(true)
    expect(result.userId).toBe('user_123')
    expect(result.businessId).toBe('business_456')
  })

  it('returns descriptive failure when the auth header is missing', async () => {
    const request = createMockRequest()

    const result = await requireAuth(request)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Missing auth header')
  })

  it('flags invalid tokens without throwing', async () => {
    const request = createMockRequest('Bearer malformed-token')

    const result = await requireAuth(request)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Invalid token')
  })

  it('verifyJWT produces a user object for valid tokens', async () => {
    const token = JWTManager.createUserToken('user_999', 'business_888', 'verify@example.com')
    const request = createMockRequest(`Bearer ${token}`)

    const result = await verifyJWT(request)

    expect(result).toEqual({ user: { id: 'user_999' } })
  })

  it('verifyJWT returns null user when verification fails', async () => {
    const request = createMockRequest('Bearer invalid')

    const result = await verifyJWT(request)

    expect(result).toEqual({ user: null })
  })
})










