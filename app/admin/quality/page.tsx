'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
 TestTube, CheckCircle, XCircle, ArrowRight, CircleNotch, Copy, X, Clock, Sparkle,
 ArrowUp, ArrowDown, Minus, ChatCircle, Wrench,
} from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../_components/Shell'
import { Panel, PanelHeader, GhostButton, PrimaryButton } from '../_components/ui'

type Score = { category: string; score: number; justification: string }
type ToolCall = { tool: string; args: Record<string, unknown>; response: unknown }
type Turn = { role: 'agent' | 'caller'; text: string }

type Run = {
 id: string
 started_at: string
 finished_at: string | null
 status: 'running' | 'completed' | 'failed' | 'cancelled'
 generator_sha: string | null
 total_pairs: number
 completed_pairs: number
 overall_score: number | null
 expectation_pass_rate: number | null
 category_averages: Record<string, number> | null
 notes: string | null
}

type PairResult = {
 id: string
 business_id: string
 scenario_id: string
 overall_score: number
 expectation_pass: boolean
 expectation_notes: string[]
 scores: Score[]
 transcript: Turn[]
 tool_calls: ToolCall[]
 stop_reason: string
 created_at: string
}

type RunDetail = {
 run: Run
 previous: { id: string; overall_score: number | null; expectation_pass_rate: number | null; category_averages: Record<string, number> | null; generator_sha: string | null } | null
 results: PairResult[]
}

const CATEGORIES: { id: string; label: string; short: string }[] = [
 { id: 'booking_correctness', label: 'Booking correctness', short: 'Booking' },
 { id: 'information_completeness', label: 'Info completeness', short: 'Info' },
 { id: 'sms_consent_disclosure', label: 'SMS consent disclosure', short: 'Consent' },
 { id: 'emergency_handling', label: 'Emergency handling', short: 'Emergency' },
 { id: 'tone_naturalness', label: 'Tone & naturalness', short: 'Tone' },
 { id: 'hallucination_safety', label: 'Hallucination safety', short: 'Safety' },
 { id: 'edge_case_handling', label: 'Edge cases', short: 'Edge' },
]

