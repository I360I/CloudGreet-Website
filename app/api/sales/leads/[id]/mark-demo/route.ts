import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth, REP_TOOL_ROLES } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/sales/leads/[id]/mark-demo
 *   body: { scheduled_at: ISO datetime, notes?: string }
 *
 * Marks the lead as demo_scheduled, stamps the demo time on the
 * rep's lead_assignment row, and fires two notifications:
 *   1. Founder email (Anthony) via emailFounderAlert
 *   2. Slack post if SLACK_WEBHOOK_URL is configured
 *
 * Rep can only mark leads assigned to them.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }
  // Setters don't close deals or earn commission, so a closes row must
  // never carry their id as rep_id. Instead the demo flows to their
  // assigned closing rep (custom_users.assigned_rep_id): the closes row
  // is created under that rep with set_by_setter_id recording who booked
  // it. No assigned rep -> no closes row (lead_assignments is the record).
  const isSetter = auth.role === 'setter'
  let closeOwnerRepId: string | null = isSetter ? null : auth.userId
  let setterAssignedRepMissing = false
  if (isSetter) {
    const { data: setterUser } = await supabaseAdmin
      .from('custom_users')
      .select('assigned_rep_id')
      .eq('id', auth.userId)
      .maybeSingle()
    closeOwnerRepId = setterUser?.assigned_rep_id || null
    setterAssignedRepMissing = !closeOwnerRepId
  }

  const body = await request.json().catch(() => ({} as any))
  const scheduledAtRaw = String(body?.scheduled_at || '').trim()
  if (!scheduledAtRaw) {
    return NextResponse.json({ error: 'scheduled_at is required' }, { status: 400 })
  }
  const scheduledAt = new Date(scheduledAtRaw)
  if (Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: 'scheduled_at is not a valid date' }, { status: 400 })
  }
  const notes = String(body?.notes || '').trim().slice(0, 500) || null

  const { data: assignment } = await supabaseAdmin
    .from('lead_assignments')
    .select('lead_id')
    .eq('rep_id', auth.userId)
    .eq('lead_id', params.id)
    .maybeSingle()
  if (!assignment) {
    return NextResponse.json({ error: 'Not your lead' }, { status: 404 })
  }

  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('id, business_name, contact_name, phone, email')
    .eq('id', params.id)
    .maybeSingle()
  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  const scheduledAtIso = scheduledAt.toISOString()
  const { error: updErr } = await supabaseAdmin
    .from('lead_assignments')
    .update({
      status: 'demo_scheduled',
      follow_up_at: scheduledAtIso,
      last_touched_at: new Date().toISOString(),
    })
    .eq('rep_id', auth.userId)
    .eq('lead_id', params.id)
  if (updErr) {
    logger.error('mark-demo: assignment update failed', { leadId: params.id, error: updErr.message })
    return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  // Setter handoff: give the closing rep their OWN copy of this lead so the
  // setter-booked demo shows up in the closer's Leads list (dialable +
  // dispositionable), not only as a closes row they can't work from there.
  // PK is (lead_id, rep_id), so this is a separate row from the setter's;
  // upsert keeps it idempotent. Non-fatal - the demo is already recorded.
  if (closeOwnerRepId && closeOwnerRepId !== auth.userId) {
    const nowIso = new Date().toISOString()
    const { error: closerAssignErr } = await supabaseAdmin
      .from('lead_assignments')
      .upsert({
        lead_id: params.id,
        rep_id: closeOwnerRepId,
        status: 'demo_scheduled',
        follow_up_at: scheduledAtIso,
        assigned_at: nowIso,
        last_touched_at: nowIso,
      }, { onConflict: 'lead_id,rep_id' })
    if (closerAssignErr) {
      logger.warn('mark-demo: closer lead-assignment upsert failed', {
        leadId: params.id, closeOwnerRepId, error: closerAssignErr.message,
      })
    }
  }

  // Push into admin's agents-due queue by creating (or updating) a
  // close row with demo_scheduled_at set. The queue surfaces both
  // paid clients (business_id NOT NULL) and rep-flagged upcoming
  // demos (demo_scheduled_at NOT NULL) so Anthony can prep the
  // agent before the demo call.
  //
  // Idempotent: if a close already exists for this rep + this
  // prospect email, update its demo time instead of stacking rows.
  //
  // For setters the row is owned by their assigned closing rep
  // (closeOwnerRepId resolved above) so the demo appears in that rep's
  // /sales pipeline like one they set themselves; set_by_setter_id
  // keeps the attribution.
  let closeId: string | null = null
  if (closeOwnerRepId) {
    const businessName = lead.business_name || 'Unknown'
    const prospectEmail = lead.email ? String(lead.email).toLowerCase() : null
    const closeMatcher = supabaseAdmin
      .from('closes')
      .select('id')
      .eq('rep_id', closeOwnerRepId)
      .eq('prospect_business_name', businessName)
      .order('created_at', { ascending: false })
      .limit(1)
    const { data: existingClose } = await (prospectEmail
      ? closeMatcher.eq('prospect_email', prospectEmail)
      : closeMatcher).maybeSingle()

    if (existingClose?.id) {
      closeId = existingClose.id
      await supabaseAdmin
        .from('closes')
        .update({
          demo_scheduled_at: scheduledAtIso,
          updated_at: new Date().toISOString(),
          ...(isSetter ? { set_by_setter_id: auth.userId } : {}),
          ...(notes ? { notes: `Demo set: ${notes}` } : {}),
        })
        .eq('id', existingClose.id)
    } else {
      const { data: newClose, error: closeErr } = await supabaseAdmin
        .from('closes')
        .insert({
          rep_id: closeOwnerRepId,
          set_by_setter_id: isSetter ? auth.userId : null,
          prospect_business_name: businessName,
          prospect_contact_name: lead.contact_name || null,
          prospect_email: prospectEmail,
          prospect_phone: lead.phone || null,
          agreed_monthly_cents: 0,
          agreed_setup_fee_cents: 0,
          status: 'pending',
          demo_scheduled_at: scheduledAtIso,
          notes: notes ? `Demo set: ${notes}` : `Demo set from lead ${lead.id}`,
        })
        .select('id')
        .single()
      if (closeErr) {
        // Non-fatal: assignment update already succeeded. Log loud so
        // admin notices the queue won't surface this one.
        logger.warn('mark-demo: close insert failed (assignment still updated)', {
          leadId: lead.id, error: closeErr.message,
        })
      } else {
        closeId = newClose?.id || null
      }
    }
  } else if (setterAssignedRepMissing) {
    logger.warn('mark-demo: setter has no assigned rep - demo not pushed to any pipeline', {
      setterId: auth.userId, leadId: lead.id,
    })
  }

  // Pull rep info for the notification.
  const { data: rep } = await supabaseAdmin
    .from('custom_users')
    .select('email, name, first_name, last_name')
    .eq('id', auth.userId)
    .maybeSingle()
  const repName = rep?.name
    || [rep?.first_name, rep?.last_name].filter(Boolean).join(' ')
    || rep?.email
    || 'a rep'

  // When a setter books, name the rep whose pipeline the demo landed in.
  let pipelineLine = ''
  if (isSetter) {
    if (closeOwnerRepId) {
      const { data: owner } = await supabaseAdmin
        .from('custom_users')
        .select('email, name, first_name, last_name')
        .eq('id', closeOwnerRepId)
        .maybeSingle()
      const ownerName = owner?.name
        || [owner?.first_name, owner?.last_name].filter(Boolean).join(' ')
        || owner?.email || 'assigned rep'
      pipelineLine = `\nBooked by setter - demo added to ${ownerName}'s pipeline.`
    } else {
      pipelineLine = '\nWARNING: setter has no assigned rep, so this demo is not in any rep pipeline. Assign one under /admin/setters.'
    }
  }

  // Pretty when-string in the founder's local TZ (best effort).
  const whenPretty = scheduledAt.toLocaleString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  })

  // 0. Owner text alert (best-effort, fire-and-forget).
  void (async () => {
    const { textOwnerSetterActivity } = await import('@/lib/notifications/setter-alerts')
    await textOwnerSetterActivity([
      `Demo booked by ${repName}`,
      `${lead.business_name || 'a lead'}`,
      `When: ${whenPretty}`,
      lead.phone ? `Phone: ${lead.phone}` : '',
    ])
  })()

  // 1. Founder email (best-effort, fire-and-forget).
  void (async () => {
    try {
      const { emailFounderAlert } = await import('@/lib/notifications/founder-alert')
      await emailFounderAlert({
        subject: `Demo set: ${lead.business_name} (${repName})`,
        body: `${repName} just scheduled a demo with ${lead.business_name}.${pipelineLine}\n\nWhen: ${whenPretty}\n${notes ? `Notes: ${notes}\n` : ''}\nContact: ${lead.contact_name || '-'}\nPhone: ${lead.phone || '-'}\nEmail: ${lead.email || '-'}`,
        replyTo: rep?.email || undefined,
        metadata: {
          lead_id: lead.id,
          business_name: lead.business_name,
          contact_name: lead.contact_name,
          phone: lead.phone,
          email: lead.email,
          rep: repName,
          rep_email: rep?.email,
          scheduled_at: scheduledAtIso,
        },
      })
    } catch (e) {
      logger.warn('mark-demo: founder email failed', {
        leadId: lead.id, error: e instanceof Error ? e.message : 'Unknown',
      })
    }
  })()

  // 2. Slack post (best-effort).
  const slackUrl = process.env.SLACK_WEBHOOK_URL
  if (slackUrl) {
    void (async () => {
      try {
        const text = `:calendar: *Demo set* by ${repName} with *${lead.business_name}*\n` +
          `When: ${whenPretty}\n` +
          (lead.contact_name ? `Contact: ${lead.contact_name}\n` : '') +
          (lead.phone ? `Phone: ${lead.phone}\n` : '') +
          (lead.email ? `Email: ${lead.email}\n` : '') +
          (notes ? `Notes: ${notes}` : '')
        await fetch(slackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })
      } catch (e) {
        logger.warn('mark-demo: slack post failed', {
          leadId: lead.id, error: e instanceof Error ? e.message : 'Unknown',
        })
      }
    })()
  }

  logger.info('Rep marked demo set', {
    repId: auth.userId, leadId: lead.id, scheduledAt: scheduledAtIso,
  })

  return NextResponse.json({
    success: true,
    lead_id: lead.id,
    close_id: closeId,
    scheduled_at: scheduledAtIso,
    slack_configured: !!slackUrl,
  })
}
