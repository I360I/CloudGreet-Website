'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { RetellWebClient } from 'retell-client-js-sdk'

type Phase = 'idle' | 'connecting' | 'live' | 'ended' | 'error'
type Line = { role: string; content: string }

const VERTICALS = [
  { id: 'hvac',       label: 'HVAC',       name: 'Apex Air & Heat',       tag: 'Quotes · service calls · 24/7 dispatch',     img: '/desk-hvac.jpg',            hint: '"My AC stopped working, can someone come today?"' },
  { id: 'electrical', label: 'Electrical',  name: 'Bright Spark Electric', tag: 'Estimates · scheduling · emergency callouts', img: '/desk-electrical.jpg',      hint: '"I need an estimate for a panel upgrade."' },
  { id: 'carservice', label: 'Car Service', name: 'Executive Transport',   tag: 'Airport rides · dispatch · booking',          img: '/desk-carservice-solo.jpg', hint: '"I need a ride to the airport tomorrow at 6am."' },
  { id: 'roofing',    label: 'Roofing',     name: 'Summit Roofing',        tag: 'Inspections · estimates · storm damage',      img: '/desk-dentist.jpg',         hint: '"I think my roof is leaking after the storm."' },
  { id: 'lawyer',     label: 'Law Firm',    name: 'Hale & Co. Law',        tag: 'Consultations · intake · scheduling',         img: '/desk-lawyer.jpg',          hint: '"I need to speak with an attorney."' },
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
    setPhase('idle'); setTranscript([]); setErr('')
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
        setErr(res.status === 429 ? 'Too many demo calls — try again in a minute.' : 'Could not start the call.')
        setPhase('error'); return
      }
      const { access_token } = await res.json()
      if (!access_token) { setErr('No token returned.'); setPhase('error'); return }
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
      setErr(e?.name === 'NotAllowedError' ? 'Microphone access is needed.' : (e?.message || 'Failed to start.'))
      setPhase('error')
    }
  }, [v.id, endCall])

  const toggleMute = useCallback(() => {
    const c = clientRef.current; if (!c) return
    if (muted) { c.unmute(); setMuted(false) } else { c.mute(); setMuted(true) }
  }, [muted])

  const live = phase === 'live'
  const lastLines = transcript.slice(-3)
  const ringScale = live ? 1 + Math.min(level * 2.5, 0.45) + (agentTalking ? 0.1 : 0) : 1

  return (
    <main
      className="flex w-full flex-col bg-[#09090f] text-white"
      style={{ height: '100dvh' }}
    >
      {/* Top bar */}
      <div
        className="flex-shrink-0 px-5"
        style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top) + 0.5rem)' }}
      >
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/25">
          CloudGreet · Live demo
        </p>
        {/* Vertical pills */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {VERTICALS.map((vert, i) => (
            <button
              key={vert.id}
              onClick={() => selectVertical(i)}
              className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                i === active
                  ? 'bg-white text-gray-900'
                  : 'bg-white/8 text-white/50 hover:bg-white/14 hover:text-white/80'
              }`}
            >
              {vert.label}
            </button>
          ))}
        </div>
      </div>

      {/* Center — mascot + info */}
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-5">

        {/* Mascot card — square crop centered on the character */}
        <div
          className="relative overflow-hidden rounded-3xl shadow-2xl"
          style={{
            width: 'min(72vw, 280px)',
            height: 'min(72vw, 280px)',
            boxShadow: live
              ? `0 0 0 2px rgba(14,165,233,0.6), 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(14,165,233,${0.15 + level * 0.2})`
              : '0 20px 60px rgba(0,0,0,0.5)',
            transition: 'box-shadow 0.2s ease',
          }}
        >
          <img
            key={v.id}
            src={v.img}
            alt={v.name}
            className="h-full w-full object-cover"
            style={{ objectPosition: '80% 18%' }}
          />
          {/* Subtle vignette */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl shadow-[inset_0_0_30px_rgba(0,0,0,0.08)]" />

          {/* Live ring pulse */}
          {live && (
            <div
              className="pointer-events-none absolute inset-0 rounded-3xl border-2 border-sky-400/60 transition-transform duration-75"
              style={{ transform: `scale(${ringScale})` }}
            />
          )}
        </div>

        {/* Business identity */}
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {v.name}
          </h1>
          <p className="mt-1 text-sm text-white/40">{v.tag}</p>
          {live && (
            <p className="mt-2 text-xs text-sky-400">
              {agentTalking ? '🔊 AI is speaking…' : '🎙️ Listening…'}
            </p>
          )}
        </div>

        {/* Live transcript */}
        {lastLines.length > 0 && (
          <div className="w-full max-w-xs space-y-2 rounded-2xl border border-white/8 bg-white/5 p-4">
            {lastLines.map((l, i) => (
              <div key={i} className="text-sm leading-snug">
                <span className="mr-1.5 text-[9px] font-bold uppercase tracking-widest text-white/25">
                  {l.role === 'agent' ? 'AI' : 'You'}
                </span>
                <span className={l.role === 'agent' ? 'text-sky-300' : 'text-white/80'}>
                  {l.content}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div
        className="flex-shrink-0 px-5"
        style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom) + 1.25rem)' }}
      >
        {!live && phase !== 'connecting' ? (
          <div className="flex flex-col gap-3">
            <button
              onClick={start}
              className="w-full rounded-2xl bg-white py-4 text-sm font-semibold text-gray-900 shadow-lg transition-all hover:bg-gray-100 active:scale-[0.98]"
            >
              {phase === 'ended' ? 'Talk again' : 'Talk to the AI receptionist'}
            </button>
            {phase === 'idle' && (
              <p className="text-center text-xs text-white/25">Try saying {v.hint}</p>
            )}
          </div>
        ) : phase === 'connecting' ? (
          <div className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 text-center text-sm text-white/40">
            Connecting…
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={toggleMute}
              className="flex-1 rounded-2xl border border-white/10 bg-white/8 py-4 text-sm font-medium text-white/70 transition hover:bg-white/14 active:scale-[0.98]"
            >
              {muted ? 'Unmute' : 'Mute'}
            </button>
            <button
              onClick={() => { endCall(); setPhase('ended') }}
              className="flex-1 rounded-2xl bg-red-500/90 py-4 text-sm font-medium text-white transition hover:bg-red-500 active:scale-[0.98]"
            >
              End call
            </button>
          </div>
        )}
        {err && <p className="mt-2 text-center text-xs text-red-400">{err}</p>}
      </div>
    </main>
  )
}
