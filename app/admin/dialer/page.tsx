'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CircleNotch, ArrowsClockwise, PhoneOutgoing, Clock, Play, Pause, MagnifyingGlass } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../_components/Shell'
import { Panel, PanelHeader, Stat } from '../_components/ui'

type LiveCall = {
 id: string
 rep_id: string
 rep_name: string
 lead_id: string | null
 lead_name: string | null
 to_number: string
 status: string
 started_at: string
 elapsed_seconds: number
}

type TodayRow = {
 rep_id: string
 rep_name: string
 attempts: number
 connects: number
 no_answers: number
 voicemails: number
 talk_seconds: number
 last_call_at: string | null
}

type RecentCall = {
 id: string
 rep_id: string
 rep_name: string
 lead_id: string | null
 lead_name: string | null
 to_number: string
 status: string
 started_at: string
 ended_at: string | null
 duration_seconds: number | null
 has_recording?: boolean
}

type Summary = {
 live: LiveCall[]
 today: TodayRow[]
 recent: RecentCall[]
 reps: { id: string; name: string }[]
 numbers?: {
  active: number
  total: number
  scope: 'all' | 'rep'
 }
 generated_at: string
}

const POLL_MS = 5000

function fmtDuration(seconds: number | null | undefined): string {
 if (!seconds || seconds < 0) return '-'
 const m = Math.floor(seconds / 60)
 const s = seconds % 60
 if (m === 0) return `${s}s`
 return `${m}m ${s}s`
}

function fmtClock(iso: string | null | undefined): string {
 if (!iso) return '-'
 try {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
 } catch {
  return '-'
 }
}

function fmtPhone(n: string): string {
 const digits = (n || '').replace(/\D/g, '')
 if (digits.length === 11 && digits.startsWith('1')) {
  return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
 }
 if (digits.length === 10) {
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
 }
 return n
}

