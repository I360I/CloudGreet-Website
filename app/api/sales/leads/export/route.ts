import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuth, REP_TOOL_ROLES } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/sales/leads/export
 *
 * Returns the rep's claimed leads as a downloadable CSV. No paging
 * (capped at 5,000 rows). Header matches the import format.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.success || !auth.userId || !REP_TOOL_ROLES.has(auth.role || '')) {
    return NextResponse.json({ error: 'Sales role required' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('lead_assignments')
    .select('assigned_at, leads:lead_id(business_name, contact_name, phone, email, status, notes, created_at)')
    .eq('rep_id', auth.userId)
    .order('assigned_at', { ascending: false })
    .limit(5000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const header = ['business_name', 'contact_name', 'phone', 'email', 'status', 'notes', 'claimed_at']
  const lines = [header.join(',')]
  for (const row of (data || [])) {
    const lead: any = (row as any).leads
    if (!lead) continue
    lines.push([
      csvCell(lead.business_name),
      csvCell(lead.contact_name),
      csvCell(lead.phone),
      csvCell(lead.email),
      csvCell(lead.status),
      csvCell(lead.notes),
      csvCell((row as any).assigned_at),
    ].join(','))
  }
  const body = lines.join('\n')

  const filename = `cloudgreet-leads-${new Date().toISOString().slice(0, 10)}.csv`
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

function csvCell(v: unknown): string {
  if (v == null) return ''
  const s = String(v)
  if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}
