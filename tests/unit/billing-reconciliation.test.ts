import { describe, expect, it, beforeEach, jest } from '@jest/globals'

jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn()
  }
}))

import { getReconciliationSummary, retryInvoicePayment } from '@/lib/billing/reconciliation'
import { supabaseAdmin } from '@/lib/supabase'
import { setStripeClientForTests } from '@/lib/billing/stripe-client'

describe('billing reconciliation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const supabaseMock = supabaseAdmin as unknown as { from: jest.Mock }
    supabaseMock.from = jest.fn()
    setStripeClientForTests(null as unknown as any)
  })

  it('computes summary with ledger entries and alerts', async () => {
    const supabaseMock = supabaseAdmin as unknown as { from: jest.Mock }
    supabaseMock.from
      // ledger
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: 'entry-1',
                    amount_cents: 19900,
                    source: 'subscription',
                    description: 'Pro plan',
                    stripe_invoice_id: 'in_1',
                    recorded_at: '2025-02-01T00:00:00Z'
                  },
                  {
                    id: 'entry-2',
                    amount_cents: 4500,
                    source: 'booking_fee',
                    description: 'Booking'
                  },
                  {
                    id: 'entry-3',
                    amount_cents: -500,
                    source: 'credit_adjustment',
                    description: 'Goodwill'
                  }
                ],
                error: null
              })
            })
          })
        })
      })
      // alerts
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: 'alert-1',
                    invoice_id: 'in_1',
                    alert_type: 'invoice_failed',
                    message: 'Payment failed',
                    created_at: '2025-02-02T12:00:00Z'
                  }
                ],
                error: null
              })
            })
          })
        })
      })

    const summary = await getReconciliationSummary('tenant-1')

    expect(summary.mrrCents).toBe(19900)
    expect(summary.bookingFeesCents).toBe(4500)
    expect(summary.creditsCents).toBe(-500)
    expect(summary.totalBilledCents).toBe(19900 + 4500 - 500)
    expect(summary.openAlerts).toHaveLength(1)
    expect(summary.pastDueInvoices[0].invoiceId).toBe('in_1')
  })

  it('retries invoice payment through Stripe', async () => {
    const supabaseMock = supabaseAdmin as unknown as { from: jest.Mock }
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 'tenant-1', stripe_customer_id: 'cus_123' },
          error: null
        })
      })
    })

    supabaseMock.from
      .mockReturnValueOnce({
        select: mockSelect
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        })
      })

    const payMock = jest.fn().mockResolvedValue({ status: 'paid' })
    const mockStripe = {
      invoices: {
        retrieve: jest.fn().mockResolvedValue({ id: 'in_123', customer: 'cus_123' }),
        pay: payMock
      }
    }
    setStripeClientForTests(mockStripe as any)

    const result = await retryInvoicePayment('in_123', 'tenant-1')
    expect(result.paid).toBe(true)
    expect(payMock).toHaveBeenCalledWith('in_123', { expand: ['payment_intent'] })
  })
})


