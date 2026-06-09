"use client"

/**
 * THE HERO. One scene, scroll-linked. The zoom is drawn frame-by-frame on a
 * canvas keyed to scroll position (frames pre-decoded -> no seek lag, smooth
 * BOTH directions): scroll down plays the zoom-in, scroll up plays it in
 * reverse. The wording scrolls up/fades with it. Magnet: nudge down and it
 * pulls to the desk (the pull itself scrubs the zoom forward) and sticks
 * there with the sideways selector; scroll up and it pulls back to the hero
 * (scrubbing the zoom in reverse). At the desk you talk to the AI live via
 * /api/demo/web-call (demo agent only).
 *
 * Hero copy is passed as children. Prototype: one desk. Mobile/reduced-motion:
 * static hero + autoplay clip + dock.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { RetellWebClient } from 'retell-client-js-sdk'

type Phase = 'idle' | 'connecting' | 'live' | 'ended' | 'error'
type Line = { role: string; content: string }

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const norm = (v: number, a: number, b: number) => clamp((v - a) / (b - a), 0, 1)

const N = 73                       // frames f001..f073
const SCRUB_END = 0.8              // zoom maps over p 0..0.8; 0.8..1 holds on the desk
const STICK = 0.86                 // magnet "desk" target
const framePath = (i: number) => `/desk-frames/f${String(i).padStart(3, '0')}.jpg`

const DESK = { vertical: 'carservice', name: "Steve's Car Service", tag: 'Airport rides · dispatch · booking' }
const ROSTER = ['HVAC', 'Electrical', "Steve's Car Service", 'Dentist', 'Lawyer']
const ACTIVE = 2

export default function AgentDeskReveal({ children }: { children?: React.ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  const imgsRef = useRef<HTMLImageElement[]>([])
  const lastDrawnRef = useRef(-1)
  const [reduced, setReduced] = useState(false)
  const [ready, setReady] = useState(false)

  const clientRef = useRef<RetellWebClient | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [agentTalking, setAgentTalking] = useState(false)
  const [muted, setMuted] = useState(false)
  const [transcript, setTranscript] = useState<Line[]>([])
  const [level, setLevel] = useState(0)
  const [err, setErr] = useState('')

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sm = window.matchMedia('(max-width: 767px)')
    const upd = () => setReduced(mq.matches || sm.matches)
    upd(); setReady(true)
    mq.addEventListener('change', upd); sm.addEventListener('change', upd)
    return () => { mq.removeEventListener('change', upd); sm.removeEventListener('change', upd) }
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

  // preload frames + canvas scrub + magnet
  useEffect(() => {
    if (reduced) return
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
      ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h)
      lastDrawnRef.current = idx
    }

    let raf = 0
    const render = () => {
      const el = trackRef.current
      if (el) {
        const total = el.offsetHeight - window.innerHeight
        const p = total > 0 ? clamp(-el.getBoundingClientRect().top / total, 0, 1) : 0
        const idx = 1 + Math.round(norm(p, 0, SCRUB_END) * (N - 1))
        if (idx !== lastDrawnRef.current) drawFrame(idx)
        if (lastDrawnRef.current === -1) drawFrame(idx) // first paint once loaded
        const up = norm(p, 0.02, 0.25)
        if (heroRef.current) {
          heroRef.current.style.transform = `translateY(${-up * 26}vh)`
          heroRef.current.style.opacity = String(1 - up)
          heroRef.current.style.pointerEvents = up > 0.5 ? 'none' : 'auto'
        }
        if (dockRef.current) {
          const rev = norm(p, SCRUB_END - 0.04, STICK)
          dockRef.current.style.opacity = String(rev)
          dockRef.current.style.pointerEvents = rev > 0.6 ? 'auto' : 'none'
        }
      }
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)

    // direction-aware magnet (the pull scrubs the canvas as it scrolls)
    let t: ReturnType<typeof setTimeout> | undefined
    let snapping = false
    let lastY = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      const dir = y > lastY ? 1 : y < lastY ? -1 : 0
      lastY = y
      if (snapping) return
      if (t) clearTimeout(t)
      t = setTimeout(() => {
        const el = trackRef.current; if (!el) return
        const rect = el.getBoundingClientRect()
        const total = el.offsetHeight - window.innerHeight
        if (total <= 0) return
        const absTop = rect.top + window.scrollY
        const p = clamp(-rect.top / total, 0, 1)
        let target: number | null = null
        if (dir >= 0 && p > 0.04 && p < SCRUB_END) target = STICK
        else if (dir < 0 && p > 0.04 && p < STICK) target = 0
        if (target !== null) {
          snapping = true
          window.scrollTo({ top: absTop + target * total, behavior: 'smooth' })
          window.setTimeout(() => { snapping = false; lastY = window.scrollY }, 900)
        }
      }, 150)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', sizeCanvas)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', sizeCanvas); if (t) clearTimeout(t) }
  }, [reduced])

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

  if (ready && reduced) {
    return (
      <section id="hero" className="bg-[#f6f5f1] px-5">
        <div className="mx-auto max-w-5xl pt-6 text-center">{children}</div>
        <video src="/desk-carservice.mp4" poster="/desk-carservice-poster.jpg" autoPlay muted playsInline
          className="mx-auto mt-6 w-full max-w-3xl mix-blend-multiply" onEnded={(e) => (e.currentTarget as HTMLVideoElement).pause()} />
        <div className="mx-auto mt-4 flex max-w-xl flex-col items-center pb-10 text-center">
          <h2 className="font-display text-3xl font-medium tracking-tight">{DESK.name}</h2>
          <p className="mb-4 mt-1 text-gray-500">{DESK.tag}</p>
          {Dock}
        </div>
      </section>
    )
  }

  return (
    <section id="hero">
      <div ref={trackRef} style={{ height: '240vh' }}>
        <div className="sticky top-0 flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#f6f5f1]">
          {/* scroll-linked zoom on canvas; mix-blend drops the white like the hero */}
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full mix-blend-multiply" style={{ width: '100%', height: '100%' }} />
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[55%]"
            style={{ background: 'linear-gradient(to bottom,#f6f5f1 0%,#f6f5f1 26%,rgba(246,245,241,0.4) 60%,rgba(246,245,241,0) 100%)' }} />

          <div ref={heroRef} className="absolute inset-x-0 top-0 z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-5 pt-24 text-center sm:pt-28">
            {children}
          </div>

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
