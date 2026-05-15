import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { postToSlack } from '@/lib/notifications/slack'
import { notifyAdmin, notifyRep } from '@/lib/notifications/notify'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/agents-due/[closeId]/submit
 *   body: { test_phone: string, notes?: string }
 *
 * Admin marks the demo agent as ready and pastes in the Retell test
 * number. Once flipped to 'ready', the rep's dashboard surfaces the
 * test phone next to that close so they can call it during the demo.
 *
 * PATCH variants:
 *   { status: 'building' | 'ready' | 'skipped' }      - status-only update
 *   { test_phone, notes? }                            - sets status='ready'
 *   { scheduled_at: ISO }                             - admin-set demo time
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { closeId: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as {
    test_phone?: string; notes?: string; status?: string; scheduled_at?: string
    agent_id?: string
  }

  const update: Record<string, any> = { updated_at: new Date().toISOString() }
  let touchedReady = false
  const agentIdRaw = typeof body.agent_id === 'string' ? body.agent_id.trim() : ''
  // Always persist the agent_id on the close itself, even pre-conversion.
  // convertCloseToClient reads this back on conversion to auto-attach
  // the agent to the new business without admin re-paste.
  if (agentIdRaw) update.retell_agent_id = agentIdRaw

  if (body.test_phone !== undefined) {
    const tp = String(body.test_phone || '').trim()
    if (!tp) return NextResponse.json({ error: 'test_phone required' }, { status: 400 })
    update.demo_agent_test_phone = tp
    update.demo_agent_status = 'ready'
    update.demo_agent_built_at = new Date().toISOString()
    touchedReady = true
  }
  if (body.notes !== undefined) {
    update.demo_agent_notes = String(body.notes || '').trim() || null
  }
  if (body.status && !touchedReady) {
    if (!['pending', 'building', 'ready', 'skipped'].includes(body.status)) {
      return NextResponse.json({ error: 'invalid status' }, { status: 400 })
    }
    update.demo_agent_status = body.status
    if (body.status === 'ready') update.demo_agent_built_at = new Date().toISOString()
  }
  if (body.scheduled_at) {
    const d = new Date(body.scheduled_at)
    if (!isNaN(d.getTime())) update.demo_scheduled_at = d.toISOString()
  }

  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  try {
    const { error } = await supabaseAdmin
      .from('closes')
      .update(update)
      .eq('id', params.closeId)
    if (error) {
      return NextResponse.json({
        error: 'Could not save - run sql/customization-and-demo-agents.sql',
      }, { status: 500 })
    }

    // When we flip to ready, propagate the Retell test number into the
    // canonical sources the client dashboard reads from (phone_numbers
    // table + ai_agents.phone_number + businesses.phone_number). Without
    // this, the contractor's onboarding page sits on "your agent is being
    // built" forever even though we just gave their rep a working test
    // number to demo with. Failures here are best-effort - we log but
    // don't fail the whole request, since Slack still pings and the rep
    // still gets the test # on their close.
    if (touchedReady && update.demo_agent_test_phone) {
      void (async () => {
        const testPhone = update.demo_agent_test_phone as string
        try {
          const { data: closeRow } = await supabaseAdmin
            .from('closes')
            .select('business_id, prospect_phone')
            .eq('id', params.closeId)
            .maybeSingle()
          // Resolve a business to propagate to, even if close.business_id
          // is null (pre-build path): match a lead by phone, then
          // businesses by phone. Without this the workshop's "Mark
          // ready" silently no-ops when admin runs it before the
          // client has accepted the invite.
          let businessId = (closeRow as any)?.business_id as string | null
          if (!businessId && (closeRow as any)?.prospect_phone) {
            const { data: lead } = await supabaseAdmin
              .from('leads')
              .select('business_id')
              .eq('phone', (closeRow as any).prospect_phone)
              .not('business_id', 'is', null)
              .order('updated_at', { ascending: false })
              .limit(1)
              .maybeSingle()
            businessId = (lead as any)?.business_id || null
          }
          if (!businessId && (closeRow as any)?.prospect_phone) {
            const { data: biz } = await supabaseAdmin
              .from('businesses')
              .select('id')
              .eq('phone_number', (closeRow as any).prospect_phone)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
            businessId = (biz as any)?.id || null
          }
          if (!businessId) return  // pre-build, deferred path will pick this up at conversion
          // Mirror onto the close for future lookups + status accuracy.
          await supabaseAdmin
            .from('closes')
            .update({ business_id: businessId, updated_at: new Date().toISOString() })
            .eq('id', params.closeId)
            .then(undefined, () => null)

          // 0. Agent ID propagation. If the admin pasted a Retell agent ID
          //    on this submit, stamp it onto businesses + mirror to
          //    ai_agents and re-fire ensureLLMToolsForBusiness so the
          //    webhook + tools are wired without a second trip to
          //    /admin/clients/[id]. This is the "one paste, everywhere"
          //    bit that closes the call-logging gap reps were hitting.
          if (agentIdRaw) {
            try {
              await supabaseAdmin
                .from('businesses')
                .update({ retell_agent_id: agentIdRaw, updated_at: new Date().toISOString() })
                .eq('id', businessId)

              const { data: existingAA } = await supabaseAdmin
                .from('ai_agents')
                .select('id')
                .eq('business_id', businessId)
                .maybeSingle()
              if (existingAA) {
                await supabaseAdmin
                  .from('ai_agents')
                  .update({ retell_agent_id: agentIdRaw, status: 'connected', updated_at: new Date().toISOString() })
                  .eq('id', (existingAA as any).id)
              } else {
                await supabaseAdmin
                  .from('ai_agents')
                  .insert({
                    business_id: businessId,
                    retell_agent_id: agentIdRaw,
                    status: 'connected',
                    updated_at: new Date().toISOString(),
                  })
              }

              try {
                const { retellAgentManager } = await import('@/lib/retell-agent-manager')
                await retellAgentManager().ensureLLMToolsForBusiness(businessId)
              } catch (e) {
                logger.warn('ensureLLMToolsForBusiness after workshop link failed', {
                  businessId, error: e instanceof Error ? e.message : 'Unknown',
                })
              }
            } catch (e) {
              logger.warn('workshop agent_id stamp failed', {
                closeId: params.closeId, error: e instanceof Error ? e.message : 'Unknown',
              })
            }
          }

          // 1. phone_numbers (provider='retell') - the primary source the
          //    dashboard's TopBar + onboarding wizard read from.
          const { data: existingPN } = await supabaseAdmin
            .from('phone_numbers')
            .select('id')
            .eq('business_id', businessId)
            .eq('provider', 'retell')
            .maybeSingle()
          if (existingPN) {
            await supabaseAdmin
              .from('phone_numbers')
              .update({ phone_number: testPhone, updated_at: new Date().toISOString() })
              .eq('id', (existingPN as any).id)
          } else {
            await supabaseAdmin
              .from('phone_numbers')
              .insert({
                business_id: businessId,
                provider: 'retell',
                phone_number: testPhone,
              })
          }

          // 2. ai_agents.phone_number - fallback the dashboard checks if
          //    phone_numbers is empty. Some older clients only have this row.
          const { data: aiAgent } = await supabaseAdmin
            .from('ai_agents')
            .select('id')
            .eq('business_id', businessId)
            .maybeSingle()
          if (aiAgent) {
            await supabaseAdmin
              .from('ai_agents')
              .update({ phone_number: testPhone, updated_at: new Date().toISOString() })
              .eq('id', (aiAgent as any).id)
          }

          // 3. businesses.phone_number - the legacy column. Cheap to keep
          //    in sync so any code path still reading it gets the right value.
          await supabaseAdmin
            .from('businesses')
            .update({ phone_number: testPhone, updated_at: new Date().toISOString() })
            .eq('id', businessId)
        } catch (e) {
          logger.warn('test-phone propagation failed (best-effort)', {
            closeId: params.closeId,
            error: e instanceof Error ? e.message : 'Unknown',
          })
        }
      })()
    }

    // Slack ping when the demo agent flips to ready - the rep + client
    // dashboards now reflect it, so this is the "complete" signal. Set
    // SLACK_AGENT_COMPLETE_MENTIONS in env to a space-separated list of
    // Slack member IDs (e.g. "<@U01ABCDEF> <@U02GHIJKL>") to @-mention
    // specific people (Aaron, ops, etc.) on every completion.
    if (touchedReady) {
      void (async () => {
        const { data: c } = await supabaseAdmin
          .from('closes')
          .select('prospect_business_name, rep_id')
          .eq('id', params.closeId)
          .maybeSingle()
        let repName: string | null = null
        if ((c as any)?.rep_id) {
          const { data: u } = await supabaseAdmin
            .from('custom_users')
            .select('name, first_name, last_name, email')
            .eq('id', (c as any).rep_id)
            .maybeSingle()
          repName = (u as any)?.name
            || [(u as any)?.first_name, (u as any)?.last_name].filter(Boolean).join(' ').trim()
            || (u as any)?.email
            || null
        }
        const mentions = (process.env.SLACK_AGENT_COMPLETE_MENTIONS || '').trim()
        const prefix = mentions ? `${mentions} ` : ''
        await postToSlack({
          text: `${prefix}:white_check_mark: *Agent complete* - ${(c as any)?.prospect_business_name || 'client'}${repName ? ` · rep: ${repName}` : ''} · test #: ${update.demo_agent_test_phone}\nThe rep and client dashboards now reflect the agent. Demo can run.`,
        })

        // In-app admin notification (parallel to Slack, different
        // surface). Less noisy because we only fire on the actual
        // ready-flip, not on every test-phone update.
        await notifyAdmin({
          type: 'agent_built',
          title: `Agent ready: ${(c as any)?.prospect_business_name || 'client'}`,
          body: `Test #: ${update.demo_agent_test_phone}${repName ? ` · rep: ${repName}` : ''}`,
          link: `/admin/agents-due/${params.closeId}`,
          severity: 'success',
          metadata: {
            close_id: params.closeId,
            test_phone: update.demo_agent_test_phone,
            rep_id: (c as any)?.rep_id,
          },
        })

        // Notify the rep in-app: their demo agent is live and they can
        // call the test number. This is a "moment of truth" for them.
        if ((c as any)?.rep_id) {
          await notifyRep((c as any).rep_id, {
            type: 'demo_agent_ready',
            title: `Your demo agent is ready`,
            body: `${(c as any)?.prospect_business_name || 'Your client'} - call ${update.demo_agent_test_phone} to test it before the demo.`,
            link: '/sales/closes',
            severity: 'success',
            metadata: {
              close_id: params.closeId,
              test_phone: update.demo_agent_test_phone,
            },
          })
        }
      })()
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    logger.error('admin agents-due submit failed', {
      closeId: params.closeId,
      error: e instanceof Error ? e.message : 'Unknown',
    })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
