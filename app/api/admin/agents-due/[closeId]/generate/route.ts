import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'
import { buildBusinessContext } from '@/lib/agent-builder/build-context'
import { generateAgentPrompt } from '@/lib/agent-builder/generate'
import { validatePrompt } from '@/lib/agent-builder/validate'
import { composeFinalPrompt } from '@/lib/agent-builder/universal-layer'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120 // Vercel - allow the full pipeline to run

/**
 * POST /api/admin/agents-due/[closeId]/generate
 *
 * Runs the Phase-1 agent-builder pipeline for one close:
 *   1. Pull the close + linked business + (optional) lead row
 *   2. Build the Business Context Document (scrape + Google Places)
 *   3. Hit Claude (Sonnet 4.6) with strong system prompt + few-shot
 *   4. Static-validate the output
 *   5. Save context, prompt, validation, cost on the close row
 *   6. Slack ping when ready (or failed)
 *
 * Synchronous - the call takes ~30-60s. The admin UI shows a spinner.
 * Larger sites or slow Google API calls can push it past 60s; we set
 * maxDuration to 120 so Vercel doesn't kill us.
 *
 * Idempotent in the sense that calling it twice just regenerates;
 * the second call replaces the first draft. Approved prompts are
 * preserved - we never overwrite agent_draft_approved_prompt.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { closeId: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Mark generating up-front so the UI flips to spinner state.
  await supabaseAdmin
    .from('closes')
    .update({
      agent_draft_status: 'generating',
      agent_draft_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.closeId)

  try {
    // 1. Load the close + business.
    const { data: close, error: closeErr } = await supabaseAdmin
      .from('closes')
      .select('id, business_id, prospect_business_name, prospect_contact_name, prospect_phone, prospect_email')
      .eq('id', params.closeId)
      .single()
    if (closeErr || !close) {
      await markFailed(params.closeId, 'Close not found')
      return NextResponse.json({ error: 'Close not found' }, { status: 404 })
    }

    let business: any = null
    if (close.business_id) {
      const { data } = await supabaseAdmin
        .from('businesses')
        .select('id, business_name, address, city, state, phone, phone_number, website, services, business_hours')
        .eq('id', close.business_id)
        .maybeSingle()
      business = data
    }

    // 2. Build the context document.
    const seed = {
      business_name: business?.business_name || close.prospect_business_name,
      owner_name: close.prospect_contact_name,
      phone: business?.phone || business?.phone_number || close.prospect_phone,
      address: business?.address,
      website: business?.website,
      services: business?.services,
      business_hours: business?.business_hours,
      city_state_hint: business?.city && business?.state
        ? `${business.city}, ${business.state}`
        : null,
    }
    const ctx = await buildBusinessContext({ seed })

    // 3. Generate.
    const gen = await generateAgentPrompt(ctx)
    if (gen.ok !== true) {
      await markFailed(params.closeId, gen.error, ctx)
      return NextResponse.json({ error: gen.error }, { status: 500 })
    }

    // 4. Validate the model-generated portion (before we splice the
    //    universal block, which is hand-tuned and trusted).
    const validation = validatePrompt(gen.prompt, ctx)

    // 5. Compose the final prompt: business-specific section from the
    //    model + the universal CloudGreet receptionist behavior layer
    //    (do-not-repeat, email readback, numbers-as-words, defensive
    //    language, etc.). Stored prompt = what gets pasted into Retell.
    const finalPrompt = composeFinalPrompt(gen.prompt)

    // 6. Save.
    const { error: saveErr } = await supabaseAdmin
      .from('closes')
      .update({
        agent_draft_status: 'ready',
        agent_draft_context: ctx,
        agent_draft_prompt: finalPrompt,
        agent_draft_validation: validation,
        agent_draft_cost_micro: Math.round(Number(gen.cost_micro) || 0),
        agent_draft_generated_at: new Date().toISOString(),
        agent_draft_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.closeId)
    if (saveErr) {
      await markFailed(params.closeId, `save failed: ${saveErr.message}`, ctx)
      return NextResponse.json({ error: 'Could not save - run sql/agent-draft-pipeline.sql' }, { status: 500 })
    }

    // No Slack ping here on purpose. Drafts are intermediate state -
    // the prompt has to be reviewed, the Retell agent has to be built,
    // and the test number pasted before anything's actually shippable.
    // The "complete" notification fires once on /submit when the admin
    // marks the demo agent ready and the rep + client dashboards reflect
    // it. Pinging on every draft regenerate would just spam the channel.

    return NextResponse.json({
      success: true,
      validation,
      word_count: validation.word_count,
      cost_micro: gen.cost_micro,
      self_critique: gen.self_critique,
    })
  } catch (e) {
    const error = e instanceof Error ? e.message : 'pipeline failed'
    logger.error('agent-builder pipeline crashed', { closeId: params.closeId, error })
    await markFailed(params.closeId, error)
    return NextResponse.json({ error }, { status: 500 })
  }
}

async function markFailed(closeId: string, error: string, ctx?: unknown): Promise<void> {
  await supabaseAdmin
    .from('closes')
    .update({
      agent_draft_status: 'failed',
      agent_draft_error: error.slice(0, 500),
      ...(ctx ? { agent_draft_context: ctx } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', closeId)
}
