import { supabaseAdmin } from '@/lib/supabase'
import QuoteEmbed from './QuoteEmbed'

export const dynamic = 'force-dynamic'

function hex(val: string | undefined, fallback: string) {
  return /^#[0-9a-fA-F]{3,6}$/.test(val || '') ? val! : fallback
}

export default async function QuoteEmbedPage({
  params,
  searchParams,
}: {
  params: { businessId: string }
  searchParams: {
    accent?: string
    bg?: string
    radius?: string
    label?: string
    header?: string
    layout?: string
  }
}) {
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

  const accent = hex(searchParams.accent, '#0a0a0b')
  const bg     = hex(searchParams.bg, '#ffffff')

  const rawRadius = parseInt(searchParams.radius || '', 10)
  const radius = isNaN(rawRadius) ? 12 : Math.min(Math.max(rawRadius, 0), 24)

  const label = searchParams.label?.slice(0, 40).trim() || 'Get Quote'

  const showHeader = searchParams.header !== 'false'
  const layout = searchParams.layout === 'side' ? 'side' : 'stacked'

  return (
    <QuoteEmbed
      businessId={(biz as any).id}
      name={(biz as any).business_name || 'us'}
      accent={accent}
      bg={bg}
      radius={radius}
      label={label}
      showHeader={showHeader}
      layout={layout}
    />
  )
}
