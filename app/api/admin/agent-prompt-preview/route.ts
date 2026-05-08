import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import {
  SmartAIPrompts,
  spliceReturningCallerIntoPrompt,
  type RevenueOptimizedConfig,
} from '@/lib/smart-ai-prompts'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/agent-prompt-preview?businessType=HVAC
 *
 * Renders the universal prompt template against placeholder business
 * data so we can see the global default. Use this to iterate on the
 * base prompt with Claude or any other tool: copy the output, edit,
 * paste back into smart-ai-prompts.ts.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const businessType = url.searchParams.get('businessType') || 'HVAC'

  const sampleConfig: RevenueOptimizedConfig = {
    businessName: 'Sample Contractor LLC',
    businessType,
    ownerName: 'Mike',
    services: ['Repair', 'Install', 'Maintenance'],
    serviceAreas: ['Austin', 'Round Rock', 'Cedar Park'],
    address: '123 Main St, Austin, TX 78701',
    website: 'sample-contractor.com',
    phoneNumber: '+15125551234',
    businessHours: {
      monday:    { enabled: true, start: '08:00', end: '17:00' },
      tuesday:   { enabled: true, start: '08:00', end: '17:00' },
      wednesday: { enabled: true, start: '08:00', end: '17:00' },
      thursday:  { enabled: true, start: '08:00', end: '17:00' },
      friday:    { enabled: true, start: '08:00', end: '17:00' },
      saturday:  { enabled: false, start: '00:00', end: '00:00' },
      sunday:    { enabled: false, start: '00:00', end: '00:00' },
    },
    knowledgeBase: [],
    edgeCases: [],
  }

  const base = SmartAIPrompts.generateIndustrySpecificPrompt(businessType, sampleConfig)
  const withReturningCaller = spliceReturningCallerIntoPrompt(base)

  return NextResponse.json({
    success: true,
    businessType,
    prompt: withReturningCaller,
    char_count: withReturningCaller.length,
  })
}
