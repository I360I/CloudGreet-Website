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
import { motion, AnimatePresence } from 'framer-motion'
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

type Desk = { v: string; biz: string; cat: string; name: string; tags: string; clip: string; hint: string }
const DESKS: Desk[] = [
  { v: 'hvac', biz: 'Apex Air & Heat', cat: 'HVAC', name: 'Marcus', tags: 'AC repair · installs · emergencies', clip: '/talk-hvac.mp4', hint: '“My AC stopped working and it’s 95 out.”' },
  { v: 'electrical', biz: 'Bright Spark Electric', cat: 'Electrical', name: 'Dave', tags: 'Panels · outlets · 24/7 calls', clip: '/talk-electrical.mp4', hint: '“Half my outlets just went dead.”' },
  { v: 'carservice', biz: "Steve's Car Service", cat: 'Car service', name: 'Sam', tags: 'Airport rides · dispatch · booking', clip: '/talk-carservice.mp4', hint: '“I need a ride to the airport at 6am.”' },
  { v: 'dentist', biz: 'Bright Smile Dental', cat: 'Dental', name: 'Ava', tags: 'Cleanings · new patients · scheduling', clip: '/talk-dentist.mp4', hint: '“Do you have anything open this week?”' },
  { v: 'lawyer', biz: 'Hale & Co. Law', cat: 'Law', name: 'Paul', tags: 'Intakes · consults · scheduling', clip: '/talk-lawyer.mp4', hint: '“I was in a car accident, can someone help?”' },
]
const START = 2 // car service - matches the zoom

