import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * PATCH /api/admin/agents-due/[closeId]/business
 *   body: { website?: string, address?: string, services?: string[], business_hours?: any }
 *
 * Lets the admin fill in/correct facts on the linked business before
 * (or after) generating the agent draft. Most useful when a rep
 * provisions a client off a lead that didn't have a website on file -
 * paste the URL here and the next "Build draft" pulls real data.
 *
 * Empty-string fields are treated as "clear" (set to null) so admin
 * can wipe a wrong entry. Missing fields are left untouched.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { closeId: string } },
) {
  const auth = await requireAdmin(request)
  if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Resolve the business id from the close.
  const { data: close, error: closeErr } = await supabaseAdmin
    .from('closes')
    .select('business_id')
    .eq('id', params.closeId)
    .maybeSingle()
  if (closeErr || !close?.business_id) {
    return NextResponse.json({ error: 'No business linked to this close' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({})) as {
    website?: string
    address?: string
    services?: string[]
    business_hours?: any
  }

  const update: Record<string, any> = { updated_at: new Date().toISOString() }
  if (body.website !== undefined) {
    const w = body.website.trim()
    if (!w) {
      update.website = null
    } else {
      // Normalise: prepend https:// if missing, validate parseable.
      const candidate = /^https?:\/\//i.test(w) ? w : `https://${w}`
      try {
        const u = new URL(candidate)
        update.website = u.toString()
      } catch {
        return NextResponse.json({ error: `"${w}" doesn't look like a valid URL` }, { status: 400 })
      }
    }
  }
  if (body.address !== undefined) update.address = body.address.trim() || null
  if (body.services !== undefined) update.services = Array.isArray(body.services) ? body.services : null
  if (body.business_hours !== undefined) update.business_hours = body.business_hours

  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { error: upErr } = await supabaseAdmin
    .from('businesses')
    .update(update)
    .eq('id', close.business_id)
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, business_id: close.business_id })
}
