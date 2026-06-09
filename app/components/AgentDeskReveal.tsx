"use client"

/**
 * THE HERO. Dead-simple and robust: the zoom is a plain <video> that autoplays
 * on load (muted -> always allowed) and plays through once - 5 mascots zooming
 * into one who waves. No scrub, no magnet, no blend mode (those were the things
 * that read as "not playing"). The headline fades as the zoom plays; at the end
 * the live voice dock appears - talk to the AI receptionist in-browser via
 * /api/demo/web-call (demo agent only).
 *
 * Hero copy passed as children. Mobile/reduced-motion: same, just smaller.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { RetellWebClient } from 'retell-client-js-sdk'

type Phase = 'idle' | 'connecting' | 'live' | 'ended' | 'error'
type Line = { role: string; content: string }

const DESK = { vertical: 'carservice', name: "Steve's Car Service", tag: 'Airport rides · dispatch · booking' }
const ROSTER = ['HVAC', 'Electrical', "Steve's Car Service", 'Dentist', 'Lawyer']
const ACTIVE = 2

export default function AgentDeskReveal({ children }: { children?: React.ReactNode }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [copyHidden, setCopyHidden] = useState(false)
  const [zoomDone, setZoomDone] = useState(false)

  const clientRef = useRef<RetellWebClient | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [agentTalking, setAgentTalking] = useState(false)
  const [muted, setMuted] = useState(false)
  const [transcript, setTranscript] = useState<Line[]>([])
  const [level, setLevel] = useState(0)
  const [err, setErr] = useState('')

  // Make sure it actually plays (some browsers ignore the autoPlay attr).
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const tryPlay = () => v.play().catch(() => {})
    if (v.readyState >= 2) tryPlay()
    v.addEventListener('loadeddata', tryPlay)
    // also kick it on first user interaction, just in case
    const kick = () => tryPlay()
    window.addEventListener('scroll', kick, { passive: true, once: true })
    window.addEventListener('pointerdown', kick, { once: true })
    return () => { v.removeEventListener('loadeddata', tryPlay); window.removeEventListener('scroll', kick); window.removeEventListener('pointerdown', kick) }
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
    <section id="hero" className="relative bg-white">
      <div className="relative h-[100dvh] w-full overflow-hidden">
        {/* the zoom - plain autoplaying video, no blend/scrub/magnet */}
        <video
          ref={videoRef}
          src="/desk-carservice.mp4"
          poster="/desk-carservice-poster.jpg"
          autoPlay muted playsInline preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
          onTimeUpdate={(e) => {
            const v = e.currentTarget
            if (v.duration && v.currentTime / v.duration > 0.25) setCopyHidden(true)
          }}
          onEnded={() => setZoomDone(true)}
        />

        {/* hero copy - fades out as the zoom plays */}
        <div
          className="absolute inset-x-0 top-0 z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-5 pt-24 text-center transition-all duration-700 sm:pt-28"
          style={{ opacity: copyHidden ? 0 : 1, transform: copyHidden ? 'translateY(-8vh)' : 'none', pointerEvents: copyHidden ? 'none' : 'auto' }}
        >
          {children}
        </div>

        {/* desk label + talk dock - fade in when the zoom finishes */}
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
    </section>
  )
}
