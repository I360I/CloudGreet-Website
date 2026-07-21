'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  PhoneCall, PhoneSlash, Microphone, MicrophoneSlash, Voicemail, CircleNotch,
  Pause, Play, SkipForward, Stop, CheckCircle, WarningCircle, CaretDown,
  DotsNine, ChatText, CalendarBlank, ClockCounterClockwise, ArrowLeft, Star, PaperPlaneTilt, PencilSimple, CopySimple, ArrowSquareOut, MagnifyingGlass,
} from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import {
  useLeadNotes, fmtDuration, KEYPAD,
  type SessionStatus,
} from '@/app/sales/_components/dialer-engine'
import { useDialerSession, type CockpitLead } from './DialerSessionProvider'
import { firaCode } from './fonts'
import { SmsThread } from './SmsThread'
import { leadTimeZone, wallClockToUtc, wallClockAhead, tzToday, tzAbbrev } from '@/lib/time/lead-timezone'

/*
 * Full-screen call cockpit for 5-hour dial blocks. Industry-standard
 * session layout (Kixie/PhoneBurner style): queue rail left, live call
 * card + notes center, script/battle cards right, controls +
 * dispositions in a bottom bar, session stats up top. Uses the shared
 * dialer engine - same audio path as the floating panel.
 *
 * v5 setter design tokens (scratchpad/setter-design-spec.md).
 */

const NAVY = '#1E3A8A'

// Session/engine state lives in DialerSessionProvider (setter layout)
// so it survives navigation; the cockpit is a view over it.
export type { CockpitLead } from './DialerSessionProvider'

type Script = { id: string; section: string; title: string; body: string; sort_order: number }

const DISPOSITIONS: { key: string; label: string; hotkey: string }[] = [
  { key: 'called',         label: 'Talked',        hotkey: '1' },
  { key: 'voicemail',      label: 'Voicemail',     hotkey: '2' },
  { key: 'interested',     label: 'Interested',    hotkey: '3' },
  { key: 'demo_scheduled', label: 'Demo set',      hotkey: '4' },
  { key: 'demo_booked',    label: 'Demo booked',   hotkey: '5' },
  { key: 'demo_showed',    label: 'Demo held',     hotkey: '6' },
  { key: 'not_available',  label: 'Not avail',     hotkey: '7' },
  { key: 'not_interested', label: 'Not interested', hotkey: '8' },
  { key: 'wrong_dm',       label: 'Wrong DM',      hotkey: '9' },
  { key: 'dead',           label: 'Dead',          hotkey: '0' },
  { key: 'do_not_call',    label: 'DNC',           hotkey: '' },
]
// "Demo set" (agreed on the call) and "Demo booked" (prospect self-booked
// after we sent the link) both land the demo in the rep's pipeline.
const DEMO_KEYS = new Set(['demo_scheduled', 'demo_booked'])

