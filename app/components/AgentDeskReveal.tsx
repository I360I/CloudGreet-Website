"use client"

/**
 * THE HERO. At rest it's the live hero: the idle call-center loop
 * (/cganimation.mp4) under the headline. As you SCROLL, it crossfades to the
 * zoom and the zoom is scrubbed by scroll position (pre-decoded frames on a
 * canvas -> smooth both ways: down zooms in, up zooms back out). It does NOT
 * autoplay. A slight magnet near the bottom settles you onto the desk, where
 * the live voice dock appears - talk to the AI receptionist via
 * /api/demo/web-call (demo agent only).
 *
 * Hero copy comes in as children.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { RetellWebClient } from 'retell-client-js-sdk'

type Phase = 'idle' | 'connecting' | 'live' | 'ended' | 'error'
type Line = { role: string; content: string }

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const norm = (v: number, a: number, b: number) => clamp((v - a) / (b - a), 0, 1)

const N = 73                       // zoom frames f001..f073 (in /public/desk-frames)
const HANDOFF = 0.04               // idle holds until here, then the zoom takes over (slight delay = smoother)
const SCRUB_START = 0.04           // frames advance from the handoff so motion is continuous (no static beat)
const SCRUB_END = 0.8              // zoom maps over p; 0.8..1 holds on the desk
const STICK = 0.86                 // slight bottom-magnet target
const Y_NUDGE = -0.006             // shift frames up to line the mascots up with the idle loop (fraction of height)
const framePath = (i: number) => `/desk-frames/f${String(i).padStart(3, '0')}.jpg`

const DESK = { vertical: 'carservice', name: "Steve's Car Service", tag: 'Airport rides · dispatch · booking' }
const ROSTER = ['HVAC', 'Electrical', "Steve's Car Service", 'Dentist', 'Lawyer']
const ACTIVE = 2

export default function AgentDeskReveal({ children }: { children?: React.ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const idleRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  const imgsRef = useRef<HTMLImageElement[]>([])
  const lastDrawnRef = useRef(-1)

  const clientRef = useRef<RetellWebClient | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [agentTalking, setAgentTalking] = useState(false)
  const [muted, setMuted] = useState(false)
  const [transcript, setTranscript] = useState<Line[]>([])
  const [level, setLevel] = useState(0)
  const [err, setErr] = useState('')

  // keep the idle loop playing (autoplay can be blocked until interaction)
  useEffect(() => {
    const v = idleRef.current
    if (!v) return
    const play = () => v.play().catch(() => {})
    play()
    v.addEventListener('loadeddata', play)
    const kick = () => play()
    window.addEventListener('pointerdown', kick, { passive: true })
    window.addEventListener('scroll', kick, { passive: true, once: true })
    return () => { v.removeEventListener('loadeddata', play); window.removeEventListener('pointerdown', kick); window.removeEventListener('scroll', kick) }
  }, [])

  useEffect(() => {
    if (phase !== 'live') return
    let raf = 0
    const loop = () => { setLevel(clientRef.current?.analyzerComponent?.calculateVolume?.() ?? 0); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf)
  }, [phase])

  const end = useCallback(() => { try { clientRef.current?.stopCall() } catch {} clientRef.current = null }, [])
  useEffect(() => () => end(), [end])

  const start = useCallback(async () => {
    setErr(''); setTranscript([]); setPhase('connecting')
    try {
      const res = await fetch('/api/demo/web-call', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ vertical: DESK.vertical }) })
      if (!res.ok) { setErr(res.status === 429 ? 'Too many demo calls from here — give it a few minutes.' : 'Could not start the call.'); setPhase('error'); return }
      const { access_token } = await res.json()
      if (!access_token) { setErr('No call token returned.'); setPhase('error'); return }
      const client = new RetellWebClient(); clientRef.current = client
      client.on('call_started', () => setPhase('live'))
      client.on('call_ended', () => setPhase('ended'))
      client.on('agent_start_talking', () => setAgentTalking(true))
      client.on('agent_stop_talking', () => setAgentTalking(false))
      client.on('update', (u: any) => { if (Array.isArray(u?.transcript)) setTranscript(u.transcript) })
      client.on('error', (e: any) => { setErr(String(e?.message || e || 'call error')); end(); setPhase('error') })
      await client.startCall({ accessToken: access_token })
    } catch (e: any) {
      setErr(e?.name === 'NotAllowedError' ? 'Microphone access is needed to talk to the agent.' : (e?.message || 'Failed to start.')); setPhase('error')
    }
  }, [end])

  const toggleMute = useCallback(() => { const c = clientRef.current; if (!c) return; if (muted) { c.unmute(); setMuted(false) } else { c.mute(); setMuted(true) } }, [muted])

  // preload zoom frames + scroll-scrub on canvas + slight bottom magnet
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const imgs: HTMLImageElement[] = []
    for (let i = 1; i <= N; i++) { const im = new Image(); im.src = framePath(i); imgs.push(im) }
    imgsRef.current = imgs

    const sizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(window.innerWidth * dpr)
      canvas.height = Math.floor(window.innerHeight * dpr)
      lastDrawnRef.current = -1
    }
    sizeCanvas()

    const drawFrame = (idx: number) => {
      const im = imgs[idx - 1]
      if (!ctx || !im || !im.complete || im.naturalWidth === 0) return
      const cw = canvas.width, ch = canvas.height
      const scale = Math.max(cw / im.naturalWidth, ch / im.naturalHeight)
      const w = im.naturalWidth * scale, h = im.naturalHeight * scale
      ctx.clearRect(0, 0, cw, ch)
      ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2 + ch * Y_NUDGE, w, h)
      lastDrawnRef.current = idx
    }

    let raf = 0
    const render = () => {
      const el = trackRef.current
      if (el) {
        const total = el.offsetHeight - window.innerHeight
        const p = total > 0 ? clamp(-el.getBoundingClientRect().top / total, 0, 1) : 0
        const idx = 1 + Math.round(norm(p, SCRUB_START, SCRUB_END) * (N - 1))
        if (idx !== lastDrawnRef.current || lastDrawnRef.current === -1) drawFrame(idx)
        // crossfade idle -> canvas a touch later, over a window where the canvas
        // is already scrubbing (moving) so the handoff has no static beat
        const cross = norm(p, HANDOFF, HANDOFF + 0.08)
        if (idleRef.current?.parentElement) (idleRef.current.parentElement as HTMLElement).style.opacity = String(1 - cross)
        if (canvas) canvas.style.opacity = String(cross)
        // headline scrolls up with the scrub
        const up = norm(p, 0.04, 0.32)
        if (heroRef.current) {
          heroRef.current.style.transform = `translateY(${-up * 26}vh)`
          heroRef.current.style.opacity = String(1 - up)
          heroRef.current.style.pointerEvents = up > 0.5 ? 'none' : 'auto'
        }
        // dock appears as the zoom lands
        if (dockRef.current) {
          const rev = norm(p, SCRUB_END - 0.05, STICK)
          dockRef.current.style.opacity = String(rev)
          dockRef.current.style.pointerEvents = rev > 0.6 ? 'auto' : 'none'
        }
      }
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)

    // SLIGHT magnet at the bottom only: if you stop in the lower part of the
    // scrub, gently settle onto the desk. No magnet up top (free scrub).
    let t: ReturnType<typeof setTimeout> | undefined
    let snapping = false
    const onScroll = () => {
      if (snapping) return
      if (t) clearTimeout(t)
      t = setTimeout(() => {
        const el = trackRef.current; if (!el) return
        const rect = el.getBoundingClientRect()
        const total = el.offsetHeight - window.innerHeight
        if (total <= 0) return
        const absTop = rect.top + window.scrollY
        const p = clamp(-rect.top / total, 0, 1)
        if (p > 0.55 && p < STICK - 0.01) {
          snapping = true
          window.scrollTo({ top: absTop + STICK * total, behavior: 'smooth' })
          window.setTimeout(() => { snapping = false }, 700)
        }
      }, 150)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', sizeCanvas)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', sizeCanvas); if (t) clearTimeout(t) }
  }, [])

  const ring = 1 + Math.min(level * 1.6, 0.5) + (agentTalking ? 0.06 : 0)
  const live = phase === 'live'

  const Dock = (
    <div className="flex w-full max-w-xl flex-col items-center gap-4">
      {transcript.slice(-4).length > 0 && (
        <div className="w-full space-y-1.5 rounded-2xl border border-black/5 bg-white/85 p-4 backdrop-blur">
          {transcript.slice(-4).map((l, i) => (
            <div key={i} className="text-sm">
              <span className="mr-2 text-xs uppercase tracking-wide text-gray-400">{l.role === 'agent' ? 'Agent' : 'You'}</span>
              <span className={l.role === 'agent' ? 'text-sky-700' : 'text-gray-800'}>{l.content}</span>
            </div>
          ))}
        </div>
      )}
      {!live && phase !== 'connecting' ? (
        <button onClick={start} className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-8 py-4 text-base font-medium text-white shadow-xl transition hover:bg-gray-800">
          <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-500" /></span>
          {phase === 'ended' ? 'Talk again' : 'Talk to the receptionist'}
        </button>
      ) : phase === 'connecting' ? (
        <div className="rounded-full bg-gray-900 px-8 py-4 text-base font-medium text-white">Connecting…</div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-sky-400/30 transition-transform duration-75" style={{ transform: `scale(${ring})` }} />
            <span className="relative text-lg">{agentTalking ? '🔊' : '🎙️'}</span>
          </div>
          <button onClick={toggleMute} className="rounded-full border border-black/10 bg-white px-6 py-3.5 text-sm font-medium hover:bg-gray-50">{muted ? 'Unmute' : 'Mute'}</button>
          <button onClick={() => { end(); setPhase('ended') }} className="rounded-full bg-red-500 px-7 py-3.5 text-sm font-medium text-white hover:bg-red-600">End call</button>
        </div>
      )}
      {err && <p className="text-sm text-red-500">{err}</p>}
      {phase === 'idle' && <p className="text-xs text-gray-400">Uses your mic · try “I need a ride to the airport tomorrow at 6am.”</p>}
    </div>
  )

  return (
    <section id="hero">
      <div ref={trackRef} style={{ height: '240vh' }}>
        <div className="sticky top-0 flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#f6f5f1]">
          {/* IDLE loop - visible at rest, fades out the instant you scroll */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 [mask-image:linear-gradient(to_top,black_78%,transparent)]">
            <video ref={idleRef} autoPlay loop muted playsInline preload="auto" className="h-auto w-full mix-blend-multiply">
              <source src="/cganimation.mp4" type="video/mp4" />
            </video>
          </div>

          {/* ZOOM - scrubbed by scroll on a canvas (not autoplayed). Top-fade
              mask so the mascots' heads dissolve to white like the idle loop. */}
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full mix-blend-multiply"
            style={{ width: '100%', height: '100%', opacity: 0, WebkitMaskImage: 'linear-gradient(to top, black 64%, transparent 100%)', maskImage: 'linear-gradient(to top, black 64%, transparent 100%)' }} />

          <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[55%]"
            style={{ background: 'linear-gradient(to bottom,#f6f5f1 0%,#f6f5f1 26%,rgba(246,245,241,0.4) 60%,rgba(246,245,241,0) 100%)' }} />

          {/* HERO COPY - scrolls up + fades */}
          <div ref={heroRef} className="absolute inset-x-0 top-0 z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-5 pt-24 text-center sm:pt-28">
            {children}
          </div>

          {/* desk label + talk dock - reveal as the zoom lands */}
          <div ref={dockRef} className="absolute inset-0 z-20 flex flex-col px-6" style={{ opacity: 0 }}>
            <div className="flex justify-center pt-6">
              <div className="flex items-center gap-3 text-xs text-gray-400">
                {ROSTER.map((r, i) => (
                  <span key={r} className={`flex items-center gap-1.5 ${i === ACTIVE ? 'text-gray-900' : ''}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${i === ACTIVE ? 'bg-sky-500' : 'bg-gray-300'}`} />{r}
                  </span>
                ))}
              </div>
            </div>
            <div className="absolute left-8 top-24 sm:left-14">
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-sky-600">Live demo</p>
              <h2 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">{DESK.name}</h2>
              <p className="mt-2 text-gray-500">{DESK.tag}</p>
            </div>
            <div className="mt-auto flex flex-col items-center pb-10">{Dock}</div>
          </div>
        </div>
      </div>
    </section>
  )
}
