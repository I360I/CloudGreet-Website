/**
 * ElevenLabs Conversational AI - typed REST client.
 *
 * Wraps the endpoints we use for receptionist agents:
 *   - agents (CRUD)
 *   - voices (read)
 *   - conversations (signed URL for browser SDK)
 *   - phone numbers (SIP trunk → agent binding)
 *   - outbound calls (SIP trunk)
 *
 * Auth: ELEVENLABS_API_KEY in `xi-api-key` header (NOT Authorization: Bearer).
 *
 * Helpers return a discriminated union { ok: true, data } | { ok: false, error }
 * so callers can switch on .ok instead of try/catch.
 *
 * Schemas are aligned to the official Python/TypeScript SDK shape as of
 * the ElevenAgents docs (May 2026). If you hit a 422 from a new field
 * the API doesn't recognize, check elevenlabs.io/docs/api-reference for
 * the latest schema and patch the type in this file.
 */

const BASE = 'https://api.elevenlabs.io/v1'

function key(): string {
  const k = process.env.ELEVENLABS_API_KEY
  if (!k) throw new Error('ELEVENLABS_API_KEY not configured')
  return k
}

export type Result<T> = { ok: true; data: T } | { ok: false; status: number; error: string }

async function request<T>(
  path: string,
  init: RequestInit & { body?: any } = {},
): Promise<Result<T>> {
  const headers = new Headers(init.headers)
  headers.set('xi-api-key', key())
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const body = init.body && typeof init.body === 'object' && !(init.body instanceof FormData)
    ? JSON.stringify(init.body)
    : (init.body as any)

  const r = await fetch(`${BASE}${path}`, { ...init, headers, body })
  const text = await r.text()
  let parsed: any = null
  try { parsed = text ? JSON.parse(text) : null } catch { /* leave null */ }

  if (!r.ok) {
    const errMessage = parsed?.detail?.message
      || parsed?.detail
      || parsed?.error
      || (typeof parsed === 'string' ? parsed : null)
      || text.slice(0, 500)
      || `ElevenLabs ${r.status}`
    return {
      ok: false,
      status: r.status,
      error: typeof errMessage === 'string' ? errMessage : JSON.stringify(errMessage),
    }
  }
  return { ok: true, data: (parsed ?? undefined) as T }
}

/* ----------------------------- agent types ----------------------------- */

/**
 * Server-tool ("webhook" tool) shape. The agent calls our URL during
 * the conversation; we return JSON; agent reads the result and continues.
 *
 * Per the api-reference, modern shape uses `api_schema` block. Older
 * SDK examples used flat `url`/`method`/`request_body_schema`. We pass
 * both shapes and let EL's deserializer pick - the typed surface here
 * matches what we actually send for book_appointment.
 */
export type ServerToolDef = {
  type: 'webhook'
  name: string
  description: string
  /** Wait for our endpoint to respond before continuing. Default 20s. */
  response_timeout_secs?: number
  /** Whether the agent should announce it's about to use a tool. */
  pre_tool_speech?: 'auto' | 'force' | 'off'
  api_schema: {
    url: string
    method?: 'GET' | 'POST'
    /** Auth header EL will send when calling our endpoint. */
    request_headers?: Record<string, string>
    /** JSON Schema describing the body the agent will produce. */
    request_body_schema?: {
      type: 'object'
      required?: string[]
      properties: Record<string, JsonSchemaProperty>
    }
    /** JSON Schema for query params. */
    query_params_schema?: {
      properties?: Record<string, JsonSchemaProperty>
      required?: string[]
    }
  }
}

export type JsonSchemaProperty = {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object'
  description?: string
  enum?: any[]
  items?: JsonSchemaProperty
  properties?: Record<string, JsonSchemaProperty>
  required?: string[]
}

export type AgentTtsConfig = {
  /** Voice from the EL voice library or workspace clone. */
  voice_id: string
  /** TTS model. eleven_flash_v2 is the realtime workhorse. */
  model_id?: 'eleven_flash_v2' | 'eleven_turbo_v2_5' | 'eleven_multilingual_v2' | string
  /** 0.0 - 1.0 (higher = more consistent across utterances) */
  stability?: number
  /** 0.0 - 1.0 (higher = sticks closer to source voice) */
  similarity_boost?: number
  /** 0.7 - 1.2 (talking speed; 1.0 = native) */
  speed?: number
  /** Late-2025+ voices use this instead of style/speaker_boost. */
  expressive_mode?: boolean
}

export type AgentPromptConfig = {
  /** The system prompt the agent runs with. */
  prompt: string
  /** LLM behind the agent. e.g. "gpt-4o-mini", "claude-3-5-sonnet", "gemini-2.0-flash". */
  llm?: string
  temperature?: number
  max_tokens?: number
  tools?: ServerToolDef[]
  /** Knowledge-base document IDs the agent can cite. */
  knowledge_base?: Array<{ id: string; type?: string; name?: string }>
}

export type AgentBlock = {
  /** First sentence the agent speaks when the call connects. */
  first_message?: string
  language?: string
  prompt: AgentPromptConfig
  /** Names of dynamic variables this agent expects to receive at conversation start. */
  dynamic_variables?: {
    dynamic_variable_placeholders?: Record<string, string | number | boolean>
  }
}

