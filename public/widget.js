/*
 * CloudGreet website chat widget.
 *
 * Drop one line on any site (WordPress, Squarespace, raw HTML):
 *   <script src="https://cloudgreet.com/widget.js" data-business="BUSINESS_ID" async></script>
 *
 * Optional attributes:
 *   data-label="Chat with us"   tooltip / aria-label
 *
 * Injects a floating launcher (matching the cloudgreet.com chat bubble: white
 * circle, avatar, blue glow + ping) that opens an iframe at /embed/<businessId>
 * on this origin. Namespaced + very high z-index so it never collides with the
 * host theme.
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

  var label = script.getAttribute('data-label') || 'Chat with us';
  var origin = (function () {
    try { return new URL(script.src).origin; } catch (e) { return 'https://cloudgreet.com'; }
  })();

  var Z = 2147483000; // just under the max so nothing of ours is ever covered

  // Keyframes for the ping ring (Tailwind's animate-ping equivalent).
  var style = document.createElement('style');
  style.textContent = '@keyframes cgPing{75%,100%{transform:scale(2);opacity:0}}';
  document.head.appendChild(style);

  // Launcher button (green circle, white chat icon).
  var GREEN = '#16a34a';
  var btn = document.createElement('button');
  btn.setAttribute('aria-label', label);
  btn.style.cssText = [
    'position:fixed', 'bottom:20px', 'right:20px', 'width:56px', 'height:56px',
    'border-radius:50%', 'border:none', 'cursor:pointer', 'background:' + GREEN,
    'box-shadow:0 14px 36px -8px rgba(22,163,74,0.55)', 'z-index:' + (Z + 1),
    'display:flex', 'align-items:center', 'justify-content:center', 'padding:0', 'overflow:visible',
    'transition:transform .15s ease'
  ].join(';');
  btn.onmouseenter = function () { btn.style.transform = 'scale(1.06)'; };
  btn.onmouseleave = function () { btn.style.transform = 'scale(1)'; };

  // Ping ring (only while closed).
  var ping = document.createElement('span');
  ping.style.cssText = 'position:absolute;inset:0;border-radius:50%;background:rgba(34,197,94,0.45);animation:cgPing 2.5s cubic-bezier(0,0,0.2,1) infinite;';

  // White chat-bubble icon (closed state) - inline SVG, no external image.
  var chatIcon = '<span style="position:relative;display:flex;align-items:center;justify-content:center;width:100%;height:100%;"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></span>';
  var closeIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  function renderClosed() { btn.innerHTML = ''; btn.appendChild(ping); btn.insertAdjacentHTML('beforeend', chatIcon); }
  function renderOpen() { btn.innerHTML = closeIcon; }
  renderClosed();

  // Chat panel (iframe wrapper) - matches the landing panel styling.
  var panel = document.createElement('div');
  panel.style.cssText = [
    'position:fixed', 'bottom:88px', 'right:20px',
    'width:min(93vw, 392px)', 'height:min(72vh, 600px)',
    'background:#fff', 'border:1px solid rgba(0,0,0,0.1)', 'border-radius:20px', 'overflow:hidden',
    'box-shadow:0 30px 70px -22px rgba(0,0,0,0.45)', 'z-index:' + Z,
    'opacity:0', 'transform:translateY(24px) scale(.96)', 'transform-origin:bottom right',
    'pointer-events:none', 'transition:opacity .22s cubic-bezier(.22,1,.36,1), transform .22s cubic-bezier(.22,1,.36,1)'
  ].join(';');

  var iframe = document.createElement('iframe');
  iframe.src = origin + '/embed/' + encodeURIComponent(businessId);
  iframe.title = 'Chat';
  iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;';
  iframe.setAttribute('allow', 'clipboard-write');
  panel.appendChild(iframe);

  var open = false;
  function setOpen(v) {
    open = v;
    if (open) {
      panel.style.opacity = '1';
      panel.style.transform = 'translateY(0) scale(1)';
      panel.style.pointerEvents = 'auto';
      renderOpen();
    } else {
      panel.style.opacity = '0';
      panel.style.transform = 'translateY(24px) scale(.96)';
      panel.style.pointerEvents = 'none';
      renderClosed();
    }
  }
  btn.addEventListener('click', function () { setOpen(!open); });

  // The chat UI inside the iframe can ask us to close (the X in its header).
  window.addEventListener('message', function (e) {
    if (e && e.data && e.data.type === 'cg-widget-close') setOpen(false);
  });

  function mount() {
    document.body.appendChild(panel);
    document.body.appendChild(btn);
  }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
