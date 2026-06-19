/*
 * CloudGreet website chat widget.
 *
 * Drop one line on any site (WordPress, Squarespace, raw HTML):
 *   <script src="https://cloudgreet.com/widget.js" data-business="BUSINESS_ID" async></script>
 *
 * Optional attributes:
 *   data-accent="#2563eb"   launcher button color
 *   data-label="Chat"       tooltip / aria-label
 *
 * It injects a floating launcher button that opens an iframe pointing at
 * /embed/<businessId> on this same origin. Everything is namespaced and uses a
 * very high z-index so it never collides with the host theme.
 */
(function () {
  if (window.__cgWidgetLoaded) return;
  window.__cgWidgetLoaded = true;

  var script = document.currentScript || (function () {
    var s = document.getElementsByTagName('script');
    for (var i = s.length - 1; i >= 0; i--) { if (s[i].src && s[i].src.indexOf('widget.js') !== -1) return s[i]; }
    return null;
  })();
  if (!script) return;

  var businessId = script.getAttribute('data-business');
  if (!businessId) { console.error('[CloudGreet] widget.js is missing data-business="<id>"'); return; }

  var accent = script.getAttribute('data-accent') || '#2563eb';
  var label = script.getAttribute('data-label') || 'Chat with us';
  var origin = (function () {
    try { return new URL(script.src).origin; } catch (e) { return 'https://cloudgreet.com'; }
  })();

  var Z = 2147483000; // just under the max so nothing of ours is ever covered

  // Launcher button.
  var btn = document.createElement('button');
  btn.setAttribute('aria-label', label);
  btn.style.cssText = [
    'position:fixed', 'bottom:20px', 'right:20px', 'width:60px', 'height:60px',
    'border-radius:50%', 'border:none', 'cursor:pointer', 'background:' + accent,
    'box-shadow:0 6px 20px rgba(0,0,0,0.22)', 'z-index:' + (Z + 1),
    'display:flex', 'align-items:center', 'justify-content:center',
    'transition:transform .15s ease', 'padding:0'
  ].join(';');
  btn.onmouseenter = function () { btn.style.transform = 'scale(1.06)'; };
  btn.onmouseleave = function () { btn.style.transform = 'scale(1)'; };

  var chatIcon = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
  var closeIcon = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  btn.innerHTML = chatIcon;

  // Chat panel (iframe wrapper).
  var panel = document.createElement('div');
  panel.style.cssText = [
    'position:fixed', 'bottom:92px', 'right:20px',
    'width:min(384px, calc(100vw - 32px))', 'height:min(640px, calc(100vh - 120px))',
    'background:#fff', 'border-radius:16px', 'overflow:hidden',
    'box-shadow:0 12px 48px rgba(0,0,0,0.28)', 'z-index:' + Z,
    'opacity:0', 'transform:translateY(12px) scale(.98)', 'pointer-events:none',
    'transition:opacity .18s ease, transform .18s ease'
  ].join(';');

  var iframe = document.createElement('iframe');
  iframe.src = origin + '/embed/' + encodeURIComponent(businessId);
  iframe.title = 'Chat';
  iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;';
  iframe.setAttribute('allow', 'clipboard-write');
  panel.appendChild(iframe);

  var open = false;
  function toggle() {
    open = !open;
    if (open) {
      panel.style.opacity = '1';
      panel.style.transform = 'translateY(0) scale(1)';
      panel.style.pointerEvents = 'auto';
      btn.innerHTML = closeIcon;
    } else {
      panel.style.opacity = '0';
      panel.style.transform = 'translateY(12px) scale(.98)';
      panel.style.pointerEvents = 'none';
      btn.innerHTML = chatIcon;
    }
  }
  btn.addEventListener('click', toggle);

  function mount() {
    document.body.appendChild(panel);
    document.body.appendChild(btn);
  }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
