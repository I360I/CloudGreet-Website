import { describe, expect, it, beforeEach, jest } from '@jest/globals'
import jwt from 'jsonwebtoken'

jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn()
  }
}))

import { requireEmployee } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'

type MockRequest = {
  headers: {
    get: (key: string) => string | null
  }
}

const mockedSupabase = supabaseAdmin as unknown as { from: jest.Mock }

describe('requireEmployee', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.JWT_SECRET = 'test-secret'
    mockedSupabase.from = jest.fn()
  })

  it('authorizes sales rep', async () => {
    const token = jwt.sign(
      { userId: 'rep-1', businessId: 'biz-1', email: 'rep@example.com', role: 'sales' },
      process.env.JWT_SECRET!
    )

    mockedSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'rep-1', business_id: 'biz-1', is_active: true, role: 'sales' },
            error: null
          })
        })
      })
    })

    const request = {
      headers: {
        get: (key: string) => (key.toLowerCase() === 'authorization' ? `Bearer ${token}` : null)
      }
    } as unknown as MockRequest

    const result = await requireEmployee(request as any, { allowManager: true })

    expect(result.success).toBe(true)
    expect(result.userId).toBe('rep-1')
    expect(result.role).toBe('sales')
  })

  it('rejects unauthorized role', async () => {
    const token = jwt.sign(
      { userId: 'user-1', businessId: 'biz-1', email: 'user@example.com', role: 'user' },
      process.env.JWT_SECRET!
    )

    mockedSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'user-1', business_id: 'biz-1', is_active: true, role: 'user' },
            error: null
          })
        })
      })
    })

    const request = {
      headers: {
        get: (key: string) => (key.toLowerCase() === 'authorization' ? `Bearer ${token}` : null)
      }
    } as unknown as MockRequest

    const result = await requireEmployee(request as any)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Employee access required')
  })

  it('allows owner when manager scope enabled', async () => {
    const token = jwt.sign(
      { userId: 'owner-1', businessId: 'biz-1', email: 'owner@example.com', role: 'owner' },
      process.env.JWT_SECRET!
    )

    mockedSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'owner-1', business_id: 'biz-1', is_active: true, role: 'owner' },
            error: null
          })
        })
      })
    })

    const request = {
      headers: {
        get: (key: string) => (key.toLowerCase() === 'authorization' ? `Bearer ${token}` : null)
      }
    } as unknown as MockRequest

    const result = await requireEmployee(request as any, { allowManager: true })
    expect(result.success).toBe(true)
    expect(result.role).toBe('owner')
  })
})


