import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
 request: NextRequest,
 { params }: { params: { id: string } },
) {
 const auth = await requireAdmin(request)
 if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 const { data: job, error: jobErr } = await supabaseAdmin
  .from('scrape_jobs').select('*').eq('id', params.id).maybeSingle()
 if (jobErr || !job) {
  return NextResponse.json({ error: 'Job not found' }, { status: 404 })
 }

 const { data: results } = await supabaseAdmin
  .from('scrape_results')
  .select('*')
  .eq('job_id', params.id)
  .order('created_at', { ascending: true })

 // Pre-flight phone-dedupe check: which result phones already exist in leads?
 // Lets the UI show "already in leads" without dispatching individual queries.
 const phones = Array.from(
  new Set(
   (results || [])
    .map((r) => normalizePhone(r.phone))
    .filter((p): p is string => !!p),
  ),
 )

 let existingPhonesInLeads: string[] = []
 if (phones.length > 0) {
  // We can't easily index by normalized phone in SQL, so we fetch the full
  // set of existing leads phones once and filter client-side.
  const { data: existing } = await supabaseAdmin
   .from('leads')
   .select('phone')
   .not('phone', 'is', null)
  const set = new Set(
   (existing || [])
    .map((e) => normalizePhone(e.phone))
    .filter((p): p is string => !!p),
  )
  existingPhonesInLeads = phones.filter((p) => set.has(p))
 }

 return NextResponse.json({
  success: true,
  job,
  results: results || [],
  existing_phones_in_leads: existingPhonesInLeads,
 })
}

export async function DELETE(
 request: NextRequest,
 { params }: { params: { id: string } },
) {
 const auth = await requireAdmin(request)
 if (!auth.success) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 const { error } = await supabaseAdmin.from('scrape_jobs').delete().eq('id', params.id)
 if (error) return NextResponse.json({ error: error.message }, { status: 500 })
 return NextResponse.json({ success: true })
}

function normalizePhone(p: string | null | undefined): string | null {
 if (!p) return null
 const digits = p.replace(/[^0-9]/g, '')
 if (!digits) return null
 if (digits.length === 10) return `+1${digits}`
 if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
 return p.trim()
}
