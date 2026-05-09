import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { createAgent, deleteAgent, getConversationSignedUrl } from '@/lib/elevenlabs/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/elevenlabs/test-agent
 *
 * Creates a throwaway test agent with a sample receptionist prompt and
 * returns its agent_id + a signed URL the browser SDK can use to talk
 * to it immediately. Admin tests voice quality and turn-taking without
 * any phone setup.
 *
 * The agent is intentionally NOT persisted to our DB - it's pure
 * sanity-check fodder. Caller should DELETE the agent when done via
 * the DELETE handler.
 *
 * Body (optional):
 *   { voice_id?: string, llm?: string, prompt?: string }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({} as any))
  const voiceId = body?.voice_id
    || process.env.ELEVENLABS_DEFAULT_VOICE_ID
    || 'cjVigY5qzO86Huf0OWal' // Eric - a sensible neutral default
  const llm = body?.llm || process.env.ELEVENLABS_LLM || 'gpt-4o-mini'

  const samplePrompt = body?.prompt || `You are a friendly receptionist for a fictional plumbing company called "Acme Plumbing." You answer the phone, gather what the caller needs (a service issue, scheduling, a quote), confirm a callback number, and tell them a tech will call back shortly.

Tone: warm, fast, never robotic. Use contractions. If the caller is panicked (water leak, no AC), match their urgency.

Hard rules:
- NEVER invent prices.
- NEVER claim 24/7 service unless the caller mentions an emergency.
- If you don't know the answer, say "let me have someone call you back to confirm."

This is a test agent for evaluating voice quality. Keep responses short.`

  const r = await createAgent({
    name: `cg-sanity-${Date.now()}`,
    tags: ['sanity-test'],
    conversation_config: {
      agent: {
        first_message: 'Hey, thanks for calling Acme Plumbing. What can I do for you today?',
        language: 'en',
        prompt: {
          prompt: samplePrompt,
          llm,
          temperature: 0.7,
        },
      },
      tts: {
        voice_id: voiceId,
        model_id: 'eleven_flash_v2',
        stability: 0.5,
        similarity_boost: 0.8,
        speed: 1.0,
      },
      conversation: {
        max_duration_seconds: 300, // 5 min cap for test calls
      },
    },
  })

  if (!r.ok) {
    return NextResponse.json({ success: false, error: r.error, status: r.status }, { status: 502 })
  }

  // Mint a signed URL right away so the browser SDK can connect.
  const sig = await getConversationSignedUrl(r.data.agent_id)
  if (!sig.ok) {
    // Agent was created but we can't get the URL - try to clean up.
    await deleteAgent(r.data.agent_id)
    return NextResponse.json({
      success: false,
      error: `agent created but signed-url failed: ${sig.error}`,
    }, { status: 502 })
  }

  return NextResponse.json({
    success: true,
    agent_id: r.data.agent_id,
    signed_url: sig.data.signed_url,
    voice_id: voiceId,
    llm,
  })
}

/**
 * DELETE /api/admin/elevenlabs/test-agent?agent_id=...
 *   Tear down a throwaway test agent.
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const agentId = new URL(request.url).searchParams.get('agent_id')
  if (!agentId) return NextResponse.json({ error: 'agent_id required' }, { status: 400 })

  const r = await deleteAgent(agentId)
  if (!r.ok) return NextResponse.json({ success: false, error: r.error }, { status: 502 })
  return NextResponse.json({ success: true })
}
