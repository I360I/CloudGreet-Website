import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals'

jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn()
  }
}))

import { getUsageAnalytics } from '@/lib/analytics/usage'
import { supabaseAdmin } from '@/lib/supabase'

describe('getUsageAnalytics', () => {
  let mockFrom: jest.Mock

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-02-01T14:00:00Z'))
    jest.clearAllMocks()
    const supabaseMock = supabaseAdmin as unknown as { from: jest.Mock }
    supabaseMock.from = jest.fn()
    mockFrom = supabaseMock.from
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('computes engagement summary and churn drivers', async () => {
    mockFrom
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
            gte: jest.fn().mockResolvedValue({
              data: [{ id: 'call-1' }, { id: 'call-2' }, { id: 'call-3' }, { id: 'call-4' }, { id: 'call-5' }],
              error: null
            })
          })
        })
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              data: [{ id: 'call-10' }, { id: 'call-11' }],
              error: null
            })
          })
        })
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockResolvedValue({
            data: [
              { id: 'event-1', sequence_id: 'seq-1', created_at: '2025-01-25T12:00:00Z' },
              { id: 'event-2', sequence_id: 'seq-1', created_at: '2025-01-28T15:00:00Z' }
            ],
            error: null
          })
        })
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'appt-1',
                  estimated_value: 2200,
                  created_at: '2025-01-27T09:00:00Z',
                  status: 'completed'
                }
              ],
              error: null
            })
          })
        })
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'call-1',
                      created_at: '2025-01-28T18:00:00Z',
                      call_duration: 180,
                      conversion_outcome: 'booked',
                      recording_url: 'https://example.com/call-1',
                      transcript: 'Customer requested AC tune-up.',
                      service_requested: 'AC tune-up'
                    }
                  ],
                  error: null
                })
              })
            })
          })
        })
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockResolvedValue({
            data: [
              { id: 'event-1', sequence_id: 'seq-1', created_at: '2025-01-25T12:00:00Z' },
              { id: 'event-2', sequence_id: 'seq-1', created_at: '2025-01-28T15:00:00Z' }
            ],
            error: null
          })
        })
      })

    const analytics = await getUsageAnalytics('biz-analytics-1')

    expect(analytics.summary.calls30).toBe(5)
    expect(analytics.summary.outreach30).toBe(2)
    expect(analytics.summary.pipelineRevenue).toBe(2200)
    expect(analytics.summary.conversionRate).toBeGreaterThanOrEqual(20)
    expect(analytics.churn.riskLevel).toBe('medium')
    expect(analytics.trends.length).toBe(6)
    expect(analytics.recentCalls[0].transcript).toContain('AC tune-up')
  })

  it('identifies high churn risk when engagement is low', async () => {
    mockFrom
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
            gte: jest.fn().mockResolvedValue({
              data: [{ id: 'call-1' }],
              error: null
            })
          })
        })
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              data: [{ id: 'call-1' }],
              error: null
            })
          })
        })
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          })
        })
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      })

    const analytics = await getUsageAnalytics('biz-risk')

    expect(analytics.summary.calls30).toBe(1)
    expect(analytics.summary.outreach30).toBe(0)
    expect(analytics.churn.riskLevel).toBe('high')
    expect(analytics.churn.drivers.some((driver) => driver.toLowerCase().includes('outreach'))).toBe(true)
  })
})


