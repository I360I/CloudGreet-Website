import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const STYLES = [
  { label: 'Midnight',    accent: '#0a0a0b', bg: '#f9f9f9',   card: '#fff' },
  { label: 'Navy',        accent: '#1e3a8a', bg: '#eff6ff',   card: '#fff' },
  { label: 'Forest',      accent: '#15803d', bg: '#f0fdf4',   card: '#fff' },
  { label: 'Violet',      accent: '#6d28d9', bg: '#f5f3ff',   card: '#fff' },
  { label: 'Crimson',     accent: '#be123c', bg: '#fff1f2',   card: '#fff' },
  { label: 'Slate',       accent: '#334155', bg: '#f1f5f9',   card: '#fff' },
]

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

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{name} — Widget Styles</title>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f4f4f2; color: #1a1a1a; }

          .banner { background: #2563eb; color: #fff; font-size: 13px; font-weight: 600; text-align: center; padding: 10px 16px; }

          .page-header { background: #fff; border-bottom: 1px solid #e5e5e5; padding: 0 32px; height: 56px; display: flex; align-items: center; justify-content: space-between; }
          .page-header-logo { font-size: 16px; font-weight: 700; letter-spacing: -0.3px; }
          .page-header-sub { font-size: 12px; color: #999; }

          .hero { background: linear-gradient(135deg, #0a0a0b 0%, #1a2744 100%); color: #fff; padding: 56px 32px 48px; text-align: center; }
          .hero h1 { font-size: clamp(24px, 4vw, 42px); font-weight: 800; letter-spacing: -1px; line-height: 1.15; max-width: 560px; margin: 0 auto 12px; }
          .hero p { font-size: 16px; color: rgba(255,255,255,0.6); max-width: 420px; margin: 0 auto 28px; line-height: 1.6; }
          .hero-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); color: rgba(255,255,255,0.8); font-size: 12px; font-weight: 600; padding: 5px 12px; border-radius: 100px; margin-bottom: 20px; }
          .hero-dot { width: 6px; height: 6px; border-radius: 50%; background: #4ade80; }

          .grid-section { padding: 48px 32px; max-width: 1200px; margin: 0 auto; }
          .grid-label { font-size: 11px; font-weight: 700; letter-spacing: 1.4px; color: #888; text-transform: uppercase; text-align: center; margin-bottom: 6px; }
          .grid-title { font-size: clamp(20px, 3vw, 30px); font-weight: 800; letter-spacing: -0.5px; text-align: center; margin-bottom: 6px; }
          .grid-sub { font-size: 15px; color: #666; text-align: center; max-width: 480px; margin: 0 auto 40px; line-height: 1.6; }

          .style-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
          .style-card { border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px -4px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.06); }
          .style-card-header { padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; }
          .style-card-name { font-size: 13px; font-weight: 700; color: #1a1a1a; }
          .style-card-hex { font-size: 11px; color: #999; font-family: monospace; }
          .style-card-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
          .style-card-dot-wrap { display: flex; align-items: center; gap: 6px; }
          .style-card iframe { display: block; width: 100%; height: 420px; border: none; }

          .bottom-section { background: #fff; border-top: 1px solid #e5e5e5; padding: 48px 32px; }
          .bottom-inner { max-width: 900px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: start; }
          .bottom-title { font-size: 20px; font-weight: 700; letter-spacing: -0.4px; margin-bottom: 8px; }
          .bottom-sub { font-size: 14px; color: #666; line-height: 1.7; margin-bottom: 20px; }
          .code-block { background: #0a0a0b; color: #e5e7eb; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; line-height: 1.7; padding: 18px 20px; border-radius: 12px; overflow-x: auto; white-space: pre; }
          .code-comment { color: #6b7280; }
          .code-attr { color: #93c5fd; }
          .code-val { color: #86efac; }

          footer { padding: 28px 32px; text-align: center; font-size: 12px; color: #aaa; }

          @media (max-width: 900px) { .style-grid { grid-template-columns: repeat(2, 1fr); } .bottom-inner { grid-template-columns: 1fr; } }
          @media (max-width: 560px) { .style-grid { grid-template-columns: 1fr; } .grid-section { padding: 32px 16px; } }
        `}</style>
      </head>
      <body>
        <div className="banner">Widget preview — share this link with clients to show them how it looks</div>

        <div className="page-header">
          <span className="page-header-logo">{name}</span>
          <span className="page-header-sub">Powered by CloudGreet</span>
        </div>

        <div className="hero">
          <div className="hero-badge"><span className="hero-dot" /> Instant AI quotes</div>
          <h1>Reliable rides, on your schedule</h1>
          <p>Professional transportation for airports, events, and everyday travel across Central Ohio.</p>
        </div>

        <div className="grid-section">
          <div className="grid-label">Customizable styles</div>
          <div className="grid-title">Pick a look that fits your brand</div>
          <div className="grid-sub">Every color, same great experience. Add <code style={{fontFamily:'monospace',background:'#f0f0f0',padding:'1px 5px',borderRadius:4}}>?accent=#HEX</code> to the embed URL to match your site.</div>

          <div className="style-grid">
            {STYLES.map((s) => (
              <div key={s.label} className="style-card" style={{ background: s.card }}>
                <div className="style-card-header" style={{ background: s.bg }}>
                  <div className="style-card-dot-wrap">
                    <div className="style-card-dot" style={{ background: s.accent }} />
                    <span className="style-card-name">{s.label}</span>
                  </div>
                  <span className="style-card-hex">{s.accent}</span>
                </div>
                <iframe
                  src={`${origin}/embed/${businessId}/quote?accent=${encodeURIComponent(s.accent)}`}
                  title={`${s.label} style`}
                  allow="clipboard-write"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bottom-section">
          <div className="bottom-inner">
            <div>
              <div className="bottom-title">Drop it on any website</div>
              <div className="bottom-sub">
                One iframe, any platform — WordPress, Squarespace, Wix, raw HTML. Set the <code style={{fontFamily:'monospace',background:'#f0f0f0',padding:'1px 4px',borderRadius:3}}>accent</code> param to your brand color and it just works.
              </div>
            </div>
            <div className="code-block">{`<iframe
  src="${origin}/embed/${businessId}/quote
      ?accent=%230a0a0b"
  width="100%"
  height="460"
  frameborder="0"
  style="border-radius:16px;border:none"
></iframe>`}</div>
          </div>
        </div>

        <footer>&copy; {new Date().getFullYear()} {name} · All rights reserved</footer>
      </body>
    </html>
  )
}
