import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals'

jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn()
  }
}))

import { getCustomerSuccessSnapshot } from '@/lib/customer-success'
import { supabaseAdmin } from '@/lib/supabase'

const buildReturn = <T>(value: T) => jest.fn().mockResolvedValue({ data: value, error: null })

describe('getCustomerSuccessSnapshot', () => {
  let mockFrom: jest.Mock

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-01-31T12:00:00Z'))
    jest.clearAllMocks()
    const supabaseMock = supabaseAdmin as unknown as { from: jest.Mock }
    supabaseMock.from = jest.fn()
    mockFrom = supabaseMock.from
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('aggregates activation milestones and calculates health score', async () => {
    mockFrom
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: buildReturn({
              id: 'biz-1',
              business_name: 'Acme HVAC',
              owner_id: 'owner-1',
              onboarding_completed: true,
              onboarding_step: 6,
              calendar_connected: true,
              subscription_status: 'active',
              created_at: '2025-01-15T12:00:00Z',
              updated_at: '2025-01-16T12:00:00Z'
            })
          })
        })
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: buildReturn({
              first_name: 'Jamie',
              last_name: 'Owner',
              email: 'jamie@example.com'
            })
          })
        })
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: buildReturn([{ id: 'number-1' }])
          })
        })
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ id: 'seq-1' }],
            error: null
          })
        })
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: buildReturn([{ created_at: '2025-01-30T18:00:00Z' }])
            })
          })
        })
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              count: 7,
              error: null
            })
          })
        })
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: buildReturn([{ created_at: '2025-01-30T10:00:00Z' }])
            })
          })
        })
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              count: 24,
              error: null
            })
          })
        })
      })

    const snapshot = await getCustomerSuccessSnapshot('biz-1')

    expect(snapshot.businessName).toBe('Acme HVAC')
    expect(snapshot.activation.onboardingCompleted).toBe(true)
    expect(snapshot.activation.calendarConnected).toBe(true)
    expect(snapshot.activation.numberProvisioned).toBe(true)
    expect(snapshot.activation.outreachRunning).toBe(true)
    expect(snapshot.alerts.length).toBe(0)
    expect(snapshot.healthScore).toBeGreaterThanOrEqual(70)
  })

  it('flags churn risks when activation stalls', async () => {
    mockFrom
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: buildReturn({
              id: 'biz-2',
              business_name: 'Dormant Plumbing',
              owner_id: 'owner-2',
              onboarding_completed: false,
              onboarding_step: 1,
              calendar_connected: false,
              subscription_status: 'inactive',
              created_at: '2024-12-01T00:00:00Z',
              updated_at: '2024-12-02T00:00:00Z'
            })
          })
        })
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: buildReturn({
              first_name: 'Alex',
              last_name: 'Owner',
              email: 'alex@example.com'
            })
          })
        })
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: buildReturn([])
          })
        })
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: buildReturn([])
            })
          })
        })
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              count: 0,
              error: null
            })
          })
        })
      })

    const snapshot = await getCustomerSuccessSnapshot('biz-2')

    expect(snapshot.activation.onboardingCompleted).toBe(false)
    expect(snapshot.alerts.length).toBeGreaterThan(0)
    expect(snapshot.healthScore).toBeLessThan(50)
    expect(snapshot.activation.numberProvisioned).toBe(false)
  })
})