export default function AdminDialerPage() {
 const [summary, setSummary] = useState<Summary | null>(null)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState<string | null>(null)
 const [repFilter, setRepFilter] = useState<string>('')
 const [refreshing, setRefreshing] = useState(false)
 const [search, setSearch] = useState('')

 const load = async (silent = false) => {
  if (!silent) setRefreshing(true)
  try {
   const qs = repFilter ? `?rep_id=${encodeURIComponent(repFilter)}` : ''
   const res = await fetchWithAuth(`/api/admin/dialer/summary${qs}`)
   if (!res.ok) throw new Error(`HTTP ${res.status}`)
   const data = await res.json()
   setSummary(data)
   setError(null)
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed to load')
  } finally {
   setLoading(false)
   setRefreshing(false)
  }
 }

 useEffect(() => {
  load()
  const t = setInterval(() => load(true), POLL_MS)
  return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [repFilter])

 const totals = useMemo(() => {
  const t = { attempts: 0, connects: 0, talk_seconds: 0, live: summary?.live.length || 0 }
  for (const r of summary?.today || []) {
   t.attempts += r.attempts
   t.connects += r.connects
   t.talk_seconds += r.talk_seconds
  }
  return t
 }, [summary])

 const filteredRecent = useMemo(() => {
  const recent = summary?.recent || []
  const q = search.trim().toLowerCase()
  if (!q) return recent
  const qDigits = q.replace(/\D/g, '')
  return recent.filter((c) =>
   (c.rep_name || '').toLowerCase().includes(q) ||
   (c.lead_name || '').toLowerCase().includes(q) ||
   (c.status || '').toLowerCase().includes(q) ||
   (qDigits.length >= 3 && (c.to_number || '').replace(/\D/g, '').includes(qDigits)),
  )
 }, [summary, search])

 return (
  <AdminShell activeLabel="Dialer">
   <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
    <div className="flex items-end justify-between gap-4 flex-wrap">
     <div>
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-1">
       SALES OPERATIONS
      </div>
      <h1 className="text-xl font-medium text-white">Dialer activity</h1>
      <p className="text-xs text-gray-500 mt-1">
       Refreshes every {POLL_MS / 1000}s. Today is UTC-aligned.
      </p>
     </div>
     <div className="flex items-center gap-2">
      <select
       value={repFilter}
       onChange={(e) => setRepFilter(e.target.value)}
       className="bg-[#101015] border border-white/[0.08] text-sm text-white rounded-xl px-3 py-2"
      >
       <option value="">All reps</option>
       {(summary?.reps || []).map((r) => (
        <option key={r.id} value={r.id}>{r.name}</option>
       ))}
      </select>
      <button
       onClick={() => load()}
       className="inline-flex items-center gap-2 bg-[#101015] border border-white/[0.08] hover:border-white/[0.16] text-sm text-gray-300 rounded-xl px-3 py-2 transition"
      >
       <ArrowsClockwise className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
       Refresh
      </button>
     </div>
    </div>

    {loading && !summary && (
     <div className="flex items-center gap-2 text-gray-500 text-sm py-12 justify-center">
      <CircleNotch className="w-4 h-4 animate-spin" /> Loading...
     </div>
    )}

    {error && (
     <Panel>
      <div className="text-rose-300 text-sm">Error: {error}</div>
     </Panel>
    )}

    {summary && (
     <>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
       <Stat label="LIVE NOW" value={String(totals.live)} accent />
       <Stat label="ATTEMPTS TODAY" value={String(totals.attempts)} />
       <Stat label="CONNECTS TODAY" value={String(totals.connects)} sub={totals.attempts ? `${Math.round((totals.connects / totals.attempts) * 100)}% connect rate` : undefined} />
       <Stat label="TOTAL TALK" value={fmtDuration(totals.talk_seconds)} />
       <Stat
        label="ACTIVE NUMBERS"
        value={summary.numbers ? String(summary.numbers.active) : '—'}
        sub={summary.numbers ? (summary.numbers.scope === 'rep' ? 'for selected rep' : 'across all reps') : undefined}
       />
       <Stat
        label="TOTAL NUMBERS"
        value={summary.numbers ? String(summary.numbers.total) : '—'}
        sub={summary.numbers ? `${summary.numbers.total - summary.numbers.active} spare` : undefined}
       />
      </div>

      <Panel padding="none">
       <div className="px-5 sm:px-6 pt-5 sm:pt-6">
        <PanelHeader eyebrow="LIVE" title={`On a call now (${summary.live.length})`} />
       </div>
       {summary.live.length === 0 ? (
        <div className="px-5 sm:px-6 pb-6 text-sm text-gray-500">
         No active calls right now.
        </div>
       ) : (
        <div className="divide-y divide-white/[0.04]">
         {summary.live.map((c) => (
          <div key={c.id} className="px-5 sm:px-6 py-3 flex items-center justify-between gap-4">
           <div className="flex items-center gap-3 min-w-0">
            <span className="relative flex h-2 w-2">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
             <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <div className="min-w-0">
             <div className="text-sm text-white truncate">{c.rep_name}</div>
             <div className="text-xs text-gray-500 truncate">
              {c.lead_name ? `${c.lead_name} - ` : ''}{fmtPhone(c.to_number)}
             </div>
            </div>
           </div>
           <div className="text-xs font-mono tabular-nums text-gray-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {fmtDuration(c.elapsed_seconds)}
           </div>
          </div>
         ))}
        </div>
       )}
      </Panel>

      <Panel padding="none">
       <div className="px-5 sm:px-6 pt-5 sm:pt-6">
        <PanelHeader eyebrow="TODAY" title="By rep" />
       </div>
       {summary.today.length === 0 ? (
        <div className="px-5 sm:px-6 pb-6 text-sm text-gray-500">No calls today yet.</div>
       ) : (
        <div className="overflow-x-auto">
         <table className="w-full text-sm">
          <thead className="text-[10px] font-mono uppercase tracking-wider text-gray-500 border-y border-white/[0.04]">
           <tr>
            <th className="text-left px-5 sm:px-6 py-2 font-normal">Rep</th>
            <th className="text-right px-3 py-2 font-normal">Attempts</th>
            <th className="text-right px-3 py-2 font-normal">Connects</th>
            <th className="text-right px-3 py-2 font-normal">No answer</th>
            <th className="text-right px-3 py-2 font-normal">Voicemail</th>
            <th className="text-right px-3 py-2 font-normal">Talk</th>
            <th className="text-right px-5 sm:px-6 py-2 font-normal">Last</th>
           </tr>
          </thead>
          <tbody>
           {summary.today.map((r) => (
            <tr key={r.rep_id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
             <td className="px-5 sm:px-6 py-2.5 text-white">{r.rep_name}</td>
             <td className="px-3 py-2.5 text-right font-mono tabular-nums text-gray-300">{r.attempts}</td>
             <td className="px-3 py-2.5 text-right font-mono tabular-nums text-emerald-300">{r.connects}</td>
             <td className="px-3 py-2.5 text-right font-mono tabular-nums text-gray-400">{r.no_answers}</td>
             <td className="px-3 py-2.5 text-right font-mono tabular-nums text-gray-400">{r.voicemails}</td>
             <td className="px-3 py-2.5 text-right font-mono tabular-nums text-gray-300">{fmtDuration(r.talk_seconds)}</td>
             <td className="px-5 sm:px-6 py-2.5 text-right font-mono tabular-nums text-gray-400">{fmtClock(r.last_call_at)}</td>
            </tr>
           ))}
          </tbody>
         </table>
        </div>
       )}
      </Panel>

      <Panel padding="none">
       <div className="px-5 sm:px-6 pt-5 sm:pt-6 flex items-center justify-between gap-4 flex-wrap">
        <PanelHeader eyebrow="FEED" title={`Recent calls (${search ? `${filteredRecent.length} of ${summary.recent.length}` : summary.recent.length})`} />
        <div className="relative">
         <MagnifyingGlass className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
         <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search rep, business, number…"
          className="bg-[#101015] border border-white/[0.08] text-sm text-white rounded-xl pl-8 pr-3 py-1.5 w-64 focus:outline-none focus:border-white/[0.16]"
         />
        </div>
       </div>
       {filteredRecent.length === 0 ? (
        <div className="px-5 sm:px-6 pb-6 pt-3 text-sm text-gray-500">{search ? 'No calls match your search.' : 'No recent calls.'}</div>
       ) : (
        <div className="mt-3 max-h-[65vh] overflow-y-auto divide-y divide-white/[0.04]">
         {filteredRecent.map((c) => (
          <div key={c.id} className="px-5 sm:px-6 py-2.5 flex items-center justify-between gap-4">
           <div className="min-w-0">
            <div className="text-sm text-white truncate">
             {c.rep_name}
             <span className="text-gray-500"> calling </span>
             {c.lead_name ? (
              c.lead_id ? <Link href={`/admin/leads/${c.lead_id}`} className="text-sky-300 hover:underline">{c.lead_name}</Link> : c.lead_name
             ) : fmtPhone(c.to_number)}
            </div>
            <div className="text-xs text-gray-500 truncate">
             {fmtClock(c.started_at)} - {c.status.replace('_', ' ')} - {fmtDuration(c.duration_seconds || 0)}
            </div>
           </div>
           {c.has_recording
            ? <RecordingButton callId={c.id} />
            : <PhoneOutgoing className="w-4 h-4 text-gray-600 shrink-0" />}
          </div>
         ))}
        </div>
       )}
      </Panel>
     </>
    )}
   </div>
  </AdminShell>
 )
}

/** Play a call recording: fetches a signed URL on first play, then toggles
 *  an inline audio element. Admin-only. Mirrors the setter-detail button. */
function RecordingButton({ callId }: { callId: string }) {
 const [audio, setAudio] = useState<HTMLAudioElement | null>(null)
 const [loading, setLoading] = useState(false)
 const [playing, setPlaying] = useState(false)

 const toggle = async () => {
  if (audio) {
   if (playing) { audio.pause(); setPlaying(false) }
   else { void audio.play(); setPlaying(true) }
   return
  }
  setLoading(true)
  try {
   const r = await fetchWithAuth(`/api/admin/rep-calls/${callId}/recording`)
   const j = await r.json().catch(() => ({}))
   if (!r.ok || !j?.url) { alert(j?.error || 'Recording unavailable'); return }
   const a = new Audio(j.url)
   a.onended = () => setPlaying(false)
   a.onpause = () => setPlaying(false)
   a.onplay = () => setPlaying(true)
   setAudio(a)
   void a.play()
  } catch { alert('Could not load recording') }
  finally { setLoading(false) }
 }

 return (
  <button
   onClick={() => void toggle()}
   title="Play recording"
   className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
  >
   {loading ? <CircleNotch className="w-3 h-3 animate-spin" /> : playing ? <Pause weight="fill" className="w-3 h-3" /> : <Play weight="fill" className="w-3 h-3" />}
  </button>
 )
}
