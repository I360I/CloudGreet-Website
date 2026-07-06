'use client'

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useDialerEngine, type PowerDialItem } from '@/app/sales/_components/dialer-engine'

/*
 * Session-level home for the dialer engine + call-session state.
 *
 * Mounted ONCE in app/setter/layout.tsx, so the Telnyx connection, the
 * power-dial queue, and the session stats all survive in-app navigation.
 * Before this, the engine lived inside DialerCockpit on /setter/dialer -
 * clicking any other nav tab unmounted the page and killed the live
 * session mid-call. Now the cockpit is just a VIEW over this provider;
 * leaving the page keeps dialing, and the shell shows a "return to
 * session" pill anywhere else in the app.
 */

export type CockpitLead = PowerDialItem & {
  email?: string | null
  city?: string | null
  state?: string | null
  businessType?: string | null
  rating?: number | null
  reviews?: number | null
  status?: string
  followUpAt?: string | null
}

export type SessionPhase = 'setup' | 'running' | 'done'
export type SessionStats = { dials: number; connects: number; talkSeconds: number; demos: number }

const QUEUE_KEY = 'cg.dialer.queue'
const EMPTY_STATS: SessionStats = { dials: 0, connects: 0, talkSeconds: 0, demos: 0 }

type DialerSession = {
  engine: ReturnType<typeof useDialerEngine>
  phase: SessionPhase
  setPhase: (p: SessionPhase) => void
  gapSeconds: number
  setGapSeconds: (n: number) => void
  stats: SessionStats
  bumpDemos: () => void
  tagCounts: Record<string, number>
  recordTag: (tag: string) => void
  elapsed: number
  markSessionStart: () => void
  resetSession: () => void
  queueInput: CockpitLead[] | null
  reloadQueueInput: () => void
}

const Ctx = createContext<DialerSession | null>(null)

export function useDialerSession(): DialerSession {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useDialerSession outside DialerSessionProvider')
  return ctx
}

/** Null-safe variant for chrome that renders on routes without a session. */
export function useDialerSessionMaybe(): DialerSession | null {
  return useContext(Ctx)
}

export function DialerSessionProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<SessionPhase>('setup')
  const [gapSeconds, setGapSeconds] = useState(5)
  const [stats, setStats] = useState<SessionStats>(EMPTY_STATS)
  const [tagCounts, setTagCounts] = useState<Record<string, number>>({})
  const [elapsed, setElapsed] = useState(0)
  const [queueInput, setQueueInput] = useState<CockpitLead[] | null>(null)
  const sessionStartRef = useRef<number | null>(null)

  const engine = useDialerEngine({
    advanceSeconds: gapSeconds,
    onCallEnded: ({ finalStatus, durationSeconds }) => {
      setStats((s) => ({
        ...s,
        dials: s.dials + 1,
        // Same "connect" rule as getRepCallStats: completed and >30s.
        connects: s.connects + (finalStatus === 'completed' && durationSeconds > 30 ? 1 : 0),
        talkSeconds: s.talkSeconds + durationSeconds,
      }))
    },
  })

  // Elapsed ticker while a session is running.
  useEffect(() => {
    if (phase !== 'running') return
    const t = setInterval(() => {
      if (sessionStartRef.current) setElapsed(Math.floor((Date.now() - sessionStartRef.current) / 1000))
    }, 1000)
    return () => clearInterval(t)
  }, [phase])

  // Session completion: queue drained while running -> wrap-up.
  useEffect(() => {
    if (phase === 'running' && !engine.queueActive && engine.callState === 'idle' && stats.dials > 0) {
      setPhase('done')
    }
  }, [phase, engine.queueActive, engine.callState, stats.dials])

  const reloadQueueInput = useCallback(() => {
    try {
      const raw = sessionStorage.getItem(QUEUE_KEY)
      if (raw) setQueueInput(JSON.parse(raw))
    } catch { /* corrupted handoff - treated as empty */ }
  }, [])

  const recordTag = useCallback((tag: string) => {
    setTagCounts((c) => ({ ...c, [tag]: (c[tag] || 0) + 1 }))
  }, [])

  const bumpDemos = useCallback(() => {
    setStats((s) => ({ ...s, demos: s.demos + 1 }))
  }, [])

  const markSessionStart = useCallback(() => {
    sessionStartRef.current = Date.now()
    setElapsed(0)
  }, [])

  const resetSession = useCallback(() => {
    setPhase('setup')
    setStats(EMPTY_STATS)
    setTagCounts({})
    setElapsed(0)
    sessionStartRef.current = null
  }, [])

  return (
    <Ctx.Provider value={{
      engine, phase, setPhase, gapSeconds, setGapSeconds,
      stats, bumpDemos, tagCounts, recordTag,
      elapsed, markSessionStart, resetSession,
      queueInput, reloadQueueInput,
    }}>
      {children}
    </Ctx.Provider>
  )
}