export default function AgentDeskReveal({ children }: { children?: React.ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const idleRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const talkRefs = useRef<Array<HTMLVideoElement | null>>([])
  const imgsRef = useRef<HTMLImageElement[]>([])
  const lastDrawnRef = useRef(-1)
  const atDeskRef = useRef(false)

  const [atDesk, setAtDesk] = useState(false)
  const [active, setActive] = useState(START)
  const [dir, setDir] = useState(0)

  const clientRef = useRef<RetellWebClient | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [agentTalking, setAgentTalking] = useState(false)
  const [muted, setMuted] = useState(false)
  const [transcript, setTranscript] = useState<Line[]>([])
  const [level, setLevel] = useState(0)
  const [err, setErr] = useState('')
  const desk = DESKS[active]

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

  // play only the active desk's clip when we're at the desk
  useEffect(() => {
    talkRefs.current.forEach((v, i) => {
      if (!v) return
      if (atDesk && i === active) { v.play().catch(() => {}) } else { try { v.pause() } catch {} }
    })
  }, [atDesk, active])

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
      const res = await fetch('/api/demo/web-call', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ vertical: DESKS[active].v }) })
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
  }, [active, end])

  const toggleMute = useCallback(() => { const c = clientRef.current; if (!c) return; if (muted) { c.unmute(); setMuted(false) } else { c.mute(); setMuted(true) } }, [muted])

  // switching agents ends any active call
  const go = useCallback((next: number, d: number) => {
    const n = (next + DESKS.length) % DESKS.length
    if (n === active) return
    end(); setPhase('idle'); setTranscript([]); setMuted(false)
    setDir(d); setActive(n)
  }, [active, end])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!atDesk) return
      if (e.key === 'ArrowRight') go(active + 1, 1)
      if (e.key === 'ArrowLeft') go(active - 1, -1)
    }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [atDesk, active, go])

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
      ctx.clearRect(0, 0, cw, ch); ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2 + ch * Y_NUDGE, w, h); lastDrawnRef.current = idx
    }
    let raf = 0
    const render = () => {
      const el = trackRef.current
      if (el) {
        const total = el.offsetHeight - window.innerHeight
        const p = total > 0 ? clamp(-el.getBoundingClientRect().top / total, 0, 1) : 0
        const idx = 1 + Math.round(norm(p, SCRUB_START, SCRUB_END) * (N - 1))
        if (idx !== lastDrawnRef.current || lastDrawnRef.current === -1) drawFrame(idx)
        const nowAtDesk = p > SCRUB_END - 0.02
        if (nowAtDesk !== atDeskRef.current) { atDeskRef.current = nowAtDesk; setAtDesk(nowAtDesk) }
        const cross = norm(p, HANDOFF, HANDOFF + 0.08)
        if (idleRef.current?.parentElement) (idleRef.current.parentElement as HTMLElement).style.opacity = String(1 - cross)
        if (canvas) canvas.style.opacity = nowAtDesk ? '0' : String(cross)
        const up = norm(p, 0.04, 0.28)
        if (heroRef.current) {
          heroRef.current.style.transform = `translateY(${-up * 26}vh)`
          heroRef.current.style.opacity = String(1 - up)
          heroRef.current.style.pointerEvents = up > 0.5 ? 'none' : 'auto'
        }
      }
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)
    window.addEventListener('resize', sizeCanvas)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', sizeCanvas) }
  }, [])

  const ring = 1 + Math.min(level * 1.6, 0.5) + (agentTalking ? 0.06 : 0)
  const live = phase === 'live'

  return (
    <section id="hero">
      <div ref={trackRef} style={{ height: '240vh' }}>
        <div ref={stageRef} className="sticky top-0 flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#f6f5f1]">
          {/* isolated blend media (keeps the buttons' frosted glass stable) */}
          <div className="absolute inset-0" style={{ isolation: 'isolate' }}>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 [mask-image:linear-gradient(to_top,black_78%,transparent)]">
              <video ref={idleRef} autoPlay loop muted playsInline preload="auto" className="h-auto w-full mix-blend-multiply">
                <source src="/cganimation.mp4" type="video/mp4" />
              </video>
            </div>
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full mix-blend-multiply"
              style={{ width: '100%', height: '100%', opacity: 0, WebkitMaskImage: MASK, maskImage: MASK }} />
            {/* the 5 agent clips, only the active one shown at the desk */}
            {DESKS.map((d, i) => (
              <video key={d.v} ref={(el) => { talkRefs.current[i] = el }} src={d.clip} muted loop playsInline preload="auto"
                onEnded={(e) => { const v = e.currentTarget; try { v.currentTime = 0; v.play().catch(() => {}) } catch {} }}
                className="absolute inset-0 h-full w-full object-cover mix-blend-multiply transition-opacity duration-500"
                style={{ opacity: atDesk && i === active ? 1 : 0, transform: `translateY(${Y_NUDGE * 100}%)`, WebkitMaskImage: MASK, maskImage: MASK, pointerEvents: 'none' }} />
            ))}
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[55%]"
            style={{ background: 'linear-gradient(to bottom,#f6f5f1 0%,#f6f5f1 26%,rgba(246,245,241,0.4) 60%,rgba(246,245,241,0) 100%)' }} />

          {/* HERO COPY */}
          <div ref={heroRef} className="absolute inset-x-0 top-0 z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-5 pt-24 text-center sm:pt-28">
            {children}
          </div>

          {/* CAROUSEL UI */}
          <div className="absolute inset-0 z-20 transition-opacity duration-500" style={{ opacity: atDesk ? 1 : 0, pointerEvents: atDesk ? 'auto' : 'none' }}>
            {/* glass call panel, left in the open space */}
            <div className="absolute left-6 top-1/2 w-[min(90vw,420px)] -translate-y-1/2 sm:left-12 md:left-20">
              <AnimatePresence mode="wait" custom={dir}>
                <motion.div key={active} custom={dir}
                  initial={{ opacity: 0, x: dir >= 0 ? 40 : -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: dir >= 0 ? -40 : 40 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-[26px] border border-white/60 bg-white/55 p-6 shadow-[0_30px_80px_-24px_rgba(2,32,71,0.35)] backdrop-blur-2xl backdrop-saturate-150 sm:p-7"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" /></span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-600">Live demo · {desk.cat}</span>
                  </div>
                  <h2 className="font-display text-3xl font-medium tracking-tight text-gray-900 sm:text-4xl">{desk.biz}</h2>
                  <p className="mt-1.5 text-sm text-gray-500">{desk.tags}</p>

                  {phase === 'live' || phase === 'connecting' ? (
                    <div className="mt-5">
                      {transcript.slice(-3).length > 0 && (
                        <div className="mb-4 space-y-1.5">
                          {transcript.slice(-3).map((l, i) => (
                            <p key={i} className="text-sm leading-snug">
                              <span className="mr-1.5 text-[10px] uppercase tracking-wide text-gray-400">{l.role === 'agent' ? desk.name : 'You'}</span>
                              <span className={l.role === 'agent' ? 'text-sky-700' : 'text-gray-800'}>{l.content}</span>
                            </p>
                          ))}
                        </div>
                      )}
                      {phase === 'connecting' ? (
                        <div className="rounded-full bg-gray-900 px-6 py-3.5 text-center text-sm font-medium text-white">Connecting…</div>
                      ) : (
                        <div className="flex items-center gap-2.5">
                          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
                            <span className="absolute inset-0 rounded-full bg-sky-400/30 transition-transform duration-75" style={{ transform: `scale(${ring})` }} />
                            <span className="relative text-base">{agentTalking ? '🔊' : '🎙️'}</span>
                          </div>
                          <button onClick={toggleMute} className="flex-1 rounded-full border border-black/10 bg-white/80 px-4 py-3 text-sm font-medium hover:bg-white">{muted ? 'Unmute' : 'Mute'}</button>
                          <button onClick={() => { end(); setPhase('ended') }} className="flex-1 rounded-full bg-red-500 px-4 py-3 text-sm font-medium text-white hover:bg-red-600">End</button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-5">
                      <button onClick={start} className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gray-900 px-6 py-4 text-base font-medium text-white shadow-lg transition hover:bg-gray-800">
                        Talk to {desk.name}
                        <span className="transition-transform group-hover:translate-x-0.5">→</span>
                      </button>
                      <p className="mt-2.5 text-center text-xs text-gray-400">{phase === 'ended' ? 'Call ended — talk again, or try another desk.' : desk.hint}</p>
                      {err && <p className="mt-2 text-center text-sm text-red-500">{err}</p>}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* arrows */}
            <button aria-label="Previous agent" onClick={() => go(active - 1, -1)}
              className="absolute left-2 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/70 text-gray-700 backdrop-blur transition hover:bg-white sm:left-4">‹</button>
            <button aria-label="Next agent" onClick={() => go(active + 1, 1)}
              className="absolute right-2 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/70 text-gray-700 backdrop-blur transition hover:bg-white sm:right-4">›</button>

            {/* pill switcher */}
            <div className="absolute inset-x-0 bottom-7 z-30 flex justify-center px-4">
              <div className="flex max-w-full items-center gap-1.5 overflow-x-auto rounded-full border border-white/60 bg-white/55 p-1.5 backdrop-blur-2xl backdrop-saturate-150">
                {DESKS.map((d, i) => (
                  <button key={d.v} onClick={() => go(i, i > active ? 1 : -1)}
                    className={`whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-medium transition ${i === active ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-black/5'}`}>
                    {d.cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
