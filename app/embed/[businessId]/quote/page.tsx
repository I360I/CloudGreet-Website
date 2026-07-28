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
    expand?: string
    mode?: string
    v?: string
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

  const BRANDING: Record<string, { logo: string; name: string; tagline: string; accent: string; trust: string[] }> = {
    '650406c3-5585-446e-958d-0fbcccf54795': {
      logo: '/clients/smartride-logo.png',
      name: 'Smart Ride Central Ohio',
      tagline: 'Private airport & executive transportation',
      accent: '#1F8F3B',
      trust: ['Flight tracking', 'Owner-driven', 'Reserved pickup time'],
    },
  }
  const brand = BRANDING[businessId]
  const pageMode = searchParams.mode === 'page' && !!brand

  // In hosted-page mode the brand color drives the button + header band
  // unless the link explicitly overrides it.
  const accent = hex(searchParams.accent, pageMode ? brand!.accent : '#0a0a0b')
  const bg     = hex(searchParams.bg, '#ffffff')

  const rawRadius = parseInt(searchParams.radius || '', 10)
  const radius = isNaN(rawRadius) ? 12 : Math.min(Math.max(rawRadius, 0), 24)

  const label = searchParams.label?.slice(0, 40).trim() || 'Get Quote'

  const showHeader = searchParams.header !== 'false'
  const layout = searchParams.layout === 'side' ? 'side' : 'stacked'
  const expandOnFocus = searchParams.expand !== 'false'

  const embed = (
    <QuoteEmbed
      businessId={(biz as any).id}
      name={(biz as any).business_name || 'us'}
      accent={accent}
      bg={bg}
      radius={radius}
      label={label}
      showHeader={showHeader}
      layout={layout}
      expandOnFocus={expandOnFocus}
      fitContent={pageMode}
    />
  )

  // ---- Hosted-page mode -------------------------------------------------
  // The widget above is built to live inside an iframe on the client's own
  // site. When a client texts the link directly (Steve's /go shortlink),
  // the bare widget reads as an unbranded half-empty page. mode=page wraps
  // it in full-height branded chrome. Three variants (v=1|2|3) so clients
  // can pick a look. Branding is per-business, server-side only.
  if (!pageMode) return embed

  const v = ['1', '2', '3'].includes(searchParams.v || '') ? searchParams.v : '1'
  const poweredBy = (
    <div style={{ textAlign: 'center', fontSize: 11, paddingBottom: 18 }}>
      <span style={{ opacity: 0.55 }}>Powered by </span>
      <a href="https://cloudgreet.com" style={{ opacity: 0.8, fontWeight: 600, textDecoration: 'none', color: 'inherit' }}>CloudGreet</a>
    </div>
  )
  const trustRow = (color: string) => (
    <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', fontSize: 12, color, padding: '18px 16px 10px' }}>
      {brand!.trust.map((t) => (
        <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 5, height: 5, borderRadius: 999, background: brand!.accent, display: 'inline-block' }} />
          {t}
        </span>
      ))}
    </div>
  )
  const card = (
    <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 12px 40px -12px rgba(10,30,15,0.18)' }}>
      {embed}
    </div>
  )

  if (v === '2') {
    // Green hero: brand band on top, form card overlapping it.
    return (
      <div style={{ minHeight: '100dvh', background: '#F3F5F3', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ background: `linear-gradient(160deg, #114E23 0%, ${brand!.accent} 100%)`, padding: '28px 16px 64px', textAlign: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={brand!.logo} alt={brand!.name} style={{ height: 92, width: 92, borderRadius: 18, background: '#fff', padding: 6, margin: '0 auto', display: 'block', boxShadow: '0 8px 24px -8px rgba(0,0,0,0.35)' }} />
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 19, marginTop: 12, letterSpacing: '-0.01em' }}>{brand!.name}</div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 3 }}>{brand!.tagline}</div>
        </div>
        <div style={{ maxWidth: 480, width: '100%', margin: '-44px auto 0', padding: '0 14px', flex: 1 }}>
          {card}
          {trustRow('#4b5563')}
        </div>
        {poweredBy}
      </div>
    )
  }

  if (v === '3') {
    // Executive dark: near-black chrome, white card pops, green accents.
    return (
      <div style={{ minHeight: '100dvh', background: '#0C120E', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#E5E7EB' }}>
        <div style={{ padding: '30px 16px 20px', textAlign: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={brand!.logo} alt={brand!.name} style={{ height: 96, width: 96, borderRadius: 20, background: '#fff', padding: 6, margin: '0 auto', display: 'block' }} />
          <div style={{ fontWeight: 700, fontSize: 19, marginTop: 12, letterSpacing: '-0.01em', color: '#fff' }}>{brand!.name}</div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 3 }}>{brand!.tagline}</div>
        </div>
        <div style={{ maxWidth: 480, width: '100%', margin: '0 auto', padding: '0 14px', flex: 1 }}>
          {card}
          {trustRow('rgba(255,255,255,0.6)')}
        </div>
        {poweredBy}
      </div>
    )
  }

  // v=1 Clean light: white page, logo up top, card, trust row.
  return (
    <div style={{ minHeight: '100dvh', background: '#FAFAF8', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#111827' }}>
      <div style={{ padding: '30px 16px 16px', textAlign: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={brand!.logo} alt={brand!.name} style={{ height: 110, width: 110, margin: '0 auto', display: 'block' }} />
        <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>{brand!.tagline}</div>
      </div>
      <div style={{ maxWidth: 480, width: '100%', margin: '0 auto', padding: '0 14px', flex: 1 }}>
        {card}
        {trustRow('#4b5563')}
      </div>
      {poweredBy}
    </div>
  )
}
