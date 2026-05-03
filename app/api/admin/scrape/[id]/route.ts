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

 return NextResponse.json({ success: true, job, results: results || [] })
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
