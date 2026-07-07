import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/sales/setters
 *
 * The setters assigned to the signed-in sales rep (custom_users.
 * assigned_rep_id = me). Powers the "Your setters" card + login-as in
 * the rep's Settings, so a rep like Darrin can jump into Ed's dashboard
 * to check his queue / demos.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || auth.role !== 'sales') {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const { data } = await supabaseAdmin
    .from('custom_users')
    .select('id, email, first_name, last_name, name, is_active, last_login, last_active_at')
    .eq('role', 'setter')
    .eq('assigned_rep_id', auth.userId)
    .order('created_at', { ascending: true })

  return NextResponse.json({
    success: true,
    setters: (data || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name || [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email,
      is_active: !!u.is_active,
      last_active: [u.last_active_at, u.last_login].filter(Boolean).sort().pop() || null,
    })),
  })
}
