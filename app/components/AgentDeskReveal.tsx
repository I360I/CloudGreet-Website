"use client"

/**
 * Hero -> desk -> talk. Scrolling out of the hero seamlessly continues into
 * a scrubbed zoom (the clip opens on the SAME 5-mascot frame as the hero and
 * gets the same mix-blend-multiply white-drop, so the handoff is invisible),
 * pushes into one mascot who waves, then reveals a LIVE voice demo - you talk
 * to the AI receptionist in-browser via /api/demo/web-call (demo agent only,
 * no real client calendars/SMS).
 *
 * Prototype: one desk (car service). The sideways row of 5 is the next step.
 * Mobile / reduced-motion: autoplay the clip once, then show the talk dock.
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
const ZOOM_P = 0.82 // scrub completes here; remainder reveals the talk dock

export default function AgentDeskReveal() {
  const trackRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const pRef = useRef(0)
  const [reduced, setReduced] = useState(false)
  const [ready, setReady] = useState(false)

  // --- live voice ---
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

  // --- scroll scrub ---
  useEffect(() => {
    if (reduced) return
    const onScroll = () => {
      const el = trackRef.current; if (!el) return
      const total = el.offsetHeight - window.innerHeight
      pRef.current = total > 0 ? clamp(-el.getBoundingClientRect().top / total, 0, 1) : 0
    }
    let raf = 0, cur = 0
    const render = () => {
      const p = pRef.current
      const v = videoRef.current
      if (v && v.duration && !Number.isNaN(v.duration)) {
        const target = norm(p, 0, ZOOM_P) * v.duration
        cur += (target - cur) * 0.2; if (Math.abs(target - cur) < 0.004) cur = target
        try { v.currentTime = cur } catch {}
      }
      const reveal = norm(p, ZOOM_P, 1)
      if (dockRef.current) { dockRef.current.style.opacity = String(reveal); dockRef.current.style.pointerEvents = reveal > 0.6 ? 'auto' : 'none' }
      if (titleRef.current) titleRef.current.style.opacity = String(1 - norm(p, 0.04, 0.3))
      raf = requestAnimationFrame(render)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    onScroll(); raf = requestAnimationFrame(render)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf) }
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

  // Reduced-motion / mobile: no scrub - autoplay once, then the dock.
  if (ready && reduced) {
    return (
      <section id="agent-desk" className="bg-[#f6f5f1] px-5 py-10">
        <video src="/desk-carservice.mp4" poster="/desk-carservice-poster.jpg" autoPlay muted playsInline
          className="mx-auto w-full max-w-3xl mix-blend-multiply" onEnded={(e) => (e.currentTarget as HTMLVideoElement).pause()} />
        <div className="mx-auto mt-6 flex max-w-xl flex-col items-center text-center">
          <h2 className="font-display text-3xl font-medium tracking-tight">{DESK.name}</h2>
          <p className="mb-4 mt-1 text-gray-500">{DESK.tag}</p>
          {Dock}
        </div>
      </section>
    )
  }

  return (
    <section id="agent-desk">
      <div ref={trackRef} style={{ height: '260vh' }}>
        <div className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden bg-[#f6f5f1]">
          {/* same white-drop treatment as the hero so frame 0 matches it */}
          <video ref={videoRef} src="/desk-carservice.mp4" poster="/desk-carservice-poster.jpg" muted playsInline preload="auto"
            className="absolute inset-0 h-full w-full object-cover mix-blend-multiply" />

          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center pt-6">
            <div className="flex items-center gap-3 text-xs text-gray-400">
              {ROSTER.map((r, i) => (
                <span key={r} className={`flex items-center gap-1.5 ${i === ACTIVE ? 'text-gray-900' : ''}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${i === ACTIVE ? 'bg-sky-500' : 'bg-gray-300'}`} />{r}
                </span>
              ))}
            </div>
          </div>

          <div ref={titleRef} className="absolute left-8 top-24 z-10 sm:left-14">
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-sky-600">Live demo</p>
            <h2 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">{DESK.name}</h2>
            <p className="mt-2 text-gray-500">{DESK.tag}</p>
          </div>

          <div ref={dockRef} className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center px-6 pb-10" style={{ opacity: 0 }}>
            {Dock}
          </div>
        </div>
      </div>
    </section>
  )
}
