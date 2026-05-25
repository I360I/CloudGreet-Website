'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
 TestTube, CheckCircle, XCircle, ArrowRight, CircleNotch, X, Sparkle,
 ArrowUp, ArrowDown, Minus, ChatCircle, Wrench, Lightning, Stop, WarningCircle,
} from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../_components/Shell'
import { Panel, PanelHeader, GhostButton, PrimaryButton, DangerButton } from '../_components/ui'

type Score = { category: string; score: number; justification: string }
type ToolCall = { tool: string; args: Record<string, unknown>; response: unknown }
type Turn = { role: 'agent' | 'caller'; text: string }

type Analysis = {
 generated_at: string
 model: string
 per_pair: Array<{
  business_id: string
  scenario_id: string
  overall_score: number
  why_it_failed: string
  responsible_source: string
  recommended_fix: string
 }>
 patterns: Array<{
  pattern: string
  affected_pairs: string[]
  severity: 'critical' | 'high' | 'medium' | 'low'
 }>
 prioritized_fixes: Array<{
  rank: number
  title: string
  file: string
  rationale: string
  estimated_score_delta: string
  suggested_diff_hint: string
 }>
}

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
 cost_micro: number | null
 notes: string | null
 last_progress_at?: string | null
 meta?: Record<string, any> | null
 analysis?: Analysis | null
 analyzed_at?: string | null
 analysis_cost_micro?: number | null
}

type ClientOption = {
 id: string
 business_name: string
 business_type: string | null
 retell_agent_id: string | null
 subscription_status: string | null
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
 cost_micro: number | null
 created_at: string
}

type RunDetail = {
 run: Run
 previous: { id: string; overall_score: number | null; expectation_pass_rate: number | null; category_averages: Record<string, number> | null; generator_sha: string | null; cost_micro: number | null } | null
 results: PairResult[]
 client_prompt?: string | null
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
 const [runModalOpen, setRunModalOpen] = useState(false)
 const [cancelling, setCancelling] = useState(false)

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

 const handleStart = async (mode: 'smoke' | 'full' | 'client', businessId?: string) => {
  // Don't catch here - the modal awaits this and uses the thrown
  // error to reset its busy state and display the message inline.
  // Swallowing it locks the button on "Starting..." forever (the
  // outer setErr is hidden behind the modal anyway).
  setErr('')
  const body: Record<string, unknown> = { mode }
  if (mode === 'client' && businessId) body.business_id = businessId
  const r = await fetchWithAuth('/api/admin/quality/start', {
   method: 'POST',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify(body),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || !j.success) {
   throw new Error(j?.error || `Start failed (${r.status})`)
  }
  setRunModalOpen(false)
  setSelectedRunId(j.run_id)
  const lr = await fetchWithAuth('/api/admin/quality/runs')
  const lj = await lr.json().catch(() => ({}))
  if (lr.ok) setRuns(lj.runs || [])
 }

 const handleCancel = async () => {
  if (!activeRun) return
  setCancelling(true)
  try {
   await fetchWithAuth('/api/admin/quality/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ run_id: activeRun.id }),
   })
  } catch (e) {
   setErr(e instanceof Error ? e.message : 'Cancel failed')
  } finally {
   setCancelling(false)
  }
 }

 const handleResume = async () => {
  if (!activeRun) return
  try {
   await fetchWithAuth('/api/admin/quality/resume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ run_id: activeRun.id }),
   })
  } catch (e) {
   setErr(e instanceof Error ? e.message : 'Resume failed')
  }
 }

 return (
  <AdminShell activeLabel="Quality">
   <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto space-y-6">
    <Header
     onRun={() => setRunModalOpen(true)}
     latest={latest}
     activeRun={activeRun}
    />

    {activeRun && (
     <RunningBanner
      run={activeRun}
      onSelect={() => setSelectedRunId(activeRun.id)}
      onCancel={handleCancel}
      onResume={handleResume}
      cancelling={cancelling}
     />
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
        <EmptyState onRun={() => setRunModalOpen(true)} />
       )}
       {detailLoading && !detail && (
        <Panel><div className="p-10 text-center text-gray-500 text-sm flex items-center justify-center gap-2"><CircleNotch className="w-4 h-4 animate-spin" /> Loading run...</div></Panel>
       )}
      </AnimatePresence>
     </div>
    </div>
   </div>

   <AnimatePresence>
    {runModalOpen && (
     <RunModal
      onClose={() => setRunModalOpen(false)}
      onStart={handleStart}
      activeRun={activeRun}
     />
    )}
   </AnimatePresence>
  </AdminShell>
 )
}

