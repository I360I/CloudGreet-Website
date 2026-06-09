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
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { Microphone, MicrophoneSlash, PhoneDisconnect, Play } from '@phosphor-icons/react'
import { RetellWebClient } from 'retell-client-js-sdk'

// three.js is heavy + browser-only: load the orb on the client, on demand.
const VoiceOrb = dynamic(() => import('./VoiceOrb'), { ssr: false })

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
  { v: 'electrical', biz: 'Bright Spark Electric', cat: 'Electrical', name: 'Dave', tags: 'Panels · outlets · 24/7 calls', clip: '/talk-electrical.mp4', hint: '“Half my outlets just went dead.”', orbA: '#9cc0ea', orbB: '#2a62a8' },
  { v: 'transport', biz: 'Executive Transport', cat: 'Transport', name: 'Sam', tags: 'Airport rides · dispatch · booking', clip: '/talk-transport.mp4', hint: '“I need a ride to the airport at 6am.”', orbA: '#a3c4ea', orbB: '#356dad' },
  { v: 'dentist', biz: 'Bright Smile Dental', cat: 'Dental', name: 'Ava', tags: 'Cleanings · new patients · scheduling', clip: '/talk-dental.mp4', hint: '“Do you have anything open this week?”', orbA: '#cae2ef', orbB: '#7ba8c0' },
  { v: 'lawyer', biz: 'Hale & Co. Law', cat: 'Law', name: 'Paul', tags: 'Intakes · consults · scheduling', clip: '/talk-law.mp4', hint: '“I was in a car accident, can someone help?”', orbA: '#aad6ea', orbB: '#3f93bb' },
]
const START = 0 // HVAC first (the light-blue waving mascot the zoom lands on)

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
    const onWheel = (e: WheelEvent) => {
      if (!atDeskRef.current) return
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 8) {
        e.preventDefault()
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
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTS, { passive: true })
    window.addEventListener('touchend', onTE, { passive: true })
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('wheel', onWheel); window.removeEventListener('touchstart', onTS); window.removeEventListener('touchend', onTE) }
  }, [go])

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
          // No transform at rest: a transformed ancestor breaks the CTAs'
          // backdrop-filter (they flicker to flat/transparent over the video).
          heroRef.current.style.transform = up > 0.001 ? `translateY(${-up * 26}vh)` : 'none'
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

          {/* CAROUSEL - type on the screen, Apple-glass selector at the bottom */}
          <div className="absolute inset-0 z-20 transition-opacity duration-500" style={{ opacity: atDesk ? 1 : 0, pointerEvents: atDesk ? 'auto' : 'none' }}>
            {/* header */}
            <div className="absolute inset-x-0 top-[21vh] z-10 text-center">
              <p className="font-clash text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">Demo Agents</p>
              <p className="font-gsans mx-auto mt-1.5 max-w-xs text-sm leading-snug text-gray-400">Pick a business and talk to its AI receptionist, live.</p>
            </div>

            {/* always-on voice orb - idle morphs, reacts during a call, color-matched to the agent */}
            <div className="pointer-events-none absolute z-[6] -translate-x-1/2 -translate-y-1/2"
              style={{ left: '45%', top: '58%', width: 'clamp(180px,21vw,300px)', height: 'clamp(180px,21vw,300px)' }}>
              <VoiceOrb levelRef={levelRef} colorA={desk.orbA} colorB={desk.orbB} />
            </div>

            {/* main content - left */}
            <div className="absolute left-8 top-1/2 w-[min(92vw,600px)] -translate-y-1/2 sm:left-14 md:left-24">
              <AnimatePresence mode="wait" custom={dir}>
                <motion.div key={active} custom={dir}
                  initial={{ opacity: 0, x: dir >= 0 ? 44 : -44 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: dir >= 0 ? -44 : 44 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="mb-5 flex items-center gap-2.5">
                    <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-500" /></span>
                    <span className="font-gsans text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">{desk.cat}</span>
                  </div>
                  <h2 className="font-clash text-[clamp(2.9rem,5.8vw,5.4rem)] font-semibold leading-[0.9] tracking-[-0.02em] text-gray-900">{desk.biz}</h2>
                  <p className="font-gsans mt-5 text-lg leading-relaxed text-gray-500">{desk.tags}</p>

                  {phase === 'live' || phase === 'connecting' ? (
                    <div className="mt-8 max-w-md">
                      <div className="mb-4 flex items-center gap-2">
                        <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" /></span>
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">{agentTalking ? `${desk.name} is speaking` : phase === 'connecting' ? 'Connecting' : 'Listening'}</span>
                      </div>
                      <div ref={transcriptRef} className="mb-5 max-h-[30vh] space-y-3 overflow-y-auto pr-2 [scrollbar-width:thin]">
                        {transcript.length === 0 && phase === 'connecting' && <p className="text-gray-400">Connecting…</p>}
                        {transcript.map((l, i) => (
                          <div key={i}>
                            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">{l.role === 'agent' ? desk.name : 'You'}</p>
                            <p className={`text-[17px] leading-snug ${l.role === 'agent' ? 'text-gray-900' : 'text-gray-500'}`}>{l.content}</p>
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
                    <div className="mt-9">
                      <button onClick={start} className="group inline-flex items-center gap-4">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 text-white shadow-[0_12px_30px_-8px_rgba(2,32,71,0.5)] transition-transform group-hover:scale-105">
                          <Play weight="fill" className="ml-0.5 h-5 w-5" />
                        </span>
                        <span className="font-clash text-3xl font-semibold tracking-tight text-gray-900 transition-colors group-hover:text-sky-700">Talk to {desk.name}</span>
                      </button>
                      <p className="font-gsans mt-5 text-[15px] italic text-gray-400">{phase === 'ended' ? 'Call ended — talk again, or pick another agent below.' : desk.hint}</p>
                      {err && <p className="mt-2 text-sm text-red-500">{err}</p>}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Apple liquid-glass selector */}
            <div className="absolute inset-x-0 bottom-8 z-30 flex justify-center px-4">
              <div className="flex items-center gap-1 rounded-full border border-white/60 bg-white/40 p-1.5 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_18px_44px_-16px_rgba(15,23,42,0.35),inset_0_1px_0_0_rgba(255,255,255,0.85),inset_0_-8px_20px_-12px_rgba(255,255,255,0.5)]">
                {DESKS.map((d, i) => (
                  <button key={d.v} onClick={() => go(i, i > active ? 1 : -1)}
                    className={`relative rounded-full px-5 py-2.5 text-sm font-medium transition ${i === active ? 'text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                    {i === active && <motion.span layoutId="sel" className="absolute inset-0 -z-10 rounded-full bg-gray-900 shadow-[0_6px_16px_-6px_rgba(2,32,71,0.6)]" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
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
