/**
 * Thin client for the Anthropic Managed Agents API.
 *
 * We use this to power the chat-with-AI panel in /admin/agents-due:
 *   1. Ensure a CloudGreet Prompt Generator agent + environment exist.
 *   2. Create a session per close so the admin can iterate with the agent.
 *   3. Send/stream user messages and accumulate agent text + tool activity.
 *
 * The agent + environment IDs are persisted on the
 * `cloudgreet_system_config` table (key/value JSON) so we don't have
 * to redeploy when they're created.
 *
 * If you ever want to "publish" a new system-prompt version, call
 * provisionPromptGeneratorAgent({ force: true }) - it'll create a new
 * agent version pointer and mark all future sessions to use it. Old
 * sessions are unaffected.
 */

import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/monitoring'
import { V21_SYSTEM_PROMPT } from './v21-system-prompt'

const AGENT_NAME = 'CloudGreet Prompt Generator'
const ENV_NAME = 'cloudgreet-prompt-generator-env'
const CONFIG_KEY = 'agent_builder.managed_agent'
const MODEL = 'claude-opus-4-7'

type ConfigShape = {
  agent_id: string
  environment_id: string
  prompt_hash: string
  created_at: string
}

function client(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')
  return new Anthropic({ apiKey })
}

/**
 * Cheap hash of the system prompt so we can detect when it's been
 * edited and auto-re-provision a new agent version. No crypto needed -
 * collisions don't matter, we just want change detection.
 */
function promptHash(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i)
  return (h >>> 0).toString(16)
}

async function readConfig(): Promise<ConfigShape | null> {
  const { data } = await supabaseAdmin
    .from('cloudgreet_system_config')
    .select('value')
    .eq('key', CONFIG_KEY)
    .maybeSingle()
  if (!data?.value) return null
  return data.value as ConfigShape
}

async function writeConfig(v: ConfigShape): Promise<void> {
  await supabaseAdmin
    .from('cloudgreet_system_config')
    .upsert({ key: CONFIG_KEY, value: v, updated_at: new Date().toISOString() })
}

/**
 * Make sure the prompt-generator agent + its environment exist in
 * Anthropic. Returns the IDs we use everywhere else.
 *
 * - Pulls cached IDs from cloudgreet_system_config first.
 * - If the cached prompt hash differs from the current code (i.e.
 *   someone edited v21-system-prompt.ts), it creates a NEW agent so
 *   in-flight sessions keep working but new sessions use the new
 *   prompt. The new IDs replace the old ones in config.
 * - If force=true, always creates a new agent. Use sparingly.
 */
export async function provisionPromptGeneratorAgent(
  opts: { force?: boolean } = {},
): Promise<{ agent_id: string; environment_id: string }> {
  const a = client()
  const hash = promptHash(V21_SYSTEM_PROMPT)
  const cfg = await readConfig()

  if (cfg && !opts.force && cfg.prompt_hash === hash) {
    return { agent_id: cfg.agent_id, environment_id: cfg.environment_id }
  }

  // Environment - reuse if we have one, create otherwise. Environments
  // can outlive prompt edits.
  let environment_id = cfg?.environment_id
  if (!environment_id) {
    const env = await a.beta.environments.create({
      name: ENV_NAME,
      config: {
        type: 'cloud',
        networking: { type: 'unrestricted' },
      },
    } as any)
    environment_id = (env as any).id
  }

  // Agent - always create fresh on prompt change so old sessions stay
  // on the old version and new sessions get the new one.
  const agent = await a.beta.agents.create({
    name: AGENT_NAME,
    model: MODEL,
    system: V21_SYSTEM_PROMPT,
    // The default agent toolset includes web_fetch + web_search +
    // file ops + bash. That's what the system prompt expects.
    tools: [{ type: 'agent_toolset_20260401' }] as any,
  } as any)
  const agent_id = (agent as any).id

  await writeConfig({
    agent_id,
    environment_id: environment_id!,
    prompt_hash: hash,
    created_at: new Date().toISOString(),
  })

  logger.info('Provisioned prompt-generator managed agent', {
    agent_id,
    environment_id,
    hash,
  })

  return { agent_id, environment_id: environment_id! }
}

