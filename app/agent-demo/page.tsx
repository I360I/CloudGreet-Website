'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { RetellWebClient } from 'retell-client-js-sdk'

type Phase = 'idle' | 'connecting' | 'live' | 'ended' | 'error'
type Line = { role: string; content: string }

const VERTICALS = [
  {
    id: 'hvac',
    label: 'HVAC',
    name: 'Apex Air & Heat',
    tag: 'Quotes · service calls · 24/7 dispatch',
    bg: '/desk-hvac.jpg',
    hint: 'Try: "My AC stopped working, can someone come today?"',
  },
  {
    id: 'electrical',
    label: 'Electrical',
    name: 'Bright Spark Electric',
    tag: 'Estimates · scheduling · emergency callouts',
    bg: '/desk-electrical.jpg',
    hint: 'Try: "I need an estimate for a panel upgrade."',
  },
  {
    id: 'carservice',
    label: 'Car Service',
    name: 'Executive Transport',
    tag: 'Airport rides · dispatch · booking',
    bg: '/desk-carservice-poster.jpg',
    video: '/desk-carservice.mp4',
    hint: 'Try: "I need a ride to the airport tomorrow at 6am."',
  },
  {
    id: 'roofing',
    label: 'Roofing',
    name: 'Summit Roofing',
    tag: 'Inspections · estimates · storm damage',
    bg: '/desk-dentist.jpg',
    hint: 'Try: "I think my roof is leaking after the storm."',
  },
  {
    id: 'lawyer',
    label: 'Law Firm',
    name: 'Hale & Co. Law',
    tag: 'Consultations · intake · scheduling',
    bg: '/desk-lawyer.jpg',
    hint: 'Try: "I need to speak with an attorney about a contract dispute."',
  },
]

