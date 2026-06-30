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
  const src = (accent = '#0a0a0b') => `${base}?accent=${encodeURIComponent(accent)}`
  const p = (params: Record<string, string>) =>
    `${base}?` + Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')

  const PARAM_EXAMPLES = [
    {
      name: 'Sharp corners',
      description: '?radius=0',
      url: p({ accent: '#0a0a0b', radius: '0' }),
      code: '?radius=0',
    },
    {
      name: 'Extra rounded',
      description: '?radius=24',
      url: p({ accent: '#15803d', radius: '24' }),
      code: '?radius=24',
    },
    {
      name: 'No header',
      description: '?header=false',
      url: p({ accent: '#1e3a8a', header: 'false' }),
      code: '?header=false',
    },
    {
      name: 'Dark background',
      description: '?bg=+?accent=',
      url: p({ accent: '#3b82f6', bg: '#0f172a' }),
      code: '?bg=%230f172a\n&accent=%233b82f6',
    },
    {
      name: 'Custom button label',
      description: '?label=',
      url: p({ accent: '#6d28d9', label: 'Check My Price' }),
      code: '?label=Check+My+Price',
    },
    {
      name: 'No header + custom label',
      description: 'combined',
      url: p({ accent: '#be123c', header: 'false', label: 'Get My Fare', radius: '6' }),
      code: '?header=false\n&label=Get+My+Fare\n&radius=6',
    },
  ]

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{name} — Quote Widget Layouts</title>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html { scroll-behavior: smooth; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0f0ee; color: #1a1a1a; }

          /* ── Top nav ── */
          .topnav { position: sticky; top: 0; z-index: 100; background: #fff; border-bottom: 1px solid #e5e5e5; display: flex; align-items: center; gap: 0; overflow-x: auto; padding: 0 20px; }
          .topnav a { flex-shrink: 0; font-size: 13px; font-weight: 600; color: #555; text-decoration: none; padding: 16px 14px; border-bottom: 2px solid transparent; white-space: nowrap; }
          .topnav a:hover { color: #0a0a0b; }
          .topnav-logo { font-size: 14px; font-weight: 800; letter-spacing: -0.3px; color: #0a0a0b; padding: 16px 20px 16px 0; border-right: 1px solid #e5e5e5; margin-right: 8px; white-space: nowrap; flex-shrink: 0; }

          /* ── Section shell ── */
          .variant { margin: 32px auto; max-width: 1200px; padding: 0 24px; }
          .variant-label { font-size: 10px; font-weight: 800; letter-spacing: 1.6px; text-transform: uppercase; color: #aaa; margin-bottom: 4px; }
          .variant-title { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; margin-bottom: 16px; }
          .mocksite { border-radius: 16px; overflow: hidden; box-shadow: 0 8px 40px -8px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06); background: #fff; }
          .mocksite-bar { background: #f7f7f7; border-bottom: 1px solid #e5e5e5; padding: 10px 14px; display: flex; align-items: center; gap: 6px; }
          .mocksite-dot { width: 10px; height: 10px; border-radius: 50%; }
          .mocksite-url { flex: 1; background: #eee; border-radius: 5px; height: 22px; margin: 0 8px; }

          /* shared mock page chrome */
          .mock-nav { background: #fff; border-bottom: 1px solid #eee; padding: 0 28px; height: 52px; display: flex; align-items: center; justify-content: space-between; }
          .mock-nav-logo { font-size: 15px; font-weight: 800; letter-spacing: -0.3px; }
          .mock-nav-links { display: flex; gap: 20px; }
          .mock-nav-links span { font-size: 12px; color: #888; }
          .mock-footer { background: #f7f7f7; border-top: 1px solid #eee; padding: 18px 28px; font-size: 12px; color: #bbb; text-align: center; }

          /* 1. Split */
          .split-body { display: grid; grid-template-columns: 1fr 380px; gap: 0; }
          .split-content { padding: 40px 32px; background: #fff; }
          .split-content h2 { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 10px; }
          .split-content p { font-size: 14px; color: #666; line-height: 1.7; margin-bottom: 20px; max-width: 340px; }
          .split-content ul { list-style: none; display: flex; flex-direction: column; gap: 8px; }
          .split-content li { font-size: 13px; color: #444; display: flex; align-items: center; gap: 8px; }
          .check { color: #16a34a; font-size: 14px; }
          .split-widget { border-left: 1px solid #eee; }
          .split-widget iframe { width: 100%; height: 460px; border: none; display: block; }

          /* 2. Hero embed */
          .hero-body { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 48px 32px; display: grid; grid-template-columns: 1fr 360px; gap: 40px; align-items: center; }
          .hero-text h2 { font-size: 30px; font-weight: 800; letter-spacing: -0.8px; color: #fff; line-height: 1.2; margin-bottom: 10px; }
          .hero-text p { font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.7; max-width: 340px; }
          .hero-widget iframe { width: 100%; height: 420px; border: none; border-radius: 14px; display: block; box-shadow: 0 20px 60px -10px rgba(0,0,0,0.5); }

          /* 3. Centered card */
          .centered-body { background: #f8f8f6; padding: 48px 32px; }
          .centered-head { text-align: center; margin-bottom: 28px; }
          .centered-head h2 { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 8px; }
          .centered-head p { font-size: 14px; color: #666; }
          .centered-card { max-width: 420px; margin: 0 auto; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px -8px rgba(0,0,0,0.14); }
          .centered-card iframe { width: 100%; height: 440px; border: none; display: block; }

          /* 4. Sidebar */
          .sidebar-body { display: grid; grid-template-columns: 1fr 300px; gap: 0; min-height: 500px; }
          .sidebar-content { padding: 36px 32px; background: #fff; }
          .sidebar-content h2 { font-size: 22px; font-weight: 800; letter-spacing: -0.4px; margin-bottom: 10px; }
          .sidebar-content p { font-size: 13px; color: #666; line-height: 1.7; margin-bottom: 16px; }
          .sidebar-img { width: 100%; height: 130px; background: linear-gradient(120deg,#e0e7ff,#dbeafe); border-radius: 10px; margin-bottom: 12px; }
          .sidebar-img2 { width: 100%; height: 90px; background: linear-gradient(120deg,#f0fdf4,#dcfce7); border-radius: 10px; }
          .sidebar-right { background: #f8f8f6; border-left: 1px solid #eee; padding: 20px 16px; display: flex; flex-direction: column; gap: 12px; }
          .sidebar-widget-label { font-size: 11px; font-weight: 700; letter-spacing: 1px; color: #aaa; text-transform: uppercase; }
          .sidebar-right iframe { width: 100%; flex: 1; border: none; border-radius: 12px; box-shadow: 0 4px 16px -4px rgba(0,0,0,0.12); display: block; min-height: 420px; }

          /* 5. Full-width banner */
          .fullwidth-top { background: #0a0a0b; padding: 32px 36px; display: flex; align-items: center; justify-content: space-between; }
          .fullwidth-top h2 { font-size: 22px; font-weight: 800; color: #fff; letter-spacing: -0.4px; }
          .fullwidth-top p { font-size: 13px; color: rgba(255,255,255,0.55); margin-top: 4px; }
          .fullwidth-widget iframe { width: 100%; height: 360px; border: none; display: block; }

          /* 6. Compact pop-in */
          .compact-body { background: #fff; padding: 40px 32px; display: flex; gap: 36px; align-items: flex-start; }
          .compact-text { flex: 1; }
          .compact-text h2 { font-size: 22px; font-weight: 800; letter-spacing: -0.4px; margin-bottom: 8px; }
          .compact-text p { font-size: 13px; color: #666; line-height: 1.7; margin-bottom: 16px; max-width: 360px; }
          .compact-steps { display: flex; flex-direction: column; gap: 14px; }
          .compact-step { display: flex; gap: 12px; align-items: flex-start; }
          .compact-step-num { width: 24px; height: 24px; border-radius: 50%; background: #0a0a0b; color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
          .compact-step-text strong { font-size: 13px; font-weight: 700; display: block; margin-bottom: 2px; }
          .compact-step-text span { font-size: 12px; color: #888; }
          .compact-widget { width: 320px; flex-shrink: 0; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px -8px rgba(0,0,0,0.16); }
          .compact-widget iframe { width: 100%; height: 420px; border: none; display: block; }

          .divider-section { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
          .divider-line { border: none; border-top: 1px solid #e0e0de; margin: 8px 0; }

          /* params section */
          .params-section { margin: 32px auto 48px; max-width: 1200px; padding: 0 24px; }
          .params-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
          .param-card { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px -4px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05); }
          .param-card iframe { display: block; width: 100%; height: 400px; border: none; }
          .param-card-footer { padding: 14px 16px; border-top: 1px solid #f0f0f0; }
          .param-card-name { font-size: 12px; font-weight: 700; color: #1a1a1a; margin-bottom: 6px; }
          .param-card-code { font-family: 'SF Mono','Fira Code',monospace; font-size: 11px; color: #555; background: #f5f5f5; border-radius: 7px; padding: 8px 10px; line-height: 1.6; word-break: break-all; }

          @media (max-width: 900px) { .params-grid { grid-template-columns: repeat(2,1fr); } }
          @media (max-width: 560px) { .params-grid { grid-template-columns: 1fr; } }
        `}</style>
      </head>
      <body>

        <div className="topnav">
          <span className="topnav-logo">{name}</span>
          <a href="#split">Split</a>
          <a href="#hero">Hero</a>
          <a href="#centered">Centered</a>
          <a href="#sidebar">Sidebar</a>
          <a href="#fullwidth">Full-width</a>
          <a href="#compact">Compact</a>
          <a href="#params">Style params</a>
        </div>

        {/* 1. Split */}
        <div className="variant" id="split">
          <div className="variant-label">Layout 1</div>
          <div className="variant-title">Split — text left, widget right</div>
          <div className="mocksite">
            <div className="mocksite-bar">
              <div className="mocksite-dot" style={{background:'#ff5f57'}} />
              <div className="mocksite-dot" style={{background:'#febc2e'}} />
              <div className="mocksite-dot" style={{background:'#28c840'}} />
              <div className="mocksite-url" />
            </div>
            <div className="mock-nav">
              <span className="mock-nav-logo">{name}</span>
              <div className="mock-nav-links"><span>Services</span><span>About</span><span>Contact</span></div>
            </div>
            <div className="split-body">
              <div className="split-content">
                <h2>Get an instant quote</h2>
                <p>Know your fare before you book. Our AI gives you an exact price in seconds — no phone calls, no waiting.</p>
                <ul>
                  <li><span className="check">✓</span> Airport pickups & drop-offs</li>
                  <li><span className="check">✓</span> CMH and Rickenbacker covered</li>
                  <li><span className="check">✓</span> Book right in the chat</li>
                  <li><span className="check">✓</span> No account needed</li>
                </ul>
              </div>
              <div className="split-widget">
                <iframe src={src()} title="Quote widget" allow="clipboard-write" />
              </div>
            </div>
            <div className="mock-footer">&copy; {new Date().getFullYear()} {name}</div>
          </div>
        </div>

        <div className="divider-section"><div className="divider-line" /></div>

        {/* 2. Hero embed */}
        <div className="variant" id="hero">
          <div className="variant-label">Layout 2</div>
          <div className="variant-title">Hero — widget in the banner</div>
          <div className="mocksite">
            <div className="mocksite-bar">
              <div className="mocksite-dot" style={{background:'#ff5f57'}} />
              <div className="mocksite-dot" style={{background:'#febc2e'}} />
              <div className="mocksite-dot" style={{background:'#28c840'}} />
              <div className="mocksite-url" />
            </div>
            <div className="hero-body">
              <div className="hero-text">
                <h2>Professional rides across Central Ohio</h2>
                <p>Airports, events, or anywhere you need to go. Get your price instantly on the right.</p>
              </div>
              <div className="hero-widget">
                <iframe src={src('#1e3a8a')} title="Quote widget" allow="clipboard-write" />
              </div>
            </div>
            <div className="mock-footer">&copy; {new Date().getFullYear()} {name}</div>
          </div>
        </div>

        <div className="divider-section"><div className="divider-line" /></div>

        {/* 3. Centered */}
        <div className="variant" id="centered">
          <div className="variant-label">Layout 3</div>
          <div className="variant-title">Centered — standalone quote section</div>
          <div className="mocksite">
            <div className="mocksite-bar">
              <div className="mocksite-dot" style={{background:'#ff5f57'}} />
              <div className="mocksite-dot" style={{background:'#febc2e'}} />
              <div className="mocksite-dot" style={{background:'#28c840'}} />
              <div className="mocksite-url" />
            </div>
            <div className="mock-nav">
              <span className="mock-nav-logo">{name}</span>
              <div className="mock-nav-links"><span>Services</span><span>About</span><span>Contact</span></div>
            </div>
            <div className="centered-body">
              <div className="centered-head">
                <h2>How much will my ride cost?</h2>
                <p>Enter your pickup and destination and get a price instantly.</p>
              </div>
              <div className="centered-card">
                <iframe src={src('#15803d')} title="Quote widget" allow="clipboard-write" />
              </div>
            </div>
            <div className="mock-footer">&copy; {new Date().getFullYear()} {name}</div>
          </div>
        </div>

        <div className="divider-section"><div className="divider-line" /></div>

        {/* 4. Sidebar */}
        <div className="variant" id="sidebar">
          <div className="variant-label">Layout 4</div>
          <div className="variant-title">Sidebar — pinned quote widget beside content</div>
          <div className="mocksite">
            <div className="mocksite-bar">
              <div className="mocksite-dot" style={{background:'#ff5f57'}} />
              <div className="mocksite-dot" style={{background:'#febc2e'}} />
              <div className="mocksite-dot" style={{background:'#28c840'}} />
              <div className="mocksite-url" />
            </div>
            <div className="mock-nav">
              <span className="mock-nav-logo">{name}</span>
              <div className="mock-nav-links"><span>Services</span><span>About</span><span>Contact</span></div>
            </div>
            <div className="sidebar-body">
              <div className="sidebar-content">
                <h2>Airport Transportation</h2>
                <p>We provide reliable, on-time airport transportation to and from both Columbus airports. Track your flight, meet you at arrivals, and get you there stress-free.</p>
                <div className="sidebar-img" />
                <p>Whether it's an early morning departure or a late-night arrival, we have you covered with professional drivers who know the area.</p>
                <div className="sidebar-img2" />
              </div>
              <div className="sidebar-right">
                <span className="sidebar-widget-label">Quick quote</span>
                <iframe src={src('#6d28d9')} title="Quote widget" allow="clipboard-write" />
              </div>
            </div>
            <div className="mock-footer">&copy; {new Date().getFullYear()} {name}</div>
          </div>
        </div>

        <div className="divider-section"><div className="divider-line" /></div>

        {/* 5. Full-width */}
        <div className="variant" id="fullwidth">
          <div className="variant-label">Layout 5</div>
          <div className="variant-title">Full-width — quote as a page-wide block</div>
          <div className="mocksite">
            <div className="mocksite-bar">
              <div className="mocksite-dot" style={{background:'#ff5f57'}} />
              <div className="mocksite-dot" style={{background:'#febc2e'}} />
              <div className="mocksite-dot" style={{background:'#28c840'}} />
              <div className="mocksite-url" />
            </div>
            <div className="mock-nav">
              <span className="mock-nav-logo">{name}</span>
              <div className="mock-nav-links"><span>Services</span><span>About</span><span>Contact</span></div>
            </div>
            <div className="fullwidth-top">
              <div>
                <h2>Ready to book your ride?</h2>
                <p>Get an instant price and lock in your trip below.</p>
              </div>
            </div>
            <div className="fullwidth-widget">
              <iframe src={src('#be123c')} title="Quote widget" allow="clipboard-write" />
            </div>
            <div className="mock-footer">&copy; {new Date().getFullYear()} {name}</div>
          </div>
        </div>

        <div className="divider-section"><div className="divider-line" /></div>

        {/* 6. Compact pop-in */}
        <div className="variant" id="compact">
          <div className="variant-label">Layout 6</div>
          <div className="variant-title">Compact — steps left, widget right</div>
          <div className="mocksite">
            <div className="mocksite-bar">
              <div className="mocksite-dot" style={{background:'#ff5f57'}} />
              <div className="mocksite-dot" style={{background:'#febc2e'}} />
              <div className="mocksite-dot" style={{background:'#28c840'}} />
              <div className="mocksite-url" />
            </div>
            <div className="mock-nav">
              <span className="mock-nav-logo">{name}</span>
              <div className="mock-nav-links"><span>Services</span><span>About</span><span>Contact</span></div>
            </div>
            <div className="compact-body">
              <div className="compact-text">
                <h2>Booking is simple</h2>
                <p>Three steps and you're done — no app, no account, no hassle.</p>
                <div className="compact-steps">
                  <div className="compact-step">
                    <div className="compact-step-num">1</div>
                    <div className="compact-step-text">
                      <strong>Enter your route</strong>
                      <span>Pickup address and destination — use the quick buttons for airports.</span>
                    </div>
                  </div>
                  <div className="compact-step">
                    <div className="compact-step-num">2</div>
                    <div className="compact-step-text">
                      <strong>Get your price</strong>
                      <span>The AI responds instantly with an exact fare.</span>
                    </div>
                  </div>
                  <div className="compact-step">
                    <div className="compact-step-num">3</div>
                    <div className="compact-step-text">
                      <strong>Confirm & you're booked</strong>
                      <span>Give your name, number, and pickup time — that's it.</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="compact-widget">
                <iframe src={src('#334155')} title="Quote widget" allow="clipboard-write" />
              </div>
            </div>
            <div className="mock-footer">&copy; {new Date().getFullYear()} {name}</div>
          </div>
        </div>

        <div className="divider-section"><div className="divider-line" /></div>

        {/* Style params */}
        <div className="params-section" id="params">
          <div className="variant-label">Style params</div>
          <div className="variant-title">Customize with URL params — mix and match</div>
          <div className="params-grid">
            {PARAM_EXAMPLES.map((ex) => (
              <div key={ex.name} className="param-card">
                <iframe src={ex.url} title={ex.name} allow="clipboard-write" />
                <div className="param-card-footer">
                  <div className="param-card-name">{ex.name}</div>
                  <div className="param-card-code">{ex.code}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{height: '48px'}} />

      </body>
    </html>
  )
}
