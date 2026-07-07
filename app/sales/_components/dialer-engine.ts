'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

/**
 * Telnyx WebRTC dialer engine, extracted from Dialer.tsx so two surfaces
 * can share one battle-tested call path:
 *   - the floating panel (Dialer.tsx) on the leads pages
 *   - the full-screen call cockpit (/setter/dialer)
 *
 * The audio-path workarounds in dial() (pre-captured localStream, the
 * tryUnmute triple-fire, the attachStream poller) encode real Telnyx SDK
 * bugs discovered the hard way - moved verbatim, do NOT "clean them up".
 *
 * Only one engine instance should be mounted at a time (the panel and
 * the cockpit live on different routes, so this holds naturally).
 */

export type CallState =
  | 'idle'
  | 'connecting'        // dialing out, waiting for ringback
  | 'ringing'           // remote ringing
  | 'active'            // call connected
  | 'ended'

export type SessionStatus =
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

export type CallEndedInfo = {
  leadId: string | null
  finalStatus: string
  durationSeconds: number
}

declare global {
  interface Window {
    cgDial?: (number: string, leadId?: string) => void
    cgPowerDial?: (items: PowerDialItem[]) => void
    cgPowerDialAbort?: () => void
  }
}

export type DialerEngineOptions = {
  /** Fired when the session needs the user (mic prompt/denied, hard error). */
  onAttentionNeeded?: () => void
  /** Fired once per call after the log row is finalized. */
  onCallEnded?: (info: CallEndedInfo) => void
  /** Seconds between queue calls (default 5). Change any time. */
  advanceSeconds?: number
}

