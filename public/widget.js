/*
 * CloudGreet website chat widget.
 *
 * Drop one line on any site (WordPress, Squarespace, raw HTML):
 *   <script src="https://cloudgreet.com/widget.js" data-business="BUSINESS_ID" async></script>
 *
 * Optional attributes:
 *   data-label="Chat with us"            launcher aria-label
 *   data-ring="BOOK A RIDE · CHAT · "     curved text around the button
 *                                         (set data-ring="" to hide the ring)
 *   data-autoopen="2000"                  auto-open the chat after N ms (0 = immediately)
 *
 * Injects a floating green launcher with curved rotating text around it, that
 * opens an iframe at /embed/<businessId> on this origin. Namespaced + very
 * high z-index so it never collides with the host theme.
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
  var autoOpen = script.getAttribute('data-autoopen');
  var ringText = script.getAttribute('data-ring');
  if (ringText === null) ringText = 'BOOK A RIDE · CHAT · ';
  var origin = (function () {
    try { return new URL(script.src).origin; } catch (e) { return 'https://cloudgreet.com'; }
  })();

  var GREEN = '#16a34a';
  var Z = 2147483000; // just under the max so nothing of ours is ever covered

  var style = document.createElement('style');
  style.textContent =
    '@keyframes cgPing{75%,100%{transform:scale(2);opacity:0}}' +
    '@keyframes cgSpin{to{transform:rotate(360deg)}}';
  document.head.appendChild(style);

  // Launcher container holds the curved-text ring + the button, anchored in the
  // corner. Container ignores pointer events; only the button is clickable.
  var wrap = document.createElement('div');
  wrap.style.cssText = [
    'position:fixed', 'bottom:16px', 'right:16px', 'width:116px', 'height:116px',
    'z-index:' + (Z + 1), 'pointer-events:none'
  ].join(';');

  // Curved rotating text ring (green text on a circular path, repeated to fill).
  var ring = document.createElement('div');
  ring.style.cssText = 'position:absolute;inset:0;animation:cgSpin 34s linear infinite;transition:opacity .2s ease;';
  // One pass is enough - textLength stretches it evenly around the whole
  // circle, so the letters end up nicely tracked out (doubled only if short).
  var repeated = ringText.length < 16 ? ringText + ringText : ringText;
  ring.innerHTML =
    '<svg width="116" height="116" viewBox="0 0 116 116" style="display:block;overflow:visible">' +
    '<defs><path id="cgRingPath" d="M58,58 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0"/></defs>' +
    '<text font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif" ' +
    'font-size="13" font-weight="800" letter-spacing="1.5" fill="' + GREEN + '" ' +
    'stroke="#ffffff" stroke-width="3" paint-order="stroke" stroke-linejoin="round">' +
    '<textPath href="#cgRingPath" startOffset="0" textLength="289" lengthAdjust="spacing">' +
    repeated + '</textPath></text></svg>';

  // Launcher button (green circle, white chat icon), centered in the ring.
  var btn = document.createElement('button');
  btn.setAttribute('aria-label', label);
  btn.style.cssText = [
    'position:absolute', 'top:50%', 'left:50%', 'transform:translate(-50%,-50%)',
    'width:56px', 'height:56px', 'border-radius:50%', 'border:none', 'cursor:pointer',
    'background:' + GREEN, 'box-shadow:0 14px 36px -8px rgba(22,163,74,0.55)',
    'display:flex', 'align-items:center', 'justify-content:center', 'padding:0',
    'pointer-events:auto', 'transition:transform .15s ease'
  ].join(';');
  btn.onmouseenter = function () { btn.style.transform = 'translate(-50%,-50%) scale(1.06)'; };
  btn.onmouseleave = function () { btn.style.transform = 'translate(-50%,-50%) scale(1)'; };

  var ping = document.createElement('span');
  ping.style.cssText = 'position:absolute;inset:0;border-radius:50%;background:rgba(34,197,94,0.45);animation:cgPing 2.5s cubic-bezier(0,0,0.2,1) infinite;';

  var chatIcon = '<span style="position:relative;display:flex;align-items:center;justify-content:center;width:100%;height:100%;"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></span>';
  var closeIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  function renderClosed() { btn.innerHTML = ''; btn.appendChild(ping); btn.insertAdjacentHTML('beforeend', chatIcon); }
  function renderOpen() { btn.innerHTML = closeIcon; }
  renderClosed();

  // Chat panel (iframe wrapper) - matches the landing panel styling.
  var panel = document.createElement('div');
  panel.style.cssText = [
    'position:fixed', 'bottom:140px', 'right:20px',
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
      if (ringText) ring.style.opacity = '0';
      panel.style.opacity = '1';
      panel.style.transform = 'translateY(0) scale(1)';
      panel.style.pointerEvents = 'auto';
      renderOpen();
    } else {
      if (ringText) ring.style.opacity = '1';
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
    if (ringText) wrap.appendChild(ring);
    wrap.appendChild(btn);
    document.body.appendChild(panel);
    document.body.appendChild(wrap);
  }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);

  if (autoOpen !== null) {
    var delay = parseInt(autoOpen, 10);
    setTimeout(function () { setOpen(true); }, isNaN(delay) ? 0 : delay);
  }
})();
