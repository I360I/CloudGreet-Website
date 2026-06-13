"use client"

/**
 * THE HERO + AGENT CAROUSEL.
 *
 * At rest: the idle call-center loop under the headline (like production).
 * Scroll: crossfades to the scroll-scrubbed zoom (canvas frames), pushing into
 * the desks. At the desk it becomes a CAROUSEL of 5 agents (one per business
 * vertical) - each a looping boomerang talking clip with its own glass call
 * panel. Swipe / arrows / pills move between them with sliding transitions.
 * Tap "Talk to <name>" to talk live in-browser via /api/demo/web-call.
 *
 * Demo agents only (no real client calendars). Per-vertical voices share one
 * demo agent for now; distinct personas are a follow-up.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion'
import { metaTrackCustom } from '@/lib/meta-pixel'
import { Microphone, MicrophoneSlash, PhoneDisconnect, Play } from '@phosphor-icons/react'
import { RetellWebClient } from 'retell-client-js-sdk'

type Phase = 'idle' | 'connecting' | 'live' | 'ended' | 'error'
type Line = { role: string; content: string }

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const norm = (v: number, a: number, b: number) => clamp((v - a) / (b - a), 0, 1)

const N = 73
const HANDOFF = 0.04
const SCRUB_START = 0.04
const SCRUB_END = 0.8
const Y_NUDGE = -0.006
const framePath = (i: number) => `/desk-frames/f${String(i).padStart(3, '0')}.jpg`
const MASK = 'linear-gradient(to top, black 64%, transparent 100%)'

type Desk = { v: string; biz: string; cat: string; name: string; tags: string; clip: string; hint: string; orbA: string; orbB: string }
const DESKS: Desk[] = [
  { v: 'hvac', biz: 'Apex Air & Heat', cat: 'HVAC', name: 'Mia', tags: 'AC repair · installs · emergencies', clip: '/talk-hvac.mp4', hint: '“My AC stopped working and it’s 95 out.”', orbA: '#c8e2f2', orbB: '#6fa3c4' },
  { v: 'electrical', biz: 'Bright Spark Electric', cat: 'Electrical', name: 'Dave', tags: 'Panels · outlets · 24/7 calls', clip: '/talk-law.mp4', hint: '“Half my outlets just went dead.”', orbA: '#9cc0ea', orbB: '#2a62a8' },
  { v: 'transport', biz: 'Executive Transport', cat: 'Transport', name: 'Sam', tags: 'Airport rides · dispatch · booking', clip: '/talk-transport.mp4', hint: '“How much for a ride from O’Hare to Naperville?”', orbA: '#a3c4ea', orbB: '#356dad' },
  { v: 'roofing', biz: 'Summit Roofing', cat: 'Roofing', name: 'Ava', tags: 'Repairs · replacements · free estimates', clip: '/talk-dental.mp4', hint: '“I’ve got a leak after that storm.”', orbA: '#cae2ef', orbB: '#7ba8c0' },
  { v: 'lawyer', biz: 'Hale & Co. Law', cat: 'Law', name: 'Paul', tags: 'Intakes · consults · scheduling', clip: '/talk-electrical.mp4', hint: '“I was in a car accident, can someone help?”', orbA: '#aad6ea', orbB: '#3f93bb' },
]
const START = 0 // HVAC first (the light-blue waving mascot the zoom lands on)

// Scroll-scrubbed "flip the computer -> zoom into the white screen" transition
// OUT of the desk view into the next section. One frame-set per agent; only
// agents that have a transition asset get one (others just scroll straight on).
// Disabled on the live site for now: the flip-zoom transition is only half-built
// (one mascot, can be triggered mid-scroll). Re-enable per agent here once all
// the matching clips exist. Empty map = no transition renders or triggers.
const TRANSITIONS: Record<string, { base: string; n: number }> = {}

/**
 * Morphing text (adapted from Magic UI, MIT): the old word melts into the
 * new one via dual blurred layers under an alpha-threshold SVG filter.
 */
