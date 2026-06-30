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

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{name} — Preview</title>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8f8f6; color: #1a1a1a; }
          nav { background: #fff; border-bottom: 1px solid #e5e5e5; padding: 0 24px; height: 60px; display: flex; align-items: center; justify-content: space-between; }
          .nav-logo { font-size: 18px; font-weight: 700; color: #1a1a1a; letter-spacing: -0.3px; }
          .nav-links { display: flex; gap: 24px; }
          .nav-links a { font-size: 14px; color: #555; text-decoration: none; }
          .hero { background: linear-gradient(135deg, #0a0a0b 0%, #1a2744 100%); color: #fff; padding: 72px 24px; text-align: center; }
          .hero h1 { font-size: clamp(28px, 5vw, 48px); font-weight: 800; letter-spacing: -1px; line-height: 1.15; max-width: 640px; margin: 0 auto 16px; }
          .hero p { font-size: 17px; color: rgba(255,255,255,0.65); max-width: 480px; margin: 0 auto 36px; line-height: 1.6; }
          .hero-cta { display: inline-block; background: #16a34a; color: #fff; font-size: 15px; font-weight: 600; padding: 14px 28px; border-radius: 10px; text-decoration: none; }
          .section { padding: 64px 24px; max-width: 1100px; margin: 0 auto; }
          .section-label { font-size: 12px; font-weight: 700; letter-spacing: 1.2px; color: #16a34a; text-transform: uppercase; margin-bottom: 8px; }
          .section-title { font-size: clamp(22px, 3vw, 32px); font-weight: 700; letter-spacing: -0.5px; margin-bottom: 12px; }
          .section-sub { font-size: 16px; color: #666; line-height: 1.6; max-width: 520px; margin-bottom: 40px; }
          .quote-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; }
          .quote-layout iframe { border: none; border-radius: 16px; box-shadow: 0 20px 60px -15px rgba(0,0,0,0.18); width: 100%; height: min(72vh, 560px); min-height: 460px; display: block; }
          .features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 48px; }
          .feature { background: #fff; border-radius: 14px; padding: 24px; border: 1px solid #e8e8e8; }
          .feature-icon { font-size: 28px; margin-bottom: 12px; }
          .feature h3 { font-size: 15px; font-weight: 700; margin-bottom: 6px; }
          .feature p { font-size: 13px; color: #666; line-height: 1.6; }
          .divider { border: none; border-top: 1px solid #e5e5e5; margin: 0 24px; }
          footer { background: #fff; border-top: 1px solid #e5e5e5; padding: 32px 24px; text-align: center; font-size: 13px; color: #999; }
          .preview-banner { background: #2563eb; color: #fff; font-size: 13px; font-weight: 600; text-align: center; padding: 10px 16px; letter-spacing: 0.2px; }
          @media (max-width: 700px) {
            .quote-layout { grid-template-columns: 1fr; }
            .features { grid-template-columns: 1fr; }
            .nav-links { display: none; }
          }
        `}</style>
      </head>
      <body>
        <div className="preview-banner">
          Preview — this is how the quote widget looks embedded on a client site
        </div>

        <nav>
          <span className="nav-logo">{name}</span>
          <div className="nav-links">
            <a href="#">Services</a>
            <a href="#">About</a>
            <a href="#">Contact</a>
          </div>
        </nav>

        <div className="hero">
          <h1>Reliable rides, on your schedule</h1>
          <p>Professional transportation for airports, events, and everyday travel across Central Ohio.</p>
          <a href="#quote" className="hero-cta">Get a free quote</a>
        </div>

        <hr className="divider" />

        <div className="section" id="quote">
          <div className="quote-layout">
            <div>
              <div className="section-label">Instant pricing</div>
              <div className="section-title">Get a quote in seconds</div>
              <div className="section-sub">
                Enter your pickup and destination and our AI assistant will give you an exact price right away. No waiting, no phone tag.
              </div>
              <div className="features">
                <div className="feature">
                  <div className="feature-icon">⚡</div>
                  <h3>Instant price</h3>
                  <p>Know your fare before you book — no surprises.</p>
                </div>
                <div className="feature">
                  <div className="feature-icon">📍</div>
                  <h3>Door to door</h3>
                  <p>We pick you up and drop you off exactly where you need.</p>
                </div>
                <div className="feature">
                  <div className="feature-icon">✅</div>
                  <h3>Easy booking</h3>
                  <p>Book right in the chat — no account or app needed.</p>
                </div>
              </div>
            </div>
            <iframe
              src={`${origin}/embed/${businessId}/quote`}
              title="Get a quote"
              allow="clipboard-write"
            />
          </div>
        </div>

        <footer>
          &copy; {new Date().getFullYear()} {name} · All rights reserved
        </footer>
      </body>
    </html>
  )
}
