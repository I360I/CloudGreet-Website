import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/clients/[id]/sms-prompt-preview
 *
 * Returns the body section of the SMS agent prompt that would run for this
 * business RIGHT NOW (i.e. the hardcoded default, since agent_sms_prompt is
 * null). Used by the SMS setup page so the admin can "load current default"
 * into the editor, tweak it, and save it as the custom prompt.
 *
 * Returns { body: string } -- the static body only (everything after the
 * dynamic header that's always prepended at runtime).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('business_name, timezone, dispatch_mode, agent_sms_prompt')
    .eq('id', params.id)
    .maybeSingle()
  if (!biz) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  // If a custom prompt is already stored, return that.
  if ((biz as any).agent_sms_prompt) {
    return NextResponse.json({ body: (biz as any).agent_sms_prompt, source: 'stored' })
  }

  // Otherwise generate the SmartRide default body.
  // We import buildSystemPrompt indirectly by calling the same function
  // used at runtime with dummy customer context, then strip the header.
  const { getDefaultSmsPromptBody } = await import('@/lib/sms-default-prompt')
  const body = getDefaultSmsPromptBody({
    businessName: (biz as any).business_name || 'Your Business',
    timezone: (biz as any).timezone || 'America/New_York',
    dispatchMode: !!(biz as any).dispatch_mode,
  })

  return NextResponse.json({ body, source: 'default' })
}
