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

  // Launcher button (white circle, blue glow).
  var btn = document.createElement('button');
  btn.setAttribute('aria-label', label);
  btn.style.cssText = [
    'position:fixed', 'bottom:20px', 'right:20px', 'width:56px', 'height:56px',
    'border-radius:50%', 'border:1px solid rgba(0,0,0,0.05)', 'cursor:pointer', 'background:#fff',
    'box-shadow:0 18px 44px -10px rgba(37,99,235,0.55)', 'z-index:' + (Z + 1),
    'display:flex', 'align-items:center', 'justify-content:center', 'padding:0', 'overflow:visible',
    'transition:transform .15s ease'
  ].join(';');
  btn.onmouseenter = function () { btn.style.transform = 'scale(1.06)'; };
  btn.onmouseleave = function () { btn.style.transform = 'scale(1)'; };

  // Ping ring (only while closed).
  var ping = document.createElement('span');
  ping.style.cssText = 'position:absolute;inset:0;border-radius:50%;background:rgba(59,130,246,0.3);animation:cgPing 2.5s cubic-bezier(0,0,0.2,1) infinite;';

  // Avatar (closed state).
  var avatarWrap = document.createElement('span');
  avatarWrap.style.cssText = 'position:relative;display:block;width:100%;height:100%;border-radius:50%;overflow:hidden;';
  var avatar = document.createElement('img');
  avatar.src = origin + '/chat-agent.png';
  avatar.alt = '';
  avatar.style.cssText = 'width:100%;height:100%;object-fit:cover;object-position:top;display:block;';
  avatarWrap.appendChild(avatar);

  var closeIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  function renderClosed() { btn.innerHTML = ''; btn.appendChild(ping); btn.appendChild(avatarWrap); }
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
