import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_LEADS = 50

const ai = new Anthropic()

async function draftDM(
  business_name: string,
  business_type: string | null,
  city: string | null,
  state: string | null,
): Promise<string> {
  const location = [city, state].filter(Boolean).join(', ')
  const type = business_type || 'business'

  const msg = await ai.messages.create({
    model: MODEL,
    max_tokens: 150,
    messages: [
      {
        role: 'user',
        content: `Write a 2-sentence Instagram DM to the owner of "${business_name}", a ${type}${location ? ` in ${location}` : ''}.

Goal: get them curious enough to try a live AI phone receptionist demo at cloudgreet.com/#demo — it answers calls and books jobs automatically.

Rules:
- Casual, direct — like a person reaching out, not a salesperson blasting a list
- No hashtags, no emojis
- Mention their specific trade or location naturally if it helps it feel personal
- Do NOT list features or use buzzwords like "cutting-edge" or "revolutionary"
- End with: cloudgreet.com/#demo
- 2 sentences max

Write only the DM text, nothing else.`,
      },
    ],
  })

  return ((msg.content[0] as { type: string; text: string }).text || '').trim()
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const leadIds: string[] = (body?.leadIds || []).slice(0, MAX_LEADS)
  if (leadIds.length === 0) {
    return NextResponse.json({ success: true, results: [] })
  }

  const { data: leads, error } = await supabaseAdmin
    .from('leads')
    .select('id, business_name, business_type, city, state')
    .in('id', leadIds)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!leads || leads.length === 0) {
    return NextResponse.json({ success: true, results: [] })
  }

  const results = await Promise.all(
    leads.map(async (lead) => {
      try {
        const draft = await draftDM(lead.business_name, lead.business_type, lead.city, lead.state)
        return { leadId: lead.id, draft }
      } catch {
        const fallback = `Hey ${lead.business_name} — built something that answers your calls and books jobs automatically, even when you're tied up on a job. Took 30 seconds to see it: cloudgreet.com/#demo`
        return { leadId: lead.id, draft: fallback }
      }
    }),
  )

  return NextResponse.json({ success: true, results })
}