export function useDialerEngine(options: DialerEngineOptions = {}) {
  const [status, setStatus] = useState<SessionStatus>('init')
  const [error, setError] = useState<string | null>(null)
  const [callState, setCallState] = useState<CallState>('idle')
  const [destination, setDestination] = useState('')
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)
  const [droppingVm, setDroppingVm] = useState(false)
  const [secondsActive, setSecondsActive] = useState(0)
  const [micBusy, setMicBusy] = useState(false)
  const [micErrName, setMicErrName] = useState<string | null>(null)
  const [fromNumber, setFromNumber] = useState<string | null>(null)

  // Power dialer queue. When non-empty, the engine auto-advances:
  // dial item N → wait for call to end → countdown (with optional
  // post-call status selection) → dial item N+1.
  const [queue, setQueue] = useState<PowerDialItem[]>([])
  const [queueIndex, setQueueIndex] = useState(0)
  const [queuePaused, setQueuePaused] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [postCallStatus, setPostCallStatus] = useState<string | null>(null)
  const lastQueuedLeadIdRef = useRef<string | null>(null)
  const queueAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Mirror for the countdown loop: the tick chain is created once when
  // the call ends, so reading postCallStatus through state would see a
  // stale closure and silently drop tags picked during the countdown
  // (real bug in the pre-extraction version).
  const postCallStatusRef = useRef<string | null>(null)
  useEffect(() => { postCallStatusRef.current = postCallStatus }, [postCallStatus])
  // Mirror for finalizeCall's ended→idle tail: while a queue session is
  // live the advance countdown owns the 'ended' state, and flipping to
  // 'idle' out from under it cancels the countdown mid-flight, freezes
  // the timer, and disables the disposition buttons (callee-hangup bug).
  const queueLenRef = useRef(0)
  useEffect(() => { queueLenRef.current = queue.length }, [queue.length])

  const optionsRef = useRef(options)
  useEffect(() => { optionsRef.current = options })
  const advanceSecondsRef = useRef(options.advanceSeconds ?? 5)
  useEffect(() => { advanceSecondsRef.current = options.advanceSeconds ?? 5 }, [options.advanceSeconds])

  // Refs to long-lived objects (Telnyx client, current Call, server-side
  // log row id, etc.) so re-renders don't recreate them.
  const clientRef = useRef<any>(null)
  const callRef = useRef<any>(null)
  const callRowIdRef = useRef<string | null>(null)
  const fromNumberRef = useRef<string | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const setupRef = useRef<((opts?: { fromUserGesture?: boolean }) => Promise<void>) | null>(null)

  // Cached number pool for local-presence caller-ID selection. Loaded
  // once on ready and refreshed when NumberPicker mutates the pool -
  // replaces the old fetch-per-call workaround.
  const numbersRef = useRef<{ phone_number: string; is_active: boolean }[]>([])
  const refreshNumbers = useCallback(async () => {
    try {
      const r = await fetchWithAuth('/api/sales/dialer/numbers')
      const j = await r.json().catch(() => ({}))
      if (j?.numbers) numbersRef.current = j.numbers
    } catch { /* keep the stale cache */ }
  }, [])

  // Telnyx WebRTC needs an <audio> element to pump the remote (callee)
  // audio into. Without this you hear ringing but nothing else. Created
  // imperatively on mount so it exists before any newCall, regardless of
  // what the consuming surface renders.
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  useEffect(() => {
    const el = document.createElement('audio')
    el.autoplay = true
    el.setAttribute('playsinline', '')
    el.style.display = 'none'
    document.body.appendChild(el)
    remoteAudioRef.current = el
    return () => {
      remoteAudioRef.current = null
      el.remove()
    }
  }, [])

  const activeLeadIdRef = useRef<string | null>(null)
  // One finalize per call (Telnyx fires hangup AND destroy); reset in dial().
  const finalizedRef = useRef(false)
  // SDK id of the call we're currently running; notifications for any
  // other (stale) call id are ignored entirely.
  const currentCallIdRef = useRef<string | null>(null)
  // Which log row already got its real call_control_id patched.
  const ccidSentForRowRef = useRef<string | null>(null)

  const finalizeCall = useCallback(async (finalStatus: string, duration: number) => {
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
    try {
      optionsRef.current.onCallEnded?.({
        leadId: activeLeadIdRef.current,
        finalStatus,
        durationSeconds: duration,
      })
    } catch { /* consumer error is not the engine's problem */ }
    // activeLeadId intentionally kept through the 'ended' state so the
    // cockpit can show a disposition prompt for single dials too - the
    // next dial() overwrites it.
    // Small "ended" tail in the UI before flipping back to idle. Skipped
    // during queue sessions: there the advance countdown owns 'ended'
    // (buttons stay clickable for the whole gap) and the transition out
    // happens via the next dial() or the queue-drain path.
    setTimeout(() => {
      if (queueLenRef.current > 0) return
      setCallState((cs) => (cs === 'ended' ? 'idle' : cs))
    }, 1500)
  }, [])

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
        setFromNumber(j.from_number || null)
        void refreshNumbers()

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
          // Ignore notifications for anything but the CURRENT call. The
          // SDK emits late destroy/purge events for previous calls
          // (notably right after a new call starts) - processing those
          // finalized the new call instantly and double-counted dials.
          if (c?.id && currentCallIdRef.current && c.id !== currentCallIdRef.current) return
          callRef.current = c
          const s = c?.state
          if (s === 'requesting' || s === 'trying') setCallState('connecting')
          else if (s === 'ringing' || s === 'early') setCallState('ringing')
          else if (s === 'active') {
            setCallState('active')
            startedAtRef.current = Date.now()
            // The SDK's call.id is its internal session UUID, useless
            // against the Call Control API. Once the call is up, the SDK
            // exposes the REAL call_control_id - patch it onto our log
            // row so voicemail-drop's speak/hangup actions target a call
            // Telnyx recognizes (the rep-voice webhook can't do this for
            // outbound WebRTC legs; it ignores them as unhandled).
            try {
              const ccid = (c as any)?.telnyxIDs?.telnyxCallControlId
              if (ccid && callRowIdRef.current && ccidSentForRowRef.current !== callRowIdRef.current) {
                ccidSentForRowRef.current = callRowIdRef.current
                void fetchWithAuth('/api/sales/dialer/log', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: callRowIdRef.current, telnyx_call_id: ccid }),
                }).then(() => {
                  // Auto-record (owner-only, server decides by the callee's
                  // consent-law state). Fire-and-forget AFTER the ccid is on
                  // the row so the backend can find/gate it; never blocks or
                  // affects the live call.
                  void fetchWithAuth('/api/sales/dialer/record', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ call_control_id: ccid, lead_id: activeLeadIdRef.current }),
                  }).catch(() => {})
                }).catch(() => {})
              }
            } catch { /* non-fatal */ }
            // Telnyx SDK mutes the local mic on call start
            // ("Muting local audio tracks on start" log in bundle.js).
            // The moment the call flips to active, unmute so the
            // callee can actually hear the rep.
            try {
              if (typeof (c as any).unmuteAudio === 'function') {
                (c as any).unmuteAudio()
              }
              const senders: RTCRtpSender[] | undefined =
                (c as any)?.peer?.peerConnection?.getSenders?.()
              senders?.forEach((sndr) => {
                if (sndr.track?.kind === 'audio' && !sndr.track.enabled) {
                  sndr.track.enabled = true
                }
              })
            } catch { /* non-fatal */ }
          } else if (s === 'hangup' || s === 'destroy' || s === 'purge') {
            // Telnyx fires SEPARATE notifications for hangup and destroy
            // on the same call - finalizing on each doubled every session
            // stat (6 "dials" for 3 calls). Guard: one finalize per call.
            // CRITICAL: still clear callRef before returning - the handler
            // top just re-stored this dead call, and a stale callRef makes
            // every subsequent dial() no-op ("already on a call"), which
            // froze queues into instant ended->tag loops after call #1.
            if (finalizedRef.current) {
              callRef.current = null
              return
            }
            finalizedRef.current = true
            // Release the mic stream we captured at dial time. Without
            // this the browser keeps the mic active across calls and
            // the next outbound call can fail to acquire a fresh stream.
            try {
              const ls = (c as any)?._cgLocalStream as MediaStream | undefined
              ls?.getTracks().forEach((t) => t.stop())
            } catch { /* non-fatal */ }
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
              : 'no_answer'
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

  const grantMicrophone = useCallback(() => {
    // CRITICAL: getUserMedia must be called synchronously from the click
    // handler with no awaits before it, otherwise some browsers consider
    // the user gesture stale and silently auto-deny without prompting.
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

  // Attention callback for surfaces that hide the dialer behind a
  // launcher (the floating panel auto-opens on these).
  useEffect(() => {
    if (status === 'mic_required' || status === 'mic_denied' || status === 'error') {
      try { optionsRef.current.onAttentionNeeded?.() } catch { /* ignore */ }
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

  const dial = useCallback(async (rawNumber: string, leadId?: string) => {
    const number = e164(rawNumber)
    if (!number) {
      setError(`Couldn't parse "${rawNumber}" as a US phone`)
      return
    }
    if (status !== 'ready') {
      setError('Dialer not ready yet - try again in a second.')
      try { optionsRef.current.onAttentionNeeded?.() } catch { /* ignore */ }
      return
    }
    if (callRef.current) {
      // Already on a call; ignore.
      return
    }
    setError(null)
    setActiveLeadId(leadId || null)
    activeLeadIdRef.current = leadId || null
    setDestination(number)
    setCallState('connecting')
    startedAtRef.current = null
    finalizedRef.current = false

    // Local presence: pick whichever of the rep's up-to-3 saved numbers
    // shares the lead's area code, instead of always dialing out from
    // the single static "active" one. Uses the cached pool (refreshed on
    // ready + on NumberPicker changes).
    let callerNumber = fromNumberRef.current
    const npa = number.slice(2, 5)
    const match = numbersRef.current.find((n) => n.phone_number.slice(2, 5) === npa)
    if (match) callerNumber = match.phone_number

    // Capture a fresh mic stream right before placing the call. We
    // rely on the SDK's audio:true under the hood, but in some Telnyx
    // SDK versions / browser combos the internal getUserMedia silently
    // ends up muted after the permission-priming stop() pattern -
    // result: callee hears nothing while the rep hears them fine.
    // Pre-capturing and passing localStream sidesteps that entirely.
    let localStream: MediaStream | null = null
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      })
    } catch (err) {
      console.error('dial: getUserMedia failed', err)
      setCallState('idle')
      setError(err instanceof Error ? err.message : 'Microphone unavailable')
      return
    }

    // Sanity check: track must be enabled or the callee hears silence.
    const audioTrack = localStream.getAudioTracks()[0]
    if (audioTrack && !audioTrack.enabled) audioTrack.enabled = true

    try {
      const call = clientRef.current.newCall({
        destinationNumber: number,
        callerNumber,
        // Correct option per @telnyx/webrtc 2.26.4 ICallOptions:
        // it's `localStream`, not `mediaStream`.
        localStream,
        audio: true,
        video: false,
        // Pipe the remote (callee) audio stream into the hidden
        // <audio> we appended to the body on mount.
        remoteElement: remoteAudioRef.current || undefined,
      })
      callRef.current = call
      // Remember which call is CURRENT: the SDK emits late purge/destroy
      // notifications for previous calls (especially right after a new
      // one starts), and treating those as this call ending produced
      // phantom "dials" and instant ended->tag screens mid-ring.
      currentCallIdRef.current = (call as any)?.id || null

      // *** THE ACTUAL FIX ***
      // The Telnyx SDK explicitly mutes the local audio tracks on
      // call start (literal log line in bundle.js: "Muting local
      // audio tracks on start"). Unmute via the call object once the
      // call is established. Multiple attempts since we don't know
      // exactly when "active" fires for this SDK version.
      const tryUnmute = () => {
        try {
          if (typeof (call as any).unmuteAudio === 'function') {
            (call as any).unmuteAudio()
          }
          // Belt and suspenders: also force the captured track on.
          localStream?.getAudioTracks().forEach((t) => { t.enabled = true })
          // And the underlying RTCRtpSender if it's accessible.
          const senders: RTCRtpSender[] | undefined =
            (call as any)?.peer?.peerConnection?.getSenders?.()
          const audioSender = senders?.find((s) => s.track?.kind === 'audio')
          if (audioSender?.track && !audioSender.track.enabled) {
            audioSender.track.enabled = true
          }
          // eslint-disable-next-line no-console
          console.info('dialer: unmute attempt', {
            hasMethod: typeof (call as any).unmuteAudio === 'function',
            trackEnabled: localStream?.getAudioTracks()[0]?.enabled,
            senderEnabled: audioSender?.track?.enabled,
            isAudioMuted: (call as any)?.isAudioMuted,
          })
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('dialer unmute attempt threw', e)
        }
      }
      // Fire multiple times to catch whichever state transition
      // un-mutes us. Cheap operation, no harm in repeating.
      setTimeout(tryUnmute, 500)
      setTimeout(tryUnmute, 1500)
      setTimeout(tryUnmute, 3000)

      // Stop the local stream when the call ends to free the mic.
      ;(call as any)._cgLocalStream = localStream

      // Safety net for SDK versions that ignore remoteElement: attach
      // the stream manually as soon as the call exposes one. We poll
      // briefly since the exact event name has varied across SDK versions.
      const attachStream = () => {
        const el = remoteAudioRef.current
        if (!el) return false
        const stream =
          (call as any)?.remoteStream ||
          (call as any)?.peer?.remoteStream ||
          (call as any)?.options?.remoteStream
        if (stream && el.srcObject !== stream) {
          el.srcObject = stream
          el.play().catch(() => { /* autoplay can be blocked - ignore */ })
          return true
        }
        return false
      }
      // Try immediately, then poll for up to 5s. Once attached, stop.
      if (!attachStream()) {
        const iv = setInterval(() => {
          if (attachStream() || !callRef.current) clearInterval(iv)
        }, 200)
        setTimeout(() => clearInterval(iv), 5000)
      }
      // Open the server-side log row so we can update it on end.
      void (async () => {
        try {
          const r = await fetchWithAuth('/api/sales/dialer/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to_number: number,
              from_number: callerNumber,
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

  const hangup = useCallback(() => {
    try { callRef.current?.hangup?.() } catch {}
  }, [])

  const toggleMute = useCallback(() => {
    const c = callRef.current
    if (!c) return
    setMuted((m) => {
      if (m) {
        try { c.unmuteAudio() } catch {}
        return false
      }
      try { c.muteAudio() } catch {}
      return true
    })
  }, [])

  // Telnyx's Answering Machine Detection only works on calls it
  // originates itself (POST /v2/calls) - the rep judges by ear and
  // clicks this; the server speaks a script and hangs up for them.
  const dropVoicemail = useCallback(async () => {
    if (!callRowIdRef.current || droppingVm) return
    setDroppingVm(true)
    try {
      const r = await fetchWithAuth('/api/sales/dialer/voicemail-drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ call_row_id: callRowIdRef.current }),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        setError(j?.error || 'Voicemail drop failed - hang up manually.')
      }
    } catch {
      setError('Voicemail drop failed - hang up manually.')
    } finally {
      setDroppingVm(false)
    }
  }, [droppingVm])

  // Keypad press: send DTMF when on a live call (so reps can navigate
  // IVRs); otherwise append to the destination input.
  const onKeypadPress = useCallback((digit: string) => {
    if (callRef.current && typeof callRef.current.dtmf === 'function') {
      const cs = callRef.current.state
      if (cs === 'active') {
        try { callRef.current.dtmf(digit) } catch { /* non-fatal */ }
        return
      }
    }
    setDestination((d) => d + digit)
  }, [])

  /** Persist a lead disposition (status) + optional outcome note. */
  const persistDisposition = useCallback(async (leadId: string, statusValue: string, dispositionNote?: string) => {
    try {
      await fetchWithAuth(`/api/sales/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: statusValue,
          touched: true,
          ...(dispositionNote ? { disposition: dispositionNote } : {}),
        }),
      })
    } catch { /* non-fatal */ }
  }, [])

  // ---- Power-dial queue ----

  const startQueue = useCallback((items: PowerDialItem[]) => {
    const cleaned = items.filter((it) => it.phone && it.leadId)
    if (cleaned.length === 0) return
    setQueue(cleaned)
    setQueueIndex(0)
    setQueuePaused(false)
    setPostCallStatus(null)
    setCountdown(null)
    // Defer the first dial a tick so React applies the queue state
    // before we kick off the call (the call-end watcher reads `queue`).
    setTimeout(() => {
      const first = cleaned[0]
      lastQueuedLeadIdRef.current = first.leadId
      void dial(first.phone, first.leadId)
    }, 50)
  }, [dial])

  const abortQueue = useCallback(() => {
    if (queueAdvanceTimerRef.current) {
      clearTimeout(queueAdvanceTimerRef.current)
      queueAdvanceTimerRef.current = null
    }
    setQueue([])
    setQueueIndex(0)
    setQueuePaused(false)
    setCountdown(null)
    setPostCallStatus(null)
  }, [])

  // Expose `window.cgDial` etc. so any component can dial without a
  // React context plumbing exercise.
  useEffect(() => {
    window.cgDial = (number: string, leadId?: string) => void dial(number, leadId)
    window.cgPowerDial = startQueue
    window.cgPowerDialAbort = abortQueue
    return () => {
      if (window.cgDial) delete window.cgDial
      if (window.cgPowerDial) delete window.cgPowerDial
      if (window.cgPowerDialAbort) delete window.cgPowerDialAbort
    }
  }, [dial, startQueue, abortQueue])

  const queueActive = queue.length > 0
  const currentItem = queueActive ? queue[queueIndex] : null
  const isLast = queueActive && queueIndex >= queue.length - 1

  // Auto-advance: when a call ends inside a queue session, run a
  // countdown with a post-call status picker, then dial the next item.
  useEffect(() => {
    if (!queueActive) return
    if (callState !== 'ended') return
    if (queuePaused) return
    if (isLast && !currentItem) return

    const total = Math.max(2, advanceSecondsRef.current)
    setCountdown(total)
    const tick = (n: number) => {
      if (n <= 0) {
        if (queueAdvanceTimerRef.current) {
          clearTimeout(queueAdvanceTimerRef.current)
          queueAdvanceTimerRef.current = null
        }
        setCountdown(null)
        // Persist post-call status (read through the ref - see comment
        // at the ref declaration) or default to 'called'.
        if (lastQueuedLeadIdRef.current) {
          void persistDisposition(lastQueuedLeadIdRef.current, postCallStatusRef.current || 'called')
        }
        setPostCallStatus(null)
        // Advance.
        if (isLast) {
          setQueue([])
          setQueueIndex(0)
          lastQueuedLeadIdRef.current = null
          // finalizeCall skips its idle tail during queue sessions, so
          // the drain path settles the state itself.
          setCallState((cs) => (cs === 'ended' ? 'idle' : cs))
          return
        }
        const next = queue[queueIndex + 1]
        if (next) {
          setQueueIndex((i) => i + 1)
          lastQueuedLeadIdRef.current = next.leadId
          void dial(next.phone, next.leadId)
        }
        return
      }
      setCountdown(n)
      queueAdvanceTimerRef.current = setTimeout(() => tick(n - 1), 1000)
    }
    queueAdvanceTimerRef.current = setTimeout(() => tick(total - 1), 1000)

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
  const togglePause = useCallback(() => setQueuePaused((p) => !p), [])

  const skipCurrent = useCallback(() => {
    if (queueAdvanceTimerRef.current) clearTimeout(queueAdvanceTimerRef.current)
    setCountdown(null)
    // Skip still persists a tag - whatever was picked, else 'called'.
    // (The old behavior silently dropped it.)
    if (lastQueuedLeadIdRef.current) {
      void persistDisposition(lastQueuedLeadIdRef.current, postCallStatusRef.current || 'called')
    }
    setPostCallStatus(null)
    if (callState !== 'idle' && callState !== 'ended') {
      try { callRef.current?.hangup?.() } catch {}
    }
    if (isLast) {
      setQueue([])
      setQueueIndex(0)
      setCallState((cs) => (cs === 'ended' ? 'idle' : cs))
      return
    }
    const next = queue[queueIndex + 1]
    if (next) {
      setQueueIndex((i) => i + 1)
      lastQueuedLeadIdRef.current = next.leadId
      // Brief delay so the current call finishes hanging up before we redial.
      setTimeout(() => void dial(next.phone, next.leadId), 250)
    }
  }, [callState, isLast, queue, queueIndex, dial, persistDisposition])

  const stopQueue = useCallback(() => {
    if (queueAdvanceTimerRef.current) clearTimeout(queueAdvanceTimerRef.current)
    setCountdown(null)
    // Stop also persists the picked tag for the call just ended.
    if (lastQueuedLeadIdRef.current && callState === 'ended') {
      void persistDisposition(lastQueuedLeadIdRef.current, postCallStatusRef.current || 'called')
    }
    setPostCallStatus(null)
    setQueue([])
    setQueueIndex(0)
    if (callState === 'ended') {
      setCallState('idle')
    } else if (callState !== 'idle') {
      try { callRef.current?.hangup?.() } catch {}
    }
  }, [callState, persistDisposition])

  /** For NumberPicker's onActiveChanged bubble. */
  const applyActiveNumber = useCallback((num: string) => {
    fromNumberRef.current = num
    setFromNumber(num)
    void refreshNumbers()
  }, [refreshNumbers])

  const inCall = callState === 'connecting' || callState === 'ringing' || callState === 'active'

  return {
    // session
    status, error, micBusy, micErrName, grantMicrophone,
    // call
    callState, inCall, destination, setDestination, activeLeadId,
    secondsActive, muted, droppingVm,
    dial, hangup, toggleMute, dropVoicemail, onKeypadPress,
    // caller id
    fromNumber, applyActiveNumber, refreshNumbers,
    // queue
    queue, queueIndex, queueActive, currentItem, isLast,
    queuePaused, countdown, postCallStatus, setPostCallStatus,
    startQueue, abortQueue, togglePause, skipCurrent, stopQueue,
    // shared plumbing
    persistDisposition,
  }
}

/**
 * Lead note thread for the in-call surfaces. Fetch once per lead
 * (guarded by ref) so notes are loaded by the time the call connects.
 */
export function useLeadNotes(leadId: string | null) {
  const [notes, setNotes] = useState<{ id: string; body: string; created_at: string }[]>([])
  const [loading, setLoading] = useState(false)
  const fetchedForRef = useRef<string | null>(null)

  useEffect(() => {
    setNotes([])
    fetchedForRef.current = null
    if (!leadId) return
    fetchedForRef.current = leadId
    setLoading(true)
    void (async () => {
      try {
        const r = await fetchWithAuth(`/api/sales/leads/${leadId}`)
        const j = await r.json().catch(() => ({}))
        if (j?.success) setNotes(j.notes || [])
      } catch { /* non-fatal */ } finally {
        setLoading(false)
      }
    })()
  }, [leadId])

  const addNote = useCallback(async (body: string) => {
    const text = body.trim()
    if (!text || !leadId) return
    try {
      const r = await fetchWithAuth(`/api/sales/leads/${leadId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      })
      const j = await r.json().catch(() => ({}))
      if (j?.success && j.note) setNotes((prev) => [j.note, ...prev])
    } catch { /* non-fatal */ }
  }, [leadId])

  return { notes, loading, addNote }
}

// ---- Shared formatting helpers ----

/**
 * Format an E.164 number to "(214) 555-1234". Falls back to raw input
 * for anything that doesn't parse as US.
 */
export function formatFromNumber(raw: string): string {
  const digits = String(raw).replace(/[^0-9]/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return raw
}

// US-shaped E.164 normalization. Mirrors lib/scrapers/normalize.ts so
// the dialer accepts whatever's stored on the lead row.
export function e164(raw: string): string | null {
  if (!raw) return null
  const digits = String(raw).replace(/[^0-9]/g, '')
  if (!digits) return null
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.length >= 11) return `+1${digits.slice(-10)}`
  return null
}

export const KEYPAD: { digit: string; sub?: string }[] = [
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

export function fmtDuration(s: number): string {
  if (s < 60) return `0:${String(s).padStart(2, '0')}`
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
