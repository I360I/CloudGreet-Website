'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, PhoneCall, PhoneSlash, MicrophoneSlash, Microphone, X, CircleNotch, WarningCircle } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

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

declare global {
  interface Window {
    cgDial?: (number: string, leadId?: string) => void
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

      // On mount we use the Permissions API as a *fast path only*: if it
      // says 'granted', skip straight to connecting. Anything else (prompt,
      // denied, or API missing), wait for the user to click "Allow
      // microphone" - calling getUserMedia without a gesture both fails
      // and pollutes the UI with a non-actionable NotAllowedError.
      if (!opts?.fromUserGesture) {
        let granted = false
        try {
          const perm = await navigator.permissions
            ?.query?.({ name: 'microphone' as PermissionName })
            .catch(() => null)
          granted = perm?.state === 'granted'
        } catch { /* fall through to require click */ }
        if (!granted) {
          setStatus('mic_required')
          return
        }
      } else {
        // We were invoked from a click handler. getUserMedia is the source
        // of truth; do not gate on Permissions API (it can be stale).
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          stream.getTracks().forEach((t) => t.stop())
        } catch (e: any) {
          // eslint-disable-next-line no-console
          console.error('getUserMedia failed', e)
          const name = e?.name || 'Error'
          setMicErrName(`${name}${e?.message ? ` - ${e.message}` : ''}`)
          if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
            setStatus('mic_denied')
          } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
            setStatus('error')
            setError('No microphone detected on this device.')
          } else {
            setStatus('error')
            setError(e?.message || 'Could not access microphone')
          }
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

  const grantMicrophone = useCallback(async () => {
    setError(null)
    setMicErrName(null)
    setMicBusy(true)
    // setup() now does the getUserMedia call itself - this click provides
    // the user gesture browsers require. If the OS/browser is still
    // blocking, setup will land us in mic_required/error with micErrName
    // showing the actual reason.
    try {
      if (setupRef.current) await setupRef.current({ fromUserGesture: true })
    } finally {
      setMicBusy(false)
    }
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
    return () => {
      if (window.cgDial) delete window.cgDial
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

  return (
    <div className="fixed bottom-5 right-5 z-[80] sm:block hidden">
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="mb-3 w-80 bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-700" weight="fill" />
                <div className="text-sm font-medium text-gray-900">Dialer</div>
                <SessionPill status={status} />
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 -m-1 text-gray-400 hover:text-gray-700"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4">
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
                  <input
                    type="tel"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Enter or paste a number"
                    disabled={inCall}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-base font-mono tabular-nums text-center focus:outline-none focus:border-gray-400 focus:bg-white disabled:opacity-60"
                  />

                  {/* Live call state - replaces the keypad while a call is in flight. */}
                  {(callState === 'connecting' || callState === 'ringing') && (
                    <div className="mt-4 flex flex-col items-center justify-center py-4">
                      <div className="text-sm text-gray-700 mb-2">
                        {callState === 'connecting' ? 'Dialing' : 'Ringing'}
                        <RingingDots />
                      </div>
                      <RingingPulse />
                      <div className="mt-3 font-mono text-xs text-gray-500 tabular-nums">{destination}</div>
                    </div>
                  )}
                  {callState === 'active' && (
                    <div className="mt-4 flex flex-col items-center justify-center py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-emerald-700">on call</span>
                      </div>
                      <div className="text-2xl font-mono tabular-nums text-gray-900">{fmtDuration(secondsActive)}</div>
                      <div className="mt-1 font-mono text-xs text-gray-500 tabular-nums">{destination}</div>
                    </div>
                  )}
                  {callState === 'ended' && (
                    <div className="mt-3 text-center text-xs text-gray-500">Call ended.</div>
                  )}

                  {/* Keypad - hidden during connecting/ringing so the live state
                      gets full visual focus. Shown during active calls so reps
                      can send DTMF digits to IVR menus. */}
                  {(callState === 'idle' || callState === 'ended' || callState === 'active') && (
                    <div className="mt-3 grid grid-cols-3 gap-1.5">
                      {KEYPAD.map(({ digit, sub }) => (
                        <button
                          key={digit}
                          type="button"
                          onClick={() => onKeypadPress(digit)}
                          className="h-11 rounded-lg bg-gray-50 hover:bg-gray-100 active:bg-gray-200 active:scale-[0.97] transition-all flex flex-col items-center justify-center"
                        >
                          <span className="text-base font-medium text-gray-900 leading-none">{digit}</span>
                          {sub && <span className="text-[9px] font-mono text-gray-400 mt-0.5 tracking-wider">{sub}</span>}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="mt-3 flex items-center gap-2">
                    {!inCall ? (
                      <>
                        {destination && !inCall && (
                          <button
                            onClick={() => setDestination((d) => d.slice(0, -1))}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                            aria-label="Backspace"
                            type="button"
                          >
                            ⌫
                          </button>
                        )}
                        <button
                          onClick={onCallNow}
                          disabled={status !== 'ready' || !destination.trim()}
                          className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 text-white text-sm font-medium rounded-xl px-4 py-2.5 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <PhoneCall className="w-4 h-4" weight="fill" />
                          Call
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={toggleMute}
                          className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm border transition-all ${
                            muted
                              ? 'bg-amber-50 border-amber-200 text-amber-800'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {muted ? <Microphone className="w-4 h-4" /> : <MicrophoneSlash className="w-4 h-4" />}
                          {muted ? 'Unmute' : 'Mute'}
                        </button>
                        <button
                          onClick={hangup}
                          className="flex-1 inline-flex items-center justify-center gap-2 bg-rose-600 text-white text-sm font-medium rounded-xl px-4 py-2.5 hover:bg-rose-700 active:scale-[0.98] transition-all"
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
                    <div className="mt-3 text-[10px] font-mono text-gray-400 text-center">
                      from · {fromNumberRef.current}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating launcher */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`relative w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-[0.96] ${
          inCall
            ? 'bg-emerald-600 text-white shadow-emerald-600/30'
            : 'bg-gray-900 text-white shadow-gray-900/20 hover:bg-gray-800'
        }`}
        aria-label="Open dialer"
      >
        {inCall ? <PhoneCall className="w-5 h-5" weight="fill" /> : <Phone className="w-5 h-5" weight="fill" />}
        {status === 'ready' && !inCall && (
          <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" aria-hidden />
        )}
      </button>
    </div>
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
