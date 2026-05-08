'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { Phone, PhoneCall, PhoneSlash, MicrophoneSlash, Microphone, X, CircleNotch, WarningCircle, Pause, Play, SkipForward, Stop, CaretDown } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { NumberPicker } from './NumberPicker'

/**
 * Floating Telnyx WebRTC dialer.
 *
 * Lives in SalesShell so it persists across page navigation. Connects
 * to Telnyx once per session (token + WebRTC handshake takes ~1s),
 * stays mounted, and exposes a `window.cgDial(number, leadId?)` API
 * other components can call to dial out from a lead row.
 *
 * Failure modes handled explicitly so reps never see a silent break:
 *   - 503 from token endpoint → "Telnyx not set up by Anthony" panel
 *   - mic permission denied → guidance + retry
 *   - WS disconnect → auto-reconnect with backoff
 *
 * The browser audio path needs HTTPS, microphone permission, and a
 * working Telnyx Telephony Credential (admin sets up once - see the
 * /api/sales/dialer/token route doc).
 */

type CallState =
  | 'idle'
  | 'connecting'        // dialing out, waiting for ringback
  | 'ringing'           // remote ringing
  | 'active'            // call connected
  | 'ended'

type SessionStatus =
  | 'init'
  | 'mic_required'      // user gesture needed to grant mic
  | 'mic_denied'        // user explicitly blocked it
  | 'loading_token'
  | 'connecting'
  | 'ready'
  | 'reconnecting'
  | 'error'
  | 'unconfigured'

export type PowerDialItem = {
  leadId: string
  phone: string
  businessName?: string | null
  contactName?: string | null
}

declare global {
  interface Window {
    cgDial?: (number: string, leadId?: string) => void
    cgPowerDial?: (items: PowerDialItem[]) => void
    cgPowerDialAbort?: () => void
  }
}