export function DialerCockpit() {
  const [keypadOpen, setKeypadOpen] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [demoModalLeadId, setDemoModalLeadId] = useState<string | null>(null)
  const [callbackLeadId, setCallbackLeadId] = useState<string | null>(null)
  const [bookingLinkLeadId, setBookingLinkLeadId] = useState<string | null>(null)
  const [notesModalOpen, setNotesModalOpen] = useState(false)
  const [scripts, setScripts] = useState<Script[]>([])
  const [objectionFilter, setObjectionFilter] = useState('')

  // Engine + session state live in the layout-level provider so they
  // survive navigating to other tabs mid-session.
  const {
    engine, phase, setPhase, gapSeconds, setGapSeconds,
    stats, bumpDemos, tagCounts, recordTag,
    elapsed, markSessionStart, resetSession,
    queueInput, reloadQueueInput, patchQueueLead, repFirstName, assignedRep,
  } = useDialerSession()
  const {
    status, error, micBusy, grantMicrophone,
    callState, inCall, activeLeadId, secondsActive, muted, droppingVm,
    dial, hangup, toggleMute, dropVoicemail, onKeypadPress,
    queue, queueIndex, queueActive, currentItem,
    queuePaused, countdown, postCallStatus, setPostCallStatus,
    startQueue, togglePause, skipCurrent, stopQueue, persistDisposition,
    refreshNumbers,
  } = engine
  const [prepping, setPrepping] = useState(false)

  // Pick up a fresh queue handoff from the leads page - but never
  // clobber a session that's mid-flight.
  useEffect(() => {
    if (phase !== 'running') reloadQueueInput()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Scripts for the right rail + SMS templates, plus the PRIMARY full
  // script from the library - when one is set, it replaces the stitched
  // section snippets as the rail's main script.
  const [primaryScript, setPrimaryScript] = useState<{ title: string; body: string } | null>(null)
  useEffect(() => {
    void (async () => {
      try {
        const r = await fetchWithAuth('/api/sales/dialer/scripts')
        const j = await r.json().catch(() => ({}))
        if (j?.success) setScripts(j.scripts || [])
      } catch { /* panel just stays empty */ }
      try {
        const r = await fetchWithAuth('/api/sales/scripts-library')
        const j = await r.json().catch(() => ({}))
        const primary = (j?.scripts || []).find((x: any) => x.is_primary)
        if (primary) setPrimaryScript({ title: primary.title, body: primary.body })
      } catch { /* fall back to section snippets */ }
    })()
  }, [])

  // Rich lead info for the live card - queue meta by leadId.
  const leadMetaById = useMemo(() => {
    const m = new Map<string, CockpitLead>()
    for (const l of queueInput || []) m.set(l.leadId, l)
    return m
  }, [queueInput])
  const liveLead = activeLeadId ? leadMetaById.get(activeLeadId) : (currentItem ? leadMetaById.get(currentItem.leadId) : null)
  const liveLeadId = activeLeadId || currentItem?.leadId || null

  const { notes, loading: notesLoading, addNote } = useLeadNotes(liveLeadId)

  // On-demand owner lookup mid-call. Grounded web search; the result is
  // cached on the lead so a repeat click is free, and patched into the live
  // queue so the name shows on the card right away (and survives navigation).
  // Same endpoint the leads workspace uses.
  const [findingOwner, setFindingOwner] = useState(false)
  const [ownerError, setOwnerError] = useState<string | null>(null)
  const findOwner = useCallback(async () => {
    if (!liveLeadId || findingOwner) return
    setFindingOwner(true)
    setOwnerError(null)
    try {
      const res = await fetch(`/api/sales/leads/${liveLeadId}/find-owner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      })
      const j = await res.json().catch(() => ({}))
      if (res.ok && j?.name) {
        patchQueueLead(liveLeadId, { contactName: j.name })
      } else if (res.ok) {
        setOwnerError('No owner name found - ask for the owner on the call.')
      } else {
        setOwnerError(`Lookup failed${j?.error ? ` - ${j.error}` : ''}.`)
      }
    } catch {
      setOwnerError('Owner lookup failed - try again.')
    } finally {
      setFindingOwner(false)
    }
  }, [liveLeadId, findingOwner, patchQueueLead])

  // Drop a stale "no owner found" message when the queue advances.
  useEffect(() => { setOwnerError(null) }, [liveLeadId])

  const chooseDisposition = useCallback((key: string) => {
    if (DEMO_KEYS.has(key)) {
      if (!liveLeadId) return
      if (!queuePaused) togglePause()
      setDemoModalLeadId(liveLeadId)
      return
    }
    setPostCallStatus(key)
    recordTag(key)
    // Outside a queue countdown (single dial / already advanced), the
    // engine won't persist for us - do it directly.
    if (!queueActive || countdown === null) {
      if (liveLeadId) void persistDisposition(liveLeadId, key)
    }
  }, [liveLeadId, queueActive, countdown, queuePaused, togglePause, setPostCallStatus, recordTag, persistDisposition])

  const openCallback = useCallback(() => {
    if (!liveLeadId) return
    if (queueActive && !queuePaused) togglePause()
    setCallbackLeadId(liveLeadId)
  }, [liveLeadId, queueActive, queuePaused, togglePause])

  const openBookingLink = useCallback(() => {
    if (!liveLeadId) return
    if (queueActive && !queuePaused) togglePause()
    setBookingLinkLeadId(liveLeadId)
  }, [liveLeadId, queueActive, queuePaused, togglePause])

  const openNotes = useCallback(() => {
    // Pause so the auto-advance countdown doesn't dial the next lead
    // while a note's being typed.
    if (queueActive && !queuePaused) togglePause()
    setNotesModalOpen(true)
  }, [queueActive, queuePaused, togglePause])

  // ---- Global hotkeys (cockpit only; never while typing). ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (demoModalLeadId || callbackLeadId || bookingLinkLeadId || notesModalOpen) return
      const k = e.key.toLowerCase()
      const dispo = DISPOSITIONS.find((d) => d.hotkey === e.key)
      if (dispo && (callState === 'ended' || callState === 'active')) {
        e.preventDefault(); chooseDisposition(dispo.key); return
      }
      if (k === 'c' && (callState === 'ended' || callState === 'active')) { e.preventDefault(); openCallback(); return }
      if (k === 'b' && (callState === 'ended' || callState === 'active')) { e.preventDefault(); openBookingLink(); return }
      if (k === 'm' && inCall) { e.preventDefault(); toggleMute(); return }
      if (k === 'k') { e.preventDefault(); setKeypadOpen((v) => !v); return }
      if (k === 'v' && callState === 'active') { e.preventDefault(); void dropVoicemail(); return }
      if ((k === 'h' || k === 'escape') && inCall) { e.preventDefault(); hangup(); return }
      if (k === 'n') { e.preventDefault(); openNotes(); return }
      if (k === ' ' && queueActive) { e.preventDefault(); togglePause(); return }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [callState, inCall, queueActive, chooseDisposition, openCallback, openBookingLink, openNotes, toggleMute, dropVoicemail, hangup, togglePause, demoModalLeadId, callbackLeadId, bookingLinkLeadId])

  const start = async () => {
    if (!queueInput?.length || prepping) return

    // Auto local presence: make sure the number pool covers this
    // session's top area codes, so the engine's per-call matcher can
    // ring Dallas leads from a 214, Austin from a 512, etc. Bounded
    // server-side (3-number cap, max 2 orders, exact-NPA only) so it
    // can't run up the Telnyx bill. Best-effort with a hard timeout -
    // the session starts either way.
    setPrepping(true)
    try {
      const counts = new Map<string, number>()
      for (const l of queueInput) {
        const npa = (l.phone || '').replace(/\D/g, '').replace(/^1/, '').slice(0, 3)
        if (npa.length === 3) counts.set(npa, (counts.get(npa) || 0) + 1)
      }
      const areaCodes = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([code, count]) => ({ code, count }))
      if (areaCodes.length > 0) {
        await Promise.race([
          fetchWithAuth('/api/sales/dialer/local-presence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ area_codes: areaCodes }),
          }).then(() => refreshNumbers()),
          new Promise((resolve) => setTimeout(resolve, 20_000)),
        ])
      }
    } catch { /* local presence is a bonus, never a blocker */ } finally {
      setPrepping(false)
    }

    markSessionStart()
    setPhase('running')
    startQueue(queueInput.map(({ leadId, phone, businessName, contactName }) => ({ leadId, phone, businessName, contactName })))
  }

  const fillTemplate = (body: string) => {
    const first = (liveLead?.contactName || '').split(' ')[0] || 'there'
    return body
      .replaceAll('{{first_name}}', first)
      .replaceAll('{{business_name}}', liveLead?.businessName || 'your business')
      .replaceAll('{{rep_name}}', repFirstName || 'I')
  }

  const sectionsInOrder = ['opener', 'discovery', 'pitch', 'closing'] as const
  const proseScripts = sectionsInOrder
    .flatMap((sec) => scripts.filter((s) => s.section === sec))
  const objections = scripts.filter(
    (s) => s.section === 'objection' &&
      (!objectionFilter.trim() ||
        (s.title + ' ' + s.body).toLowerCase().includes(objectionFilter.toLowerCase())),
  )
  const smsTemplates = scripts.filter((s) => s.section === 'sms')

  // ---- Empty / setup / done screens ----

  if (!queueInput?.length) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 mb-4">
          <PhoneCall weight="duotone" className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-semibold mb-2" style={{ color: NAVY }}>No call session queued</h1>
        <p className="text-sm text-slate-500 mb-6">
          Build a session from your leads list: filter to who you want to call, then hit <strong>Start call session</strong>.
        </p>
        <Link href="/setter/leads" className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2.5 transition-colors duration-200">
          <ArrowLeft className="w-4 h-4" /> Back to leads
        </Link>
      </div>
    )
  }

  if (phase === 'done') {
    const talked = tagCounts['called'] || 0
    return (
      <div className="max-w-xl mx-auto px-6 py-16">
        <div className="bg-white rounded-xl border border-[#E3EAF4] shadow-[0_1px_2px_rgba(16,24,40,0.04)] p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white mb-4">
            <CheckCircle weight="fill" className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-semibold mb-1" style={{ color: NAVY }}>Session done</h1>
          <p className="text-sm text-slate-500 mb-6">{fmtClock(elapsed)} on the phones.</p>
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              ['Dials', stats.dials], ['Connects', stats.connects],
              ['Talk time', fmtClock(stats.talkSeconds)], ['Demos', stats.demos],
            ].map(([label, value]) => (
              <div key={String(label)} className="bg-[#F8FAFC] rounded-lg p-3">
                <div className="text-xl font-semibold" style={{ color: NAVY }}>{value}</div>
                <div className="text-[11px] text-slate-500">{label}</div>
              </div>
            ))}
          </div>
          {Object.keys(tagCounts).length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {DISPOSITIONS.filter((d) => tagCounts[d.key]).map((d) => (
                <span key={d.key} className="text-xs bg-blue-50 text-blue-800 rounded-full px-2.5 py-1">
                  {d.label}: {tagCounts[d.key]}
                </span>
              ))}
              {talked === 0 && null}
            </div>
          )}
          <div className="flex items-center justify-center gap-2">
            <Link href="/setter/leads" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-[#E3EAF4] rounded-lg px-4 py-2.5 transition-colors duration-200">
              Back to leads
            </Link>
            <button
              onClick={resetSession}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2.5 transition-colors duration-200"
            >
              <PhoneCall weight="fill" className="w-4 h-4" /> New session
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'setup') {
    return (
      <div className="max-w-xl mx-auto px-6 py-16">
        <div className="bg-white rounded-xl border border-[#E3EAF4] shadow-[0_1px_2px_rgba(16,24,40,0.04)] p-8">
          <h1 className="text-2xl font-semibold mb-1" style={{ color: NAVY }}>Call session</h1>
          <p className="text-sm text-slate-500 mb-6">{queueInput.length} leads queued from your list.</p>
          <SessionStatusNotice status={status} error={error} micBusy={micBusy} grantMicrophone={grantMicrophone} />
          <div className="flex items-center justify-between py-3 border-t border-[#EEF2F7]">
            <span className="text-sm text-slate-600">Gap between calls</span>
            <div className="flex gap-1">
              {[3, 5, 10].map((s) => (
                <button
                  key={s}
                  onClick={() => setGapSeconds(s)}
                  className={`text-xs rounded-md px-2.5 py-1.5 border transition-colors duration-150 ${
                    gapSeconds === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-[#E3EAF4] hover:border-blue-300'
                  }`}
                >
                  {s}s
                </button>
              ))}
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mb-5">
            Hotkeys: 1-0 tag the call · B send link · C callback · M mute · V drop VM · H hang up · N note · Space pause
          </div>
          <button
            onClick={() => void start()}
            disabled={status !== 'ready' || prepping}
            className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg px-4 py-3 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {prepping ? <CircleNotch className="w-4 h-4 animate-spin" /> : <PhoneCall weight="fill" className="w-4 h-4" />}
            {prepping ? 'Getting local numbers…' : status === 'ready' ? `Start dialing (${queueInput.length})` : 'Waiting for dialer…'}
          </button>
          <div className="mt-2 text-[11px] text-slate-400 text-center">
            Caller ID auto-matches each lead&apos;s area code when a local number is available.
          </div>
        </div>
      </div>
    )
  }

  // ---- Running: the cockpit proper ----
  return (
    <div className="px-4 xl:px-6 py-4 h-full flex flex-col gap-3">
      {/* Header strip: session stats. flex-nowrap + shrink-0 stat tiles
          so this bar's height never grows on a narrow window - the
          hotkey legend just hides below xl (same as before) rather
          than wrapping or forcing a scrollbar. */}
      <div className="bg-white rounded-xl border border-[#E3EAF4] px-4 py-2.5 flex items-center gap-5 flex-nowrap">
        <Link href="/setter/leads" className="text-slate-400 hover:text-slate-600 shrink-0" title="Exit to leads" aria-label="Exit to leads">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        {[
          ['Dials', String(stats.dials)],
          ['Connects', String(stats.connects)],
          ['Talk', fmtClock(stats.talkSeconds)],
          ['Demos', String(stats.demos)],
          ['Elapsed', fmtClock(elapsed)],
        ].map(([label, value]) => (
          <div key={label} className="flex items-baseline gap-1.5 shrink-0">
            <span className="text-base font-semibold" style={{ color: NAVY }}>{value}</span>
            <span className="text-[11px] text-slate-500">{label}</span>
          </div>
        ))}
        <div className="flex-1 min-w-4" />
        {assignedRep?.booking_url && (
          <CalendarPill name={assignedRep.name} url={assignedRep.booking_url} />
        )}
        <span className="text-[11px] text-slate-400 hidden 2xl:block shrink-0 whitespace-nowrap">
          1-0 tag · B send link · C callback · M mute · V VM · H hang up · Space pause
        </span>
      </div>

      <SessionStatusNotice status={status} error={error} micBusy={micBusy} grantMicrophone={grantMicrophone} compact />

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[260px_1fr_300px] gap-3">
        {/* Left: queue */}
        <div className="bg-white rounded-xl border border-[#E3EAF4] flex flex-col min-h-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#EEF2F7]">
            <div className="text-sm font-semibold" style={{ color: NAVY }}>Queue</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{Math.min(queueIndex + 1, queue.length)} of {queue.length}</div>
            <div className="mt-2 h-1 rounded-full bg-[#EEF2F7] overflow-hidden">
              <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${queue.length ? (queueIndex / queue.length) * 100 : 0}%` }} />
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto divide-y divide-[#F5F8FC]">
            {queue.map((item, i) => {
              const meta = leadMetaById.get(item.leadId)
              const isCurrent = i === queueIndex
              const isDone = i < queueIndex
              return (
                <li key={item.leadId} className={`px-4 py-2 text-xs ${isCurrent ? 'bg-blue-50' : isDone ? 'opacity-45' : ''}`}>
                  <div className={`truncate font-medium ${isCurrent ? 'text-blue-900' : 'text-slate-700'}`}>
                    {isDone ? '✓ ' : ''}{item.businessName || item.contactName || item.phone}
                  </div>
                  {meta?.city && <div className="text-[10px] text-slate-400 truncate">{meta.businessType ? `${meta.businessType} · ` : ''}{meta.city}</div>}
                </li>
              )
            })}
          </ul>
        </div>

        {/* Center: live call card + notes + SMS */}
        <div className="flex flex-col gap-3 min-h-0">
          <div className="bg-white rounded-xl border border-[#E3EAF4] p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="text-2xl font-semibold truncate" style={{ color: NAVY }}>
                  {liveLead?.businessName || currentItem?.businessName || '—'}
                </div>
                <div className="text-sm text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                  {liveLead?.contactName
                    ? <span className="font-medium text-slate-700">{liveLead.contactName}</span>
                    : liveLeadId && (
                      <button
                        onClick={() => void findOwner()}
                        disabled={findingOwner}
                        title="Look up the owner's name so you can ask for them by name"
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md px-2 py-1 transition-colors duration-150 disabled:opacity-60"
                      >
                        {findingOwner
                          ? <><CircleNotch weight="bold" className="w-3 h-3 animate-spin" /> Finding owner…</>
                          : <><MagnifyingGlass weight="bold" className="w-3 h-3" /> Find owner</>}
                      </button>
                    )}
                  {liveLead?.businessType && <span>· {liveLead.businessType}</span>}
                  {liveLead?.city && <span>· {liveLead.city}{liveLead.state ? `, ${liveLead.state}` : ''}</span>}
                  {typeof liveLead?.rating === 'number' && (
                    <span className="inline-flex items-center gap-0.5 text-amber-600">
                      <Star weight="fill" className="w-3 h-3" /> {liveLead.rating.toFixed(1)}
                      {liveLead.reviews ? <span className="text-slate-400">({liveLead.reviews})</span> : null}
                    </span>
                  )}
                </div>
                {ownerError && (
                  <div className="mt-1 text-[11px] text-amber-600">{ownerError}</div>
                )}
                <div className={`text-lg mt-2 text-slate-800 ${firaCode.className}`}>
                  {fmtPhone(currentItem?.phone || liveLead?.phone || '')}
                </div>
                {liveLead?.followUpAt && (
                  <div className={`mt-1.5 inline-flex items-center gap-1.5 text-xs rounded-full px-2 py-0.5 border ${
                    new Date(liveLead.followUpAt).getTime() <= Date.now()
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    <CalendarBlank weight="fill" className="w-3 h-3" />
                    {new Date(liveLead.followUpAt).getTime() <= Date.now() ? 'Callback due - promised ' : 'Callback set for '}
                    {new Date(liveLead.followUpAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </div>
                )}
              </div>
              <CallStateBadge callState={callState} seconds={secondsActive} countdown={countdown} queuePaused={queuePaused} />
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-[#E3EAF4] flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold" style={{ color: NAVY }}>Notes</span>
              <button
                onClick={openNotes}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-1.5 transition-colors duration-150"
              >
                <PencilSimple className="w-3.5 h-3.5" /> Add note <span className="text-blue-200 text-[10px]">N</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-3">
              {notesLoading ? (
                <div className="text-xs text-slate-400 py-2">Loading notes…</div>
              ) : notes.length === 0 ? (
                <div className="text-xs text-slate-400 py-2">No notes on this lead yet.</div>
              ) : (
                <ul className="space-y-1.5">
                  {notes.map((n) => (
                    <li key={n.id} className="text-xs text-slate-600 leading-snug">
                      <span className={`text-slate-400 ${firaCode.className}`}>
                        {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>{' '}
                      {n.body}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* SMS follow-up: thread + composer, shared with /setter/messages */}
          <div className="bg-white rounded-xl border border-[#E3EAF4] p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <ChatText weight="duotone" className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold" style={{ color: NAVY }}>Text follow-up</span>
            </div>
            <SmsThread
              leadId={liveLeadId}
              templates={smsTemplates.map((t) => ({ id: t.id, title: t.title, body: fillTemplate(t.body) }))}
              placeholder="Pick a template or type a text…"
            />
          </div>
        </div>

        {/* Right: script + battle cards */}
        <div className="bg-white rounded-xl border border-[#E3EAF4] flex flex-col min-h-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#EEF2F7] text-sm font-semibold" style={{ color: NAVY }}>Script</div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {!primaryScript && proseScripts.length === 0 && objections.length === 0 && (
              <div className="text-xs text-slate-400">No script content yet - set a primary under Scripts, or add sections.</div>
            )}
            {primaryScript ? (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 mb-1">{primaryScript.title}</div>
                <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{fillTemplate(primaryScript.body)}</div>
              </div>
            ) : proseScripts.map((s) => (
              <div key={s.id}>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 mb-1">{s.title}</div>
                <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{fillTemplate(s.body)}</div>
              </div>
            ))}
            {scripts.some((s) => s.section === 'objection') && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Objections</div>
                <input
                  value={objectionFilter}
                  onChange={(e) => setObjectionFilter(e.target.value)}
                  placeholder="Filter objections…"
                  className="w-full mb-2 bg-[#F8FAFC] border border-[#E3EAF4] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-400"
                />
                <div className="space-y-1.5">
                  {objections.map((o) => (
                    <details key={o.id} className="group border border-[#E3EAF4] rounded-lg">
                      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-slate-800 flex items-center justify-between gap-2 hover:bg-[#F8FAFC] rounded-lg">
                        <span className="truncate">&ldquo;{o.title}&rdquo;</span>
                        <CaretDown className="w-3 h-3 text-slate-400 group-open:rotate-180 transition-transform shrink-0" />
                      </summary>
                      <div className="px-3 pb-2.5 text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{fillTemplate(o.body)}</div>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar: controls + dispositions + queue transport.
          flex-nowrap (not flex-wrap) on the outer bar so its height
          never grows on a narrow laptop width - wrapping onto a
          second line used to steal enough height from the center
          column that the notes/text-follow-up panel above it could
          collapse out of view entirely at ~1280px. The dispositions
          cluster itself is a fixed 2-row grid (below) so every button
          stays visible with no scrolling; Mute/Keypad/VM/Hangup and
          Pause/Skip/Stop sit shrink-0 on either side and are always
          reachable regardless of window width. */}
      <div className="bg-white rounded-xl border border-[#E3EAF4] px-4 py-3 relative">
       {/* Row 1: call controls (left) + queue transport (right). */}
       <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={toggleMute}
            disabled={!inCall}
            title="Mute (M)"
            className={`inline-flex items-center justify-center w-11 h-11 rounded-lg border transition-colors duration-150 disabled:opacity-40 ${
              muted ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-white border-[#E3EAF4] text-slate-600 hover:bg-slate-50'
            }`}
          >
            {muted ? <Microphone className="w-4 h-4" /> : <MicrophoneSlash className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setKeypadOpen((v) => !v)}
            title="Keypad (K)"
            className="inline-flex items-center justify-center w-11 h-11 rounded-lg border bg-white border-[#E3EAF4] text-slate-600 hover:bg-slate-50 transition-colors duration-150"
          >
            <DotsNine className="w-4 h-4" weight="bold" />
          </button>
          <button
            onClick={dropVoicemail}
            disabled={callState !== 'active' || droppingVm}
            title="Drop voicemail and hang up (V)"
            className="inline-flex items-center justify-center gap-1.5 h-11 rounded-lg border bg-white border-[#E3EAF4] text-slate-600 hover:bg-slate-50 px-3 text-xs font-medium transition-colors duration-150 disabled:opacity-40"
          >
            {droppingVm ? <CircleNotch className="w-4 h-4 animate-spin" /> : <Voicemail className="w-4 h-4" />}
            Drop VM
          </button>
          <button
            onClick={hangup}
            disabled={!inCall}
            title="Hang up (H)"
            className="inline-flex items-center justify-center gap-1.5 h-11 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-4 text-sm font-semibold transition-colors duration-150 disabled:opacity-40"
          >
            <PhoneSlash className="w-4 h-4" weight="fill" /> Hang up
          </button>
        </div>

        <div className="flex-1" />

        {/* Queue transport - stays on the top row, right-aligned. */}
        <div className="flex items-center gap-1.5 shrink-0">
          {countdown !== null && !queuePaused && (
            <span className={`text-sm text-blue-700 ${firaCode.className}`}>next in {countdown}s</span>
          )}
          <button onClick={togglePause} title="Pause/resume (Space)" className="inline-flex items-center justify-center w-11 h-11 rounded-lg border bg-white border-[#E3EAF4] text-slate-600 hover:bg-slate-50 transition-colors duration-150">
            {queuePaused ? <Play className="w-4 h-4" weight="fill" /> : <Pause className="w-4 h-4" weight="fill" />}
          </button>
          <button onClick={skipCurrent} title="Skip to next" className="inline-flex items-center justify-center w-11 h-11 rounded-lg border bg-white border-[#E3EAF4] text-slate-600 hover:bg-slate-50 transition-colors duration-150">
            <SkipForward className="w-4 h-4" weight="fill" />
          </button>
          <button onClick={stopQueue} title="End session" className="inline-flex items-center justify-center w-11 h-11 rounded-lg border bg-white border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors duration-150">
            <Stop className="w-4 h-4" weight="fill" />
          </button>
        </div>
       </div>

        {/* Row 2: Send link is the prominent action (the whole flow is
            send-link -> they book); dispositions fill a 2-row grid.
            Own full-width row so nothing overlaps the controls above. */}
        <div className="flex items-stretch gap-2 mt-2.5 flex-wrap">
          <button
            onClick={openBookingLink}
            disabled={callState !== 'ended' && callState !== 'active'}
            title="Email the prospect the demo booking link (B)"
            className="shrink-0 inline-flex flex-col items-center justify-center gap-0.5 rounded-lg px-4 border-2 bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 transition-colors duration-150 disabled:opacity-40"
          >
            <PaperPlaneTilt weight="fill" className="w-5 h-5" />
            <span className="text-xs font-semibold leading-none">Send link</span>
            <span className="text-[10px] leading-none text-blue-200">B</span>
          </button>

          <div className="min-w-0 grid grid-rows-2 grid-flow-col auto-cols-max gap-1 content-center">
            {DISPOSITIONS.map((d) => (
              <button
                key={d.key}
                onClick={() => chooseDisposition(d.key)}
                disabled={callState !== 'ended' && callState !== 'active'}
                className={`inline-flex items-center gap-1 text-[11px] leading-none rounded-md px-2 py-1.5 border transition-colors duration-150 disabled:opacity-40 ${
                  postCallStatus === d.key
                    ? 'bg-blue-600 text-white border-blue-600'
                    : DEMO_KEYS.has(d.key)
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:border-emerald-500'
                      : 'bg-white text-slate-700 border-[#E3EAF4] hover:border-blue-300'
                }`}
              >
                <span className={postCallStatus === d.key ? 'text-blue-200' : DEMO_KEYS.has(d.key) ? 'text-emerald-500' : 'text-slate-400'}>{d.hotkey}</span>{d.label}
              </button>
            ))}
            <button
              onClick={openCallback}
              disabled={callState !== 'ended' && callState !== 'active'}
              className="inline-flex items-center gap-1 text-[11px] leading-none rounded-md px-2 py-1.5 border bg-white text-slate-700 border-[#E3EAF4] hover:border-amber-400 transition-colors duration-150 disabled:opacity-40"
            >
              <ClockCounterClockwise className="w-3 h-3 text-amber-500" /><span className="text-slate-400">C</span> Callback
            </button>
            <button
              onClick={openNotes}
              title="Add a note (N)"
              className="inline-flex items-center gap-1 text-[11px] leading-none rounded-md px-2 py-1.5 border bg-white text-slate-700 border-[#E3EAF4] hover:border-blue-300 transition-colors duration-150"
            >
              <PencilSimple className="w-3 h-3 text-blue-500" /><span className="text-slate-400">N</span> Note
            </button>
          </div>
        </div>

        {/* Keypad popover */}
        {keypadOpen && (
          <div className="absolute bottom-full mb-2 left-4 bg-white border border-[#E3EAF4] rounded-xl shadow-lg p-2 grid grid-cols-3 gap-1 w-44 z-20">
            {KEYPAD.map(({ digit, sub }) => (
              <button
                key={digit}
                type="button"
                onClick={() => onKeypadPress(digit)}
                className="h-10 rounded-md bg-[#F8FAFC] hover:bg-blue-50 active:scale-[0.97] transition-all flex items-center justify-center gap-1"
              >
                <span className="text-sm font-medium text-slate-900 leading-none">{digit}</span>
                {sub && <span className={`text-[8px] text-slate-400 tracking-wider ${firaCode.className}`}>{sub}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {demoModalLeadId && (
        <DemoSetModal
          leadId={demoModalLeadId}
          leadState={leadMetaById.get(demoModalLeadId)?.state || null}
          leadPhone={leadMetaById.get(demoModalLeadId)?.phone || null}
          initialEmail={leadMetaById.get(demoModalLeadId)?.email || ''}
          onClose={() => { setDemoModalLeadId(null); if (queuePaused) togglePause() }}
          onSaved={() => {
            setDemoModalLeadId(null)
            setPostCallStatus('demo_scheduled')
            recordTag('demo_scheduled')
            bumpDemos()
            if (queuePaused) togglePause()
          }}
        />
      )}
      {callbackLeadId && (
        <CallbackModal
          leadId={callbackLeadId}
          leadState={leadMetaById.get(callbackLeadId)?.state || null}
          leadPhone={leadMetaById.get(callbackLeadId)?.phone || null}
          onClose={() => { setCallbackLeadId(null); if (queuePaused) togglePause() }}
          onSaved={() => {
            setCallbackLeadId(null)
            setPostCallStatus('called')
            recordTag('called')
            if (queuePaused) togglePause()
          }}
        />
      )}
      {bookingLinkLeadId && (
        <BookingLinkModal
          leadId={bookingLinkLeadId}
          initialEmail={leadMetaById.get(bookingLinkLeadId)?.email || ''}
          onClose={() => { setBookingLinkLeadId(null); if (queuePaused) togglePause() }}
          onSent={() => {
            setBookingLinkLeadId(null)
            if (queuePaused) togglePause()
          }}
        />
      )}
      {notesModalOpen && (
        <NotesModal
          draft={noteDraft}
          setDraft={setNoteDraft}
          notes={notes}
          onSave={async (text) => { await addNote(text); setNoteDraft('') }}
          onClose={() => { setNotesModalOpen(false); if (queuePaused) togglePause() }}
          leadName={liveLead?.businessName || currentItem?.businessName || 'this lead'}
        />
      )}
    </div>
  )
}

/** Assigned rep's booking link, always in reach at the top of the
 *  cockpit: one click copies it, another opens it in a new tab. */
function CalendarPill({ name, url }: { name: string; url: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard blocked - the open link still works */ }
  }
  return (
    <span className="inline-flex items-center gap-1 shrink-0 rounded-full border border-[#E3EAF4] bg-white pl-2.5 pr-1 py-1">
      <CalendarBlank weight="fill" className="w-3.5 h-3.5 text-blue-600 shrink-0" />
      <button
        onClick={() => void copy()}
        title={`Copy ${name}'s booking link`}
        className="text-[11px] font-medium text-slate-600 hover:text-slate-900 max-w-[120px] truncate"
      >
        {copied ? 'Copied!' : `${name.split(' ')[0]}'s calendar`}
      </button>
      <button
        onClick={() => void copy()}
        title="Copy link"
        aria-label="Copy booking link"
        className="p-1 text-slate-400 hover:text-blue-600"
      >
        {copied ? <CheckCircle weight="fill" className="w-3.5 h-3.5 text-emerald-500" /> : <CopySimple className="w-3.5 h-3.5" />}
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title="Open calendar"
        aria-label="Open booking calendar"
        className="p-1 text-slate-400 hover:text-blue-600"
      >
        <ArrowSquareOut className="w-3.5 h-3.5" />
      </a>
    </span>
  )
}

/** Roomy note editor - opens on the "Add note" button or the N hotkey. */
function NotesModal({ draft, setDraft, notes, onSave, onClose, leadName }: {
  draft: string
  setDraft: (v: string) => void
  notes: { id: string; body: string; created_at: string }[]
  onSave: (text: string) => Promise<void>
  onClose: () => void
  leadName: string
}) {
  const [busy, setBusy] = useState(false)
  const save = async () => {
    if (!draft.trim() || busy) return
    setBusy(true)
    try { await onSave(draft.trim()) } finally { setBusy(false); onClose() }
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white border border-[#E3EAF4] rounded-xl shadow-xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-1" style={{ color: NAVY }}>Note on {leadName}</h3>
        <p className="text-xs text-slate-500 mb-3">Cmd/Ctrl+Enter to save, Esc to close.</p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { e.preventDefault(); onClose() }
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void save() }
          }}
          rows={7}
          autoFocus
          placeholder="What happened on the call, next steps, anything worth remembering…"
          className="w-full px-3.5 py-2.5 bg-white border border-[#E3EAF4] rounded-lg text-sm leading-relaxed focus:outline-none focus:border-blue-500 resize-y"
        />
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => void save()}
            disabled={busy || !draft.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-60 transition-colors duration-150"
          >
            {busy ? <CircleNotch className="w-4 h-4 animate-spin" /> : <CheckCircle weight="fill" className="w-4 h-4" />}
            Save note
          </button>
          <button onClick={onClose} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-900">Cancel</button>
        </div>
        {notes.length > 0 && (
          <div className="mt-5 pt-4 border-t border-[#EEF2F7] max-h-40 overflow-y-auto">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2">Earlier notes</div>
            <ul className="space-y-2">
              {notes.map((n) => (
                <li key={n.id} className="text-xs text-slate-600 leading-snug">
                  <span className={`text-slate-400 ${firaCode.className}`}>
                    {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>{' '}
                  {n.body}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function SessionStatusNotice({ status, error, micBusy, grantMicrophone, compact }: {
  status: SessionStatus; error: string | null; micBusy: boolean; grantMicrophone: () => void; compact?: boolean
}) {
  if (status === 'ready') return null
  if (status === 'mic_required' || status === 'mic_denied') {
    return (
      <div className={`bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-900 flex items-center justify-between gap-3 ${compact ? '' : 'mb-5'}`}>
        <span>
          {status === 'mic_required'
            ? 'Microphone access needed - click Allow in the browser prompt.'
            : 'Microphone is blocked - allow it via the lock icon in the address bar, then retry.'}
        </span>
        <button
          onClick={grantMicrophone}
          disabled={micBusy}
          className="shrink-0 inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg px-3 py-2 transition-colors duration-150 disabled:opacity-60"
        >
          {micBusy ? <CircleNotch className="w-3.5 h-3.5 animate-spin" /> : <Microphone className="w-3.5 h-3.5" weight="fill" />}
          {status === 'mic_required' ? 'Allow microphone' : 'Try again'}
        </button>
      </div>
    )
  }
  if (status === 'unconfigured') {
    return (
      <div className={`bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 ${compact ? '' : 'mb-5'}`}>
        Browser dialing isn&apos;t configured yet (Telnyx credentials missing) - ask admin.
      </div>
    )
  }
  if (status === 'error' && error) {
    return (
      <div className={`bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700 flex items-start gap-2 ${compact ? '' : 'mb-5'}`}>
        <WarningCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
      </div>
    )
  }
  return (
    <div className={`bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800 flex items-center gap-2 ${compact ? '' : 'mb-5'}`}>
      <CircleNotch className="w-4 h-4 animate-spin" /> Connecting the dialer…
    </div>
  )
}

function CallStateBadge({ callState, seconds, countdown, queuePaused }: {
  callState: string; seconds: number; countdown: number | null; queuePaused: boolean
}) {
  if (callState === 'active') {
    return (
      <span className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-3 py-2 text-sm font-medium">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        {fmtDuration(seconds)}
      </span>
    )
  }
  if (callState === 'connecting' || callState === 'ringing') {
    return (
      <span className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2 text-sm font-medium">
        <CircleNotch className="w-4 h-4 animate-spin" />
        {callState === 'connecting' ? 'Dialing…' : 'Ringing…'}
      </span>
    )
  }
  if (callState === 'ended') {
    return (
      <span className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg px-3 py-2 text-sm font-medium">
        Ended{queuePaused ? ' · paused' : countdown !== null ? ` · tag it (${countdown}s)` : ''}
      </span>
    )
  }
  return null
}

/** Same endpoint + behavior as the leads-list demo modal, including the
 *  optional prospect-email that sends the booking-link invite. */
function DemoSetModal({ leadId, leadState, leadPhone, initialEmail, onClose, onSaved }: { leadId: string; leadState?: string | null; leadPhone?: string | null; initialEmail?: string | null; onClose: () => void; onSaved: () => void }) {
  const tz = leadTimeZone(leadState, leadPhone)
  const initial = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(10, 0, 0, 0)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })()
  const [when, setWhen] = useState(initial)
  const [email, setEmail] = useState((initialEmail || '').trim())
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const emailTrimmed = email.trim()
  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailTrimmed)

  const save = async () => {
    if (!when) { setErr('Pick a date/time'); return }
    if (emailTrimmed && !emailValid) { setErr("That email doesn't look right"); return }
    setBusy(true); setErr(null)
    try {
      // Interpret the picked wall-clock time in the PROSPECT's timezone
      // (not the setter's browser tz - Ed dials from the Philippines).
      const scheduledIso = tz ? wallClockToUtc(when, tz) : new Date(when).toISOString()
      const r = await fetchWithAuth(`/api/sales/leads/${leadId}/mark-demo`, {
        method: 'POST',
        body: JSON.stringify({ scheduled_at: scheduledIso, notes: notes.trim() || undefined }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) { setErr(j?.error || `Failed (${r.status})`); return }

      // If they gave an email, also send the booking-link invite so the demo
      // lands on the rep's calendar with reminders (a verbal time alone
      // no-shows). Non-fatal: the demo is already booked either way.
      if (emailValid) {
        try {
          await fetchWithAuth(`/api/sales/leads/${leadId}/send-booking-link`, {
            method: 'POST',
            body: JSON.stringify({ email: emailTrimmed, scheduled_at: scheduledIso, tz: tz || undefined }),
          })
        } catch { /* invite is best-effort; the booking stuck */ }
      }
      onSaved()
    } catch { setErr('Failed') } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white border border-[#E3EAF4] rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-1" style={{ color: NAVY }}>Mark demo set</h3>
        <p className="text-xs text-slate-500 mb-4">Books the demo, pings the team, and (if you add an email) sends the prospect the booking link so it lands on the rep&apos;s calendar.</p>
        <label className="block text-xs font-medium text-slate-700 mb-1.5">
          When? <span className="font-normal text-slate-400">{tz ? `(prospect's time · ${tzAbbrev(tz, new Date(when || Date.now()))})` : '(your local time)'}</span>
        </label>
        <input
          type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} autoFocus
          className="w-full px-3.5 py-2.5 bg-white border border-[#E3EAF4] rounded-lg text-sm focus:outline-none focus:border-blue-500"
        />
        <label className="block text-xs font-medium text-slate-700 mt-3 mb-1.5">
          Prospect&apos;s email <span className="font-normal text-slate-400">(we&apos;ll send them the booking link)</span>
        </label>
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com"
          className="w-full px-3.5 py-2.5 bg-white border border-[#E3EAF4] rounded-lg text-sm focus:outline-none focus:border-blue-500"
        />
        <p className="text-[11px] text-slate-400 mt-1">Optional. Leave blank if you&apos;ll send the invite yourself, we&apos;ll just book it and ping the team.</p>
        <label className="block text-xs font-medium text-slate-700 mt-3 mb-1.5">Notes (optional)</label>
        <textarea
          value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="anything for the build"
          className="w-full px-3.5 py-2.5 bg-white border border-[#E3EAF4] rounded-lg text-sm focus:outline-none focus:border-blue-500 resize-none"
        />
        {err && <div className="mt-3 bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-xs text-rose-700">{err}</div>}
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Cancel</button>
          <button
            onClick={save} disabled={busy || !when}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-60 transition-colors duration-150"
          >
            {busy ? <CircleNotch className="w-4 h-4 animate-spin" /> : <CheckCircle weight="fill" className="w-4 h-4" />}
            {emailValid ? 'Book demo & send link' : 'Mark demo set'}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Emails the prospect a demo booking link mid-call. Whose calendar goes
 * out is decided server-side (setter -> assigned rep's link). Email is
 * prefilled from the lead when we have one; the send also backfills
 * leads.email and drops a timeline note.
 */
function BookingLinkModal({ leadId, initialEmail, onClose, onSent }: {
  leadId: string; initialEmail: string; onClose: () => void; onSent: () => void
}) {
  const [email, setEmail] = useState(initialEmail)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<{ email: string; owner: string } | null>(null)

  const send = async () => {
    const addr = email.trim()
    if (!addr) { setErr('Enter their email'); return }
    setBusy(true); setErr(null)
    try {
      const r = await fetchWithAuth(`/api/sales/leads/${leadId}/send-booking-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addr }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) { setErr(j?.error || `Failed (${r.status})`); return }
      setSentTo({ email: j.sent_to, owner: j.calendar_owner })
    } catch { setErr('Failed to send') } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white border border-[#E3EAF4] rounded-xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        {!sentTo ? (
          <>
            <h3 className="text-base font-semibold mb-1" style={{ color: NAVY }}>Send booking link</h3>
            <p className="text-xs text-slate-500 mb-4">
              Emails them a link to grab a demo time straight on the calendar.
            </p>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Their email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter' && !busy) void send() }}
              placeholder="owner@business.com"
              className="w-full px-3.5 py-2.5 bg-white border border-[#E3EAF4] rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
            {err && <div className="mt-3 bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-xs text-rose-700">{err}</div>}
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Cancel</button>
              <button
                onClick={send} disabled={busy || !email.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-60 transition-colors duration-150"
              >
                {busy ? <CircleNotch className="w-4 h-4 animate-spin" /> : <PaperPlaneTilt weight="fill" className="w-4 h-4" />}
                Send
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle weight="fill" className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-semibold" style={{ color: NAVY }}>Link sent</h3>
            </div>
            <p className="text-xs text-slate-500 mb-5">
              {sentTo.email} got a link to {sentTo.owner}&apos;s calendar. It&apos;s also logged in the lead&apos;s notes.
            </p>
            <div className="flex justify-end">
              <button
                onClick={onSent}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors duration-150"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/** Quick callback scheduling -> lead_assignments.follow_up_at. */
function CallbackModal({ leadId, leadState, leadPhone, onClose, onSaved }: { leadId: string; leadState?: string | null; leadPhone?: string | null; onClose: () => void; onSaved: () => void }) {
  const tz = leadTimeZone(leadState, leadPhone)
  const [custom, setCustom] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const save = async (iso: string) => {
    setBusy(true); setErr(null)
    try {
      const r = await fetchWithAuth(`/api/sales/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follow_up_at: iso, touched: true }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || j?.error) { setErr(j?.error || `Failed (${r.status})`); return }
      onSaved()
    } catch { setErr('Failed') } finally { setBusy(false) }
  }

  // "9am" presets are in the PROSPECT's timezone when known (Ed dials
  // from a different tz); "In 2 hours" is absolute either way.
  const daysUntilMon = ((8 - tzToday(tz || 'America/Chicago').dow) % 7) || 7
  const quick: { label: string; get: () => string }[] = [
    { label: 'In 2 hours', get: () => new Date(Date.now() + 2 * 3600e3).toISOString() },
    { label: 'Tomorrow 9am', get: () => tz ? wallClockAhead(tz, 1, 9) : (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d.toISOString() })() },
    { label: 'Monday 9am', get: () => tz ? wallClockAhead(tz, daysUntilMon, 9) : (() => { const d = new Date(); d.setDate(d.getDate() + daysUntilMon); d.setHours(9, 0, 0, 0); return d.toISOString() })() },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white border border-[#E3EAF4] rounded-xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-1" style={{ color: NAVY }}>Schedule callback</h3>
        <p className="text-xs text-slate-500 mb-4">Sets the follow-up time - the lead resurfaces at the top of your queue.</p>
        <div className="grid grid-cols-1 gap-2 mb-3">
          {quick.map((q) => (
            <button
              key={q.label}
              onClick={() => void save(q.get())}
              disabled={busy}
              className="w-full text-left text-sm border border-[#E3EAF4] hover:border-blue-400 rounded-lg px-3.5 py-2.5 text-slate-800 transition-colors duration-150 disabled:opacity-50"
            >
              {q.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="datetime-local" value={custom} onChange={(e) => setCustom(e.target.value)}
            className="flex-1 px-3 py-2 bg-white border border-[#E3EAF4] rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => custom && void save(tz ? wallClockToUtc(custom, tz) : new Date(custom).toISOString())}
            disabled={busy || !custom}
            className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-3.5 py-2 transition-colors duration-150 disabled:opacity-50"
          >
            Set
          </button>
        </div>
        {err && <div className="mt-3 bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-xs text-rose-700">{err}</div>}
        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900">Cancel</button>
        </div>
      </div>
    </div>
  )
}

const fmtPhone = (raw: string) => {
  const d = raw.replace(/\D/g, '').replace(/^1/, '')
  if (d.length !== 10) return raw
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

function fmtClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}
