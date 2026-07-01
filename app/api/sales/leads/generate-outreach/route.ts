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
        content: `Write a short Instagram DM to the owner of "${business_name}", a ${type}${location ? ` in ${location}` : ''}.

Goal: get them to check out cloudgreet.com/#demo without it feeling like a pitch.

Rules:
- 1-2 sentences max, very short
- Sound like a real person, not a marketer
- No em dashes, no hashtags, no emojis
- No buzzwords, no feature lists
- Mention their trade or location only if it sounds natural
- End with cloudgreet.com/#demo

Write only the message, nothing else.`,
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
        const fallback = `Hey, saw ${lead.business_name} and wanted to share something quick. cloudgreet.com/#demo`
        return { leadId: lead.id, draft: fallback }
      }
    }),
  )

  return NextResponse.json({ success: true, results })
}
