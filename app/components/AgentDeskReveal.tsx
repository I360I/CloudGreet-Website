"use client"

/**
 * THE HERO. At rest it's the live hero: the idle call-center loop
 * (/cganimation.mp4) under the headline - same as production. As you scroll
 * it crossfades to the zoom transition (/desk-carservice.mp4) which plays
 * through once (5 mascots zooming into one who waves), the headline scrolls
 * up, then the live voice dock appears - talk to the AI receptionist via
 * /api/demo/web-call (demo agent only).
 *
 * Both clips keep mix-blend-multiply (drops the white onto the cream page -
 * confirmed working on live). The zoom plays on a scroll trigger (a cut on
 * fast scroll is fine); it isn't scrubbed. Hero copy comes in as children.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { RetellWebClient } from 'retell-client-js-sdk'

type Phase = 'idle' | 'connecting' | 'live' | 'ended' | 'error'
type Line = { role: string; content: string }

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const norm = (v: number, a: number, b: number) => clamp((v - a) / (b - a), 0, 1)

const DESK = { vertical: 'carservice', name: "Steve's Car Service", tag: 'Airport rides · dispatch · booking' }
const ROSTER = ['HVAC', 'Electrical', "Steve's Car Service", 'Dentist', 'Lawyer']
const ACTIVE = 2

export default function AgentDeskReveal({ children }: { children?: React.ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const idleRef = useRef<HTMLVideoElement>(null)
  const zoomRef = useRef<HTMLVideoElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)
  const [started, setStarted] = useState(false)
  const [zoomDone, setZoomDone] = useState(false)

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

  // scroll: move wording up + trigger the zoom once (idle -> zoom crossfade)
  useEffect(() => {
    let raf = 0
    const render = () => {
      const el = trackRef.current
      if (el) {
        const total = el.offsetHeight - window.innerHeight
        const p = total > 0 ? clamp(-el.getBoundingClientRect().top / total, 0, 1) : 0
        const z = zoomRef.current
        const vidUp = z && z.duration && startedRef.current ? norm(z.currentTime, 0, z.duration * 0.5) : 0
        const up = Math.max(norm(p, 0.02, 0.28), vidUp)
        if (heroRef.current) {
          heroRef.current.style.transform = `translateY(${-up * 26}vh)`
          heroRef.current.style.opacity = String(1 - up)
          heroRef.current.style.pointerEvents = up > 0.5 ? 'none' : 'auto'
        }
        if (p > 0.05 && !startedRef.current) {
          startedRef.current = true; setStarted(true)
          const z = zoomRef.current
          if (z) { try { z.currentTime = 0 } catch {}; z.play().catch(() => {}) }
        }
        if (p <= 0.005 && startedRef.current) {
          startedRef.current = false; setStarted(false); setZoomDone(false)
          const z = zoomRef.current; if (z) { try { z.pause(); z.currentTime = 0 } catch {} }
        }
      }
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)
    return () => cancelAnimationFrame(raf)
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
      <div ref={trackRef} style={{ height: '220vh' }}>
        <div className="sticky top-0 flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#f6f5f1]">
          {/* IDLE loop - the live hero scene, visible at rest, fades as the zoom takes over */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 transition-opacity duration-500 [mask-image:linear-gradient(to_top,black_78%,transparent)]"
            style={{ opacity: started ? 0 : 1 }}>
            <video ref={idleRef} autoPlay loop muted playsInline preload="auto" className="h-auto w-full mix-blend-multiply">
              <source src="/cganimation.mp4" type="video/mp4" />
            </video>
          </div>

          {/* ZOOM transition - plays once on scroll */}
          <video ref={zoomRef} src="/desk-carservice.mp4" poster="/desk-carservice-poster.jpg" muted playsInline preload="auto"
            onEnded={() => setZoomDone(true)}
            className="absolute inset-0 h-full w-full object-cover mix-blend-multiply transition-opacity duration-500"
            style={{ opacity: started ? 1 : 0 }} />

          <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[55%]"
            style={{ background: 'linear-gradient(to bottom,#f6f5f1 0%,#f6f5f1 26%,rgba(246,245,241,0.4) 60%,rgba(246,245,241,0) 100%)' }} />

          {/* HERO COPY - scrolls up + fades */}
          <div ref={heroRef} className="absolute inset-x-0 top-0 z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-5 pt-24 text-center sm:pt-28">
            {children}
          </div>

          {/* desk label + talk dock - reveal once the zoom finishes */}
          <div className="absolute inset-0 z-20 flex flex-col px-6 transition-opacity duration-500"
            style={{ opacity: zoomDone ? 1 : 0, pointerEvents: zoomDone ? 'auto' : 'none' }}>
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
