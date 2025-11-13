import { describe, expect, it } from '@jest/globals'
import { sequenceInputSchema, templateInputSchema } from '@/lib/prospecting/outreach-schema'

describe('outreach schema validation', () => {
  it('validates a minimal email template', () => {
    const result = templateInputSchema.safeParse({
      name: 'Intro email',
      channel: 'email',
      subject: 'Hi there',
      body: 'Hello {{first_name}}, would love to connect.',
      complianceFooter: 'Reply STOP to opt out; HELP for help.'
    })

    expect(result.success).toBe(true)
  })

  it('rejects email template without subject', () => {
    const result = templateInputSchema.safeParse({
      name: 'No subject',
      channel: 'email',
      body: 'Hello',
      complianceFooter: 'Reply STOP to opt out; HELP for help.'
    })

    expect(result.success).toBe(false)
  })

  it('validates sequence with steps', () => {
    const result = sequenceInputSchema.safeParse({
      name: 'HVAC owners',
      throttlePerDay: 100,
      timezone: 'America/New_York',
      steps: [
        { stepOrder: 1, channel: 'email', waitMinutes: 0, templateId: '00000000-0000-0000-0000-000000000001' },
        { stepOrder: 2, channel: 'sms', waitMinutes: 1440, templateId: '00000000-0000-0000-0000-000000000002' }
      ]
    })

    expect(result.success).toBe(true)
  })

  it('rejects duplicate step orders', () => {
    const result = sequenceInputSchema.safeParse({
      name: 'Duplicate steps',
      throttlePerDay: 100,
      steps: [
        { stepOrder: 1, channel: 'email', waitMinutes: 0, templateId: '00000000-0000-0000-0000-000000000001' },
        { stepOrder: 1, channel: 'sms', waitMinutes: 60, templateId: '00000000-0000-0000-0000-000000000002' }
      ]
    })

    expect(result.success).toBe(false)
  })
})