export default function QualityPage() {
 const [runs, setRuns] = useState<Run[]>([])
 const [loading, setLoading] = useState(true)
 const [err, setErr] = useState('')
 const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
 const [detail, setDetail] = useState<RunDetail | null>(null)
 const [detailLoading, setDetailLoading] = useState(false)
 const [howToOpen, setHowToOpen] = useState(false)

 // Initial + polling: list refreshes every 5s if there's a running run.
 useEffect(() => {
  let cancelled = false
  const fetchList = async () => {
   try {
    const r = await fetchWithAuth('/api/admin/quality/runs')
    const j = await r.json().catch(() => ({}))
    if (cancelled) return
    if (!r.ok) throw new Error(j?.error || 'Failed')
    setRuns(j.runs || [])
    setErr('')
    if (!selectedRunId && (j.runs || []).length > 0) {
     setSelectedRunId(j.runs[0].id)
    }
   } catch (e) {
    if (!cancelled) setErr(e instanceof Error ? e.message : 'Failed')
   } finally {
    if (!cancelled) setLoading(false)
   }
  }
  fetchList()
  const i = setInterval(fetchList, 5000)
  return () => { cancelled = true; clearInterval(i) }
  // selectedRunId intentionally omitted - we only auto-pick on first load.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [])

 // Detail polling: faster (2s) while the selected run is still running.
 useEffect(() => {
  if (!selectedRunId) { setDetail(null); return }
  let cancelled = false
  let timer: ReturnType<typeof setTimeout> | null = null
  const tick = async () => {
   try {
    setDetailLoading((d) => d && !detail)
    const r = await fetchWithAuth(`/api/admin/quality/runs/${selectedRunId}`)
    const j = await r.json().catch(() => ({}))
    if (cancelled) return
    if (!r.ok) throw new Error(j?.error || 'Failed')
    setDetail(j)
    setDetailLoading(false)
    const isRunning = j?.run?.status === 'running'
    timer = setTimeout(tick, isRunning ? 2000 : 15000)
   } catch (e) {
    if (!cancelled) {
     setErr(e instanceof Error ? e.message : 'Failed')
     setDetailLoading(false)
     timer = setTimeout(tick, 8000)
    }
   }
  }
  tick()
  return () => { cancelled = true; if (timer) clearTimeout(timer) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [selectedRunId])

 const latest = runs[0] || null
 const activeRun = runs.find((r) => r.status === 'running') || null

 return (
  <AdminShell activeLabel="Quality">
   <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto space-y-6">
    <Header onHowTo={() => setHowToOpen(true)} latest={latest} />

    {activeRun && (
     <RunningBanner run={activeRun} onSelect={() => setSelectedRunId(activeRun.id)} />
    )}

    {err && !loading && (
     <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
      {err}
     </div>
    )}

    <div className="grid lg:grid-cols-[280px_1fr] gap-6">
     <RunList
      runs={runs}
      selectedId={selectedRunId}
      onSelect={setSelectedRunId}
      loading={loading}
     />
     <div className="min-w-0">
      <AnimatePresence mode="wait">
       {detail && (
        <motion.div
         key={detail.run.id}
         initial={{ opacity: 0, y: 8 }}
         animate={{ opacity: 1, y: 0 }}
         exit={{ opacity: 0 }}
         transition={{ duration: 0.25 }}
        >
         <RunDetailView detail={detail} />
        </motion.div>
       )}
       {!detail && !detailLoading && runs.length === 0 && !loading && (
        <EmptyState onHowTo={() => setHowToOpen(true)} />
       )}
       {detailLoading && !detail && (
        <Panel><div className="p-10 text-center text-gray-500 text-sm flex items-center justify-center gap-2"><CircleNotch className="w-4 h-4 animate-spin" /> Loading run...</div></Panel>
       )}
      </AnimatePresence>
     </div>
    </div>
   </div>

   <AnimatePresence>
    {howToOpen && <HowToRunModal onClose={() => setHowToOpen(false)} />}
   </AnimatePresence>
  </AdminShell>
 )
}

function Header({ onHowTo, latest }: { onHowTo: () => void; latest: Run | null }) {
 return (
  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
   <div>
    <div className="flex items-center gap-2.5 mb-1.5">
     <TestTube className="w-5 h-5 text-sky-400" weight="bold" />
     <h1 className="text-2xl font-display font-medium tracking-tight text-white">Agent Quality</h1>
    </div>
    <p className="text-sm text-gray-400 max-w-2xl">
     Offline eval of the agent-prompt pipeline. Synthetic businesses x synthetic callers, scored by a Claude judge against a 7-category rubric. Use this before shipping prompt-generator changes.
    </p>
   </div>
   <div className="flex items-center gap-2">
    {latest && (
     <div className="text-right text-[11px] text-gray-500 font-mono">
      Last run: {timeAgo(latest.started_at)}
     </div>
    )}
    <PrimaryButton onClick={onHowTo}>
     <Sparkle className="w-4 h-4" weight="bold" /> Run new eval
    </PrimaryButton>
   </div>
  </div>
 )
}

function RunningBanner({ run, onSelect }: { run: Run; onSelect: () => void }) {
 const pct = run.total_pairs > 0 ? (run.completed_pairs / run.total_pairs) * 100 : 0
 return (
  <button
   onClick={onSelect}
   className="w-full text-left rounded-2xl border border-sky-400/30 bg-gradient-to-br from-sky-500/10 to-transparent p-4 hover:bg-sky-500/15 transition-colors"
  >
   <div className="flex items-center justify-between gap-3 mb-2">
    <div className="flex items-center gap-2 text-sm font-medium text-sky-200">
     <CircleNotch className="w-4 h-4 animate-spin" weight="bold" />
     Eval in progress
    </div>
    <div className="text-xs font-mono text-sky-300">
     {run.completed_pairs} / {run.total_pairs} pairs
    </div>
   </div>
   <div className="relative h-2 rounded-full bg-white/[0.06] overflow-hidden">
    <motion.div
     className="absolute inset-y-0 left-0 bg-sky-400 rounded-full"
     initial={{ width: 0 }}
     animate={{ width: `${pct}%` }}
     transition={{ duration: 0.5 }}
    />
   </div>
  </button>
 )
}

function RunList({
 runs, selectedId, onSelect, loading,
}: {
 runs: Run[]
 selectedId: string | null
 onSelect: (id: string) => void
 loading: boolean
}) {
 return (
  <Panel>
   <PanelHeader eyebrow="Most recent first" title="Runs" />
   <div className="px-2 pb-2 max-h-[70vh] overflow-y-auto">
    {loading && runs.length === 0 && (
     <div className="p-6 text-center text-gray-500 text-sm flex items-center justify-center gap-2">
      <CircleNotch className="w-4 h-4 animate-spin" /> Loading...
     </div>
    )}
    {!loading && runs.length === 0 && (
     <div className="p-6 text-center text-gray-500 text-sm">No runs yet.</div>
    )}
    {runs.map((r, i) => {
     const isActive = r.id === selectedId
     const score = r.overall_score ?? 0
     const delta = i < runs.length - 1 ? score - (runs[i + 1].overall_score ?? 0) : 0
     return (
      <button
       key={r.id}
       onClick={() => onSelect(r.id)}
       className={`w-full text-left p-3 rounded-xl mb-1 transition-colors ${
        isActive ? 'bg-white/[0.06] border border-white/[0.1]' : 'hover:bg-white/[0.03] border border-transparent'
       }`}
      >
       <div className="flex items-center justify-between gap-2 mb-1">
        <div className="text-[11px] font-mono uppercase tracking-wider text-gray-500">
         {timeAgo(r.started_at)}
        </div>
        <StatusBadge status={r.status} />
       </div>
       <div className="flex items-center justify-between gap-3">
        <div className="text-base font-medium text-white tabular-nums">
         {r.overall_score !== null ? pct(r.overall_score) : '—'}
        </div>
        {r.overall_score !== null && i < runs.length - 1 && runs[i + 1].overall_score !== null && (
         <DeltaPill delta={delta} />
        )}
       </div>
       {r.generator_sha && (
        <div className="text-[10px] font-mono text-gray-600 mt-1">sha {r.generator_sha}</div>
       )}
      </button>
     )
    })}
   </div>
  </Panel>
 )
}

function RunDetailView({ detail }: { detail: RunDetail }) {
 const { run, previous, results } = detail

 const completedResults = useMemo(() => results.filter((r) => r.overall_score !== null), [results])
 const passCount = completedResults.filter((r) => r.expectation_pass).length

 return (
  <div className="space-y-5">
   {/* Big number row */}
   <div className="grid sm:grid-cols-3 gap-3">
    <BigStat
     label="Overall score"
     value={run.overall_score !== null ? pct(run.overall_score) : '—'}
     sub={previous?.overall_score != null && run.overall_score != null
      ? `vs ${pct(previous.overall_score)} last run`
      : 'No prior run'}
     delta={previous?.overall_score != null && run.overall_score != null
      ? run.overall_score - previous.overall_score
      : null}
    />
    <BigStat
     label="Expectation pass rate"
     value={run.expectation_pass_rate !== null ? pct(run.expectation_pass_rate) : '—'}
     sub={`${passCount} / ${completedResults.length} pairs all-pass`}
     delta={previous?.expectation_pass_rate != null && run.expectation_pass_rate != null
      ? run.expectation_pass_rate - previous.expectation_pass_rate
      : null}
    />
    <BigStat
     label="Progress"
     value={`${run.completed_pairs} / ${run.total_pairs}`}
     sub={
      run.status === 'running'
       ? 'In progress'
       : run.finished_at
        ? `Finished ${timeAgo(run.finished_at)}`
        : run.status
     }
    />
   </div>

   <Panel>
    <PanelHeader eyebrow={previous ? 'delta vs previous completed run' : 'no prior run to compare'} title="Scores by category" />
    <div className="px-5 pb-5 space-y-3">
     {CATEGORIES.map((c) => {
      const cur = run.category_averages?.[c.id] ?? 0
      const prev = previous?.category_averages?.[c.id] ?? null
      return (
       <CategoryBar
        key={c.id}
        label={c.label}
        current={cur}
        previous={prev}
       />
      )
     })}
    </div>
   </Panel>

   <Panel>
    <PanelHeader eyebrow="Each (business x scenario) pair, worst-first" title="Pairs" />
    <div className="px-2 pb-2">
     {results.length === 0 && (
      <div className="p-6 text-center text-gray-500 text-sm">No results yet. Pairs appear as they complete.</div>
     )}
     {[...results].sort((a, b) => a.overall_score - b.overall_score).map((p) => (
      <PairRow key={p.id} pair={p} />
     ))}
    </div>
   </Panel>
  </div>
 )
}

function BigStat({
 label, value, sub, delta,
}: { label: string; value: string; sub: string; delta?: number | null }) {
 return (
  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
   <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2">{label}</div>
   <div className="flex items-baseline gap-2 mb-1">
    <div className="text-3xl font-medium text-white tabular-nums">{value}</div>
    {delta != null && <DeltaPill delta={delta} />}
   </div>
   <div className="text-xs text-gray-500">{sub}</div>
  </div>
 )
}

function CategoryBar({
 label, current, previous,
}: { label: string; current: number; previous: number | null }) {
 const pctW = Math.max(0, Math.min(1, current / 3)) * 100
 const delta = previous != null ? current - previous : null
 const color = current >= 2.4 ? 'bg-emerald-400' : current >= 1.6 ? 'bg-amber-400' : 'bg-rose-400'
 return (
  <div>
   <div className="flex items-center justify-between gap-3 mb-1.5">
    <div className="text-sm text-gray-300">{label}</div>
    <div className="flex items-center gap-2">
     <div className="text-sm font-mono text-white tabular-nums">{current.toFixed(2)}<span className="text-gray-500"> / 3</span></div>
     {delta != null && <DeltaPill delta={delta} suffix=" pts" />}
    </div>
   </div>
   <div className="relative h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
    <motion.div
     className={`absolute inset-y-0 left-0 rounded-full ${color}`}
     initial={{ width: 0 }}
     animate={{ width: `${pctW}%` }}
     transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    />
   </div>
  </div>
 )
}

function PairRow({ pair }: { pair: PairResult }) {
 const [open, setOpen] = useState(false)
 const score = pair.overall_score
 const badge = score >= 0.8 ? 'good' : score >= 0.55 ? 'mid' : 'bad'
 const badgeColor = badge === 'good' ? 'text-emerald-300 bg-emerald-500/10 border-emerald-400/20'
  : badge === 'mid' ? 'text-amber-300 bg-amber-500/10 border-amber-400/20'
  : 'text-rose-300 bg-rose-500/10 border-rose-400/20'
 return (
  <div className={`rounded-xl mb-1 transition-colors ${open ? 'bg-white/[0.03]' : 'hover:bg-white/[0.02]'}`}>
   <button onClick={() => setOpen((v) => !v)} className="w-full text-left p-3 flex items-center gap-3">
    <div className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${badgeColor} tabular-nums`}>
     {pct(score)}
    </div>
    <div className="text-sm text-gray-200 truncate flex-1">
     <span className="text-gray-500">{pair.business_id}</span> <span className="text-gray-700">×</span> <span className="font-medium">{pair.scenario_id}</span>
    </div>
    <div className="flex items-center gap-1.5">
     {pair.expectation_pass
      ? <CheckCircle className="w-4 h-4 text-emerald-400" weight="fill" />
      : <XCircle className="w-4 h-4 text-rose-400" weight="fill" />}
     <ArrowRight className={`w-3.5 h-3.5 text-gray-500 transition-transform ${open ? 'rotate-90' : ''}`} />
    </div>
   </button>
   <AnimatePresence>
    {open && (
     <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
     >
      <div className="px-3 pb-4 pt-1 grid lg:grid-cols-[1fr_280px] gap-4">
       <div className="space-y-3 min-w-0">
        {pair.expectation_notes && pair.expectation_notes.length > 0 && (
         <div className="rounded-xl border border-rose-400/20 bg-rose-500/5 p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-rose-300 mb-1">Expectation failures</div>
          {pair.expectation_notes.map((n, i) => (
           <div key={i} className="text-xs text-rose-200 leading-relaxed">• {n}</div>
          ))}
         </div>
        )}
        {pair.tool_calls && pair.tool_calls.length > 0 && (
         <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
           <Wrench className="w-3 h-3" /> Tool calls
          </div>
          <div className="space-y-1.5">
           {pair.tool_calls.map((t, i) => (
            <div key={i} className="text-xs font-mono text-gray-400 bg-black/30 border border-white/[0.04] rounded-lg px-3 py-2 overflow-x-auto whitespace-nowrap">
             <span className="text-sky-300">{t.tool}</span>
             <span className="text-gray-600">(</span>
             {Object.entries(t.args).slice(0, 4).map(([k, v], i, arr) => (
              <span key={k}>{k}=<span className="text-gray-200">{truncate(String(v), 22)}</span>{i < arr.length - 1 && <span className="text-gray-600">, </span>}</span>
             ))}
             {Object.keys(t.args).length > 4 && <span className="text-gray-600">, …</span>}
             <span className="text-gray-600">)</span>
            </div>
           ))}
          </div>
         </div>
        )}
        <div>
         <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
          <ChatCircle className="w-3 h-3" /> Transcript
         </div>
         <div className="rounded-xl border border-white/[0.04] bg-black/30 p-3 max-h-72 overflow-y-auto space-y-2 font-mono text-[11px] leading-relaxed">
          {pair.transcript.map((t, i) => (
           <div key={i} className={t.role === 'agent' ? 'text-sky-200' : 'text-gray-300'}>
            <span className="text-gray-600 mr-2 uppercase tracking-wider text-[9px]">{t.role}</span>
            {t.text}
           </div>
          ))}
         </div>
        </div>
       </div>
       <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-2">Scores</div>
        <div className="space-y-1.5">
         {pair.scores.map((s) => (
          <ScoreRow key={s.category} score={s} />
         ))}
        </div>
       </div>
      </div>
     </motion.div>
    )}
   </AnimatePresence>
  </div>
 )
}

function ScoreRow({ score }: { score: Score }) {
 const cat = CATEGORIES.find((c) => c.id === score.category)
 const color = score.score >= 3 ? 'text-emerald-300' : score.score >= 2 ? 'text-amber-300' : 'text-rose-300'
 return (
  <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-2">
   <div className="flex items-center justify-between mb-1">
    <div className="text-[11px] text-gray-300">{cat?.short || score.category}</div>
    <div className={`text-xs font-mono tabular-nums ${color}`}>{score.score}/3</div>
   </div>
   <div className="text-[10px] text-gray-500 leading-snug">{score.justification}</div>
  </div>
 )
}

function StatusBadge({ status }: { status: string }) {
 if (status === 'running') {
  return (
   <div className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-400/20 flex items-center gap-1">
    <CircleNotch className="w-2.5 h-2.5 animate-spin" /> live
   </div>
  )
 }
 if (status === 'completed') {
  return <div className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-400/20">done</div>
 }
 if (status === 'failed') {
  return <div className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-400/20">failed</div>
 }
 return <div className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/[0.04] text-gray-400 border border-white/[0.04]">{status}</div>
}

function DeltaPill({ delta, suffix = '' }: { delta: number; suffix?: string }) {
 if (Math.abs(delta) < 0.005) {
  return <div className="text-[10px] font-mono inline-flex items-center gap-0.5 text-gray-500"><Minus className="w-2.5 h-2.5" /> 0{suffix}</div>
 }
 const up = delta > 0
 return (
  <div className={`text-[10px] font-mono inline-flex items-center gap-0.5 ${up ? 'text-emerald-300' : 'text-rose-300'}`}>
   {up ? <ArrowUp className="w-2.5 h-2.5" weight="bold" /> : <ArrowDown className="w-2.5 h-2.5" weight="bold" />}
   {(up ? '+' : '')}{(delta * 100).toFixed(1) + (suffix || '%')}
  </div>
 )
}

function EmptyState({ onHowTo }: { onHowTo: () => void }) {
 return (
  <Panel>
   <div className="p-10 text-center">
    <TestTube className="w-10 h-10 text-sky-400 mx-auto mb-3" weight="bold" />
    <div className="text-base font-medium text-white mb-1">No evals yet</div>
    <p className="text-sm text-gray-400 max-w-md mx-auto mb-5">
     Run the offline eval harness to test the agent-prompt pipeline against synthetic businesses + caller scenarios. Results show up here as the run progresses.
    </p>
    <PrimaryButton onClick={onHowTo}>How to run</PrimaryButton>
   </div>
  </Panel>
 )
}

function HowToRunModal({ onClose }: { onClose: () => void }) {
 const [copied, setCopied] = useState(false)
 const cmd = `vercel env pull .env.local && npx tsx --env-file=.env.local scripts/prompt-research/eval.ts --limit=10`
 const copy = async () => {
  try {
   await navigator.clipboard?.writeText(cmd)
   setCopied(true)
   setTimeout(() => setCopied(false), 1500)
  } catch {}
 }
 return (
  <motion.div
   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
   className="fixed inset-0 z-50 flex items-center justify-center px-4"
  >
   <button onClick={onClose} aria-label="Close" className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
   <motion.div
    initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }}
    className="relative bg-[#0c0c10] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-xl"
   >
    <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
     <div className="text-sm font-semibold text-white inline-flex items-center gap-2">
      <Sparkle className="w-4 h-4 text-sky-400" /> Run a new eval
     </div>
     <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-white/[0.06]">
      <X className="w-4 h-4 text-gray-400" />
     </button>
    </div>
    <div className="px-6 py-5 space-y-4 text-sm text-gray-300">
     <p>
      Right now the eval runs locally (it takes a few minutes and burns Anthropic tokens, so it's not exposed as a one-click admin action yet). Run this from your <span className="font-mono text-sky-300">cloudgreet/</span> directory:
     </p>
     <div className="relative">
      <pre className="bg-black/40 border border-white/[0.06] rounded-xl px-4 py-3 text-xs font-mono text-sky-200 overflow-x-auto whitespace-pre-wrap">
       {cmd}
      </pre>
      <button
       onClick={copy}
       className="absolute top-2 right-2 px-2 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 inline-flex items-center gap-1"
      >
       <Copy className="w-3 h-3" /> {copied ? 'copied' : 'copy'}
      </button>
     </div>
     <div className="text-xs text-gray-500 space-y-1">
      <div>• <span className="font-mono text-gray-400">--limit=10</span> runs ~10 pairs as a smoke test (~$1).</div>
      <div>• Omit <span className="font-mono text-gray-400">--limit</span> for the full ~90-pair sweep (~$10-15).</div>
      <div>• Progress shows up here in real time as pairs complete.</div>
      <div>• When done: <span className="font-mono text-gray-400">rm .env.local</span> so secrets don't sit on disk.</div>
     </div>
    </div>
    <div className="px-6 py-3 border-t border-white/[0.06] flex justify-end gap-2">
     <GhostButton onClick={onClose}>Close</GhostButton>
    </div>
   </motion.div>
  </motion.div>
 )
}

// ---- helpers ----

function pct(x: number): string {
 return (x * 100).toFixed(1) + '%'
}

function timeAgo(iso: string): string {
 const ms = Date.now() - new Date(iso).getTime()
 if (ms < 60_000) return 'just now'
 if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`
 if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`
 return `${Math.floor(ms / 86_400_000)}d ago`
}

function truncate(s: string, n: number): string {
 if (s.length <= n) return s
 return s.slice(0, n - 1) + '…'
}
