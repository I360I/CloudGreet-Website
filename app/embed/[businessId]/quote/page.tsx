import { supabaseAdmin } from '@/lib/supabase'
import QuoteEmbed from './QuoteEmbed'

export const dynamic = 'force-dynamic'

export default async function QuoteEmbedPage({ params }: { params: { businessId: string } }) {
  const raw = params.businessId || ''
  let id = raw
  try { id = decodeURIComponent(raw) } catch { /* keep raw */ }
  const m = id.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
  const businessId = (m ? m[0] : id).trim()

  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('id, business_name')
    .eq('id', businessId)
    .maybeSingle()

  if (!biz) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', color: '#6b7280', fontSize: 14, padding: 24, textAlign: 'center' }}>
        Quote widget not set up for this site yet.
      </div>
    )
  }

  return <QuoteEmbed businessId={(biz as any).id} name={(biz as any).business_name || 'us'} />
}
