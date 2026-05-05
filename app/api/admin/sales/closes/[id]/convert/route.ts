import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'
import { logger } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/sales/closes/[id]/convert
 *   { email?, password?, first_name?, last_name?, business_type? }
 *
 * Promotes a close into a real client. Creates the custom_user +
 * businesses rows wired up exactly the same way as POST
 * /api/admin/clients (so the existing onboarding / Retell / Stripe
 * flows pick it up unchanged), then stamps:
 *   · businesses.rep_id           = close.rep_id
 *   · businesses.monthly_price_cents = close.agreed_monthly_cents
 *   · businesses.setup_fee_cents     = close.agreed_setup_fee_cents
 *   · closes.business_id           = new business.id
 *   · closes.status               = 'invoice_sent'
 *
 * After this runs, the Stripe invoice.paid webhook can credit the
 * rep automatically (commission_ledger insert at 50%).
 *
 * Body fields default from the close:
 *   email          → close.prospect_email or generated <slug>@cloudgreet.client
 *   password       → auto-generated 16-char temp; returned in response
 *   business_type  → 'service_business'
 *   first/last_name → derived from prospect_contact_name
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({} as any))

  const { data: close, error: closeErr } = await supabaseAdmin
    .from('closes')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()
  if (closeErr || !close) {
    return NextResponse.json({ error: 'Close not found' }, { status: 404 })
  }
  if (close.business_id) {
    return NextResponse.json({
      error: `Close is already linked to business ${close.business_id}`,
    }, { status: 409 })
  }

  // Resolve fields with sensible fallbacks
  const businessName: string = (close.prospect_business_name || '').trim()
  if (!businessName) {
    return NextResponse.json({ error: 'Close has no business name' }, { status: 400 })
  }

  let email: string = (body?.email || close.prospect_email || '').trim().toLowerCase()
  if (!email) {
    // Generate a placeholder so we can create the row; admin can update later.
    const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'client'
    email = `${slug}-${Date.now().toString(36)}@cloudgreet.client`
  }

  // Derive name from contact_name "LAST, FIRST" or "First Last"
  const contact = (close.prospect_contact_name || '').trim()
  let firstName = body?.first_name || ''
  let lastName = body?.last_name || ''
  if (!firstName || !lastName) {
    if (contact.includes(',')) {
      const [last, first] = contact.split(',').map((s: string) => s.trim())
      firstName = firstName || (first || businessName.split(' ')[0] || 'Owner')
      lastName = lastName || (last || 'User')
    } else if (contact) {
      const parts = contact.split(/\s+/)
      firstName = firstName || (parts[0] || businessName.split(' ')[0] || 'Owner')
      lastName = lastName || (parts.slice(1).join(' ') || 'User')
    } else {
      firstName = firstName || (businessName.split(' ')[0] || 'Owner')
      lastName = lastName || 'User'
    }
  }
  const fullName = `${firstName} ${lastName}`.trim()

  // Auto-generate a temp password if admin didn't supply one
  const password: string =
    typeof body?.password === 'string' && body.password.length >= 8
      ? body.password
      : crypto.randomBytes(12).toString('base64url')

  // Email collision guard
  const { data: existing } = await supabaseAdmin
    .from('custom_users')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({
      error: `A user already exists with email ${email}. Provide a different email in the request body.`,
    }, { status: 409 })
  }

  const password_hash = await bcrypt.hash(password, 10)

  // 1) user
  const { data: user, error: uErr } = await supabaseAdmin
    .from('custom_users')
    .insert({
      email, password_hash,
      name: fullName, first_name: firstName, last_name: lastName,
      role: 'owner', is_admin: false, is_active: true, status: 'active',
      phone: close.prospect_phone || null,
    })
    .select('id, email')
    .single()
  if (uErr || !user) {
    logger.error('Convert close: user insert failed', { error: uErr?.message })
    return NextResponse.json({ error: 'Failed to create user', detail: uErr?.message }, { status: 500 })
  }

  // 2) business — stamps rep_id + the negotiated price right away,
  // so the Stripe webhook + the rep dashboard see them immediately.
  const { data: business, error: bErr } = await supabaseAdmin
    .from('businesses')
    .insert({
      owner_id: user.id,
      business_name: businessName,
      business_type: body?.business_type || 'service_business',
      email,
      phone_number: close.prospect_phone || null,
      subscription_status: 'pending',
      account_status: 'active',
      onboarding_completed: false,
      rep_id: close.rep_id,
      monthly_price_cents: close.agreed_monthly_cents,
      setup_fee_cents: close.agreed_setup_fee_cents || 0,
    })
    .select('id, business_name, email')
    .single()
  if (bErr || !business) {
    await supabaseAdmin.from('custom_users').delete().eq('id', user.id)
    logger.error('Convert close: business insert failed (rolled back)', { error: bErr?.message })
    return NextResponse.json({ error: 'Failed to create business', detail: bErr?.message }, { status: 500 })
  }

  // 3) link
  const { error: linkErr } = await supabaseAdmin
    .from('custom_users')
    .update({ business_id: business.id })
    .eq('id', user.id)
  if (linkErr) {
    await supabaseAdmin.from('businesses').delete().eq('id', business.id)
    await supabaseAdmin.from('custom_users').delete().eq('id', user.id)
    logger.error('Convert close: link failed (rolled back)', { error: linkErr.message })
    return NextResponse.json({ error: 'Failed to finalize creation', detail: linkErr.message }, { status: 500 })
  }

  // 4) close → business_id + advance status
  await supabaseAdmin
    .from('closes')
    .update({
      business_id: business.id,
      status: close.status === 'pending' ? 'invoice_sent' : close.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', close.id)

  return NextResponse.json({
    success: true,
    business: { id: business.id, business_name: business.business_name },
    user: { id: user.id, email: user.email },
    temp_password: password, // surfaced once so admin can hand it to the client
  })
}