export type AgentConversationConfig = {
  agent: AgentBlock
  tts?: AgentTtsConfig
  asr?: {
    quality?: 'high' | 'low'
    keywords?: string[]
  }
  turn?: {
    turn_timeout?: number
    silence_end_call_timeout?: number
  }
  conversation?: {
    max_duration_seconds?: number
    /** Which client events to push over WebSocket. */
    client_events?: string[]
  }
}

export type CreateAgentInput = {
  name?: string
  tags?: string[]
  conversation_config: AgentConversationConfig
  platform_settings?: {
    /** Where the post-call webhook fires. Workspace-default fallback. */
    workspace_overrides?: any
    auth?: { enable_auth?: boolean; allowlist?: any[] }
  }
}

export type Agent = CreateAgentInput & {
  agent_id: string
  created_at_unix_secs?: number
}

/* ----------------------------- voice types ----------------------------- */

export type Voice = {
  voice_id: string
  name: string
  category?: string
  preview_url?: string
  labels?: Record<string, string>
}

/* ----------------------------- phone types ----------------------------- */

/**
 * SIP-trunk phone number registration.
 *
 * Telnyx side: outbound SIP profile points at ElevenLabs' regional SIP
 * endpoint (e.g. sip.elevenlabs.io). Inbound calls to a Telnyx number
 * forward to that endpoint with this phone_number in the SIP To: header.
 *
 * EL side: this registration tells EL "if a SIP INVITE arrives for
 * +1XXXX, route it to this agent." Outbound trunk lets EL dial out.
 */
export type SipTrunkInput = {
  provider: 'sip_trunk'
  phone_number: string  // E.164
  label: string
  /** Optional: bind the number to an agent at registration time. */
  agent_id?: string
  inbound_trunk_config?: {
    /** Telnyx-side IPs allowed to send us SIP INVITEs. */
    allowed_addresses?: string[]
    /** SIP digest credentials EL uses to authenticate inbound. */
    username?: string
    password?: string
    media_encryption?: 'srtp' | 'rtp'
  }
  outbound_trunk_config?: {
    /** Where EL sends outbound INVITEs (e.g. sip.telnyx.com). */
    address: string
    transport?: 'tls' | 'tcp' | 'udp'
    username?: string
    password?: string
  }
}

export type PhoneNumber = {
  phone_number_id: string
  phone_number: string
  label?: string
  agent_id?: string | null
  provider?: 'twilio' | 'sip_trunk' | string
}

/* ----------------------------- agent CRUD ----------------------------- */

export async function createAgent(input: CreateAgentInput) {
  return request<Agent>('/convai/agents/create', { method: 'POST', body: input })
}

export async function getAgent(agentId: string) {
  return request<Agent>(`/convai/agents/${encodeURIComponent(agentId)}`)
}

export async function updateAgent(agentId: string, patch: Partial<CreateAgentInput>) {
  return request<Agent>(`/convai/agents/${encodeURIComponent(agentId)}`, {
    method: 'PATCH',
    body: patch,
  })
}

export async function deleteAgent(agentId: string) {
  return request<void>(`/convai/agents/${encodeURIComponent(agentId)}`, { method: 'DELETE' })
}

/* ----------------------------- voices ----------------------------- */

export async function listVoices() {
  return request<{ voices: Voice[] }>('/voices')
}

/* ----------------------------- conversations (browser SDK) ---------------- */

/**
 * Short-lived signed URL the browser SDK uses to open a WebSocket
 * conversation with an agent. Replaces our /api/retell/session-token.
 */
export async function getConversationSignedUrl(agentId: string) {
  return request<{ signed_url: string }>(
    `/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
  )
}

/* ----------------------------- phone numbers ----------------------------- */

export async function importSipPhoneNumber(input: SipTrunkInput) {
  return request<{ phone_number_id: string }>(
    '/convai/phone-numbers',
    { method: 'POST', body: input },
  )
}

export async function getPhoneNumber(phoneNumberId: string) {
  return request<PhoneNumber>(
    `/convai/phone-numbers/${encodeURIComponent(phoneNumberId)}`,
  )
}

export async function updatePhoneNumber(
  phoneNumberId: string,
  patch: Partial<{ agent_id: string | null; label: string }>,
) {
  return request<PhoneNumber>(
    `/convai/phone-numbers/${encodeURIComponent(phoneNumberId)}`,
    { method: 'PATCH', body: patch },
  )
}

export async function deletePhoneNumber(phoneNumberId: string) {
  return request<void>(
    `/convai/phone-numbers/${encodeURIComponent(phoneNumberId)}`,
    { method: 'DELETE' },
  )
}

/* ----------------------------- outbound calls ----------------------------- */

/**
 * Place an outbound call via SIP trunk. EL dials out through the trunk
 * we configured on the phone-number resource.
 */
export async function startOutboundCall(input: {
  agent_id: string
  agent_phone_number_id: string
  to_number: string
  conversation_initiation_client_data?: {
    /** {{var_name}} placeholders interpolated into prompt + tool descriptions. */
    dynamic_variables?: Record<string, string | number | boolean>
    /** Per-call overrides to first_message, voice, etc. */
    conversation_config_override?: Partial<AgentConversationConfig>
  }
}) {
  return request<{
    success: boolean
    message?: string
    conversation_id: string
    sip_call_id?: string
  }>('/convai/sip-trunk/outbound-call', { method: 'POST', body: input })
}
