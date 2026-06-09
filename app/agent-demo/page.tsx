"use client"

/**
 * PROTOTYPE - one desk, live voice. Validates the core of the landing
 * concept: zoom to a desk and actually talk to the AI receptionist in the
 * browser. Uses a dedicated DEMO agent via /api/demo/web-call (no real
 * client calendars/SMS). Next step is the sideways row of 5 verticals.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { RetellWebClient } from 'retell-client-js-sdk'

type Phase = 'idle' | 'connecting' | 'live' | 'ended' | 'error'
type Line = { role: string; content: string }

// Prototype desk. The other four are the rest of the carousel.
const DESK = { vertical: 'carservice', name: "Steve's Car Service", tag: 'Airport rides · dispatch · booking' }
const ROSTER = ['HVAC', 'Electrical', "Steve's Car Service", 'Dentist', 'Lawyer']
const ACTIVE = 2

export default function AgentDemoPage() {
  const clientRef = useRef<RetellWebClient | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [agentTalking, setAgentTalking] = useState(false)
  const [muted, setMuted] = useState(false)
  const [transcript, setTranscript] = useState<Line[]>([])
  const [level, setLevel] = useState(0)
  const [err, setErr] = useState<string>('')

  // pulse orb with live mic/agent volume
  useEffect(() => {
    if (phase !== 'live') return
    let raf = 0
    const loop = () => {
      const v = clientRef.current?.analyzerComponent?.calculateVolume?.() ?? 0
      setLevel(v)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  const end = useCallback(() => {
    try { clientRef.current?.stopCall() } catch {}
    clientRef.current = null
  }, [])

  useEffect(() => () => end(), [end])

  const start = useCallback(async () => {
    setErr(''); setTranscript([]); setPhase('connecting')
    try {
      const res = await fetch('/api/demo/web-call', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ vertical: DESK.vertical }),
      })
      if (!res.ok) {
        setErr(res.status === 429 ? 'Too many demo calls from here — give it a few minutes.' : 'Could not start the call.')
        setPhase('error'); return
      }
      const { access_token } = await res.json()
      if (!access_token) { setErr('No call token returned.'); setPhase('error'); return }

      const client = new RetellWebClient()
      clientRef.current = client
      client.on('call_started', () => setPhase('live'))
      client.on('call_ended', () => setPhase('ended'))
      client.on('agent_start_talking', () => setAgentTalking(true))
      client.on('agent_stop_talking', () => setAgentTalking(false))
      client.on('update', (u: any) => { if (Array.isArray(u?.transcript)) setTranscript(u.transcript) })
      client.on('error', (e: any) => { setErr(String(e?.message || e || 'call error')); end(); setPhase('error') })
      await client.startCall({ accessToken: access_token })
    } catch (e: any) {
      setErr(e?.name === 'NotAllowedError' ? 'Microphone access is needed to talk to the agent.' : (e?.message || 'Failed to start.'))
      setPhase('error')
    }
  }, [end])

  const toggleMute = useCallback(() => {
    const c = clientRef.current; if (!c) return
    if (muted) { c.unmute(); setMuted(false) } else { c.mute(); setMuted(true) }
  }, [muted])

  const orbScale = 1 + Math.min(level * 1.8, 0.6) + (agentTalking ? 0.08 : 0)
  const lastLines = transcript.slice(-6)

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#0b1220] text-white">
      {/* arrival video -> desk backdrop */}
      <video
        ref={videoRef} src="/roi-zoom.mp4" poster="/roi-zoom-poster.jpg"
        autoPlay muted playsInline
        className="absolute inset-0 h-full w-full object-cover opacity-60"
        onEnded={(e) => { (e.currentTarget as HTMLVideoElement).pause() }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b1220]/40 via-[#0b1220]/30 to-[#0b1220]/85" />

      {/* roster dots - hint at the sideways carousel */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 text-xs text-white/60">
        {ROSTER.map((r, i) => (
          <span key={r} className={`flex items-center gap-1.5 ${i === ACTIVE ? 'text-white' : ''}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${i === ACTIVE ? 'bg-sky-400' : 'bg-white/30'}`} />
            {r}
          </span>
        ))}
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
        <p className="mb-2 text-sm uppercase tracking-[0.2em] text-sky-300/80">Live demo</p>
        <h1 className="font-display text-4xl sm:text-5xl font-medium tracking-tight">{DESK.name}</h1>
        <p className="mt-2 text-white/60">{DESK.tag}</p>

        {/* the orb */}
        <div className="relative my-10 flex h-44 w-44 items-center justify-center">
          <div
            className="absolute h-32 w-32 rounded-full bg-sky-500/30 blur-xl transition-transform duration-75"
            style={{ transform: `scale(${phase === 'live' ? orbScale : 1})` }}
          />
          <div
            className={`relative flex h-28 w-28 items-center justify-center rounded-full border transition-all
              ${phase === 'live' ? 'border-sky-400/60 bg-sky-500/20' : 'border-white/20 bg-white/5'}`}
            style={{ transform: `scale(${phase === 'live' ? orbScale : 1})` }}
          >
            <span className="text-3xl">{agentTalking ? '🔊' : phase === 'live' ? '🎙️' : '☁️'}</span>
          </div>
        </div>

        {/* controls */}
        {phase === 'idle' || phase === 'ended' || phase === 'error' ? (
          <button onClick={start}
            className="rounded-full bg-white px-8 py-4 text-base font-medium text-gray-900 shadow-lg transition hover:bg-gray-100">
            {phase === 'ended' ? 'Talk again' : 'Talk to the receptionist'}
          </button>
        ) : phase === 'connecting' ? (
          <div className="rounded-full bg-white/10 px-8 py-4 text-base font-medium">Connecting…</div>
        ) : (
          <div className="flex items-center gap-3">
            <button onClick={toggleMute}
              className="rounded-full border border-white/20 bg-white/5 px-6 py-4 text-sm font-medium hover:bg-white/10">
              {muted ? 'Unmute' : 'Mute'}
            </button>
            <button onClick={() => { end(); setPhase('ended') }}
              className="rounded-full bg-red-500 px-8 py-4 text-sm font-medium hover:bg-red-600">
              End call
            </button>
          </div>
        )}

        {err && <p className="mt-4 text-sm text-red-300">{err}</p>}
        {phase === 'idle' && <p className="mt-4 text-xs text-white/40">Uses your mic. Try: “Hi, I need a ride to the airport tomorrow at 6am.”</p>}

        {/* live transcript */}
        {lastLines.length > 0 && (
          <div className="mt-8 w-full space-y-2 text-left">
            {lastLines.map((l, i) => (
              <div key={i} className={`text-sm ${l.role === 'agent' ? 'text-sky-200' : 'text-white/80'}`}>
                <span className="mr-2 text-xs uppercase tracking-wide text-white/40">{l.role === 'agent' ? 'Agent' : 'You'}</span>
                {l.content}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
