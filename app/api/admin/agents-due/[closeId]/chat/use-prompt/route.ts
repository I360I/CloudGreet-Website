import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { composeFinalPrompt } from '@/lib/agent-builder/universal-layer'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/agents-due/[closeId]/chat/use-prompt
 *   body: { prompt: string }
 *
 * The admin clicks "Use this prompt" in the chat panel. We accept the
 * (already-extracted) prompt body from the client, persist it on the
 * close row as the draft, and flip status to 'ready' so the existing
 * approve flow takes over.
 *
 * We don't try to parse the chat transcript server-side - the chat UI
 * has the agent's last full message in hand and can do the AGENT PROMPT
 * block extraction client-side. Keeps this endpoint simple + idempotent.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { closeId: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as { prompt?: string }
  const prompt = (body.prompt || '').trim()
  if (!prompt || prompt.length < 200) {
    return NextResponse.json(
      { error: 'prompt is required and must be a real generated agent prompt' },
      { status: 400 },
    )
  }

  // Append the universal CloudGreet behavior layer (anti-injection / off-task
  // refusal, numbers-as-words, email readback, SMS consent, etc.). The
  // generator writes the business-specific prompt; these operational rules are
  // owned in one place. Idempotent - won't double-append.
  const finalPrompt = composeFinalPrompt(prompt)

  const { error } = await supabaseAdmin
    .from('closes')
    .update({
      agent_draft_prompt: finalPrompt,
      agent_draft_status: 'ready',
      agent_draft_error: null,
      agent_draft_generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.closeId)

  if (error) {
    logger.error('chat use-prompt save failed', { closeId: params.closeId, error: error.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
