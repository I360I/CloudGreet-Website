'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { Phone, PhoneCall, PhoneSlash, MicrophoneSlash, Microphone, X, CircleNotch, WarningCircle, Pause, Play, SkipForward, Stop, CaretDown, Voicemail } from '@phosphor-icons/react'
import { NumberPicker } from './NumberPicker'
import {
  useDialerEngine, useLeadNotes, formatFromNumber, fmtDuration, KEYPAD,
  type SessionStatus, type PowerDialItem,
} from './dialer-engine'

export type { PowerDialItem }

/**
 * Floating Telnyx WebRTC dialer panel.
 *
 * Lives in the shells so it persists across page navigation. The actual
 * call engine (Telnyx session, queue mechanics, audio workarounds) lives
 * in dialer-engine.ts and is shared with the full-screen call cockpit -
 * this file is just the compact floating UI over it.
 */
export function Dialer() {
  const [open, setOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const dragControls = useDragControls()

  const engine = useDialerEngine({
    // Auto-open the panel when something needs the user's attention
    // (mic prompt, denied state, hard error). Reps shouldn't have to
    // know the dialer button hides the actual problem.
    onAttentionNeeded: () => setOpen(true),
  })
  const {
    status, error, micBusy, micErrName, grantMicrophone,
    callState, inCall, destination, setDestination, activeLeadId,
    secondsActive, muted, droppingVm,
    dial, hangup, toggleMute, dropVoicemail, onKeypadPress,
    fromNumber, applyActiveNumber,
    queue, queueIndex, queueActive, currentItem,
    queuePaused, countdown, postCallStatus, setPostCallStatus,
    togglePause, skipCurrent, stopQueue,
  } = engine

  // Opening a power-dial session from the leads list should also pop
  // the panel so the rep sees the queue header.
  useEffect(() => {
    if (queueActive) setOpen(true)
  }, [queueActive])

  const { notes: callNotes, loading: notesLoading, addNote } = useLeadNotes(activeLeadId)

  const addCallNote = () => {
    const text = noteDraft.trim()
    if (!text) return
    setNoteDraft('')
    void addNote(text)
  }

  const onCallNow = () => {
    if (!destination.trim()) return
    setOpen(true)
    void dial(destination)
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
              <div className="px-3 py-2.5 bg-blue-50 border-b border-blue-100 text-xs">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="font-medium text-blue-900 inline-flex items-center gap-1.5">
                    <PhoneCall className="w-3.5 h-3.5" weight="fill" />
                    Power dial · {queueIndex + 1} of {queue.length}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={togglePause}
                      className="p-1 text-blue-700 hover:text-blue-900"
                      title={queuePaused ? 'Resume' : 'Pause'}
                    >
                      {queuePaused
                        ? <Play className="w-3.5 h-3.5" weight="fill" />
                        : <Pause className="w-3.5 h-3.5" weight="fill" />}
                    </button>
                    <button
                      onClick={skipCurrent}
                      className="p-1 text-blue-700 hover:text-blue-900"
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
                  <div className="text-blue-800 truncate">
                    {currentItem.businessName || currentItem.contactName || currentItem.phone}
                  </div>
                )}
                {callState === 'ended' && countdown !== null && !queuePaused && (
                  <div className="mt-2 pt-2 border-t border-blue-100">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-blue-700 mb-1.5">
                      Tag this call · next in {countdown}s
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { v: 'called',      l: 'Talked' },
                        { v: 'voicemail',   l: 'VM' },
                        { v: 'interested',  l: 'Interested' },
                        { v: 'dead',        l: 'Dead' },
                        { v: 'do_not_call', l: 'DNC' },
                      ].map((opt) => (
                        <button
                          key={opt.v}
                          onClick={() => setPostCallStatus(opt.v)}
                          className={`text-[11px] rounded-md px-2 py-1 border transition-colors ${
                            postCallStatus === opt.v
                              ? 'bg-blue-700 text-white border-blue-700'
                              : 'bg-white text-blue-800 border-blue-200 hover:border-blue-400'
                          }`}
                        >
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {queuePaused && (
                  <div className="mt-1 text-[11px] italic text-blue-700">Paused.</div>
                )}
              </div>
            )}

            <div className="p-3">
              {status === 'unconfigured' ? (
                <div className="text-xs text-gray-600">
                  <div className="font-medium text-gray-900 mb-1">Not set up yet</div>
                  Browser dialing needs Telnyx credentials. Admin has to flip a couple of env vars before this works (TELNYX_TELEPHONY_CREDENTIAL_ID and TELNYX_OUTBOUND_FROM_NUMBER).
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
                      no separate ring animation panel. */}
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

                  {/* Lead notes - surfaced here so the rep doesn't have
                      to tab away to the leads page mid-call. */}
                  {inCall && activeLeadId && (
                    <div className="mt-2.5 border border-gray-200 rounded-lg bg-gray-50/60 max-h-32 overflow-y-auto">
                      <div className="px-2.5 pt-2 pb-1.5 flex items-center gap-1.5">
                        <input
                          type="text"
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') addCallNote() }}
                          placeholder="Add a note…"
                          className="flex-1 min-w-0 bg-white border border-gray-200 rounded-md px-2 py-1 text-[11px] focus:outline-none focus:border-gray-400"
                        />
                        <button
                          type="button"
                          onClick={addCallNote}
                          disabled={!noteDraft.trim()}
                          className="text-[11px] font-medium text-gray-700 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed px-1.5"
                        >
                          Add
                        </button>
                      </div>
                      {notesLoading ? (
                        <div className="px-2.5 pb-2 text-[11px] text-gray-400">Loading notes…</div>
                      ) : callNotes.length > 0 ? (
                        <ul className="px-2.5 pb-2 space-y-1">
                          {callNotes.map((n) => (
                            <li key={n.id} className="text-[11px] text-gray-600 leading-snug">
                              <span className="text-gray-400 font-mono">
                                {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>{' '}
                              {n.body}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="px-2.5 pb-2 text-[11px] text-gray-400">No notes yet.</div>
                      )}
                    </div>
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
                            onClick={() => setDestination(destination.slice(0, -1))}
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
                        {callState === 'active' && (
                          <button
                            onClick={dropVoicemail}
                            disabled={droppingVm}
                            title="Speak a voicemail script and hang up"
                            className="inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-2 text-xs border bg-white border-gray-200 text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-wait"
                          >
                            {droppingVm ? <CircleNotch className="w-3.5 h-3.5 animate-spin" /> : <Voicemail className="w-3.5 h-3.5" />}
                            {droppingVm ? 'Dropping…' : 'Drop VM'}
                          </button>
                        )}
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

                  {fromNumber && status === 'ready' && !inCall && (
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="mt-3 mx-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-colors"
                      title="Switch which number you call from"
                    >
                      <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">from</span>
                      <span className="text-sm font-medium text-gray-900 tabular-nums">{formatFromNumber(fromNumber)}</span>
                      <CaretDown weight="bold" className="w-3 h-3 text-gray-500" />
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
        onActiveChanged={applyActiveNumber}
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
