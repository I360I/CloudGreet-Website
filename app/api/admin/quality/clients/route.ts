import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/quality/clients
 *
 * Lightweight directory used by the "Test a specific client" picker in
 * /admin/quality. Returns every business with a name + id - the admin
 * can then run the eval against that client's actual prompt-generator
 * output.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data, error } = await supabaseAdmin
    .from('businesses')
    .select('id, business_name, business_type, retell_agent_id, subscription_status, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ clients: data || [] })
}
