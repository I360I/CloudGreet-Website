"use client"

/**
 * PROTOTYPE - one desk, live voice. Validates the core landing concept:
 * arrive at a mascot's desk (he waves hello) and actually talk to the AI
 * receptionist in-browser. Dedicated DEMO agent via /api/demo/web-call
 * (no real client calendars/SMS). Next: the sideways row of 5 verticals
 * (solo shots already staged in /public as desk-*.jpg).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { RetellWebClient } from 'retell-client-js-sdk'

type Phase = 'idle' | 'connecting' | 'live' | 'ended' | 'error'
type Line = { role: string; content: string }

const DESK = {
  vertical: 'carservice',
  name: "Steve's Car Service",
  tag: 'Airport rides · dispatch · booking',
  video: '/desk-carservice.mp4',
  poster: '/desk-carservice-poster.jpg',
}
const ROSTER = ['HVAC', 'Electrical', "Steve's Car Service", 'Dentist', 'Lawyer']
const ACTIVE = 2

export default function AgentDemoPage() {
  const clientRef = useRef<RetellWebClient | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [agentTalking, setAgentTalking] = useState(false)
  const [muted, setMuted] = useState(false)
  const [transcript, setTranscript] = useState<Line[]>([])
  const [level, setLevel] = useState(0)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (phase !== 'live') return
    let raf = 0
    const loop = () => {
      setLevel(clientRef.current?.analyzerComponent?.calculateVolume?.() ?? 0)
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

  const ring = 1 + Math.min(level * 1.6, 0.5) + (agentTalking ? 0.06 : 0)
  const lastLines = transcript.slice(-4)
  const live = phase === 'live'

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#f6f5f1] text-gray-900">
      {/* arrival: mascot zooms in and waves, then holds on last frame */}
      <video src={DESK.video} poster={DESK.poster} autoPlay muted playsInline
        className="absolute inset-0 h-full w-full object-cover"
        onEnded={(e) => (e.currentTarget as HTMLVideoElement).pause()} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#f6f5f1] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#f6f5f1] via-[#f6f5f1]/80 to-transparent" />

      {/* roster - the sideways carousel to come */}
      <div className="absolute top-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 text-xs text-gray-400">
        {ROSTER.map((r, i) => (
          <span key={r} className={`flex items-center gap-1.5 ${i === ACTIVE ? 'text-gray-900' : ''}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${i === ACTIVE ? 'bg-sky-500' : 'bg-gray-300'}`} />
            {r}
          </span>
        ))}
      </div>

      {/* title, top-left in the open space */}
      <div className="absolute left-8 top-20 z-10 sm:left-14 sm:top-28">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-sky-600">Live demo</p>
        <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">{DESK.name}</h1>
        <p className="mt-2 text-gray-500">{DESK.tag}</p>
      </div>

      {/* call dock, bottom-center */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-4 px-6 pb-10">
        {lastLines.length > 0 && (
          <div className="w-full max-w-xl space-y-1.5 rounded-2xl border border-black/5 bg-white/80 p-4 backdrop-blur">
            {lastLines.map((l, i) => (
              <div key={i} className="text-sm">
                <span className="mr-2 text-xs uppercase tracking-wide text-gray-400">{l.role === 'agent' ? 'Agent' : 'You'}</span>
                <span className={l.role === 'agent' ? 'text-sky-700' : 'text-gray-800'}>{l.content}</span>
              </div>
            ))}
          </div>
        )}

        {!live && phase !== 'connecting' ? (
          <button onClick={start}
            className="group relative inline-flex items-center gap-2 rounded-full bg-gray-900 px-8 py-4 text-base font-medium text-white shadow-xl transition hover:bg-gray-800">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-500" />
            </span>
            {phase === 'ended' ? 'Talk again' : 'Talk to the receptionist'}
          </button>
        ) : phase === 'connecting' ? (
          <div className="rounded-full bg-gray-900 px-8 py-4 text-base font-medium text-white">Connecting…</div>
        ) : (
          <div className="flex items-center gap-3">
            {/* live volume ring */}
            <div className="relative flex h-12 w-12 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-sky-400/30 transition-transform duration-75" style={{ transform: `scale(${ring})` }} />
              <span className="relative text-lg">{agentTalking ? '🔊' : '🎙️'}</span>
            </div>
            <button onClick={toggleMute} className="rounded-full border border-black/10 bg-white px-6 py-3.5 text-sm font-medium hover:bg-gray-50">
              {muted ? 'Unmute' : 'Mute'}
            </button>
            <button onClick={() => { end(); setPhase('ended') }} className="rounded-full bg-red-500 px-7 py-3.5 text-sm font-medium text-white hover:bg-red-600">
              End call
            </button>
          </div>
        )}

        {err && <p className="text-sm text-red-500">{err}</p>}
        {phase === 'idle' && <p className="text-xs text-gray-400">Uses your mic · try “I need a ride to the airport tomorrow at 6am.”</p>}
      </div>
    </main>
  )
}
