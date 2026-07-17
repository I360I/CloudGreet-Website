'use client'

import { useEffect, useState } from 'react'
import { ChartBar, Copy, CheckCircle, CircleNotch } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { firaCode } from '../_components/fonts'

const NAVY = '#1E3A8A'

type DailyReportRow = {
  date: string
  dials: number
  connects: number
  conversations: number
  voicemails: number
  no_answers: number
  talk_seconds: number
  last_call_at: string | null
  demos: number
}

function fmtTalk(s: number): string {
  if (!s) return '0m'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

// "2026-07-14" -> "Mon, Jul 14". Parse as UTC noon so the label never
// slips a day from timezone math.
function fmtDate(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00Z`)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function isToday(ymd: string): boolean {
  const now = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  return ymd === now
}

function eodText(r: DailyReportRow): string {
  return [
    `EoD Report — ${fmtDate(r.date)}`,
    `Dials: ${r.dials}`,
    `Reached (talked): ${r.connects}`,
    `Voicemails: ${r.voicemails}`,
    `Demos set: ${r.demos}`,
    `Talk time: ${fmtTalk(r.talk_seconds)}`,
  ].join('\n')
}

export default function SetterReportsPage() {
  const [rows, setRows] = useState<DailyReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [copiedDate, setCopiedDate] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetchWithAuth('/api/setter/daily-report?days=14', { cache: 'no-store' })
        const j = await r.json().catch(() => ({}))
        if (!r.ok || !j?.success) { if (!cancelled) setErr(j?.error || 'Could not load reports'); return }
        if (!cancelled) setRows(j.report || [])
      } catch {
        if (!cancelled) setErr('Could not load reports')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const copy = async (r: DailyReportRow) => {
    try { await navigator.clipboard.writeText(eodText(r)) } catch { /* clipboard may be blocked */ }
    setCopiedDate(r.date)
    setTimeout(() => setCopiedDate((c) => (c === r.date ? null : c)), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 p-6">
        <CircleNotch className="w-4 h-4 animate-spin" /> Loading your reports…
      </div>
    )
  }

  const today = rows.find((r) => isToday(r.date))
  const past = rows.filter((r) => !isToday(r.date))

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center gap-2 mb-1">
        <ChartBar className="w-6 h-6" style={{ color: NAVY }} weight="fill" />
        <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Daily reports</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">Your call outcomes by day. Hit &quot;Copy for EoD&quot; to paste the day straight into your end-of-day report.</p>

      {err && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{err}</div>
      )}

      {/* Today - the hero */}
      {today && (
        <div className="mb-6 rounded-2xl border-2 border-blue-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4">
            <div className="text-xs font-mono uppercase tracking-wider text-blue-600">Today · {fmtDate(today.date)}</div>
            <CopyButton copied={copiedDate === today.date} onClick={() => copy(today)} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-5">
            <Stat label="Dials" value={today.dials} big />
            <Stat label="Reached" value={today.connects} big />
            <Stat label="Voicemails" value={today.voicemails} />
            <Stat label="Demos set" value={today.demos} accent />
            <Stat label="Talk time" value={fmtTalk(today.talk_seconds)} />
          </div>
        </div>
      )}

      {/* Past days */}
      <div className="text-xs font-mono uppercase tracking-wider text-gray-400 mb-2 px-1">Past days</div>
      <div className="space-y-2">
        {past.map((r) => (
          <div key={r.date} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold" style={{ color: NAVY }}>{fmtDate(r.date)}</div>
              <CopyButton copied={copiedDate === r.date} onClick={() => copy(r)} small />
            </div>
            <div className={`flex flex-wrap gap-x-5 gap-y-1 text-sm ${firaCode.className}`}>
              <Inline label="Dials" value={r.dials} />
              <Inline label="Reached" value={r.connects} />
              <Inline label="VM" value={r.voicemails} />
              <Inline label="Demos" value={r.demos} accent />
              <Inline label="Talk" value={fmtTalk(r.talk_seconds)} />
            </div>
          </div>
        ))}
        {!past.length && !today && (
          <div className="text-sm text-gray-500 px-1">No calls logged yet. Once you start dialing, your daily numbers show up here.</div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, big, accent }: { label: string; value: number | string; big?: boolean; accent?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-0.5">{label}</div>
      <div
        className={`${firaCode.className} tabular-nums font-semibold ${big ? 'text-3xl' : 'text-xl'}`}
        style={{ color: accent ? '#D97706' : NAVY }}
      >
        {value}
      </div>
    </div>
  )
}

function Inline({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <span>
      <span className="text-gray-400">{label} </span>
      <span className="font-semibold" style={{ color: accent ? '#D97706' : '#111827' }}>{value}</span>
    </span>
  )
}

function CopyButton({ copied, onClick, small }: { copied: boolean; onClick: () => void; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg font-medium transition-colors ${
        small ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5'
      } ${copied ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
    >
      {copied
        ? <><CheckCircle weight="fill" className="w-3.5 h-3.5" /> Copied</>
        : <><Copy weight="bold" className="w-3.5 h-3.5" /> Copy for EoD</>}
    </button>
  )
}