function Header({
 onRun, latest, activeRun,
}: { onRun: () => void; latest: Run | null; activeRun: Run | null }) {
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
    <PrimaryButton onClick={onRun} disabled={!!activeRun}>
     <Sparkle className="w-4 h-4" weight="bold" /> {activeRun ? 'Eval running...' : 'Run new eval'}
    </PrimaryButton>
   </div>
  </div>
 )
}

function RunningBanner({
 run, onSelect, onCancel, onResume, cancelling,
}: { run: Run; onSelect: () => void; onCancel: () => void; onResume: () => void; cancelling: boolean }) {
 const pct = run.total_pairs > 0 ? (run.completed_pairs / run.total_pairs) * 100 : 0
 const handleCancelClick = (e: React.MouseEvent) => {
  e.stopPropagation()
  if (cancelling) return
  if (confirm('Cancel the running eval? Pairs already processed will stay, but no further pairs will run.')) {
   onCancel()
  }
 }
 const handleResumeClick = (e: React.MouseEvent) => {
  e.stopPropagation()
  onResume()
 }
 const ageSec = run.last_progress_at ? Math.floor((Date.now() - new Date(run.last_progress_at).getTime()) / 1000) : 0
 // The chain pings last_progress_at every batch. A healthy batch is
 // ~30-60s, but worst-case (rate-limit retries, slow Anthropic) can
 // push to 3+ minutes. Wait until 4 minutes before crying stalled so
 // we don't lie about progress on slow networks.
 const stalled = ageSec > 240

 const accent = stalled
  ? { border: 'border-amber-400/40', bg: 'from-amber-500/10', text: 'text-amber-200', icon: 'text-amber-300' }
  : { border: 'border-sky-400/30', bg: 'from-sky-500/10', text: 'text-sky-200', icon: 'text-sky-300' }

 return (
  <div
   onClick={onSelect}
   className={`w-full cursor-pointer rounded-2xl border ${accent.border} bg-gradient-to-br ${accent.bg} to-transparent p-4 hover:bg-white/[0.04] transition-colors`}
  >
   <div className="flex items-center justify-between gap-3 mb-2">
    <div className={`flex items-center gap-2 text-sm font-medium ${accent.text}`}>
     {stalled ? (
      <>
       <WarningCircle className={`w-4 h-4 ${accent.icon}`} weight="bold" />
       Eval stalled - last update {ageSec}s ago
      </>
     ) : (
      <>
       <CircleNotch className="w-4 h-4 animate-spin" weight="bold" />
       Eval in progress
      </>
     )}
    </div>
    <div className="flex items-center gap-3">
     <div className={`text-xs font-mono ${accent.icon}`}>
      {run.completed_pairs} / {run.total_pairs} pairs
     </div>
     <div className="text-xs font-mono text-amber-300 tabular-nums">
      {formatCost(run.cost_micro)} spent
     </div>
     {stalled && (
      <button
       onClick={handleResumeClick}
       className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-400/30 inline-flex items-center gap-1"
      >
       <Sparkle className="w-3 h-3" weight="bold" /> resume
      </button>
     )}
     <button
      onClick={handleCancelClick}
      disabled={cancelling}
      className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-400/20 inline-flex items-center gap-1 disabled:opacity-50"
     >
      {cancelling ? <CircleNotch className="w-3 h-3 animate-spin" /> : <Stop className="w-3 h-3" weight="fill" />} cancel
     </button>
    </div>
   </div>
   <div className="relative h-2 rounded-full bg-white/[0.06] overflow-hidden">
    <motion.div
     className={`absolute inset-y-0 left-0 rounded-full ${stalled ? 'bg-amber-400' : 'bg-sky-400'}`}
     initial={{ width: 0 }}
     animate={{ width: `${pct}%` }}
     transition={{ duration: 0.5 }}
    />
   </div>
  </div>
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
        <div className="flex items-center gap-1.5">
         {r.meta?.source === 'client' && (
          <div className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-400/20 truncate max-w-[110px]" title={r.meta?.business_name as string | undefined}>
           {r.meta?.business_name || 'client'}
          </div>
         )}
         <StatusBadge status={r.status} />
        </div>
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

 const isClient = run.meta?.source === 'client'
 const clientName = run.meta?.business_name as string | undefined
 const generatedPrompt = isClient ? detail.client_prompt || undefined : undefined

 return (
  <div className="space-y-5">
   {isClient && clientName && (
    <div className="rounded-2xl border border-sky-400/20 bg-sky-500/[0.04] p-4">
     <div className="flex items-center justify-between gap-3 flex-wrap">
      <div>
       <div className="text-[10px] font-mono uppercase tracking-wider text-sky-300/80 mb-1">Testing client</div>
       <div className="text-base font-medium text-white">{clientName}</div>
       <div className="text-[11px] font-mono text-gray-500 mt-0.5">business_id {run.meta?.business_id?.slice?.(0, 8)}</div>
      </div>
      <div className="text-[11px] text-gray-400 max-w-md leading-relaxed">
       Every scenario runs against the <span className="text-sky-300">live Retell system prompt + greeting</span> pulled directly from this client&apos;s deployed agent. No regeneration - this is exactly what real callers hear today.
      </div>
     </div>
    </div>
   )}
   {/* Download full report */}
   <div className="flex justify-end">
    <a
     href={`/api/admin/quality/runs/${run.id}/export`}
     download
     className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] text-xs text-gray-300 hover:text-white transition-colors"
    >
     <ArrowRight className="w-3 h-3 -rotate-90" weight="bold" />
     Download full report (.md)
    </a>
   </div>

   {/* Big number row */}
   <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
    <CostStat
     micro={run.cost_micro}
     prevMicro={previous?.cost_micro ?? null}
     completed={run.completed_pairs}
     total={run.total_pairs}
     status={run.status}
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

   {run.analysis && (
    <AnalysisPanel analysis={run.analysis} costMicro={run.analysis_cost_micro || 0} />
   )}

   {!run.analysis && run.status === 'completed' && (
    <RunAnalysisPanel runId={run.id} />
   )}

   {isClient && generatedPrompt && (
    <Panel>
     <PanelHeader eyebrow="The prompt these scenarios ran against" title="Generated agent prompt" />
     <details className="px-5 pb-5 group">
      <summary className="cursor-pointer text-xs font-mono text-sky-300 hover:text-sky-200 inline-flex items-center gap-2 py-2">
       <ArrowRight className="w-3 h-3 transition-transform group-open:rotate-90" />
       {generatedPrompt.length} characters · click to view
      </summary>
      <pre className="mt-2 rounded-xl border border-white/[0.04] bg-black/30 p-4 text-[11px] font-mono text-gray-300 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
       {generatedPrompt}
      </pre>
     </details>
    </Panel>
   )}

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

function RunAnalysisPanel({ runId }: { runId: string }) {
 const [busy, setBusy] = useState(false)
 const [err, setErr] = useState('')
 const [done, setDone] = useState(false)

 const run = async () => {
  setBusy(true)
  setErr('')
  try {
   const r = await fetchWithAuth(`/api/admin/quality/runs/${runId}/analyze`, { method: 'POST' })
   const j = await r.json().catch(() => ({}))
   if (!r.ok || !j.success) throw new Error(j?.error || `Analyze failed (${r.status})`)
   setDone(true)
   // Trigger a refetch on the parent by reloading - simplest is a soft refresh.
   if (typeof window !== 'undefined') setTimeout(() => window.location.reload(), 500)
  } catch (e) {
   setErr(e instanceof Error ? e.message : 'Analyze failed')
   setBusy(false)
  }
 }

 return (
  <div className="rounded-2xl border border-purple-400/20 bg-gradient-to-br from-purple-500/[0.06] to-transparent">
   <div className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
    <div>
     <div className="text-[10px] font-mono uppercase tracking-wider text-purple-300/80 mb-1">Brain · Failure-Reading Agent</div>
     <div className="text-sm text-gray-300">Diagnose the bottom-5 worst pairs and get prioritized fixes.</div>
     <div className="text-[10px] text-gray-500 mt-1 font-mono">~$0.30-0.60 · Opus 4.7 · 30-60s</div>
    </div>
    <button
     onClick={run}
     disabled={busy}
     className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-purple-400/30 bg-purple-500/[0.08] hover:bg-purple-500/[0.14] disabled:opacity-50 disabled:cursor-not-allowed text-sm text-purple-100 transition-colors"
    >
     {busy ? (
      <><CircleNotch className="w-4 h-4 animate-spin" weight="bold" /> {done ? 'Saving...' : 'Analyzing...'}</>
     ) : (
      <><Sparkle className="w-4 h-4" weight="bold" /> Run analysis</>
     )}
    </button>
   </div>
   {err && (
    <div className="mx-5 mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{err}</div>
   )}
  </div>
 )
}

function AnalysisPanel({ analysis, costMicro }: { analysis: Analysis; costMicro: number }) {
 const sevColor = (s: string) =>
  s === 'critical' ? 'border-rose-400/40 bg-rose-500/[0.06] text-rose-200'
  : s === 'high' ? 'border-amber-400/40 bg-amber-500/[0.06] text-amber-200'
  : s === 'medium' ? 'border-sky-400/30 bg-sky-500/[0.04] text-sky-200'
  : 'border-white/[0.08] bg-white/[0.02] text-gray-300'

 return (
  <div className="rounded-2xl border border-purple-400/20 bg-gradient-to-br from-purple-500/[0.06] to-transparent">
   <div className="px-5 pt-4 pb-3 border-b border-white/[0.04] flex items-center justify-between gap-3 flex-wrap">
    <div>
     <div className="text-[10px] font-mono uppercase tracking-wider text-purple-300/80 mb-1">Brain · Failure-Reading Agent</div>
     <h2 className="text-base font-medium text-white">What to fix</h2>
    </div>
    <div className="text-[10px] font-mono text-gray-500">
     {analysis.model} · ${(costMicro / 1_000_000).toFixed(3)}
    </div>
   </div>

   {/* Prioritized fixes - the headline takeaway */}
   <div className="px-5 py-4 space-y-3">
    <div className="text-[10px] font-mono uppercase tracking-wider text-purple-300/80">Prioritized fixes</div>
    {analysis.prioritized_fixes.map((f) => (
     <div key={f.rank} className="rounded-xl border border-purple-400/15 bg-purple-500/[0.03] p-4">
      <div className="flex items-start gap-3">
       <div className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-500/20 text-purple-200 text-sm font-medium flex items-center justify-center">
        {f.rank}
       </div>
       <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1.5">
         <div className="text-sm font-medium text-white">{f.title}</div>
         <div className="text-[10px] font-mono text-emerald-300 tabular-nums">{f.estimated_score_delta}</div>
        </div>
        <div className="text-[11px] font-mono text-sky-300 mb-2">{f.file}</div>
        <div className="text-xs text-gray-300 leading-relaxed mb-2">{f.rationale}</div>
        {f.suggested_diff_hint && (
         <pre className="text-[11px] font-mono text-gray-300 bg-black/30 border border-white/[0.04] rounded-lg p-2.5 overflow-x-auto whitespace-pre-wrap">
{f.suggested_diff_hint}
         </pre>
        )}
       </div>
      </div>
     </div>
    ))}
   </div>

   {/* Cross-cutting patterns */}
   {analysis.patterns.length > 0 && (
    <div className="px-5 pb-4 space-y-2">
     <div className="text-[10px] font-mono uppercase tracking-wider text-purple-300/80 mt-3">Cross-cutting patterns</div>
     {analysis.patterns.map((p, i) => (
      <div key={i} className={`rounded-xl border p-3 ${sevColor(p.severity)}`}>
       <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1">
        <div className="text-[10px] font-mono uppercase tracking-wider opacity-70">{p.severity}</div>
        <div className="text-[10px] font-mono opacity-60">{p.affected_pairs.length} pair{p.affected_pairs.length === 1 ? '' : 's'}</div>
       </div>
       <div className="text-sm leading-relaxed">{p.pattern}</div>
       {p.affected_pairs.length > 0 && (
        <div className="text-[10px] font-mono mt-1.5 opacity-60 truncate">
         {p.affected_pairs.join(' · ')}
        </div>
       )}
      </div>
     ))}
    </div>
   )}

   {/* Per-pair diagnoses - expandable */}
   <details className="px-5 pb-5 group">
    <summary className="cursor-pointer text-xs font-mono text-purple-300 hover:text-purple-200 inline-flex items-center gap-2 py-2">
     <ArrowRight className="w-3 h-3 transition-transform group-open:rotate-90" />
     Per-pair diagnoses ({analysis.per_pair.length})
    </summary>
    <div className="mt-2 space-y-2">
     {analysis.per_pair.map((p, i) => (
      <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
       <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <div className="text-xs text-gray-300">
         <span className="text-gray-500">{p.business_id}</span> <span className="text-gray-700">×</span> <span className="font-medium text-white">{p.scenario_id}</span>
        </div>
        <div className="text-[10px] font-mono text-rose-300 tabular-nums">{pct(p.overall_score)}</div>
       </div>
       <div className="text-xs text-gray-300 leading-relaxed mb-1.5">
        <span className="text-gray-500 font-mono text-[10px] uppercase tracking-wider">Why: </span>
        {p.why_it_failed}
       </div>
       <div className="text-[11px] text-sky-300 font-mono mb-1.5">{p.responsible_source}</div>
       <div className="text-xs text-emerald-200/90 leading-relaxed">
        <span className="text-emerald-300/70 font-mono text-[10px] uppercase tracking-wider">Fix: </span>
        {p.recommended_fix}
       </div>
      </div>
     ))}
    </div>
   </details>
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

function CostStat({
 micro, prevMicro, completed, total, status,
}: {
 micro: number | null
 prevMicro: number | null
 completed: number
 total: number
 status: string
}) {
 const dollars = (micro ?? 0) / 1_000_000
 const perPair = completed > 0 ? dollars / completed : 0
 const projected = total > 0 ? perPair * total : 0
 // Raw cost delta in dollars vs previous run. We show absolute $ here
 // rather than percent because runs with different pair counts skew %.
 const prevDollars = prevMicro != null ? prevMicro / 1_000_000 : null
 const deltaUSD = prevDollars != null ? dollars - prevDollars : null
 return (
  <div className="rounded-2xl border border-amber-400/15 bg-amber-500/[0.04] p-5">
   <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300/80 mb-2">Anthropic cost</div>
   <div className="flex items-baseline gap-2 mb-1">
    <div className="text-3xl font-medium text-white tabular-nums">${dollars.toFixed(2)}</div>
    {deltaUSD != null && Math.abs(deltaUSD) >= 0.005 && (
     <div className={`text-[10px] font-mono inline-flex items-center gap-0.5 ${deltaUSD > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
      {deltaUSD > 0 ? <ArrowUp className="w-2.5 h-2.5" weight="bold" /> : <ArrowDown className="w-2.5 h-2.5" weight="bold" />}
      {deltaUSD > 0 ? '+' : ''}${Math.abs(deltaUSD).toFixed(2)}
     </div>
    )}
   </div>
   <div className="text-xs text-gray-500 tabular-nums">
    {status === 'running' && completed > 0
     ? `~$${projected.toFixed(2)} projected at this pace`
     : completed > 0
      ? `$${perPair.toFixed(3)} avg / pair`
      : 'No pairs scored yet'}
   </div>
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
    {pair.cost_micro != null && pair.cost_micro > 0 && (
     <div className="text-[10px] font-mono text-amber-300/70 tabular-nums">{formatCost(pair.cost_micro)}</div>
    )}
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

function EmptyState({ onRun }: { onRun: () => void }) {
 return (
  <Panel>
   <div className="p-10 text-center">
    <TestTube className="w-10 h-10 text-sky-400 mx-auto mb-3" weight="bold" />
    <div className="text-base font-medium text-white mb-1">No evals yet</div>
    <p className="text-sm text-gray-400 max-w-md mx-auto mb-5">
     Run the offline eval to test the agent-prompt pipeline against synthetic businesses + caller scenarios. Results show up here as the run progresses.
    </p>
    <PrimaryButton onClick={onRun}>
     <Sparkle className="w-4 h-4" weight="bold" /> Run new eval
    </PrimaryButton>
   </div>
  </Panel>
 )
}

function RunModal({
 onClose, onStart, activeRun,
}: {
 onClose: () => void
 onStart: (mode: 'smoke' | 'full' | 'client', businessId?: string) => Promise<void>
 activeRun: Run | null
}) {
 const [busy, setBusy] = useState<'smoke' | 'full' | 'client' | null>(null)
 const [error, setError] = useState('')
 const [tab, setTab] = useState<'synthetic' | 'client'>('synthetic')
 const [clients, setClients] = useState<ClientOption[]>([])
 const [clientQuery, setClientQuery] = useState('')
 const [pickedClientId, setPickedClientId] = useState<string | null>(null)

 useEffect(() => {
  if (tab !== 'client' || activeRun) return
  let cancelled = false
  ;(async () => {
   try {
    const r = await fetchWithAuth('/api/admin/quality/clients')
    const j = await r.json().catch(() => ({}))
    if (!cancelled && r.ok) setClients(j.clients || [])
   } catch { /* ignore */ }
  })()
  return () => { cancelled = true }
 }, [tab, activeRun])

 const start = async (mode: 'smoke' | 'full' | 'client') => {
  if (busy) return
  if (mode === 'client' && !pickedClientId) {
   setError('Pick a client first')
   return
  }
  setBusy(mode)
  setError('')
  try {
   await onStart(mode, pickedClientId || undefined)
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed to start')
   setBusy(null)
  }
 }

 const filteredClients = useMemo(() => {
  const q = clientQuery.trim().toLowerCase()
  if (!q) return clients
  return clients.filter((c) =>
   (c.business_name || '').toLowerCase().includes(q) ||
   (c.business_type || '').toLowerCase().includes(q),
  )
 }, [clients, clientQuery])

 return (
  <motion.div
   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
   className="fixed inset-0 z-50 flex items-center justify-center px-4"
  >
   <button onClick={onClose} aria-label="Close" className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
   <motion.div
    initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }}
    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    className="relative bg-[#0c0c10] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
   >
    <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
     <div className="text-sm font-semibold text-white inline-flex items-center gap-2">
      <Sparkle className="w-4 h-4 text-sky-400" weight="bold" /> Run a new eval
     </div>
     <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-white/[0.06]">
      <X className="w-4 h-4 text-gray-400" />
     </button>
    </div>

    {activeRun ? (
     <div className="px-6 py-6 text-center text-sm text-gray-400">
      <WarningCircle className="w-7 h-7 text-amber-400 mx-auto mb-2" weight="bold" />
      An eval is already in progress.<br />
      Wait for it to finish or cancel it first.
     </div>
    ) : (
     <>
      <div className="px-6 pt-4">
       <div className="inline-flex rounded-lg border border-white/[0.08] bg-white/[0.02] p-0.5">
        <TabButton active={tab === 'synthetic'} onClick={() => setTab('synthetic')}>
         Test the generator
        </TabButton>
        <TabButton active={tab === 'client'} onClick={() => setTab('client')}>
         Test a specific client
        </TabButton>
       </div>
      </div>

      {tab === 'synthetic' && (
       <div className="px-6 py-5 space-y-3">
        <p className="text-sm text-gray-400">
         Run the prompt generator against synthetic businesses + scenarios. This is what to run after editing <span className="font-mono text-sky-300">lib/agent-builder/*</span>.
        </p>

        <RunChoice
         title="Smoke test"
         sub="10 pairs · ~3 min · ~$1"
         icon={<Lightning className="w-5 h-5 text-amber-300" weight="bold" />}
         onClick={() => start('smoke')}
         busy={busy === 'smoke'}
         disabled={busy !== null}
         recommendedFor="Same 10 scenarios every time so scores are directly comparable across runs."
        />

        <RunChoice
         title="Full sweep"
         sub="~90 pairs · ~25-40 min · ~$10-15"
         icon={<TestTube className="w-5 h-5 text-sky-400" weight="bold" />}
         onClick={() => start('full')}
         busy={busy === 'full'}
         disabled={busy !== null}
         recommendedFor="Run before merging a meaningful change. Every synthetic business × every applicable scenario."
        />
       </div>
      )}

      {tab === 'client' && (
       <div className="px-6 py-5 space-y-3">
        <p className="text-sm text-gray-400">
         Run every scenario against the client&apos;s live Retell prompt and greeting (pulled directly from the deployed agent, no regeneration). Use this to audit what real callers actually hit.
        </p>

        <input
         placeholder="Search clients..."
         value={clientQuery}
         onChange={(e) => setClientQuery(e.target.value)}
         className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-sky-400/40"
        />

        <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 -mr-1">
         {filteredClients.length === 0 && (
          <div className="text-xs text-gray-500 text-center py-6">No clients match.</div>
         )}
         {filteredClients.map((c) => (
          <button
           key={c.id}
           onClick={() => setPickedClientId(c.id)}
           className={`w-full text-left p-3 rounded-xl border transition-all ${
            pickedClientId === c.id
             ? 'border-sky-400/40 bg-sky-400/5'
             : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
           }`}
          >
           <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-medium text-white truncate">{c.business_name || 'Unnamed business'}</div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
             {c.retell_agent_id && (
              <div className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-400/20">
               live agent
              </div>
             )}
             {c.subscription_status === 'active' && (
              <div className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-400/20">
               paying
              </div>
             )}
            </div>
           </div>
           <div className="text-[11px] font-mono text-gray-500 mt-0.5">
            {c.business_type || '—'} · {c.id.slice(0, 8)}
           </div>
          </button>
         ))}
        </div>

        <div className="text-[11px] text-gray-500 font-mono">
         {pickedClientId
          ? `12 scenarios · ~3 min · ~$1`
          : 'Pick a client above'}
        </div>

        <PrimaryButton
         onClick={() => start('client')}
         disabled={!pickedClientId || busy !== null}
        >
         {busy === 'client' ? (
          <><CircleNotch className="w-4 h-4 animate-spin" weight="bold" /> Starting...</>
         ) : (
          <><Sparkle className="w-4 h-4" weight="bold" /> Test this client (web)</>
         )}
        </PrimaryButton>

        <LocalCliCommand pickedClientId={pickedClientId} />
       </div>
      )}

      {tab === 'synthetic' && (
       <div className="px-6 pb-5">
        <LocalCliCommand mode="synthetic" />
       </div>
      )}

      {error && (
       <div className="mx-6 mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</div>
      )}
     </>
    )}

    <div className="px-6 py-3 border-t border-white/[0.06] flex justify-end gap-2">
     <GhostButton onClick={onClose}>{activeRun ? 'Close' : 'Cancel'}</GhostButton>
    </div>
   </motion.div>
  </motion.div>
 )
}

/**
 * Renders the exact one-line CLI command for this run config so the user
 * can paste into their terminal. Bypasses Vercel function timeouts +
 * runs against their own Anthropic rate-limit window. Results stream
 * into the same Supabase tables, so the dashboard shows it live.
 */
function LocalCliCommand({
 pickedClientId,
 mode,
}: { pickedClientId?: string | null; mode?: 'synthetic' }) {
 const [copied, setCopied] = useState(false)
 const baseCmd = 'npx tsx --env-file=.env.local scripts/prompt-research/eval.ts'
 const cmd = mode === 'synthetic'
  ? baseCmd
  : pickedClientId
   ? `${baseCmd} --client=${pickedClientId} --generate-scenarios`
   : null

 if (!cmd) return null

 const copy = () => {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return
  navigator.clipboard.writeText(cmd).then(() => {
   setCopied(true)
   setTimeout(() => setCopied(false), 1500)
  }).catch(() => {})
 }

 return (
  <div className="mt-3 rounded-xl border border-emerald-400/15 bg-emerald-500/[0.03] p-3">
   <div className="flex items-center justify-between gap-3 mb-2">
    <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-300/80">
     Or run locally (no Vercel timeout · uses your laptop&apos;s rate-limit window)
    </div>
    <button
     onClick={copy}
     className="text-[10px] font-mono px-2 py-1 rounded border border-emerald-400/30 bg-emerald-500/[0.08] hover:bg-emerald-500/[0.14] text-emerald-200 transition-colors"
    >
     {copied ? 'Copied!' : 'Copy'}
    </button>
   </div>
   <pre className="text-[11px] font-mono text-emerald-100/90 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
    {cmd}
   </pre>
   <div className="text-[10px] text-gray-500 mt-2 font-mono">
    Results stream to Supabase, so this dashboard updates live while it runs.
   </div>
  </div>
 )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
 return (
  <button
   onClick={onClick}
   className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
    active
     ? 'bg-white/[0.08] text-white'
     : 'text-gray-400 hover:text-gray-200'
   }`}
  >
   {children}
  </button>
 )
}

function RunChoice({
 title, sub, icon, onClick, busy, disabled, recommendedFor,
}: {
 title: string; sub: string; icon: React.ReactNode
 onClick: () => void; busy: boolean; disabled: boolean
 recommendedFor: string
}) {
 return (
  <button
   onClick={onClick}
   disabled={disabled}
   className={`w-full text-left rounded-xl border p-4 transition-all ${
    disabled
     ? 'border-white/[0.04] bg-white/[0.02] opacity-50 cursor-not-allowed'
     : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.16]'
   }`}
  >
   <div className="flex items-center gap-3 mb-1.5">
    <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
     {busy ? <CircleNotch className="w-4 h-4 text-sky-300 animate-spin" weight="bold" /> : icon}
    </div>
    <div className="flex-1 min-w-0">
     <div className="text-sm font-medium text-white">{title}</div>
     <div className="text-[11px] font-mono text-gray-500">{sub}</div>
    </div>
    <ArrowRight className="w-4 h-4 text-gray-500" />
   </div>
   <p className="text-[11px] text-gray-500 leading-relaxed pl-12">{recommendedFor}</p>
  </button>
 )
}

// ---- helpers ----

function pct(x: number): string {
 return (x * 100).toFixed(1) + '%'
}

function formatCost(micro: number | null | undefined): string {
 const m = micro || 0
 const d = m / 1_000_000
 if (d < 0.01) return '< $0.01'
 if (d < 1) return `$${d.toFixed(3)}`
 if (d < 10) return `$${d.toFixed(2)}`
 return `$${d.toFixed(2)}`
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
