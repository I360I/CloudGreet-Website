import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function QuotePreviewPage({ params }: { params: { businessId: string } }) {
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

  const name = (biz as { business_name?: string } | null)?.business_name || 'Your Business'
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://cloudgreet.com'
  const base = `${origin}/embed/${businessId}/quote`
  const p = (params: Record<string, string>) =>
    `${base}?` + Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')

  const EXAMPLES = [
    { label: 'Default',           url: base },
    { label: 'Navy',              url: p({ accent: '#1e3a8a' }) },
    { label: 'Green',             url: p({ accent: '#15803d' }) },
    { label: 'Sharp corners',     url: p({ accent: '#0a0a0b', radius: '0' }) },
    { label: 'Extra rounded',     url: p({ accent: '#6d28d9', radius: '24' }) },
    { label: 'No header',         url: p({ accent: '#be123c', header: 'false' }) },
    { label: 'Dark background',   url: p({ accent: '#3b82f6', bg: '#0f172a' }) },
    { label: 'Custom label',      url: p({ accent: '#15803d', label: 'Check My Price' }) },
    { label: 'Combined',          url: p({ accent: '#1e3a8a', radius: '6', header: 'false', label: 'Get My Fare' }) },
  ]

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{name} — Widget Preview</title>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f2; color: #1a1a1a; padding: 32px 24px; }
          h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
          .sub { font-size: 13px; color: #888; margin-bottom: 28px; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
          .card { background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
          .card-label { font-size: 12px; font-weight: 600; color: #555; padding: 10px 14px; border-bottom: 1px solid #f0f0f0; }
          .card iframe { display: block; width: 100%; height: 420px; border: none; }
          @media (max-width: 860px) { .grid { grid-template-columns: repeat(2,1fr); } }
          @media (max-width: 540px) { .grid { grid-template-columns: 1fr; } }
        `}</style>
      </head>
      <body>
        <h1>{name} — Quote Widget</h1>
        <p className="sub">All examples are live and interactive. Add URL params to the embed code to match your style.</p>
        <div className="grid">
          {EXAMPLES.map((ex) => (
            <div key={ex.label} className="card">
              <div className="card-label">{ex.label}</div>
              <iframe src={ex.url} title={ex.label} allow="clipboard-write" />
            </div>
          ))}
        </div>
      </body>
    </html>
  )
}
