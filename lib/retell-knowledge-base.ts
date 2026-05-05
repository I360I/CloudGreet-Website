/**
 * Read-only helpers for inspecting the Retell knowledge base attached
 * to a business's agent. The contractor (Anthony) curates KB content
 * directly in Retell - we just fetch + display so the admin panel can
 * show what the AI has been given for each client.
 */

const RETELL_BASE = 'https://api.retellai.com'

function apiKey(): string {
 return process.env.RETELL_API_KEY || process.env.NEXT_PUBLIC_RETELL_API_KEY || ''
}

export type KnowledgeBaseSource = {
 type: 'text' | 'document' | 'url' | 'unknown'
 title: string | null
 // Truncated preview for the UI; full text isn't useful at scale.
 preview: string | null
 url: string | null
}

export type KnowledgeBaseSummary = {
 kbId: string
 name: string | null
 status: string | null
 sources: KnowledgeBaseSource[]
}

/**
 * Resolves the knowledge base ids attached to a Retell agent's LLM,
 * fetches each one, and returns a normalized summary the admin UI
 * can render. Returns an empty array when the agent has no KB or
 * when the agent isn't a Retell-managed LLM.
 */
export async function fetchAgentKnowledgeBases(retellAgentId: string): Promise<{
 ok: true
 bases: KnowledgeBaseSummary[]
} | { ok: false; reason: string }> {
 const key = apiKey()
 if (!key) return { ok: false, reason: 'RETELL_API_KEY not set' }

 try {
  const agentRes = await fetch(`${RETELL_BASE}/get-agent/${encodeURIComponent(retellAgentId)}`, {
   headers: { Authorization: `Bearer ${key}` },
   cache: 'no-store',
  })
  if (!agentRes.ok) {
   const txt = await agentRes.text().catch(() => agentRes.statusText)
   return { ok: false, reason: `get-agent ${agentRes.status}: ${txt.slice(0, 200)}` }
  }
  const agent = await agentRes.json().catch(() => ({} as any))
  const llmId: string | null = agent?.response_engine?.llm_id ?? null
  if (!llmId) return { ok: true, bases: [] }

  const llmRes = await fetch(`${RETELL_BASE}/get-retell-llm/${encodeURIComponent(llmId)}`, {
   headers: { Authorization: `Bearer ${key}` },
   cache: 'no-store',
  })
  if (!llmRes.ok) {
   const txt = await llmRes.text().catch(() => llmRes.statusText)
   return { ok: false, reason: `get-retell-llm ${llmRes.status}: ${txt.slice(0, 200)}` }
  }
  const llm = await llmRes.json().catch(() => ({} as any))
  const ids: string[] = Array.isArray(llm?.knowledge_base_ids) ? llm.knowledge_base_ids : []
  if (ids.length === 0) return { ok: true, bases: [] }

  const bases = await Promise.all(ids.map((id) => fetchKnowledgeBase(id, key)))
  return { ok: true, bases: bases.filter((b): b is KnowledgeBaseSummary => !!b) }
 } catch (e) {
  return { ok: false, reason: e instanceof Error ? e.message : 'Unknown error' }
 }
}

async function fetchKnowledgeBase(kbId: string, key: string): Promise<KnowledgeBaseSummary | null> {
 try {
  const res = await fetch(`${RETELL_BASE}/get-knowledge-base/${encodeURIComponent(kbId)}`, {
   headers: { Authorization: `Bearer ${key}` },
   cache: 'no-store',
  })
  if (!res.ok) return null
  const kb = await res.json().catch(() => ({} as any))
  const rawSources: any[] = Array.isArray(kb?.knowledge_base_sources)
   ? kb.knowledge_base_sources
   : Array.isArray(kb?.sources)
    ? kb.sources
    : []
  const sources: KnowledgeBaseSource[] = rawSources.map((s) => normalizeSource(s))
  return {
   kbId,
   name: kb?.knowledge_base_name || kb?.name || null,
   status: kb?.status || null,
   sources,
  }
 } catch {
  return null
 }
}

function normalizeSource(s: any): KnowledgeBaseSource {
 const t = (s?.type || s?.source_type || '').toString().toLowerCase()
 let type: KnowledgeBaseSource['type'] = 'unknown'
 if (t.includes('text')) type = 'text'
 else if (t.includes('doc') || t.includes('file') || t.includes('pdf')) type = 'document'
 else if (t.includes('url') || t.includes('web')) type = 'url'

 const title: string | null =
  s?.title || s?.filename || s?.name || s?.url || (type === 'text' ? 'Text document' : null)

 let preview: string | null = null
 const text: string | null = s?.text || s?.content || null
 if (typeof text === 'string') {
  preview = text.length > 280 ? `${text.slice(0, 280).trim()}…` : text
 }

 const url: string | null = s?.url || s?.source_url || s?.file_url || null

 return { type, title, preview, url }
}
