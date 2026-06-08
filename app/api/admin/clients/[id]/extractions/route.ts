import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Per-client definition of structured fields the agent extracts after
 * each call. Stored on businesses.extraction_fields and pushed to the
 * Retell agent's post_call_analysis_data so Retell's post-call pass
 * actually fills them in.
 *
 * Schema (per field):
 *   { name: string, type: 'string'|'number'|'boolean', description: string, examples?: string[] }
 */

type Field = {
 name: string
 type: 'string' | 'number' | 'boolean'
 description: string
 examples?: string[]
}

function normalizeFields(input: unknown): Field[] {
 if (!Array.isArray(input)) return []
 return input
  .map((f: any): Field | null => {
   const name = String(f?.name || '').trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
   if (!name) return null
   const type = (['string', 'number', 'boolean'].includes(f?.type) ? f.type : 'string') as Field['type']
   const description = String(f?.description || '').trim().slice(0, 500)
   const examples = Array.isArray(f?.examples)
    ? f.examples.map((x: any) => String(x).slice(0, 200)).slice(0, 5)
    : undefined
   return { name, type, description, examples }
  })
  .filter((x): x is Field => !!x)
}

export async function GET(
 request: NextRequest,
 { params }: { params: { id: string } },
) {
 const auth = await requireAdmin(request)
 if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 const { data, error } = await supabaseAdmin
  .from('businesses')
  .select('extraction_fields')
  .eq('id', params.id)
  .maybeSingle()
 if (error) return NextResponse.json({ error: error.message }, { status: 500 })

 return NextResponse.json({
  success: true,
  fields: normalizeFields((data as any)?.extraction_fields),
 })
}

export async function PUT(
 request: NextRequest,
 { params }: { params: { id: string } },
) {
 const auth = await requireAdmin(request)
 if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 const body = await request.json().catch(() => null) as { fields?: unknown } | null
 const fields = normalizeFields(body?.fields)

 // 1. Save canonical copy on the business row.
 const { error: dbErr } = await supabaseAdmin
  .from('businesses')
  .update({ extraction_fields: fields, updated_at: new Date().toISOString() })
  .eq('id', params.id)
 if (dbErr) {
  logger.error('Failed to save extraction_fields', { clientId: params.id, error: dbErr.message })
  return NextResponse.json({ error: dbErr.message }, { status: 500 })
 }

 // 2. Push to Retell agent.post_call_analysis_data so the post-call
 //    pass actually fills them in.
 const apiKey = process.env.RETELL_API_KEY || process.env.NEXT_PUBLIC_RETELL_API_KEY
 const { data: biz } = await supabaseAdmin
  .from('businesses')
  .select('retell_agent_id')
  .eq('id', params.id)
  .maybeSingle()
 const agentId = (biz as any)?.retell_agent_id
 let synced = false
 let syncError: string | null = null
 if (agentId && apiKey) {
  try {
   const retellShape = fields.map((f) => ({
    type: f.type,
    name: f.name,
    description: f.description || `Extract ${f.name} from the call`,
    examples: f.examples || [],
   }))
   const res = await fetch(`https://api.retellai.com/update-agent/${agentId}`, {
    method: 'PATCH',
    headers: {
     Authorization: `Bearer ${apiKey}`,
     'Content-Type': 'application/json',
    },
    body: JSON.stringify({ post_call_analysis_data: retellShape }),
   })
   if (!res.ok) {
    syncError = `${res.status} ${(await res.text().catch(() => res.statusText)).slice(0, 200)}`
   } else {
    synced = true
    // Re-bind phones so the new analysis schema goes live.
    try {
     const phones = await fetch('https://api.retellai.com/list-phone-numbers', {
      headers: { Authorization: `Bearer ${apiKey}` },
     })
     if (phones.ok) {
      const list = (await phones.json().catch(() => [])) as any[]
      for (const p of list) {
       const num = p.phone_number || p.phone_number_pretty
       if (!num) continue
       if (p.inbound_agent_id !== agentId && p.outbound_agent_id !== agentId && p.agent_id !== agentId) continue
       await fetch(`https://api.retellai.com/update-phone-number/${encodeURIComponent(num)}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        // inbound_webhook_url is what makes call_inbound fire (returning-caller
       // recognition). It lives on the phone number, not the agent - keep it
       // pinned whenever we rebind so legacy numbers self-heal.
       body: JSON.stringify({ inbound_agent_id: agentId, inbound_agent_version: null, inbound_webhook_url: `${(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://cloudgreet.com').replace(/\/$/, '')}/api/retell/voice-webhook` }),
       })
      }
     }
    } catch { /* non-fatal */ }
   }
  } catch (e) {
   syncError = e instanceof Error ? e.message : 'Unknown'
  }
 }

 return NextResponse.json({ success: true, fields, synced, syncError })
}
