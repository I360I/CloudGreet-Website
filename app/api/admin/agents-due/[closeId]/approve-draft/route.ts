import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/agents-due/[closeId]/approve-draft
 *   body: { prompt?: string }   (defaults to the saved agent_draft_prompt)
 *
 * Locks in the prompt as the approved version. Doesn't touch
 * demo_agent_status - admin still does the manual paste-into-Retell
 * step and then enters the test number via the existing /submit
 * endpoint, which flips demo_agent_status to 'ready'.
 *
 * This split is intentional for Phase 1 - we let the human be the
 * bridge to Retell so we don't ship a half-tested Retell API integration.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { closeId: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { prompt?: string }
  let prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''

  if (!prompt) {
    // Fall back to whatever's currently in agent_draft_prompt.
    const { data } = await supabaseAdmin
      .from('closes')
      .select('agent_draft_prompt')
      .eq('id', params.closeId)
      .maybeSingle()
    prompt = (data as any)?.agent_draft_prompt || ''
  }
  if (!prompt) {
    return NextResponse.json({ error: 'No prompt to approve' }, { status: 400 })
  }

  const nowIso = new Date().toISOString()
  const { error } = await supabaseAdmin
    .from('closes')
    .update({
      agent_draft_status: 'approved',
      agent_draft_prompt: prompt,
      agent_draft_approved_prompt: prompt,
      agent_draft_approved_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', params.closeId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, approved_at: nowIso })
}
