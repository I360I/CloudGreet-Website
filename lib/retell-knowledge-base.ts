import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'

/**
 * Keeps a Retell knowledge base in sync per business. The agent has
 * one KB; we own the contents. Whenever client info changes (owner
 * name, business name, services, address, etc.) we regenerate the
 * single document in that KB so the AI always has the latest facts.
 *
 * Why one document instead of many: Retell's KB lookup is best-effort
 * and chunking is heuristic. With short, dense, single-document
 * content we get better recall.
 */

type BusinessRow = {
 id: string
 business_name?: string | null
 business_type?: string | null
 phone_number?: string | null
 phone?: string | null
 website?: string | null
 address?: string | null
 city?: string | null
 state?: string | null
 zip_code?: string | null
 services?: string[] | null
 service_areas?: string[] | null
 business_hours?: Record<string, { enabled: boolean; start: string; end: string }> | null
 retell_agent_id?: string | null
 retell_kb_id?: string | null
 owner_id?: string | null
}

type OwnerRow = {
 first_name?: string | null
 last_name?: string | null
 name?: string | null
 phone?: string | null
 email?: string | null
}

const RETELL_BASE = 'https://api.retellai.com'

function apiKey(): string {
 return process.env.RETELL_API_KEY || process.env.NEXT_PUBLIC_RETELL_API_KEY || ''
}

/**
 * Composes the canonical knowledge document. Plain text on purpose:
 * easier for Retell's RAG to chunk and quote, easier for us to read
 * in their dashboard.
 */
export function composeKnowledgeText(b: BusinessRow, owner: OwnerRow | null): string {
 const lines: string[] = []
 lines.push(`# ${b.business_name || 'Business'}`)
 if (b.business_type) lines.push(`Industry: ${b.business_type}`)
 if (owner) {
  const ownerName = owner.name || [owner.first_name, owner.last_name].filter(Boolean).join(' ').trim()
  if (ownerName) lines.push(`Owner: ${ownerName}`)
  if (owner.phone) lines.push(`Owner phone: ${owner.phone}`)
  if (owner.email) lines.push(`Owner email: ${owner.email}`)
 }
 const phone = b.phone_number || b.phone
 if (phone) lines.push(`Business phone: ${phone}`)
 if (b.website) lines.push(`Website: ${b.website}`)
 const addressParts = [b.address, b.city, b.state, b.zip_code].filter(Boolean)
 if (addressParts.length) lines.push(`Address: ${addressParts.join(', ')}`)
 if (b.services?.length) lines.push(`Services offered: ${b.services.join(', ')}`)
 if (b.service_areas?.length) lines.push(`Service areas: ${b.service_areas.join(', ')}`)
 if (b.business_hours && Object.keys(b.business_hours).length) {
  const days = Object.entries(b.business_hours)
   .filter(([, v]) => v?.enabled)
   .map(([day, v]) => `${day} ${v.start}-${v.end}`)
  if (days.length) lines.push(`Hours: ${days.join('; ')}`)
 }
 lines.push('')
 lines.push(
  'Use these facts when callers ask about who runs the business, what services are offered, hours, location, or how to reach the owner directly.',
 )
 return lines.join('\n')
}

/**
 * Syncs the business's KB to Retell. Creates a KB on first call,
 * updates it on subsequent calls. Returns the kb_id (saved on
 * businesses.retell_kb_id) and links it to the agent.
 */
export async function syncBusinessKnowledgeBase(businessId: string): Promise<{
 kbId: string | null
 synced: boolean
 reason?: string
}> {
 const key = apiKey()
 if (!key) return { kbId: null, synced: false, reason: 'RETELL_API_KEY not set' }

 const { data: biz } = await supabaseAdmin
  .from('businesses')
  .select('*')
  .eq('id', businessId)
  .maybeSingle<BusinessRow>()

 if (!biz) return { kbId: null, synced: false, reason: 'business not found' }

 let owner: OwnerRow | null = null
 if (biz.owner_id) {
  const { data: u } = await supabaseAdmin
   .from('custom_users')
   .select('first_name, last_name, name, phone, email')
   .eq('id', biz.owner_id)
   .maybeSingle<OwnerRow>()
  owner = u || null
 }

 const text = composeKnowledgeText(biz, owner)
 const title = `${biz.business_name || 'Business'} — facts`

 try {
  let kbId = biz.retell_kb_id || null

  // Create the KB on first call. Retell's create endpoint accepts a
  // text source inline so we can do it in one shot.
  if (!kbId) {
   const createRes = await fetch(`${RETELL_BASE}/create-knowledge-base`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
     knowledge_base_name: `CloudGreet · ${biz.business_name || biz.id}`,
     knowledge_base_texts: [{ text, title }],
    }),
   })
   if (!createRes.ok) {
    const txt = await createRes.text().catch(() => createRes.statusText)
    return { kbId: null, synced: false, reason: `create-knowledge-base ${createRes.status}: ${txt.slice(0, 200)}` }
   }
   const j = await createRes.json().catch(() => ({}))
   kbId = j?.knowledge_base_id || j?.kb_id || j?.id || null
   if (!kbId) {
    return { kbId: null, synced: false, reason: 'create-knowledge-base returned no id' }
   }
   await supabaseAdmin
    .from('businesses')
    .update({ retell_kb_id: kbId, updated_at: new Date().toISOString() })
    .eq('id', biz.id)
  } else {
   // Replace the single document. Retell's API treats KBs as a set of
   // sources; the cleanest update is to add a new text source. They
   // dedupe by content automatically.
   const addRes = await fetch(`${RETELL_BASE}/add-knowledge-base-sources/${kbId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
     knowledge_base_texts: [{ text, title }],
    }),
   })
   if (!addRes.ok) {
    const txt = await addRes.text().catch(() => addRes.statusText)
    logger.warn('add-knowledge-base-sources failed (non-fatal)', {
     businessId, status: addRes.status, body: txt.slice(0, 200),
    })
   }
  }

  // Link KB to the agent's LLM (so the LLM uses it during calls).
  if (biz.retell_agent_id && kbId) {
   try {
    const agentRes = await fetch(`${RETELL_BASE}/get-agent/${biz.retell_agent_id}`, {
     headers: { Authorization: `Bearer ${key}` },
    })
    if (agentRes.ok) {
     const agent = await agentRes.json().catch(() => ({} as any))
     const llmId = agent?.response_engine?.llm_id
     if (llmId) {
      await fetch(`${RETELL_BASE}/update-retell-llm/${llmId}`, {
       method: 'PATCH',
       headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
       body: JSON.stringify({ knowledge_base_ids: [kbId] }),
      })
     }
    }
   } catch (linkErr) {
    logger.warn('Linking KB to agent LLM failed (non-fatal)', {
     businessId, error: linkErr instanceof Error ? linkErr.message : 'Unknown',
    })
   }
  }

  return { kbId, synced: true }
 } catch (e) {
  return {
   kbId: null,
   synced: false,
   reason: e instanceof Error ? e.message : 'Unknown error',
  }
 }
}