function MorphingText({ text, className = '' }: { text: string; className?: string }) {
  const [pair, setPair] = useState({ from: text, to: text })
  const fromRef = useRef<HTMLSpanElement>(null)
  const toRef = useRef<HTMLSpanElement>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    setPair((p) => (text === p.to ? p : { from: p.to, to: text }))
  }, [text])

  useEffect(() => {
    const a = fromRef.current, b = toRef.current
    if (!a || !b) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    if (pair.from === pair.to || reduce) {
      a.style.opacity = '0'; a.style.filter = 'none'
      b.style.opacity = '1'; b.style.filter = 'none'
      return
    }
    const DURATION = 850
    const start = performance.now()
    cancelAnimationFrame(rafRef.current)
    const tick = (now: number) => {
      const f = Math.min(1, (now - start) / DURATION)
      const inv = 1 - f
      b.style.filter = `blur(${Math.min(8 / Math.max(f, 0.01) - 8, 100)}px)`
      b.style.opacity = `${Math.pow(f, 0.4) * 100}%`
      a.style.filter = `blur(${Math.min(8 / Math.max(inv, 0.01) - 8, 100)}px)`
      a.style.opacity = `${Math.pow(inv, 0.4) * 100}%`
      if (f < 1) rafRef.current = requestAnimationFrame(tick)
      else { a.style.opacity = '0'; a.style.filter = 'none'; b.style.filter = 'none' }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [pair])

  return (
    <div className={`relative ${className}`} style={{ filter: 'url(#cg-morph-threshold)' }}>
      {/* current text reserves layout; morph layers paint on top */}
      <span aria-hidden className="invisible block">{pair.to}</span>
      <span ref={fromRef} aria-hidden className="absolute inset-0">{pair.from}</span>
      <span ref={toRef} className="absolute inset-0">{pair.to}</span>
      <svg className="absolute h-0 w-0" aria-hidden>
        <defs>
          <filter id="cg-morph-threshold">
            <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 255 -140" />
          </filter>
        </defs>
      </svg>
    </div>
  )
}

/** macOS-dock magnification for the selector pills (Magic UI Dock style). */
function DockPill({ mouseX, className, onClick, children }: {
  mouseX: MotionValue<number>
  className?: string
  onClick: () => void
  children: React.ReactNode
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const distance = useTransform(mouseX, (v: number) => {
    const b = ref.current?.getBoundingClientRect()
    return b ? v - (b.left + b.width / 2) : Infinity
  })
  const scale = useSpring(useTransform(distance, [-110, 0, 110], [1, 1.18, 1]), { stiffness: 320, damping: 22 })
  const y = useSpring(useTransform(distance, [-110, 0, 110], [0, -6, 0]), { stiffness: 320, damping: 22 })
  return (
    <motion.button ref={ref} onClick={onClick} className={className}
      style={{ scale, y, transformOrigin: 'bottom center' }}>
      {children}
    </motion.button>
  )
}

export default function AgentDeskReveal({ children }: { children?: React.ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const idleRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const raysRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const talkRefs = useRef<Array<HTMLVideoElement | null>>([])
  const imgsRef = useRef<HTMLImageElement[]>([])
  const lastDrawnRef = useRef(-1)
  const atDeskRef = useRef(false)
  // transition-out (flip computer -> zoom to white), scrubbed in the SAME stage
  const mediaRef = useRef<HTMLDivElement>(null)
  const carouselRef = useRef<HTMLDivElement>(null)
  const transCanvasRef = useRef<HTMLCanvasElement>(null)
  const transImgsRef = useRef<HTMLImageElement[]>([])
  const transNRef = useRef(0)
  const lastTransRef = useRef(-1)

  const pillBarRef = useRef<HTMLDivElement>(null)
  const pillRefs = useRef<Array<HTMLDivElement | null>>([])
  const dockX = useMotionValue<number>(Infinity)

  const [atDesk, setAtDesk] = useState(false)
  const [active, setActive] = useState(START)
  const activeRef = useRef(START)
  const [dir, setDir] = useState(0)

  const transcriptRef = useRef<HTMLDivElement>(null)
  const clientRef = useRef<RetellWebClient | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [agentTalking, setAgentTalking] = useState(false)
  const [muted, setMuted] = useState(false)
  const [transcript, setTranscript] = useState<Line[]>([])
  const levelRef = useRef(0)
  const [err, setErr] = useState('')
  const desk = DESKS[active]
  const trans = TRANSITIONS[desk.v]

  // idle loop autoplay (kick on interaction in case it's blocked)
  useEffect(() => {
    const v = idleRef.current; if (!v) return
    const play = () => v.play().catch(() => {})
    play(); v.addEventListener('loadeddata', play)
    const kick = () => play()
    window.addEventListener('pointerdown', kick, { passive: true })
    window.addEventListener('scroll', kick, { passive: true, once: true })
    return () => { v.removeEventListener('loadeddata', play); window.removeEventListener('pointerdown', kick); window.removeEventListener('scroll', kick) }
  }, [])

  // play only the active desk's clip; always start it at frame 0 (the wave),
  // so it links up with the zoom's final wave instead of cutting mid-motion.
  useEffect(() => {
    talkRefs.current.forEach((v, i) => {
      if (!v) return
      if (atDesk && i === active) {
        if (v.paused) { try { v.currentTime = 0 } catch {}; v.play().catch(() => {}) }
      } else {
        try { v.pause(); v.currentTime = 0 } catch {}
      }
    })
  }, [atDesk, active])

  useEffect(() => {
    if (phase !== 'live') { levelRef.current = 0; return }
    let raf = 0
    const loop = () => { levelRef.current = clientRef.current?.analyzerComponent?.calculateVolume?.() ?? 0; raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf)
  }, [phase])

  // keep transcript scrolled to the latest line
  useEffect(() => { const el = transcriptRef.current; if (el) el.scrollTop = el.scrollHeight }, [transcript])

  // phones: the pill bar can overflow - keep the active pill centered in view
  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth >= 640) return
    const bar = pillBarRef.current, btn = pillRefs.current[active]
    if (!bar || !btn) return
    const target = btn.offsetLeft - (bar.clientWidth - btn.offsetWidth) / 2
    bar.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
  }, [active, atDesk])

  const end = useCallback(() => { try { clientRef.current?.stopCall() } catch {} clientRef.current = null }, [])
  useEffect(() => () => end(), [end])

  const start = useCallback(async () => {
    setErr(''); setTranscript([]); setPhase('connecting')

    // iOS Safari: getUserMedia must be CALLED inside the tap gesture. If we
    // fetch the call token first, the gesture window closes by the time the
    // SDK asks for the mic and the permission prompt never shows - the call
    // sits on "Connecting" forever. So: mic first, network second.
    let warmup: MediaStream | null = null
    try {
      warmup = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (e: any) {
      setErr(e?.name === 'NotAllowedError' || e?.name === 'NotFoundError'
        ? 'Microphone access is needed to talk to the agent — check your browser permissions and try again.'
        : (e?.message || 'Could not access the microphone.'))
      setPhase('error')
      return
    }

    // Watchdog: never hang on "Connecting" silently.
    const watchdog = setTimeout(() => {
      setPhase((cur) => {
        if (cur !== 'connecting') return cur
        setErr("Couldn't connect — check that your browser allows the microphone, then try again.")
        try { clientRef.current?.stopCall() } catch {}
        clientRef.current = null
        return 'error'
      })
    }, 15000)
    const settle = () => clearTimeout(watchdog)

    try {
      const res = await fetch('/api/demo/web-call', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ vertical: DESKS[active].v }) })
      if (!res.ok) { settle(); setErr(res.status === 429 ? 'Too many demo calls from here — give it a few minutes.' : 'Could not start the call.'); setPhase('error'); return }
      const { access_token } = await res.json()
      if (!access_token) { settle(); setErr('No call token returned.'); setPhase('error'); return }
      const client = new RetellWebClient(); clientRef.current = client
      const releaseWarmup = () => { if (warmup) { try { warmup.getTracks().forEach((t) => t.stop()) } catch {} warmup = null } }
      client.on('call_started', () => { settle(); releaseWarmup(); setPhase('live'); metaTrackCustom('DemoCallStarted', { vertical: DESKS[activeRef.current]?.v }) })
      client.on('call_ended', () => { settle(); releaseWarmup(); setPhase('ended') })
      client.on('agent_start_talking', () => setAgentTalking(true))
      client.on('agent_stop_talking', () => setAgentTalking(false))
      client.on('update', (u: any) => { if (Array.isArray(u?.transcript)) setTranscript(u.transcript) })
      client.on('error', (e: any) => { settle(); releaseWarmup(); setErr(String(e?.message || e || 'call error')); end(); setPhase('error') })
      // Keep the warmup capture ALIVE through connection: permission is
      // granted (so the SDK's own getUserMedia is instant), and an active
      // capture session is what lets fresh/incognito Chrome sessions play
      // the agent's audio despite autoplay policy. Released on call_started.
      await client.startCall({ accessToken: access_token })
    } catch (e: any) {
      settle()
      setErr(e?.name === 'NotAllowedError' ? 'Microphone access is needed to talk to the agent.' : (e?.message || 'Failed to start.')); setPhase('error')
    } finally {
      if (warmup) { try { warmup.getTracks().forEach((t) => t.stop()) } catch {} }
    }
  }, [active, end])

  const toggleMute = useCallback(() => { const c = clientRef.current; if (!c) return; if (muted) { c.unmute(); setMuted(false) } else { c.mute(); setMuted(true) } }, [muted])

  // switching agents: play the swivel transition over the swap, end any call
  const go = useCallback((next: number, d: number) => {
    const n = (next + DESKS.length) % DESKS.length
    if (n === activeRef.current) return
    activeRef.current = n
    end(); setPhase('idle'); setTranscript([]); setMuted(false)
    setDir(d); setActive(n)
  }, [end])

  // keyboard arrows + sideways scroll/swipe to change agents (at the desk)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!atDeskRef.current) return
      if (e.key === 'ArrowRight') go(activeRef.current + 1, 1)
      if (e.key === 'ArrowLeft') go(activeRef.current - 1, -1)
    }
    let lastSwitch = 0
    // PASSIVE listener: a non-passive wheel listener on window makes WebKit/Safari
    // swallow the default vertical scroll entirely (even when it never calls
    // preventDefault), so trackpad scrolling dies in Safari while arrows still
    // work. We don't need preventDefault here - horizontal back-swipe is already
    // blocked by `overscroll-none` on the body - so detect the sideways swipe and
    // switch agents without touching the event.
    const onWheel = (e: WheelEvent) => {
      if (!atDeskRef.current) return
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 8) {
        const now = Date.now(); if (now - lastSwitch < 420) return
        lastSwitch = now
        go(activeRef.current + (e.deltaX > 0 ? 1 : -1), e.deltaX > 0 ? 1 : -1)
      }
    }
    let tx = 0, ty = 0
    const onTS = (e: TouchEvent) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY }
    const onTE = (e: TouchEvent) => {
      if (!atDeskRef.current) return
      const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(activeRef.current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('touchstart', onTS, { passive: true })
    window.addEventListener('touchend', onTE, { passive: true })
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('wheel', onWheel); window.removeEventListener('touchstart', onTS); window.removeEventListener('touchend', onTE) }
  }, [go])

  // preload the active agent's transition frames (if it has a transition)
  useEffect(() => {
    if (!trans) { transImgsRef.current = []; transNRef.current = 0; lastTransRef.current = -1; return }
    const imgs: HTMLImageElement[] = []
    for (let i = 1; i <= trans.n; i++) { const im = new Image(); im.src = `${trans.base}/f${String(i).padStart(3, '0')}.jpg`; imgs.push(im) }
    transImgsRef.current = imgs; transNRef.current = trans.n; lastTransRef.current = -1
  }, [trans?.base, trans?.n]) // eslint-disable-line react-hooks/exhaustive-deps

  // frames preload + scroll scrub
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')
    const imgs: HTMLImageElement[] = []
    for (let i = 1; i <= N; i++) { const im = new Image(); im.src = framePath(i); imgs.push(im) }
    imgsRef.current = imgs
    const sizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(window.innerWidth * dpr); canvas.height = Math.floor(window.innerHeight * dpr); lastDrawnRef.current = -1
    }
    sizeCanvas()
    const drawFrame = (idx: number) => {
      const im = imgs[idx - 1]; if (!ctx || !im || !im.complete || im.naturalWidth === 0) return
      const cw = canvas.width, ch = canvas.height
      const scale = Math.max(cw / im.naturalWidth, ch / im.naturalHeight)
      const w = im.naturalWidth * scale, h = im.naturalHeight * scale
      // Portrait phones: bias the cover-crop toward the mascot (~75% from the
      // left in the frames). 0.5 on >=640px reproduces the old centered math
      // exactly, so desktop is untouched.
      const focusX = window.innerWidth < 640 ? 0.75 : 0.5
      ctx.clearRect(0, 0, cw, ch); ctx.drawImage(im, cw / 2 - focusX * w, (ch - h) / 2 + ch * Y_NUDGE, w, h); lastDrawnRef.current = idx
    }
    // transition-out frames draw into their own canvas (self-sizing)
    const drawTransFrame = (idx: number) => {
      const tc = transCanvasRef.current; const im = transImgsRef.current[idx - 1]
      if (!tc || !im || !im.complete || im.naturalWidth === 0) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const cw = Math.floor(window.innerWidth * dpr), ch = Math.floor(window.innerHeight * dpr)
      if (tc.width !== cw || tc.height !== ch) { tc.width = cw; tc.height = ch }
      const tctx = tc.getContext('2d'); if (!tctx) return
      const scale = Math.max(cw / im.naturalWidth, ch / im.naturalHeight)
      const w = im.naturalWidth * scale, h = im.naturalHeight * scale
      tctx.clearRect(0, 0, cw, ch); tctx.drawImage(im, (cw - w) / 2, (ch - h) / 2 + ch * Y_NUDGE, w, h)
    }
    let raf = 0
    const render = () => {
      const el = trackRef.current
      if (el) {
        // p drives the existing zoom-in + desk over the first 240vh of track
        // (= 140vh of scroll), unchanged whether or not a transition follows.
        const vh = window.innerHeight
        const deskScroll = 1.4 * vh
        const scrolled = -el.getBoundingClientRect().top
        const p = clamp(scrolled / deskScroll, 0, 1)
        const idx = 1 + Math.round(norm(p, SCRUB_START, SCRUB_END) * (N - 1))
        if (idx !== lastDrawnRef.current || lastDrawnRef.current === -1) drawFrame(idx)
        const nowAtDesk = p > SCRUB_END - 0.02
        if (nowAtDesk !== atDeskRef.current) {
          atDeskRef.current = nowAtDesk; setAtDesk(nowAtDesk)
          // Scrolling back UP out of the desk view: snap back to the first
          // (HVAC, waving) mascot the zoom lands on. Otherwise, if another desk
          // (e.g. Law) was selected, scrolling down replays the HVAC zoom but
          // cuts to the wrong mascot at the handoff. Also end any live call.
          if (!nowAtDesk && activeRef.current !== START) {
            activeRef.current = START; setActive(START); setDir(0)
            end(); setPhase('idle'); setTranscript([]); setMuted(false)
          }
        }
        const cross = norm(p, HANDOFF, HANDOFF + 0.08)
        if (idleRef.current?.parentElement) (idleRef.current.parentElement as HTMLElement).style.opacity = String(1 - cross)
        if (canvas) canvas.style.opacity = nowAtDesk ? '0' : String(cross)
        const up = norm(p, 0.04, 0.28)
        if (heroRef.current) {
          // No transform at rest: a transformed ancestor breaks the CTAs'
          // backdrop-filter (they flicker to flat/transparent over the video).
          heroRef.current.style.transform = up > 0.001 ? `translateY(${-up * 26}vh)` : 'none'
          heroRef.current.style.opacity = String(1 - up)
          heroRef.current.style.pointerEvents = up > 0.5 ? 'none' : 'auto'
        }
        // light rays fade out with the hero copy as the zoom takes over
        if (raysRef.current) raysRef.current.style.opacity = String(1 - up)
        // transition-out: scrub the flip-to-white in THIS same pinned stage,
        // after the desk. Fade the desk media + UI out as the flip takes over,
        // so there's never two scenes stacked.
        const totalScroll = el.offsetHeight - vh
        const transScroll = Math.max(totalScroll - deskScroll, 1)
        const pt = transNRef.current > 0 ? clamp((scrolled - deskScroll) / transScroll, 0, 1) : 0
        const tc = transCanvasRef.current
        if (tc) {
          if (pt > 0 && transImgsRef.current.length) {
            const tIdx = 1 + Math.round(pt * (transNRef.current - 1))
            if (tIdx !== lastTransRef.current) { drawTransFrame(tIdx); lastTransRef.current = tIdx }
            tc.style.opacity = String(clamp(pt / 0.03, 0, 1))
          } else { tc.style.opacity = '0'; lastTransRef.current = -1 }
        }
        const deskFade = 1 - clamp(pt / 0.05, 0, 1)
        if (mediaRef.current) mediaRef.current.style.opacity = String(deskFade)
        if (carouselRef.current) {
          carouselRef.current.style.opacity = String(deskFade)
          // only intercept clicks when actually at the desks (not over the hero
          // CTAs above, and not mid-transition) - else the full-screen wrapper
          // eats clicks on the hero buttons.
          carouselRef.current.style.pointerEvents = atDeskRef.current && pt <= 0.02 ? 'auto' : 'none'
        }
      }
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)
    window.addEventListener('resize', sizeCanvas)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', sizeCanvas) }
  }, [])

  return (
    <section id="hero">
      <div ref={trackRef} className="relative" style={{ height: trans ? '460vh' : '240vh' }}>
        {/* nav "Demo Agents" target: jumps to the scroll point where the desks are active */}
        <div id="demo" aria-hidden className="pointer-events-none absolute left-0" style={{ top: '126vh' }} />
        <div ref={stageRef} className="sticky top-0 flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#f6f5f1]">
          {/* isolated blend media (keeps the buttons' frosted glass stable) */}
          <div ref={mediaRef} className="absolute inset-0" style={{ isolation: 'isolate' }}>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 [mask-image:linear-gradient(to_top,black_78%,transparent)]">
              <video ref={idleRef} autoPlay loop muted playsInline preload="auto" className="h-auto w-full max-sm:h-[46vh] max-sm:object-cover mix-blend-multiply">
                <source src="/cganimation.mp4" type="video/mp4" />
              </video>
            </div>
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full mix-blend-multiply"
              style={{ width: '100%', height: '100%', opacity: 0, WebkitMaskImage: MASK, maskImage: MASK }} />
            {/* the 5 agent clips, only the active one shown at the desk */}
            {DESKS.map((d, i) => (
              <video key={d.v} ref={(el) => { talkRefs.current[i] = el }} src={d.clip} muted loop playsInline preload="auto"
                onEnded={(e) => { const v = e.currentTarget; try { v.currentTime = 0; v.play().catch(() => {}) } catch {} }}
                className="absolute inset-0 h-full w-full object-cover max-sm:object-[75%_50%] mix-blend-multiply transition-opacity duration-500"
                style={{ opacity: atDesk && i === active ? 1 : 0, transform: `translateY(${Y_NUDGE * 100}%)`, WebkitMaskImage: MASK, maskImage: MASK, pointerEvents: 'none' }} />
            ))}
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[55%]"
            style={{ background: 'linear-gradient(to bottom,#f6f5f1 0%,#f6f5f1 26%,rgba(246,245,241,0.4) 60%,rgba(246,245,241,0) 100%)' }} />

          {/* LIGHT RAYS - soft beams from above, behind the copy */}
          <div ref={raysRef} aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-[74%] overflow-hidden">
            {[
              { left: '4%',  rot: '-19deg', w: '9%',  core: 0.20, dur: '11s', delay: '0s' },
              { left: '20%', rot: '-11deg', w: '13%', core: 0.26, dur: '14s', delay: '-3s' },
              { left: '37%', rot: '-4deg',  w: '8%',  core: 0.18, dur: '9.5s', delay: '-6s' },
              { left: '52%', rot: '4deg',   w: '14%', core: 0.28, dur: '12.5s', delay: '-1.5s' },
              { left: '70%', rot: '12deg',  w: '10%', core: 0.20, dur: '10.5s', delay: '-7s' },
              { left: '85%', rot: '20deg',  w: '12%', core: 0.24, dur: '13.5s', delay: '-4.5s' },
            ].map((r, i) => (
              <div key={i} className="cg-ray" style={{
                left: r.left,
                width: r.w,
                ['--ray-rot' as string]: r.rot,
                ['--ray-core' as string]: r.core,
                animationDuration: r.dur,
                animationDelay: r.delay,
              }} />
            ))}
          </div>

          {/* HERO COPY */}
          <div ref={heroRef} className="absolute inset-x-0 top-0 z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-5 pt-24 text-center sm:pt-28">
            {children}
          </div>

          {/* CAROUSEL - type on the screen, Apple-glass selector at the bottom.
              Outer wrapper opacity is rAF-driven for the transition-out fade;
              inner keeps the React atDesk reveal. Separate elements so they don't
              fight over the same style property. */}
          <div ref={carouselRef} className="pointer-events-none absolute inset-0 z-20">
          <div className="absolute inset-0 transition-opacity duration-500" style={{ opacity: atDesk ? 1 : 0, pointerEvents: atDesk ? 'auto' : 'none' }}>
            {/* header */}
            <div className="pointer-events-none absolute inset-x-0 top-[17vh] max-sm:top-[10vh] z-10 text-center">
              <p className="font-clash text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">Demo Agents</p>
              <p className="font-gsans mx-auto mt-1.5 max-w-xs text-sm leading-snug text-gray-400">Pick a business and talk to its AI receptionist, live.</p>
            </div>

            {/* main content - left */}
            <div className="absolute left-8 top-1/2 w-[min(92vw,600px)] -translate-y-1/2 sm:left-14 md:left-24 max-sm:left-5 max-sm:top-[42%] max-sm:w-[68vw]">
              <motion.div key={`cat-${active}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }}
                className="mb-5 flex items-center gap-2.5">
                <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-500" /></span>
                <span className="font-gsans text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">{desk.cat}</span>
              </motion.div>
              {/* the business name melts between agents (Magic UI morphing text) */}
              <MorphingText
                text={desk.biz}
                className="font-clash text-[clamp(2.9rem,5.8vw,5.4rem)] max-sm:text-[2.05rem] font-semibold leading-[0.9] max-sm:leading-[0.95] tracking-[-0.02em] text-gray-900"
              />
              <AnimatePresence mode="wait" custom={dir}>
                <motion.div key={active} custom={dir}
                  initial={{ opacity: 0, x: dir >= 0 ? 44 : -44 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: dir >= 0 ? -44 : 44 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <p className="font-gsans mt-5 max-sm:mt-2.5 text-lg max-sm:text-sm leading-relaxed text-gray-500">{desk.tags}</p>

                  {phase === 'live' || phase === 'connecting' ? (
                    <div className="mt-8 max-w-md">
                      <div className="mb-4 flex items-center gap-2">
                        <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" /></span>
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">{agentTalking ? `${desk.name} is speaking` : phase === 'connecting' ? 'Connecting' : 'Listening'}</span>
                      </div>
                      <div ref={transcriptRef} className="mb-5 max-h-[30vh] max-sm:max-h-[22vh] space-y-3 overflow-y-auto pr-2 [scrollbar-width:thin]">
                        {transcript.length === 0 && phase === 'connecting' && <p className="text-gray-400">Connecting…</p>}
                        {transcript.map((l, i) => (
                          <div key={i}>
                            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">{l.role === 'agent' ? desk.name : 'You'}</p>
                            <p className={`text-[17px] max-sm:text-[15px] leading-snug ${l.role === 'agent' ? 'text-gray-900' : 'text-gray-500'}`}>{l.content}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-5">
                        <button onClick={toggleMute} className="inline-flex items-center gap-2 text-base font-medium text-gray-600 transition hover:text-gray-900">
                          {muted ? <MicrophoneSlash className="h-4 w-4" /> : <Microphone className="h-4 w-4" />}{muted ? 'Unmute' : 'Mute'}
                        </button>
                        <button onClick={() => { end(); setPhase('ended') }} className="inline-flex items-center gap-2 text-base font-medium text-red-500 transition hover:text-red-600">
                          <PhoneDisconnect weight="fill" className="h-4 w-4" />End call
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-9 max-sm:mt-5">
                      <button onClick={start} className="group inline-flex items-center gap-4 max-sm:gap-3">
                        <span className="flex h-14 w-14 max-sm:h-11 max-sm:w-11 items-center justify-center rounded-full bg-gray-900 text-white ring-1 ring-gray-900/10 shadow-md transition-all duration-200 group-hover:bg-sky-600 group-hover:shadow-lg group-hover:scale-105">
                          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-[22px] w-[22px] max-sm:h-[18px] max-sm:w-[18px] translate-x-[1px]"><path d="M8 5v14l11-7z" /></svg>
                        </span>
                        <span className="font-clash text-3xl max-sm:text-[1.45rem] font-semibold tracking-tight text-gray-900 transition-colors group-hover:text-sky-700">Talk to {desk.name}</span>
                      </button>
                      <p className="font-gsans mt-5 max-sm:mt-3 text-[15px] max-sm:text-[13px] italic text-gray-400">{phase === 'ended' ? 'Call ended — talk again, or pick another agent below.' : desk.hint}</p>
                      {err && <p className="mt-2 text-sm text-red-500">{err}</p>}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Apple liquid-glass selector - container is click-through so its
                full-width dead-zones don't eat clicks on the call controls; only
                the pill itself is interactive. */}
            <div className="pointer-events-none absolute inset-x-0 bottom-8 max-sm:bottom-5 z-30 flex justify-center px-4 max-sm:px-3">
              <div ref={pillBarRef}
                onMouseMove={(e) => dockX.set(e.clientX)}
                onMouseLeave={() => dockX.set(Infinity)}
                className="pointer-events-auto flex items-center gap-1.5 max-sm:gap-1 rounded-full border border-white/60 bg-white/30 p-1.5 max-sm:p-1 max-sm:max-w-full max-sm:overflow-x-auto max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden backdrop-blur-2xl backdrop-saturate-150 shadow-[0_18px_44px_-16px_rgba(15,23,42,0.35),inset_0_1px_0_0_rgba(255,255,255,0.85),inset_0_-8px_20px_-12px_rgba(255,255,255,0.5)]">
                {DESKS.map((d, i) => (
                  <div key={d.v} ref={(el) => { pillRefs.current[i] = el }} className="relative">
                    <DockPill mouseX={dockX} onClick={() => go(i, i > active ? 1 : -1)}
                      className={`relative whitespace-nowrap rounded-full px-5 py-2.5 max-sm:px-2.5 max-sm:py-2 text-sm max-sm:text-[11px] font-medium transition-colors ${i === active
                        ? 'text-white'
                        : 'border border-white/70 bg-white/50 text-gray-600 backdrop-blur-xl shadow-[0_10px_24px_-12px_rgba(15,23,42,0.4),inset_0_1px_0_0_rgba(255,255,255,0.9)] hover:bg-white/70 hover:text-gray-900'}`}>
                      {i === active && <motion.span layoutId="sel" className="absolute inset-0 -z-10 rounded-full bg-gray-900 shadow-[0_6px_16px_-6px_rgba(2,32,71,0.6)]" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                      {d.cat}
                    </DockPill>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </div>
          {/* transition-out canvas: same stage, on top, fades in over the desk */}
          {trans && (
            <div className="pointer-events-none absolute inset-0 z-[40]" style={{ isolation: 'isolate' }}>
              <canvas ref={transCanvasRef} className="absolute inset-0 h-full w-full mix-blend-multiply"
                style={{ opacity: 0, WebkitMaskImage: MASK, maskImage: MASK }} />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
