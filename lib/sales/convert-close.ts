import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { supabaseAdmin } from '../supabase'
import { logger } from '../monitoring'

/**
 * Convert a `closes` row into a real client (custom_users + businesses
 * + linked close). Shared by:
 *
 *   - POST /api/admin/sales/closes/[id]/convert  (manual admin path)
 *   - Stripe checkout.session.completed webhook  (rep self-serve path:
 *     when a rep-generated payment link is paid, the webhook calls this
 *     to provision the client account before the existing subscription
 *     hookup runs)
 *
 * Stamps `business.rep_id`, `business.monthly_price_cents`,
 * `business.setup_fee_cents` from the close, links
 * `close.business_id`, and advances `close.status` to invoice_sent
 * (or paid, when called from the webhook). Idempotent: if the close
 * already has a business_id, returns the existing record without
 * re-creating anything.
 */
export type ConvertCloseInput = {
  closeId: string
  /** Optional override email; defaults to close.prospect_email or generated. */
  email?: string
  /** Optional plaintext password; auto-generated 16-char if omitted. */
  password?: string
  first_name?: string
  last_name?: string
  business_type?: string
  /** Pre-existing Stripe customer (set by webhook path so we don't lose it). */
  stripeCustomerId?: string | null
  /** Set close.status = 'paid' when the caller knows payment landed. */
  markPaid?: boolean
}

export type ConvertCloseResult = {
  business: { id: string; business_name: string }
  user: { id: string; email: string }
  close_id: string
  /** Plaintext password - only returned on the first conversion. Empty on idempotent re-call. */
  temp_password: string
}

