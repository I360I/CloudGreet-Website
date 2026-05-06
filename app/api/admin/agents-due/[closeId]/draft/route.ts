import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET    /api/admin/agents-due/[closeId]/draft
 *   Returns the latest draft + context + validation for a close.
 *
 * PATCH  /api/admin/agents-due/[closeId]/draft
 *   body: { prompt: string }
 *   Saves an admin-edited version of the prompt without flipping to
 *   approved. Used by the editable textarea in /admin/agents-due so
 *   admin can hand-tune before clicking Approve.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { closeId: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('closes')
    .select(
      'id, agent_draft_status, agent_draft_context, agent_draft_prompt, agent_draft_approved_prompt, agent_draft_validation, agent_draft_error, agent_draft_cost_micro, agent_draft_generated_at, agent_draft_approved_at',
    )
    .eq('id', params.closeId)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    success: true,
    status: (data as any).agent_draft_status || 'none',
    context: (data as any).agent_draft_context || null,
    prompt: (data as any).agent_draft_prompt || null,
    approved_prompt: (data as any).agent_draft_approved_prompt || null,
    validation: (data as any).agent_draft_validation || null,
    error: (data as any).agent_draft_error || null,
    cost_micro: (data as any).agent_draft_cost_micro || 0,
    generated_at: (data as any).agent_draft_generated_at || null,
    approved_at: (data as any).agent_draft_approved_at || null,
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { closeId: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { prompt?: string }
  const prompt = typeof body.prompt === 'string' ? body.prompt : null
  if (prompt === null) return NextResponse.json({ error: 'prompt required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('closes')
    .update({
      agent_draft_prompt: prompt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.closeId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
