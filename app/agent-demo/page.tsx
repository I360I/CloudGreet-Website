'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { RetellWebClient } from 'retell-client-js-sdk'

type Phase = 'idle' | 'connecting' | 'live' | 'ended' | 'error'
type Line = { role: string; content: string }

const VERTICALS = [
  { id: 'hvac',       label: 'HVAC',       name: 'Apex Air & Heat',       tag: 'Quotes · service calls · 24/7 dispatch',    img: '/desk-hvac.jpg',             hint: '"My AC stopped working, can someone come today?"' },
  { id: 'electrical', label: 'Electrical',  name: 'Bright Spark Electric', tag: 'Estimates · scheduling · emergency callouts', img: '/desk-electrical.jpg',       hint: '"I need an estimate for a panel upgrade."' },
  { id: 'carservice', label: 'Car Service', name: 'Executive Transport',   tag: 'Airport rides · dispatch · booking',          img: '/desk-carservice-solo.jpg',  hint: '"I need a ride to the airport tomorrow at 6am."' },
  { id: 'roofing',    label: 'Roofing',     name: 'Summit Roofing',        tag: 'Inspections · estimates · storm damage',      img: '/desk-dentist.jpg',          hint: '"I think my roof is leaking after the storm."' },
  { id: 'lawyer',     label: 'Law Firm',    name: 'Hale & Co. Law',        tag: 'Consultations · intake · scheduling',         img: '/desk-lawyer.jpg',           hint: '"I need to speak with an attorney."' },
]

export default function AgentDemoPage() {
  const [active, setActive] = useState(2)
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
        setErr(res.status === 429 ? 'Too many demo calls right now — try again in a minute.' : 'Could not start the call.')
        setPhase('error'); return
      }
      const { access_token } = await res.json()
      if (!access_token) { setErr('No call token returned.'); setPhase('error'); return }
      const client = new RetellWebClient()
      clientRef.current = client
      client.on('call_started',        () => setPhase('live'))
      client.on('call_ended',          () => setPhase('ended'))
      client.on('agent_start_talking', () => setAgentTalking(true))
      client.on('agent_stop_talking',  () => setAgentTalking(false))
      client.on('update', (u: any)     => { if (Array.isArray(u?.transcript)) setTranscript(u.transcript) })
      client.on('error', (e: any)      => { setErr(String(e?.message || e || 'call error')); endCall(); setPhase('error') })
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

  const live = phase === 'live'
  const lastLines = transcript.slice(-3)
  const ringScale = live ? 1 + Math.min(level * 2, 0.4) + (agentTalking ? 0.08 : 0) : 1

  return (
    <main
      className="flex w-full flex-col overflow-hidden bg-[#f7f7f5]"
      style={{ height: '100dvh' }}
    >
      {/* ── Mascot image panel ── */}
      <div
        className="relative w-full flex-shrink-0 overflow-hidden"
        style={{ height: '52dvh' }}
      >
        <img
          key={v.id}
          src={v.img}
          alt={v.name}
          className="h-full w-full object-cover transition-opacity duration-300"
          style={{
            objectPosition: '68% 25%',
            opacity: live ? 0.75 : 1,
          }}
        />

        {/* Fade bottom into page bg */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#f7f7f5] to-transparent" />

        {/* Top bar overlaid on image */}
        <div
          className="absolute inset-x-0 top-0 flex flex-col gap-3 px-5"
          style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top) + 0.5rem)' }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400">
            CloudGreet · Live demo
          </p>

          {/* Vertical pills */}
          <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {VERTICALS.map((vert, i) => (
              <button
                key={vert.id}
                onClick={() => selectVertical(i)}
                className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm transition-all duration-200 ${
                  i === active
                    ? 'bg-gray-900 text-white'
                    : 'bg-white/80 text-gray-600 hover:bg-white hover:text-gray-900'
                }`}
              >
                {vert.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live indicator on image */}
        {live && (
          <div className="absolute bottom-8 left-5 flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full bg-sky-500 transition-transform duration-75"
              style={{ transform: `scale(${ringScale})` }}
            />
            <span className="text-xs font-medium text-gray-600">
              {agentTalking ? 'AI is speaking…' : 'Listening…'}
            </span>
          </div>
        )}
      </div>

      {/* ── Bottom UI ── */}
      <div
        className="flex flex-1 flex-col justify-between px-5"
        style={{ paddingBottom: 'max(1.75rem, env(safe-area-inset-bottom) + 1rem)' }}
      >
        {/* Business identity */}
        <div className="pt-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
            {v.name}
          </h1>
          <p className="mt-0.5 text-sm text-gray-400">{v.tag}</p>
        </div>

        {/* Transcript — grows in middle */}
        {lastLines.length > 0 && (
          <div className="my-3 space-y-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            {lastLines.map((l, i) => (
              <div key={i} className="text-sm leading-snug">
                <span className="mr-1.5 text-[9px] font-bold uppercase tracking-widest text-gray-300">
                  {l.role === 'agent' ? 'AI' : 'You'}
                </span>
                <span className={l.role === 'agent' ? 'text-sky-600' : 'text-gray-800'}>
                  {l.content}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Spacer when no transcript */}
        {lastLines.length === 0 && <div className="flex-1" />}

        {/* Call controls */}
        <div className="flex flex-col gap-3">
          {!live && phase !== 'connecting' ? (
            <>
              <button
                onClick={start}
                className="w-full rounded-2xl bg-gray-900 py-4 text-sm font-semibold text-white shadow-md transition-all hover:bg-gray-800 active:scale-[0.98]"
              >
                {phase === 'ended' ? 'Talk again' : 'Talk to the AI receptionist'}
              </button>
              {phase === 'idle' && (
                <p className="text-center text-xs text-gray-400">Try saying {v.hint}</p>
              )}
            </>
          ) : phase === 'connecting' ? (
            <div className="w-full rounded-2xl border border-gray-200 bg-white py-4 text-center text-sm font-medium text-gray-400">
              Connecting…
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={toggleMute}
                className="flex-1 rounded-2xl border border-gray-200 bg-white py-4 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-[0.98]"
              >
                {muted ? 'Unmute' : 'Mute'}
              </button>
              <button
                onClick={() => { endCall(); setPhase('ended') }}
                className="flex-1 rounded-2xl bg-red-500 py-4 text-sm font-medium text-white shadow-sm transition hover:bg-red-600 active:scale-[0.98]"
              >
                End call
              </button>
            </div>
          )}

          {err && <p className="text-center text-xs text-red-500">{err}</p>}
        </div>
      </div>
    </main>
  )
}