export default function AgentDemoPage() {
  const [active, setActive] = useState(2) // Car Service default
  const clientRef = useRef<RetellWebClient | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [agentTalking, setAgentTalking] = useState(false)
  const [muted, setMuted] = useState(false)
  const [transcript, setTranscript] = useState<Line[]>([])
  const [level, setLevel] = useState(0)
  const [err, setErr] = useState('')

  const v = VERTICALS[active]

  const endCall = useCallback(() => {
    try { clientRef.current?.stopCall() } catch {}
    clientRef.current = null
  }, [])

  useEffect(() => () => endCall(), [endCall])

  const selectVertical = useCallback((idx: number) => {
    if (idx === active) return
    endCall()
    setPhase('idle')
    setTranscript([])
    setErr('')
    setActive(idx)
  }, [active, endCall])

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

  const start = useCallback(async () => {
    setErr(''); setTranscript([]); setPhase('connecting')
    try {
      const res = await fetch('/api/demo/web-call', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ vertical: v.id }),
      })
      if (!res.ok) {
        setErr(res.status === 429 ? 'Too many demo calls right now — give it a minute.' : 'Could not start the call.')
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
      client.on('error', (e: any) => { setErr(String(e?.message || e || 'call error')); endCall(); setPhase('error') })
      await client.startCall({ accessToken: access_token })
    } catch (e: any) {
      setErr(e?.name === 'NotAllowedError' ? 'Microphone access is needed to talk to the agent.' : (e?.message || 'Failed to start.'))
      setPhase('error')
    }
  }, [v.id, endCall])

  const toggleMute = useCallback(() => {
    const c = clientRef.current; if (!c) return
    if (muted) { c.unmute(); setMuted(false) } else { c.mute(); setMuted(true) }
  }, [muted])

  const ring = 1 + Math.min(level * 1.6, 0.5) + (agentTalking ? 0.06 : 0)
  const lastLines = transcript.slice(-4)
  const live = phase === 'live'

  return (
    <main className="relative w-full overflow-hidden bg-gray-900 text-white" style={{ height: '100dvh' }}>

      {/* Background — image always, video overlaid for carservice */}
      <div className="absolute inset-0">
        <img
          key={`bg-${v.id}`}
          src={v.bg}
          alt=""
          className="h-full w-full object-cover transition-opacity duration-500"
        />
        {v.video && (
          <video
            key={`vid-${v.id}`}
            src={v.video}
            autoPlay muted playsInline
            className="absolute inset-0 h-full w-full object-cover"
            onEnded={(e) => (e.currentTarget as HTMLVideoElement).pause()}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/25 to-black/75" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col">

        {/* Top bar */}
        <div
          className="flex flex-col gap-3 px-5 pt-6"
          style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top) + 0.75rem)' }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
            CloudGreet · Live demo
          </p>

          {/* Vertical picker — horizontal scroll on mobile */}
          <div
            className="flex gap-2 overflow-x-auto"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', paddingBottom: 2 }}
          >
            {VERTICALS.map((vert, i) => (
              <button
                key={vert.id}
                onClick={() => selectVertical(i)}
                className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                  i === active
                    ? 'bg-white text-gray-900 shadow'
                    : 'bg-white/10 text-white/70 hover:bg-white/20 active:bg-white/25'
                }`}
              >
                {vert.label}
              </button>
            ))}
          </div>
        </div>

        {/* Business name — grows to fill space */}
        <div className="flex flex-1 flex-col justify-center px-6">
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-6xl">
            {v.name}
          </h1>
          <p className="mt-2 text-sm text-white/55 sm:text-base">{v.tag}</p>
        </div>

        {/* Call controls */}
        <div
          className="flex flex-col items-center gap-4 px-5 pb-10"
          style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom) + 1.5rem)' }}
        >
          {/* Transcript */}
          {lastLines.length > 0 && (
            <div className="w-full max-w-sm space-y-2 rounded-2xl border border-white/10 bg-black/50 p-4 backdrop-blur-md">
              {lastLines.map((l, i) => (
                <div key={i} className="text-sm leading-snug">
                  <span className="mr-2 text-[10px] font-semibold uppercase tracking-wider text-white/35">
                    {l.role === 'agent' ? 'AI' : 'You'}
                  </span>
                  <span className={l.role === 'agent' ? 'text-sky-300' : 'text-white/85'}>
                    {l.content}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Button states */}
          {!live && phase !== 'connecting' ? (
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={start}
                className="relative inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 text-base font-semibold text-gray-900 shadow-2xl transition-transform hover:scale-105 active:scale-95"
              >
                <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-500" />
                </span>
                {phase === 'ended' ? 'Talk again' : 'Talk to the AI receptionist'}
              </button>
              {phase === 'idle' && (
                <p className="text-center text-xs text-white/35">{v.hint}</p>
              )}
            </div>
          ) : phase === 'connecting' ? (
            <div className="rounded-full bg-white/10 px-8 py-4 text-sm font-medium text-white backdrop-blur">
              Connecting…
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="relative flex h-12 w-12 items-center justify-center">
                <span
                  className="absolute inset-0 rounded-full bg-sky-400/30 transition-transform duration-75"
                  style={{ transform: `scale(${ring})` }}
                />
                <span className="relative text-xl">{agentTalking ? '🔊' : '🎙️'}</span>
              </div>
              <button
                onClick={toggleMute}
                className="rounded-full border border-white/15 bg-white/10 px-6 py-3.5 text-sm font-medium backdrop-blur hover:bg-white/20 active:bg-white/25"
              >
                {muted ? 'Unmute' : 'Mute'}
              </button>
              <button
                onClick={() => { endCall(); setPhase('ended') }}
                className="rounded-full bg-red-500 px-7 py-3.5 text-sm font-medium hover:bg-red-600 active:bg-red-700"
              >
                End call
              </button>
            </div>
          )}

          {err && <p className="text-center text-sm text-red-400">{err}</p>}
        </div>
      </div>
    </main>
  )
}
