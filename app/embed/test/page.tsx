export default function EmbedTestPage() {
  const src =
    'https://cloudgreet.com/embed/650406c3-5585-446e-958d-0fbcccf54795/quote?layout=side&header=false'

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Smart Ride Central Ohio</title>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0b; color: #fff; }
          .hero { padding: 48px 24px 32px; text-align: center; }
          .hero h1 { font-size: clamp(28px, 6vw, 48px); font-weight: 800; line-height: 1.15; margin-bottom: 12px; }
          .hero p { font-size: 16px; color: rgba(255,255,255,0.55); margin-bottom: 32px; }
          .widget-wrap { margin: 0 auto; padding: 0 16px 48px; max-width: 640px; }
          #cg-wrap { width: 100%; height: 230px; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 32px rgba(0,0,0,0.4); transition: height .3s ease; }
          #cg-wrap iframe { width: 100%; height: 100%; border: none; display: block; }
          .badges { display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; padding: 0 24px 48px; }
          .badge { font-size: 13px; color: rgba(255,255,255,0.4); }
        `}</style>
      </head>
      <body>
        <div className="hero">
          <h1>Airport Rides You<br />Can Count On</h1>
          <p>Columbus · CMH · Rickenbacker · Events · Seniors</p>
        </div>
        <div className="widget-wrap">
          <div id="cg-wrap">
            <iframe src={src} allow="clipboard-write" />
          </div>
        </div>
        <div className="badges">
          <span className="badge">⭐ 5.0 Google Rating</span>
          <span className="badge">✓ Commercially Insured</span>
          <span className="badge">✓ Owner Operated</span>
        </div>
        <script dangerouslySetInnerHTML={{ __html: `
          window.addEventListener('message', function(e) {
            var w = document.getElementById('cg-wrap');
            if (!w || !e.data) return;
            if (e.data.type === 'cg-quote-height') { w.style.height = e.data.height + 'px' }
            if (e.data.type === 'cg-quote-resize-chat') { w.style.height = '480px' }
            if (e.data.type === 'cg-quote-resize-form') { w.style.height = '' }
          });
        ` }} />
      </body>
    </html>
  )
}