export function Dialer() {
  const [status, setStatus] = useState<SessionStatus>('init')
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [callState, setCallState] = useState<CallState>('idle')
  const [destination, setDestination] = useState('')
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)
  const [secondsActive, setSecondsActive] = useState(0)
  const [micBusy, setMicBusy] = useState(false)
  const [micErrName, setMicErrName] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [, forceFromRefresh] = useState(0)
  const dragControls = useDragControls()

  // Power dialer queue. When non-empty, the dialer auto-advances
  // through items: dial item N → wait for call to end → 5s countdown
  // (with optional post-call status selection) → dial item N+1.
  const [queue, setQueue] = useState<PowerDialItem[]>([])
  const [queueIndex, setQueueIndex] = useState(0)
  const [queuePaused, setQueuePaused] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [postCallStatus, setPostCallStatus] = useState<string | null>(null)
  const lastQueuedLeadIdRef = useRef<string | null>(null)
  const queueAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Refs to long-lived objects (Telnyx client, current Call, server-side
  // log row id, etc.) so re-renders don't recreate them.
  const clientRef = useRef<any>(null)
  const callRef = useRef<any>(null)
  const callRowIdRef = useRef<string | null>(null)
  const fromNumberRef = useRef<string | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const setupRef = useRef<((opts?: { fromUserGesture?: boolean }) => Promise<void>) | null>(null)

  // ---- Connect once on mount, tear down on unmount.
  useEffect(() => {
    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    const setup = async (opts?: { fromUserGesture?: boolean }) => {
      setError(null)

      // On mount: use Permissions API to detect a pre-existing grant. If
      // it says 'granted', skip straight to token mint. Otherwise show
      // the click-to-allow UI - we do NOT auto-call getUserMedia here,
      // since that would fire a fresh OS prompt on every page reload.
      // When called from grantMicrophone (fromUserGesture), we know the
      // user just granted via a synchronous getUserMedia and can proceed
      // straight to connecting.
      if (!opts?.fromUserGesture) {
        let granted = false
        try {
          const perm = await navigator.permissions
            ?.query?.({ name: 'microphone' as PermissionName })
            .catch(() => null)
          if (perm?.state === 'granted') granted = true
        } catch { /* unsupported - fall through */ }
        if (!granted) {
          setStatus('mic_required')
          return
        }
      }

      setStatus('loading_token')
      try {
        const r = await fetchWithAuth('/api/sales/dialer/token', { method: 'POST' })
        if (cancelled) return
        if (r.status === 503) {
          setStatus('unconfigured')
          return
        }
        const j = await r.json().catch(() => ({}))
        if (!r.ok || !j?.success) {
          setStatus('error')
          setError(j?.error || `Token mint failed (${r.status})`)
          retryTimer = setTimeout(setup, 15_000)
          return
        }
        fromNumberRef.current = j.from_number || null

        // Lazy-import the Telnyx SDK so SSR doesn't choke on `window`.
        const mod = await import('@telnyx/webrtc')
        if (cancelled) return
        const TelnyxRTC = (mod as any).TelnyxRTC
        const client = new TelnyxRTC({ login_token: j.login_token })

        client.on('telnyx.ready', () => { if (!cancelled) setStatus('ready') })
        client.on('telnyx.socket.close', () => {
          if (cancelled) return
          setStatus('reconnecting')
          // SDK auto-reconnects; if it gives up after a while we'll
          // re-mint a token on the next user action.
        })
        client.on('telnyx.error', (e: any) => {
          if (cancelled) return
          // Full payload to devtools so we can actually see the cause -
          // Telnyx's SDK fires this with shape { code, cause, causeCode,
          // error: { message } } depending on the failure mode.
          // eslint-disable-next-line no-console
          console.error('Telnyx error', e)
          const msg =
            e?.cause ||
            e?.causeCode ||
            e?.error?.message ||
            e?.message ||
            (typeof e === 'string' ? e : null) ||
            (() => { try { return JSON.stringify(e).slice(0, 200) } catch { return 'WebRTC error' } })()
          setStatus('error')
          setError(msg)
        })
        client.on('telnyx.socket.error', (e: any) => {
          if (cancelled) return
          // eslint-disable-next-line no-console
          console.error('Telnyx socket error', e)
          setStatus('error')
          setError(e?.message || 'WebSocket failed - network/firewall blocking wss://rtc.telnyx.com?')
        })
        client.on('telnyx.notification', (note: any) => {
          if (cancelled) return
          if (note?.type !== 'callUpdate') return
          const c = note.call
          callRef.current = c
          const s = c?.state
          if (s === 'requesting' || s === 'trying') setCallState('connecting')
          else if (s === 'ringing' || s === 'early') setCallState('ringing')
          else if (s === 'active') {
            setCallState('active')
            startedAtRef.current = Date.now()
          } else if (s === 'hangup' || s === 'destroy' || s === 'purge') {
            const startedAt = startedAtRef.current
            const duration = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0
            // Best-effort: classify the ending. Telnyx's cause codes
            // map roughly to status; we do a coarse mapping that's
            // good enough for the rep's "did it pick up" purpose.
            const cause = String(c?.cause || '').toLowerCase()
            const finalStatus =
              startedAt ? 'completed'
              : /busy/.test(cause) ? 'busy'
              : /reject|decline/.test(cause) ? 'rejected'
              : /no_user|noanswer|no_answer|noresponse|no_response|not_found/.test(cause) ? 'no_answer'
              : startedAt ? 'completed' : 'no_answer'
            void finalizeCall(finalStatus, duration)
          }
        })

        clientRef.current = client
        setStatus('connecting')
        client.connect()
      } catch (e) {
        if (cancelled) return
        setStatus('error')
        setError(e instanceof Error ? e.message : 'Could not initialise dialer')
        retryTimer = setTimeout(setup, 15_000)
      }
    }

    void setup()
    setupRef.current = setup

    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
      try { clientRef.current?.disconnect?.() } catch {}
      clientRef.current = null
      setupRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const grantMicrophone = useCallback((e?: React.MouseEvent) => {
    // CRITICAL: getUserMedia must be called synchronously from the click
    // handler with no awaits before it, otherwise some browsers consider
    // the user gesture stale and silently auto-deny without prompting.
    // We do not mark the function async - we call gUM immediately and
    // attach the .then/.catch chain so the promise resolves later, but
    // the call itself is in the same tick as the click.
    setError(null)
    setMicErrName(null)
    setMicBusy(true)
    let micPromise: Promise<MediaStream>
    try {
      micPromise = navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('getUserMedia threw synchronously', err)
      setMicBusy(false)
      setStatus('error')
      setError(err?.message || 'Could not access microphone')
      return
    }
    micPromise.then(
      (stream) => {
        stream.getTracks().forEach((t) => t.stop())
        if (setupRef.current) {
          setupRef.current({ fromUserGesture: true })
            .finally(() => setMicBusy(false))
        } else {
          setMicBusy(false)
        }
      },
      (err: any) => {
        // eslint-disable-next-line no-console
        console.error('getUserMedia rejected', err)
        setMicBusy(false)
        const name = err?.name || 'Error'
        setMicErrName(`${name}${err?.message ? ` - ${err.message}` : ''}`)
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
          setStatus('mic_denied')
        } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
          setStatus('error')
          setError('No microphone detected on this device.')
        } else {
          setStatus('error')
          setError(err?.message || 'Could not access microphone')
        }
      }
    )
  }, [])

  // ---- Auto-open the panel when something needs the user's attention
  // (mic prompt, denied state, hard error). Reps shouldn't have to know
  // the dialer button hides the actual problem.
  useEffect(() => {
    if (status === 'mic_required' || status === 'mic_denied' || status === 'error') {
      setOpen(true)
    }
  }, [status])

  // ---- Active-call seconds counter for the live UI badge.
  useEffect(() => {
    if (callState !== 'active') { setSecondsActive(0); return }
    const t = setInterval(() => {
      if (startedAtRef.current) setSecondsActive(Math.floor((Date.now() - startedAtRef.current) / 1000))
    }, 1000)
    return () => clearInterval(t)
  }, [callState])

  const dial = useCallback((rawNumber: string, leadId?: string) => {
    const number = e164(rawNumber)
    if (!number) {
      setError(`Couldn't parse "${rawNumber}" as a US phone`)
      return
    }
    if (status !== 'ready') {
      setOpen(true)
      setError('Dialer not ready yet - try again in a second.')
      return
    }
    if (callRef.current) {
      // Already on a call; ignore.
      return
    }
    setError(null)
    setOpen(true)
    setActiveLeadId(leadId || null)
    setDestination(number)
    setCallState('connecting')
    startedAtRef.current = null

    try {
      const call = clientRef.current.newCall({
        destinationNumber: number,
        callerNumber: fromNumberRef.current,
        audio: true,
        video: false,
      })
      callRef.current = call
      // Open the server-side log row so we can update it on end.
      void (async () => {
        try {
          const r = await fetchWithAuth('/api/sales/dialer/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to_number: number,
              from_number: fromNumberRef.current,
              telnyx_call_id: call?.id || null,
              lead_id: leadId || null,
              status: 'ringing',
            }),
          })
          const j = await r.json().catch(() => ({}))
          if (j?.success) callRowIdRef.current = j.id
        } catch { /* non-fatal */ }
      })()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start call')
      setCallState('idle')
    }
  }, [status])

  // Expose `window.cgDial` so any component can call it without a
  // React context plumbing exercise.
  useEffect(() => {
    window.cgDial = (number: string, leadId?: string) => dial(number, leadId)
    window.cgPowerDial = (items: PowerDialItem[]) => {
      const cleaned = items.filter((it) => it.phone && it.leadId)
      if (cleaned.length === 0) return
      setQueue(cleaned)
      setQueueIndex(0)
      setQueuePaused(false)
      setPostCallStatus(null)
      setCountdown(null)
      setOpen(true)
      // Defer the first dial a tick so React applies the queue state
      // before we kick off the call (the call-end watcher reads `queue`).
      setTimeout(() => {
        const first = cleaned[0]
        lastQueuedLeadIdRef.current = first.leadId
        dial(first.phone, first.leadId)
      }, 50)
    }
    window.cgPowerDialAbort = () => {
      if (queueAdvanceTimerRef.current) {
        clearTimeout(queueAdvanceTimerRef.current)
        queueAdvanceTimerRef.current = null
      }
      setQueue([])
      setQueueIndex(0)
      setQueuePaused(false)
      setCountdown(null)
      setPostCallStatus(null)
    }
    return () => {
      if (window.cgDial) delete window.cgDial
      if (window.cgPowerDial) delete window.cgPowerDial
      if (window.cgPowerDialAbort) delete window.cgPowerDialAbort
    }
  }, [dial])

  const hangup = useCallback(() => {
    try { callRef.current?.hangup?.() } catch {}
  }, [])

  const finalizeCall = async (finalStatus: string, duration: number) => {
    setCallState('ended')
    setMuted(false)
    callRef.current = null
    if (callRowIdRef.current) {
      try {
        await fetchWithAuth('/api/sales/dialer/log', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: callRowIdRef.current,
            status: finalStatus,
            ended_at: new Date().toISOString(),
            duration_seconds: duration,
          }),
        })
      } catch { /* non-fatal */ }
    }
    callRowIdRef.current = null
    setActiveLeadId(null)
    // Small "ended" tail in the UI before flipping back to idle.
    setTimeout(() => setCallState('idle'), 1500)
  }

  const toggleMute = () => {
    const c = callRef.current
    if (!c) return
    if (muted) {
      try { c.unmuteAudio() } catch {}
      setMuted(false)
    } else {
      try { c.muteAudio() } catch {}
      setMuted(true)
    }
  }

  const onCallNow = () => {
    if (!destination.trim()) return
    dial(destination)
  }

  // Keypad press: append to destination when idle, send DTMF when on a
  // live call (so reps can navigate IVRs). Telnyx exposes dtmf() on the
  // call object - signature is just the single digit string.
  const onKeypadPress = (digit: string) => {
    if (callState === 'active' && callRef.current) {
      try { callRef.current.dtmf(digit) } catch { /* non-fatal */ }
      return
    }
    setDestination((d) => d + digit)
  }

  const inCall = callState === 'connecting' || callState === 'ringing' || callState === 'active'
  const queueActive = queue.length > 0
  const currentItem = queueActive ? queue[queueIndex] : null
  const isLast = queueActive && queueIndex >= queue.length - 1

  // Auto-advance: when call ends inside a queue session, run a 5-second
  // countdown with a post-call status picker, then dial the next item.
  // Pause stops the countdown without losing position; skip jumps to
  // next without completing the picker; stop nukes the queue.
  useEffect(() => {
    if (!queueActive) return
    if (callState !== 'ended') return
    if (queuePaused) return
    if (isLast && !currentItem) return

    setCountdown(5)
    const tick = (n: number) => {
      if (n <= 0) {
        if (queueAdvanceTimerRef.current) {
          clearTimeout(queueAdvanceTimerRef.current)
          queueAdvanceTimerRef.current = null
        }
        setCountdown(null)
        // Persist post-call status if the rep picked one (or default to 'called').
        if (lastQueuedLeadIdRef.current) {
          const status = postCallStatus || 'called'
          void fetchWithAuth(`/api/sales/leads/${lastQueuedLeadIdRef.current}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, touched: true }),
          }).catch(() => { /* non-fatal */ })
        }
        setPostCallStatus(null)
        // Advance.
        if (isLast) {
          // Done.
          setQueue([])
          setQueueIndex(0)
          lastQueuedLeadIdRef.current = null
          return
        }
        const next = queue[queueIndex + 1]
        if (next) {
          setQueueIndex((i) => i + 1)
          lastQueuedLeadIdRef.current = next.leadId
          dial(next.phone, next.leadId)
        }
        return
      }
      setCountdown(n)
      queueAdvanceTimerRef.current = setTimeout(() => tick(n - 1), 1000)
    }
    queueAdvanceTimerRef.current = setTimeout(() => tick(4), 1000)

    return () => {
      if (queueAdvanceTimerRef.current) {
        clearTimeout(queueAdvanceTimerRef.current)
        queueAdvanceTimerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callState, queueActive, queuePaused, queueIndex])

  // Pause/resume keeps the same queue position. When un-paused inside
  // an 'ended' state, the effect above re-runs naturally.
  const togglePause = () => setQueuePaused((p) => !p)
  const skipCurrent = () => {
    if (queueAdvanceTimerRef.current) clearTimeout(queueAdvanceTimerRef.current)
    setCountdown(null)
    setPostCallStatus(null)
    if (callState !== 'idle' && callState !== 'ended') {
      try { callRef.current?.hangup?.() } catch {}
    }
    if (isLast) {
      setQueue([])
      setQueueIndex(0)
      return
    }
    const next = queue[queueIndex + 1]
    if (next) {
      setQueueIndex((i) => i + 1)
      lastQueuedLeadIdRef.current = next.leadId
      // Brief delay so the current call finishes hanging up before we redial.
      setTimeout(() => dial(next.phone, next.leadId), 250)
    }
  }
  const stopQueue = () => {
    if (queueAdvanceTimerRef.current) clearTimeout(queueAdvanceTimerRef.current)
    setCountdown(null)
    setPostCallStatus(null)
    setQueue([])
    setQueueIndex(0)
    if (callState !== 'idle') {
      try { callRef.current?.hangup?.() } catch {}
    }
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            drag
            dragControls={dragControls}
            dragListener={false}
            dragMomentum={false}
            dragElastic={0}
            initial={{ opacity: 0, scale: 0.2 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.2 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            style={{ transformOrigin: 'top right' }}
            className="fixed top-14 right-5 z-[80] hidden sm:block w-80 bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden"
          >
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="px-4 py-3 border-b border-gray-100 flex items-center justify-between cursor-move select-none touch-none"
            >
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-700" weight="fill" />
                <div className="text-sm font-medium text-gray-900">Dialer</div>
                <SessionPill status={status} />
              </div>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setOpen(false)}
                className="p-1 -m-1 text-gray-400 hover:text-gray-700 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {queueActive && (
              <div className="px-3 py-2.5 bg-violet-50 border-b border-violet-100 text-xs">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="font-medium text-violet-900 inline-flex items-center gap-1.5">
                    <PhoneCall className="w-3.5 h-3.5" weight="fill" />
                    Power dial · {queueIndex + 1} of {queue.length}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={togglePause}
                      className="p-1 text-violet-700 hover:text-violet-900"
                      title={queuePaused ? 'Resume' : 'Pause'}
                    >
                      {queuePaused
                        ? <Play className="w-3.5 h-3.5" weight="fill" />
                        : <Pause className="w-3.5 h-3.5" weight="fill" />}
                    </button>
                    <button
                      onClick={skipCurrent}
                      className="p-1 text-violet-700 hover:text-violet-900"
                      title="Skip"
                    >
                      <SkipForward className="w-3.5 h-3.5" weight="fill" />
                    </button>
                    <button
                      onClick={stopQueue}
                      className="p-1 text-rose-700 hover:text-rose-900"
                      title="Stop"
                    >
                      <Stop className="w-3.5 h-3.5" weight="fill" />
                    </button>
                  </div>
                </div>
                {currentItem && (
                  <div className="text-violet-800 truncate">
                    {currentItem.businessName || currentItem.contactName || currentItem.phone}
                  </div>
                )}
                {callState === 'ended' && countdown !== null && !queuePaused && (
                  <div className="mt-2 pt-2 border-t border-violet-100">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-violet-700 mb-1.5">
                      Tag this call · next in {countdown}s
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { v: 'called',     l: 'Talked' },
                        { v: 'voicemail',  l: 'VM' },
                        { v: 'interested', l: 'Interested' },
                        { v: 'dead',       l: 'Dead' },
                        { v: 'do_not_call', l: 'DNC' },
                      ].map((opt) => (
                        <button
                          key={opt.v}
                          onClick={() => setPostCallStatus(opt.v)}
                          className={`text-[11px] rounded-md px-2 py-1 border transition-colors ${
                            postCallStatus === opt.v
                              ? 'bg-violet-700 text-white border-violet-700'
                              : 'bg-white text-violet-800 border-violet-200 hover:border-violet-400'
                          }`}
                        >
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {queuePaused && (
                  <div className="mt-1 text-[11px] italic text-violet-700">Paused.</div>
                )}
              </div>
            )}

            <div className="p-3">
              {status === 'unconfigured' ? (
                <div className="text-xs text-gray-600">
                  <div className="font-medium text-gray-900 mb-1">Not set up yet</div>
                  Browser dialing needs Telnyx credentials. Anthony has to flip a couple of env vars before this works (TELNYX_TELEPHONY_CREDENTIAL_ID and TELNYX_OUTBOUND_FROM_NUMBER).
                </div>
              ) : status === 'mic_required' ? (
                <div className="text-xs text-gray-700 space-y-3">
                  <div>
                    <div className="font-medium text-gray-900 mb-1">Microphone access needed</div>
                    Browsers only grant mic permission after a click. Tap the button below and pick <strong>Allow</strong> in the prompt.
                  </div>
                  <button
                    onClick={grantMicrophone}
                    disabled={micBusy}
                    className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-medium rounded-xl px-4 py-2 hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-60"
                  >
                    {micBusy ? <CircleNotch className="w-4 h-4 animate-spin" /> : <Microphone className="w-4 h-4" weight="fill" />}
                    {micBusy ? 'Requesting…' : 'Allow microphone'}
                  </button>
                  {micErrName && (
                    <>
                      <div className="text-[11px] text-rose-700 font-mono break-words">{micErrName}</div>
                      <div className="text-[11px] text-gray-500">
                        Browser auto-rejected without a prompt. Click the lock icon in the address bar → <strong>Reset permissions</strong>, refresh, then click Allow microphone again.
                      </div>
                    </>
                  )}
                </div>
              ) : status === 'mic_denied' ? (
                <div className="text-xs text-gray-700 space-y-3">
                  <div>
                    <div className="font-medium text-rose-700 mb-1">Microphone is blocked</div>
                    Browser or OS is denying mic access for cloudgreet.com. Two places to check:
                  </div>
                  <div className="text-gray-600">
                    <div className="font-medium text-gray-800 mb-0.5">In the browser</div>
                    <ol className="list-decimal list-inside space-y-0.5">
                      <li>Click the lock icon in the address bar</li>
                      <li><strong>Microphone</strong> → <strong>Allow</strong></li>
                      <li>Refresh this page</li>
                    </ol>
                  </div>
                  <div className="text-gray-600">
                    <div className="font-medium text-gray-800 mb-0.5">On macOS</div>
                    <ol className="list-decimal list-inside space-y-0.5">
                      <li>System Settings → Privacy &amp; Security → Microphone</li>
                      <li>Turn on <strong>Google Chrome</strong></li>
                      <li>Quit Chrome fully (⌘Q) and reopen</li>
                    </ol>
                  </div>
                  <button
                    onClick={grantMicrophone}
                    disabled={micBusy}
                    className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-medium rounded-xl px-4 py-2 hover:bg-gray-800 transition-all disabled:opacity-60"
                  >
                    {micBusy && <CircleNotch className="w-4 h-4 animate-spin" />}
                    {micBusy ? 'Trying…' : 'Try again'}
                  </button>
                  {micErrName && (
                    <div className="text-[11px] text-rose-700 font-mono break-words">
                      Browser said: {micErrName}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* When idle, show input. When in a call, that input
                      becomes the live status line - no duplicate number,
                      no separate ring animation panel. Keeps the dialer
                      a tight box. */}
                  {!inCall ? (
                    <input
                      type="tel"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="Enter or paste a number"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono tabular-nums text-center focus:outline-none focus:border-gray-400 focus:bg-white"
                    />
                  ) : (
                    <div className={`rounded-lg px-3 py-2 flex items-center justify-between gap-3 border ${
                      callState === 'active'
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-amber-50 border-amber-200'
                    }`}>
                      <span className="font-mono text-sm tabular-nums text-gray-900">{destination}</span>
                      {callState === 'active' ? (
                        <span className="font-mono text-sm tabular-nums text-emerald-700 inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {fmtDuration(secondsActive)}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-800 inline-flex items-center">
                          {callState === 'connecting' ? 'Dialing' : 'Ringing'}
                          <RingingDots />
                        </span>
                      )}
                    </div>
                  )}

                  {callState === 'ended' && (
                    <div className="mt-2 text-center text-[11px] text-gray-500">Call ended.</div>
                  )}

                  {/* Keypad - always visible. During an active call the
                      keys send DTMF; otherwise they type into the input. */}
                  <div className="mt-2.5 grid grid-cols-3 gap-1">
                    {KEYPAD.map(({ digit, sub }) => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => onKeypadPress(digit)}
                        className="h-9 rounded-md bg-gray-50 hover:bg-gray-100 active:bg-gray-200 active:scale-[0.97] transition-all flex items-center justify-center gap-1"
                      >
                        <span className="text-sm font-medium text-gray-900 leading-none">{digit}</span>
                        {sub && <span className="text-[8px] font-mono text-gray-400 tracking-wider">{sub}</span>}
                      </button>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div className="mt-2 flex items-center gap-1.5">
                    {!inCall ? (
                      <>
                        {destination && (
                          <button
                            onClick={() => setDestination((d) => d.slice(0, -1))}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                            aria-label="Backspace"
                            type="button"
                          >
                            ⌫
                          </button>
                        )}
                        <button
                          onClick={onCallNow}
                          disabled={status !== 'ready' || !destination.trim()}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg px-3 py-2 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <PhoneCall className="w-4 h-4" weight="fill" />
                          Call
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={toggleMute}
                          className={`inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-2 text-xs border transition-all ${
                            muted
                              ? 'bg-amber-50 border-amber-200 text-amber-800'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {muted ? <Microphone className="w-3.5 h-3.5" /> : <MicrophoneSlash className="w-3.5 h-3.5" />}
                          {muted ? 'Unmute' : 'Mute'}
                        </button>
                        <button
                          onClick={hangup}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-rose-600 text-white text-sm font-medium rounded-lg px-3 py-2 hover:bg-rose-700 active:scale-[0.98] transition-all"
                        >
                          <PhoneSlash className="w-4 h-4" weight="fill" />
                          Hang up
                        </button>
                      </>
                    )}
                  </div>

                  {error && (
                    <div className="mt-3 text-[11px] text-rose-700 flex items-start gap-1.5">
                      <WarningCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {fromNumberRef.current && status === 'ready' && !inCall && (
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="mt-3 mx-auto flex items-center gap-1 text-[10px] font-mono text-gray-500 hover:text-gray-900 transition-colors"
                      title="Switch which number you call from"
                    >
                      from · <span className="text-gray-700">{fromNumberRef.current}</span>
                      <CaretDown weight="bold" className="w-2.5 h-2.5" />
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating launcher - top-right, small black circle. The panel
          scales out of this exact corner via transformOrigin so the
          expansion feels anchored to the click. */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed top-4 right-4 z-[80] hidden sm:flex w-8 h-8 rounded-full shadow-md items-center justify-center transition-all active:scale-90 hover:scale-110 ${
          inCall
            ? 'bg-emerald-600 text-white shadow-emerald-600/30'
            : 'bg-gray-900 text-white shadow-gray-900/20 hover:bg-black'
        }`}
        aria-label="Open dialer"
      >
        {inCall
          ? <PhoneCall className="w-3.5 h-3.5" weight="fill" />
          : <Phone className="w-3.5 h-3.5" weight="fill" />}
        {status === 'ready' && !inCall && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-white" aria-hidden />
        )}
      </button>

      <NumberPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onActiveChanged={(num) => {
          // Update the displayed from-number immediately. The dialer
          // session itself doesn't need to reconnect for outbound
          // caller-ID switches - Telnyx looks up the from on each
          // call placement against the connection's allowed numbers.
          fromNumberRef.current = num
          forceFromRefresh((n) => n + 1)
        }}
      />
    </>
  )
}

function SessionPill({ status }: { status: SessionStatus }) {
  const m: Record<SessionStatus, { label: string; cls: string }> = {
    init:           { label: 'init',     cls: 'bg-gray-100 text-gray-500 border-gray-200' },
    mic_required:   { label: 'mic',      cls: 'bg-amber-50 text-amber-800 border-amber-200' },
    mic_denied:     { label: 'mic',      cls: 'bg-rose-50 text-rose-700 border-rose-200' },
    loading_token:  { label: 'auth',     cls: 'bg-gray-100 text-gray-500 border-gray-200' },
    connecting:     { label: 'connect',  cls: 'bg-amber-50 text-amber-800 border-amber-200' },
    ready:          { label: 'ready',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    reconnecting:   { label: 'reconnect',cls: 'bg-amber-50 text-amber-800 border-amber-200' },
    error:          { label: 'error',    cls: 'bg-rose-50 text-rose-700 border-rose-200' },
    unconfigured:   { label: 'setup',    cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  }
  const s = m[status]
  return (
    <span className={`inline-flex items-center text-[10px] font-mono uppercase tracking-[0.18em] border rounded-full px-1.5 py-0.5 ${s.cls}`}>
      {(status === 'connecting' || status === 'loading_token' || status === 'reconnecting') && <CircleNotch className="w-2.5 h-2.5 animate-spin mr-1" />}
      {s.label}
    </span>
  )
}

// US-shaped E.164 normalization. Mirrors lib/scrapers/normalize.ts so
// the dialer accepts whatever's stored on the lead row without UX
// friction. Returns null for inputs we can't reasonably interpret.
function e164(raw: string): string | null {
  if (!raw) return null
  const digits = String(raw).replace(/[^0-9]/g, '')
  if (!digits) return null
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.length >= 11) return `+1${digits.slice(-10)}`
  return null
}

const KEYPAD: { digit: string; sub?: string }[] = [
  { digit: '1' },
  { digit: '2', sub: 'ABC' },
  { digit: '3', sub: 'DEF' },
  { digit: '4', sub: 'GHI' },
  { digit: '5', sub: 'JKL' },
  { digit: '6', sub: 'MNO' },
  { digit: '7', sub: 'PQRS' },
  { digit: '8', sub: 'TUV' },
  { digit: '9', sub: 'WXYZ' },
  { digit: '*' },
  { digit: '0', sub: '+' },
  { digit: '#' },
]

function RingingDots() {
  return (
    <span className="inline-flex ml-0.5">
      <span className="animate-[ring_1.4s_ease-in-out_infinite] [animation-delay:0ms]">.</span>
      <span className="animate-[ring_1.4s_ease-in-out_infinite] [animation-delay:200ms]">.</span>
      <span className="animate-[ring_1.4s_ease-in-out_infinite] [animation-delay:400ms]">.</span>
      <style jsx>{`
        @keyframes ring {
          0%, 60%, 100% { opacity: 0.2; }
          30% { opacity: 1; }
        }
      `}</style>
    </span>
  )
}

function RingingPulse() {
  // Concentric expanding rings under a phone icon - classic "ringing"
  // visual without being a full lottie animation.
  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <span className="absolute inset-0 rounded-full bg-emerald-400/25 animate-ping" />
      <span className="absolute inset-2 rounded-full bg-emerald-400/40 animate-ping [animation-delay:200ms]" />
      <span className="relative inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/40">
        <PhoneCall className="w-5 h-5" weight="fill" />
      </span>
    </div>
  )
}

function fmtDuration(s: number): string {
  if (s < 60) return `0:${String(s).padStart(2, '0')}`
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
