import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { convertCloseToClient } from '@/lib/sales/convert-close'
import { JWTManager } from '@/lib/jwt-manager'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Public (unauthenticated) endpoints for the self-serve "create your
 * account" link reps share with prospects.
 *
 * GET  /api/account-invite/[token]
 *   Returns the prospect-facing summary (business name, email, rep
 *   name) so the create-account page can render without an account.
 *   Returns 404 / 410 if missing / expired / consumed.
 *
 * POST /api/account-invite/[token]
 *   body: { password, first_name?, last_name? }
 *   Creates a close + business + user account in one shot using the
 *   prospect's chosen password, marks the invite consumed, sets the
 *   auth cookie, returns redirect_url. The page then redirects to
 *   /dashboard/onboarding signed in as the new owner.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } },
) {
  const { data: invite } = await supabaseAdmin
    .from('client_account_invites')
    .select('id, prospect_email, prospect_business_name, prospect_contact_name, expires_at, consumed_at, rep_id')
    .eq('token', params.token)
    .maybeSingle()
  if (!invite) {
    return NextResponse.json({ error: 'invite_not_found' }, { status: 404 })
  }
  if (invite.consumed_at) {
    return NextResponse.json({ error: 'invite_consumed' }, { status: 410 })
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'invite_expired' }, { status: 410 })
  }

  const { data: rep } = await supabaseAdmin
    .from('custom_users')
    .select('email, name, first_name, last_name')
    .eq('id', invite.rep_id)
    .maybeSingle()
  const repName = rep?.name
    || [rep?.first_name, rep?.last_name].filter(Boolean).join(' ')
    || rep?.email
    || 'your CloudGreet rep'

  return NextResponse.json({
    success: true,
    invite: {
      email: invite.prospect_email,
      business_name: invite.prospect_business_name,
      contact_name: invite.prospect_contact_name,
      rep_name: repName,
    },
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } },
) {
  const body = await request.json().catch(() => ({} as any))
  const password = String(body?.password || '').trim()
  const firstName = String(body?.first_name || '').trim()
  const lastName = String(body?.last_name || '').trim()
  const bodyEmail = String(body?.email || '').trim().toLowerCase()
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const { data: invite } = await supabaseAdmin
    .from('client_account_invites')
    .select('*')
    .eq('token', params.token)
    .maybeSingle()
  if (!invite) {
    return NextResponse.json({ error: 'invite_not_found' }, { status: 404 })
  }
  if (invite.consumed_at) {
    return NextResponse.json({ error: 'invite_consumed' }, { status: 410 })
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'invite_expired' }, { status: 410 })
  }

  // Invite may have been minted without a prospect email (cold-call
  // path - rep had phone but not email). In that case the prospect
  // supplies one here.
  const effectiveEmail: string = invite.prospect_email || bodyEmail
  if (!effectiveEmail || !/^[^@]+@[^@]+\.[^@]+$/.test(effectiveEmail)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  // Reuse a pre-existing close for this (rep, lead) if one exists -
  // typically the close the rep made via "Demo set" and the admin ran
  // the agent workshop against. Without this we'd insert a brand-new
  // close that has none of the workshop's pre-build data
  // (retell_agent_id, demo_agent_test_phone, website) and the
  // auto-attach on conversion never fires.
  const businessName = invite.prospect_business_name || 'Unknown'
  let closeId: string | null = null
  let weCreatedTheClose = false
  if (invite.lead_id) {
    const { data: existing } = await supabaseAdmin
      .from('closes')
      .select('id')
      .eq('rep_id', invite.rep_id)
      .eq('lead_id', invite.lead_id)
      .is('business_id', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if ((existing as any)?.id) {
      closeId = (existing as any).id
      // Backfill email on the existing close so convert-close can match.
      await supabaseAdmin
        .from('closes')
        .update({
          prospect_email: effectiveEmail,
          updated_at: new Date().toISOString(),
        })
        .eq('id', closeId)
        .then(undefined, () => null)
    }
  }
  // Fall back: also look up by (rep, prospect_business_name) for
  // closes that were created pre-lead_id-on-close (older paths).
  if (!closeId) {
    const { data: existing } = await supabaseAdmin
      .from('closes')
      .select('id, retell_agent_id')
      .eq('rep_id', invite.rep_id)
      .eq('prospect_business_name', businessName)
      .is('business_id', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if ((existing as any)?.id) {
      closeId = (existing as any).id
      await supabaseAdmin
        .from('closes')
        .update({
          prospect_email: effectiveEmail,
          updated_at: new Date().toISOString(),
        })
        .eq('id', closeId)
        .then(undefined, () => null)
    }
  }

  // No existing close - create one. This is the cold path (rep never
  // touched the workshop) so there's nothing to preserve.
  if (!closeId) {
    const { data: close, error: closeErr } = await supabaseAdmin
      .from('closes')
      .insert({
        rep_id: invite.rep_id,
        lead_id: invite.lead_id || null,
        prospect_business_name: businessName,
        prospect_contact_name: invite.prospect_contact_name || null,
        prospect_email: effectiveEmail,
        prospect_phone: invite.prospect_phone || null,
        agreed_monthly_cents: 0,
        agreed_setup_fee_cents: 0,
        status: 'pending',
        notes: `Self-serve account via invite ${invite.id}`,
      })
      .select('id')
      .single()
    if (closeErr || !close) {
      logger.error('account-invite: close insert failed', { error: closeErr?.message })
      return NextResponse.json({ error: closeErr?.message || 'Failed to create close' }, { status: 500 })
    }
    closeId = close.id
    weCreatedTheClose = true
  }
  const close = { id: closeId! }

  const convert = await convertCloseToClient({
    closeId: close.id,
    email: effectiveEmail,
    password,
    first_name: firstName || undefined,
    last_name: lastName || undefined,
  })
  if (convert.ok === false) {
    // Only roll back the close if WE created it on this request. If we
    // reused a workshop close, deleting it would wipe pre-build data
    // (retell_agent_id, demo_agent_test_phone, website) the admin set
    // earlier.
    if (weCreatedTheClose) {
      await supabaseAdmin.from('closes').delete().eq('id', close.id)
    }
    return NextResponse.json({ error: convert.error }, { status: convert.status })
  }
  const { business, user } = convert.data

  // Best-effort: backfill scraped lead data onto the new business so
  // the contractor's profile is pre-populated (website, address, TZ).
  if (invite.lead_id) {
    try {
      const { syncBusinessFromLead } = await import('@/lib/business-sync')
      await syncBusinessFromLead({ businessId: business.id, leadId: invite.lead_id })
    } catch { /* non-fatal */ }
  }

  // Mark the invite consumed.
  await supabaseAdmin
    .from('client_account_invites')
    .update({
      consumed_at: new Date().toISOString(),
      consumed_business_id: business.id,
    })
    .eq('id', invite.id)

  // Bump the lead status so the rep's pipeline reflects the conversion.
  if (invite.lead_id) {
    await supabaseAdmin
      .from('lead_assignments')
      .update({
        status: 'converted',
        last_touched_at: new Date().toISOString(),
      })
      .eq('rep_id', invite.rep_id)
      .eq('lead_id', invite.lead_id)
  }

  // Sign the new owner in right away so the redirect lands them on
  // the onboarding wizard already authenticated.
  const jwt = JWTManager.createUserToken(user.id, business.id, user.email, 'owner')
  const res = NextResponse.json({
    success: true,
    redirect_url: '/dashboard/onboarding',
    user: { id: user.id, email: user.email },
    business: { id: business.id, business_name: business.business_name },
  })
  res.cookies.set('token', jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  // Founder FYI - new client landed via self-serve.
  void (async () => {
    try {
      const { emailFounderAlert } = await import('@/lib/notifications/founder-alert')
      await emailFounderAlert({
        subject: `Self-serve client created: ${business.business_name}`,
        body: `${effectiveEmail} accepted a self-serve invite from rep ${invite.rep_id} and created their CloudGreet account.`,
        metadata: {
          business_id: business.id,
          business_name: business.business_name,
          client_email: user.email,
          rep_id: invite.rep_id,
          lead_id: invite.lead_id || null,
          invite_id: invite.id,
        },
      })
    } catch { /* non-fatal */ }
  })()

  logger.info('account-invite consumed', {
    invite_id: invite.id,
    rep_id: invite.rep_id,
    business_id: business.id,
    user_id: user.id,
  })

  return res
}