/**
 * Create a fresh session pinned to the latest agent + environment.
 * Returns the session id; caller stores it on the close row.
 */
export async function createSession(): Promise<string> {
  const { agent_id, environment_id } = await provisionPromptGeneratorAgent()
  const a = client()
  const session = await a.beta.sessions.create({
    agent: agent_id,
    environment_id,
  } as any)
  return (session as any).id
}

export type ChatChunk =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; name: string; input?: string }
  | { type: 'tool_result'; name?: string; ok: boolean; preview?: string }
  | { type: 'thinking'; text: string }
  | { type: 'error'; message: string }
  | { type: 'done' }

/**
 * Send a user message into an existing session and stream the agent's
 * response back. Yields normalized chunks (text/tool_use/tool_result/
 * thinking/done/error) so the route handler can re-serialize them as
 * SSE without leaking Anthropic-specific shapes to the browser.
 *
 * Ends when the session reports idle/terminated (i.e. the agent stopped
 * speaking).
 */
export async function* sendAndStream(
  sessionId: string,
  userText: string,
): AsyncGenerator<ChatChunk> {
  const a = client()

  // 1) Open the event stream BEFORE sending so we don't race past the
  // first events.
  const stream = await a.beta.sessions.events.stream(sessionId)

  // 2) Send the user message.
  await a.beta.sessions.events.send(sessionId, {
    events: [
      {
        type: 'user.message',
        content: [{ type: 'text', text: userText }],
      },
    ],
  } as any)

  // 3) Iterate events. End on session.status.idle / terminated.
  try {
    for await (const ev of stream as any) {
      const t = ev?.type as string | undefined
      if (!t) continue

      if (t === 'agent.message' || t === 'agent.thread.message.received' || t === 'agent.thread.message.sent') {
        const blocks: any[] = Array.isArray(ev.content) ? ev.content : []
        for (const b of blocks) {
          if (b?.type === 'text' && typeof b.text === 'string' && b.text.length > 0) {
            yield { type: 'text', text: b.text }
          }
        }
      } else if (t === 'agent.thinking') {
        const blocks: any[] = Array.isArray(ev.content) ? ev.content : []
        for (const b of blocks) {
          if (b?.type === 'text' && typeof b.text === 'string') {
            yield { type: 'thinking', text: b.text }
          }
        }
      } else if (t === 'agent.tool_use' || t === 'agent.custom_tool_use' || t === 'agent.mcp_tool_use') {
        const name = ev?.tool_name || ev?.name || 'tool'
        const input = ev?.input ? JSON.stringify(ev.input).slice(0, 200) : undefined
        yield { type: 'tool_use', name, input }
      } else if (t === 'agent.tool_result' || t === 'agent.mcp_tool_result') {
        const name = ev?.tool_name || ev?.name
        const ok = ev?.is_error !== true
        const preview =
          typeof ev?.content === 'string'
            ? ev.content.slice(0, 200)
            : Array.isArray(ev?.content)
              ? JSON.stringify(ev.content).slice(0, 200)
              : undefined
        yield { type: 'tool_result', name, ok, preview }
      } else if (t === 'session.error' || t.endsWith('.error')) {
        const msg = ev?.message || ev?.error?.message || 'Agent error'
        yield { type: 'error', message: msg }
        return
      } else if (
        t === 'session.status.idle' ||
        t === 'session.status.terminated' ||
        t === 'session.end_turn' ||
        t === 'agent.thread.status.idle'
      ) {
        yield { type: 'done' }
        return
      }
    }
  } catch (e) {
    yield { type: 'error', message: e instanceof Error ? e.message : 'Stream failed' }
  }
}
