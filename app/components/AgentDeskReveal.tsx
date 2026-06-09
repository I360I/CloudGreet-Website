"use client"

/**
 * THE HERO. One scene. At rest it's the hero: headline/CTAs over the 5
 * mascots (clip frame 0). As you scroll, the wording scrolls up and fades and
 * the zoom clip PLAYS through (native playback = smooth; not scrubbed), those
 * same mascots pushing in until one waves. Then the live voice dock appears -
 * talk to the AI receptionist in-browser via /api/demo/web-call (demo agent).
 *
 * Playback, not scroll-scrubbing: scrubbing currentTime per scroll frame was
 * choppy, and a cut on fast mid-zoom scroll is acceptable by design. Scroll
 * only (a) scrolls the wording up and (b) triggers play once.
 *
 * Hero copy comes in as children (page.tsx keeps DemoCallButtons). Prototype:
 * one desk. Mobile/reduced-motion: static hero + autoplay clip + dock.
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
  const videoRef = useRef<HTMLVideoElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const playedRef = useRef(false)
  const [reduced, setReduced] = useState(false)
  const [ready, setReady] = useState(false)
  const [zoomDone, setZoomDone] = useState(false)

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

  // Move the wording up by whichever is further: the user's scroll OR the
  // clip's playback - so once it's zooming the copy always clears the dock,
  // even if you stopped scrolling. Scroll only triggers play (no scrubbing).
  useEffect(() => {
    if (reduced) return
    let raf = 0
    const render = () => {
      const el = trackRef.current, v = videoRef.current
      if (el) {
        const total = el.offsetHeight - window.innerHeight
        const p = total > 0 ? clamp(-el.getBoundingClientRect().top / total, 0, 1) : 0
        const scrollUp = norm(p, 0.02, 0.3)
        const vidUp = v && v.duration ? norm(v.currentTime, 0, v.duration * 0.55) : 0
        const up = Math.max(scrollUp, vidUp)
        if (heroRef.current) {
          heroRef.current.style.transform = `translateY(${-up * 26}vh)`
          heroRef.current.style.opacity = String(1 - up)
          heroRef.current.style.pointerEvents = up > 0.5 ? 'none' : 'auto'
        }
        if (v) {
          if (p > 0.06 && !playedRef.current) { playedRef.current = true; v.play().catch(() => {}) }
          if (p < 0.02 && playedRef.current) { playedRef.current = false; setZoomDone(false); try { v.pause(); v.currentTime = 0 } catch {} }
        }
      }
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)
    return () => cancelAnimationFrame(raf)
  }, [reduced])

  // Magnetic snap: when scrolling stops inside the entry band, pull to the
  // nearest endpoint - back to the hero, or down into the desk (which plays
  // the zoom). Past the end it's released so the desk "sticks" with the
  // sideways selector. Skipped once you're committed near the end.
  useEffect(() => {
    if (reduced) return
    const DECIDE = 0.26 // scroll past this into the band -> magnet pulls to the desk
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
        if (p > 0.02 && p < 0.9) {
          const targetP = p < DECIDE ? 0 : 1
          snapping = true
          window.scrollTo({ top: absTop + targetP * total, behavior: 'smooth' })
          window.setTimeout(() => { snapping = false }, 750)
        }
      }, 130)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); if (t) clearTimeout(t) }
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
      <div ref={trackRef} style={{ height: '220vh' }}>
        <div className="sticky top-0 flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#f6f5f1]">
          {/* the ONE scene: same 5 mascots, plays the zoom on scroll */}
          <video ref={videoRef} src="/desk-carservice.mp4" poster="/desk-carservice-poster.jpg"
            muted playsInline preload="auto" onEnded={() => setZoomDone(true)}
            className="absolute inset-0 h-full w-full object-cover mix-blend-multiply" />
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[55%]"
            style={{ background: 'linear-gradient(to bottom,#f6f5f1 0%,#f6f5f1 26%,rgba(246,245,241,0.4) 60%,rgba(246,245,241,0) 100%)' }} />

          {/* HERO COPY - scrolls up + fades */}
          <div ref={heroRef} className="absolute inset-x-0 top-0 z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-5 pt-24 text-center sm:pt-28">
            {children}
          </div>

          {/* desk label + talk dock - appear once the zoom finishes */}
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
