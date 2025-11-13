import { describe, expect, it, beforeEach, jest } from '@jest/globals'

jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn()
  }
}))

jest.mock('@/lib/monitoring', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    log: jest.fn()
  }
}))

import { logComplianceEvent, fetchComplianceEvents } from '@/lib/compliance/logging'
import { supabaseAdmin } from '@/lib/supabase'

describe('compliance logging', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const supabaseMock = supabaseAdmin as unknown as { from: jest.Mock }
    supabaseMock.from = jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ error: null }),
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'event-1',
                channel: 'sms',
                event_type: 'STOP',
                path: '/api/sms/webhook',
                metadata: { request: { from: '+15551234567', text: 'STOP' } },
                created_at: '2025-02-01T12:00:00Z'
              }
            ],
            error: null
          })
        })
      })
    }))
  })

  it('masks phone numbers before storing metadata', async () => {
    const supabaseMock = supabaseAdmin as unknown as { from: jest.Mock }
    const insertSpy = jest.fn().mockResolvedValue({ error: null })
    supabaseMock.from.mockReturnValueOnce({
      insert: insertSpy
    })

    await logComplianceEvent({
      channel: 'sms',
      eventType: 'STOP',
      path: '/api/sms/webhook',
      requestBody: { from: '+15551234567', to: '+18885556789', text: 'STOP' }
    })

    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          request: {
            from: '+1****67',
            to: '+1****89',
            text: 'STOP'
          }
        })
      })
    )
  })

  it('returns audit events in descending order', async () => {
    const result = await fetchComplianceEvents(10)
    expect(result.events).toHaveLength(1)
    expect(result.events[0]).toMatchObject({
      id: 'event-1',
      channel: 'sms',
      eventType: 'STOP',
      path: '/api/sms/webhook'
    })
    expect(result.events[0].metadata.request.from).toBe('+15551234567')
  })
})


