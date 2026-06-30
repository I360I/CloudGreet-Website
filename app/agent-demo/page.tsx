'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { RetellWebClient } from 'retell-client-js-sdk'

type Phase = 'idle' | 'connecting' | 'live' | 'ended' | 'error'
type Line = { role: string; content: string }

const VERTICALS = [
  { id: 'hvac',       label: 'HVAC',        name: 'Apex Air & Heat',       tag: 'Quotes · service calls · 24/7 dispatch',    hint: '"My AC stopped working, can someone come today?"' },
  { id: 'electrical', label: 'Electrical',   name: 'Bright Spark Electric', tag: 'Estimates · scheduling · emergency callouts', hint: '"I need an estimate for a panel upgrade."' },
  { id: 'carservice', label: 'Car Service',  name: 'Executive Transport',   tag: 'Airport rides · dispatch · booking',          hint: '"I need a ride to the airport tomorrow at 6am."' },
  { id: 'roofing',    label: 'Roofing',      name: 'Summit Roofing',        tag: 'Inspections · estimates · storm damage',      hint: '"I think my roof is leaking after the storm."' },
  { id: 'lawyer',     label: 'Law Firm',     name: 'Hale & Co. Law',        tag: 'Consultations · intake · scheduling',         hint: '"I need to speak with an attorney."' },
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
      client.on('call_started',       () => setPhase('live'))
      client.on('call_ended',         () => setPhase('ended'))
      client.on('agent_start_talking',() => setAgentTalking(true))
      client.on('agent_stop_talking', () => setAgentTalking(false))
      client.on('update', (u: any)    => { if (Array.isArray(u?.transcript)) setTranscript(u.transcript) })
      client.on('error', (e: any)     => { setErr(String(e?.message || e || 'call error')); endCall(); setPhase('error') })
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
  const scale = live ? 1 + Math.min(level * 2, 0.35) + (agentTalking ? 0.08 : 0) : 1
  const lastLines = transcript.slice(-3)

  return (
    <main
      className="relative flex w-full flex-col overflow-hidden bg-[#09090f] text-white"
      style={{ height: '100dvh' }}
    >
      {/* Ambient glow behind orb */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: live
            ? `radial-gradient(ellipse 60% 50% at 50% 55%, rgba(14,165,233,${0.1 + level * 0.15}) 0%, transparent 70%)`
            : 'radial-gradient(ellipse 55% 40% at 50% 55%, rgba(14,165,233,0.07) 0%, transparent 70%)',
          transition: 'background 0.2s ease',
        }}
      />

      {/* Top bar */}
      <div
        className="relative z-10 flex flex-col gap-3 px-5"
        style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top) + 0.5rem)' }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/30">
          CloudGreet · Live demo
        </p>

        {/* Vertical pills */}
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
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

      {/* Center — orb + identity */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-6">
        {/* Orb */}
        <div className="relative flex items-center justify-center">
          {/* Outer pulse ring — only when live */}
          {live && (
            <span
              className="absolute rounded-full bg-sky-500/15"
              style={{
                width: 200,
                height: 200,
                transform: `scale(${scale})`,
                transition: 'transform 80ms ease-out',
              }}
            />
          )}
          {/* Idle breathe ring */}
          {!live && phase !== 'connecting' && (
            <span
              className="absolute rounded-full border border-sky-500/20"
              style={{ width: 180, height: 180, animation: 'ping 2.5s cubic-bezier(0,0,0.2,1) infinite' }}
            />
          )}
          {/* Core orb */}
          <div
            className={`relative flex items-center justify-center rounded-full transition-all duration-300 ${
              live
                ? 'bg-sky-500/20 shadow-[0_0_40px_10px_rgba(14,165,233,0.25)]'
                : phase === 'connecting'
                ? 'bg-white/5'
                : 'bg-white/6 hover:bg-white/10'
            }`}
            style={{
              width: 148,
              height: 148,
              border: live ? '1.5px solid rgba(14,165,233,0.5)' : '1.5px solid rgba(255,255,255,0.1)',
              transform: live ? `scale(${scale})` : 'scale(1)',
              transition: live ? 'transform 80ms ease-out' : 'transform 0.3s ease',
            }}
          >
            {phase === 'connecting' ? (
              <svg className="h-8 w-8 animate-spin text-white/30" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : live ? (
              <span className="text-4xl select-none">{agentTalking ? '🔊' : '🎙️'}</span>
            ) : (
              <svg className="h-10 w-10 text-white/25" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1a4 4 0 014 4v7a4 4 0 01-8 0V5a4 4 0 014-4zm0 2a2 2 0 00-2 2v7a2 2 0 004 0V5a2 2 0 00-2-2zm-7 8h2a5 5 0 0010 0h2a7 7 0 01-6 6.93V20h3v2H8v-2h3v-2.07A7 7 0 015 11z"/>
              </svg>
            )}
          </div>
        </div>

        {/* Business identity */}
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {v.name}
          </h1>
          <p className="mt-1 text-sm text-white/40">{v.tag}</p>
        </div>

        {/* Live transcript */}
        {lastLines.length > 0 && (
          <div className="w-full max-w-xs space-y-2 rounded-2xl border border-white/8 bg-white/5 p-4 backdrop-blur-sm">
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
        className="relative z-10 flex flex-col items-center gap-3 px-5"
        style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom) + 1.25rem)' }}
      >
        {!live && phase !== 'connecting' ? (
          <>
            <button
              onClick={start}
              className="w-full max-w-xs rounded-2xl bg-white py-4 text-sm font-semibold text-gray-900 shadow-lg transition-all hover:bg-gray-100 active:scale-95"
            >
              {phase === 'ended' ? 'Talk again' : 'Talk to the AI receptionist'}
            </button>
            {phase === 'idle' && (
              <p className="text-center text-xs text-white/25">Try saying {v.hint}</p>
            )}
          </>
        ) : phase === 'connecting' ? (
          <div className="w-full max-w-xs rounded-2xl bg-white/8 py-4 text-center text-sm font-medium text-white/50">
            Connecting…
          </div>
        ) : (
          <div className="flex w-full max-w-xs gap-3">
            <button
              onClick={toggleMute}
              className="flex-1 rounded-2xl border border-white/10 bg-white/8 py-4 text-sm font-medium text-white/70 transition hover:bg-white/14 active:scale-95"
            >
              {muted ? 'Unmute' : 'Mute'}
            </button>
            <button
              onClick={() => { endCall(); setPhase('ended') }}
              className="flex-1 rounded-2xl bg-red-500/90 py-4 text-sm font-medium text-white transition hover:bg-red-500 active:scale-95"
            >
              End call
            </button>
          </div>
        )}

        {err && <p className="text-center text-xs text-red-400">{err}</p>}
      </div>
    </main>
  )
}