export async function convertCloseToClient(
  input: ConvertCloseInput,
): Promise<{ ok: true; data: ConvertCloseResult } | { ok: false; error: string; status: number }> {
  const { data: close, error: closeErr } = await supabaseAdmin
    .from('closes')
    .select('*')
    .eq('id', input.closeId)
    .maybeSingle()
  if (closeErr || !close) {
    return { ok: false, error: 'Close not found', status: 404 }
  }

  // Idempotent: if already converted, just return the existing link.
  if (close.business_id) {
    const { data: existingBiz } = await supabaseAdmin
      .from('businesses')
      .select('id, business_name, owner_id')
      .eq('id', close.business_id)
      .maybeSingle()
    const { data: existingOwner } = existingBiz?.owner_id
      ? await supabaseAdmin
          .from('custom_users')
          .select('id, email')
          .eq('id', existingBiz.owner_id)
          .maybeSingle()
      : { data: null }
    // Optional: persist Stripe customer + advance status if caller has new info
    if (input.stripeCustomerId) {
      await supabaseAdmin
        .from('businesses')
        .update({ stripe_customer_id: input.stripeCustomerId, updated_at: new Date().toISOString() })
        .eq('id', close.business_id)
    }
    if (input.markPaid && close.status !== 'paid') {
      await supabaseAdmin
        .from('closes')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', close.id)
    }
    return {
      ok: true,
      data: {
        business: { id: existingBiz?.id || close.business_id, business_name: existingBiz?.business_name || close.prospect_business_name },
        user: { id: existingOwner?.id || '', email: existingOwner?.email || '' },
        close_id: close.id,
        temp_password: '',
      },
    }
  }

  const businessName: string = (close.prospect_business_name || '').trim()
  if (!businessName) {
    return { ok: false, error: 'Close has no business name', status: 400 }
  }

  let email = (input.email || close.prospect_email || '').trim().toLowerCase()
  if (!email) {
    const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'client'
    email = `${slug}-${Date.now().toString(36)}@cloudgreet.client`
  }

  const contact = (close.prospect_contact_name || '').trim()
  let firstName = input.first_name || ''
  let lastName = input.last_name || ''
  if (!firstName || !lastName) {
    if (contact.includes(',')) {
      const [last, first] = contact.split(',').map((s) => s.trim())
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

  const password =
    typeof input.password === 'string' && input.password.length >= 8
      ? input.password
      : crypto.randomBytes(12).toString('base64url')

  // If a user already exists with this email, see if it's a client
  // we already provisioned (typical when a rep ran "Send booking link"
  // first, then "Send payment link" later - same prospect, same email).
  // When the existing business is owned by the same rep, link the
  // current close to it instead of failing with a 409.
  const { data: existingUser } = await supabaseAdmin
    .from('custom_users')
    .select('id, business_id, email')
    .eq('email', email)
    .maybeSingle()
  if (existingUser) {
    if (existingUser.business_id) {
      const { data: existingBiz } = await supabaseAdmin
        .from('businesses')
        .select('id, business_name, rep_id')
        .eq('id', existingUser.business_id)
        .maybeSingle()
      if (existingBiz && existingBiz.rep_id === close.rep_id) {
        // Same rep, same prospect - fold this close into the existing
        // business and advance status.
        if (input.stripeCustomerId) {
          await supabaseAdmin
            .from('businesses')
            .update({
              stripe_customer_id: input.stripeCustomerId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingBiz.id)
        }
        await supabaseAdmin
          .from('closes')
          .update({
            business_id: existingBiz.id,
            status: input.markPaid
              ? 'paid'
              : (close.status === 'pending' ? 'invoice_sent' : close.status),
            updated_at: new Date().toISOString(),
          })
          .eq('id', close.id)

        // Persist the new pricing if the rep tweaked the close's
        // amounts since the original provision. The webhook always
        // honors what's on close.agreed_monthly_cents, but the
        // business row carries the canonical "what they pay" so the
        // admin/dashboard surfaces match.
        if (close.agreed_monthly_cents) {
          await supabaseAdmin
            .from('businesses')
            .update({
              monthly_price_cents: close.agreed_monthly_cents,
              setup_fee_cents: close.agreed_setup_fee_cents || 0,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingBiz.id)
        }

        return {
          ok: true,
          data: {
            business: { id: existingBiz.id, business_name: existingBiz.business_name },
            user: { id: existingUser.id, email: existingUser.email || email },
            close_id: close.id,
            temp_password: '',
          },
        }
      }
    }
    return {
      ok: false,
      error: `A user already exists with email ${email}.`,
      status: 409,
    }
  }

  const password_hash = await bcrypt.hash(password, 10)

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
    return { ok: false, error: 'Failed to create user', status: 500 }
  }

  const { data: business, error: bErr } = await supabaseAdmin
    .from('businesses')
    .insert({
      owner_id: user.id,
      business_name: businessName,
      business_type: input.business_type || 'service_business',
      email,
      phone_number: close.prospect_phone || null,
      subscription_status: 'pending',
      account_status: 'active',
      onboarding_completed: false,
      rep_id: close.rep_id,
      monthly_price_cents: close.agreed_monthly_cents,
      setup_fee_cents: close.agreed_setup_fee_cents || 0,
      stripe_customer_id: input.stripeCustomerId || null,
    })
    .select('id, business_name')
    .single()
  if (bErr || !business) {
    await supabaseAdmin.from('custom_users').delete().eq('id', user.id)
    logger.error('Convert close: business insert failed (rolled back)', { error: bErr?.message })
    return { ok: false, error: 'Failed to create business', status: 500 }
  }

  const { error: linkErr } = await supabaseAdmin
    .from('custom_users')
    .update({ business_id: business.id })
    .eq('id', user.id)
  if (linkErr) {
    await supabaseAdmin.from('businesses').delete().eq('id', business.id)
    await supabaseAdmin.from('custom_users').delete().eq('id', user.id)
    logger.error('Convert close: link failed (rolled back)', { error: linkErr.message })
    return { ok: false, error: 'Failed to finalize creation', status: 500 }
  }

  await supabaseAdmin
    .from('closes')
    .update({
      business_id: business.id,
      status: input.markPaid ? 'paid' : (close.status === 'pending' ? 'invoice_sent' : close.status),
      updated_at: new Date().toISOString(),
    })
    .eq('id', close.id)

  return {
    ok: true,
    data: {
      business: { id: business.id, business_name: business.business_name },
      user: { id: user.id, email: user.email },
      close_id: close.id,
      temp_password: password,
    },
  }
}
