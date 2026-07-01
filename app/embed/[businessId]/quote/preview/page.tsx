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
  const p = (ps: Record<string, string>) =>
    `${base}?` + Object.entries(ps).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')

  const STACKED = [
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

  const SIDE = [
    { label: 'Side — Default',         url: p({ layout: 'side' }) },
    { label: 'Side — Navy',            url: p({ layout: 'side', accent: '#1e3a8a' }) },
    { label: 'Side — No header',       url: p({ layout: 'side', header: 'false', accent: '#0a0a0b' }) },
  ]

  const expandSnippet = `<div id="cg-wrap" style="position:fixed;bottom:24px;right:24px;width:340px;height:520px;z-index:9999;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.18);transition:all .3s ease">
  <iframe id="cg-iframe" src="${base}" style="width:100%;height:100%;border:none" allow="clipboard-write"></iframe>
</div>
<script>
window.addEventListener('message',function(e){
  var w=document.getElementById('cg-wrap');
  if(!w)return;
  if(e.data&&e.data.type==='cg-quote-expand'){
    w.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:99999;border-radius:0;box-shadow:none;transition:all .3s ease';
  } else if(e.data&&e.data.type==='cg-quote-collapse'){
    w.style.cssText='position:fixed;bottom:24px;right:24px;width:340px;height:520px;z-index:9999;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.18);transition:all .3s ease';
  }
});
</script>`

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{name} — Widget Preview</title>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f2; color: #1a1a1a; padding: 32px 24px 60px; }
          h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
          h2 { font-size: 15px; font-weight: 700; margin: 36px 0 14px; color: #111; }
          .sub { font-size: 13px; color: #888; margin-bottom: 8px; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
          .grid-2 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
          .card { background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
          .card-label { font-size: 12px; font-weight: 600; color: #555; padding: 10px 14px; border-bottom: 1px solid #f0f0f0; }
          .card iframe { display: block; width: 100%; height: 420px; border: none; }
          .card.side-card iframe { height: 280px; }
          pre { background: #1a1a1a; color: #e5e7eb; font-size: 11.5px; line-height: 1.6; padding: 18px 20px; border-radius: 12px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; margin-top: 8px; }
          .expand-demo { background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); margin-top: 8px; }
          .expand-demo-inner { position: relative; background: #e8e9ed; min-height: 480px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
          .mock-site { width: 100%; height: 480px; padding: 28px 32px; display: flex; flex-direction: column; gap: 12px; }
          .mock-bar { height: 14px; background: #d1d5db; border-radius: 4px; }
          .mock-bar.w60 { width: 60%; }
          .mock-bar.w80 { width: 80%; }
          .mock-bar.w40 { width: 40%; }
          @media (max-width: 860px) { .grid, .grid-2 { grid-template-columns: repeat(2,1fr); } }
          @media (max-width: 540px) { .grid, .grid-2 { grid-template-columns: 1fr; } }
        `}</style>
      </head>
      <body>
        <h1>{name} — Quote Widget Preview</h1>
        <p className="sub">All examples are live and interactive.</p>

        <h2>Stacked layout (default)</h2>
        <div className="grid">
          {STACKED.map((ex) => (
            <div key={ex.label} className="card">
              <div className="card-label">{ex.label}</div>
              <iframe src={ex.url} title={ex.label} allow="clipboard-write" />
            </div>
          ))}
        </div>

        <h2>Side-by-side layout — compact, no scrolling</h2>
        <p className="sub">Both fields sit in one row. Great for wider widgets or desktop sidebars. Add <code>?layout=side</code> to the embed URL.</p>
        <div className="grid-2">
          {SIDE.map((ex) => (
            <div key={ex.label} className="card side-card">
              <div className="card-label">{ex.label}</div>
              <iframe src={ex.url} title={ex.label} allow="clipboard-write" />
            </div>
          ))}
        </div>

        <h2>Full-screen expand on mobile</h2>
        <p className="sub">When a user taps an input the widget sends a <code>postMessage</code> to the parent page, which expands it to full screen. Tap an input in the demo below to see it.</p>
        <div className="expand-demo">
          <div className="expand-demo-inner" id="demo-wrap">
            <div className="mock-site">
              <div className="mock-bar w60" />
              <div className="mock-bar w80" />
              <div className="mock-bar w40" />
              <div className="mock-bar w60" style={{ marginTop: 8 }} />
              <div className="mock-bar w80" />
            </div>
            <div id="cg-demo-widget" style={{ position: 'absolute', bottom: 24, right: 24, width: 320, height: 460, borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', transition: 'all .3s ease', zIndex: 10 }}>
              <iframe src={base} style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} allow="clipboard-write" />
            </div>
          </div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var wrap = document.getElementById('demo-wrap');
            var widget = document.getElementById('cg-demo-widget');
            window.addEventListener('message', function(e) {
              if (!widget) return;
              if (e.data && e.data.type === 'cg-quote-expand') {
                widget.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border-radius:0;overflow:hidden;box-shadow:none;transition:all .3s ease;z-index:10';
              } else if (e.data && e.data.type === 'cg-quote-collapse') {
                widget.style.cssText = 'position:absolute;bottom:24px;right:24px;width:320px;height:460px;border-radius:14px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.18);transition:all .3s ease;z-index:10';
              }
            });
          })();
        ` }} />

        <h2>Embed code for Steve's site</h2>
        <p className="sub">Paste this into a Custom HTML block in WordPress. The widget floats bottom-right and goes full-screen when tapped.</p>
        <pre>{expandSnippet}</pre>
      </body>
    </html>
  )
}
