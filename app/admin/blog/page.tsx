'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../_components/Shell'
import { Panel, PanelHeader, RisingFade } from '../_components/ui'
import {
  CircleNotch, Sparkle, ArrowSquareOut, TrashSimple,
  PencilSimple, CaretLeft, CaretRight, CheckCircle, Clock, Plus, CalendarDots,
} from '@phosphor-icons/react'

type PostSummary = {
  id: string; slug: string; title: string; description: string
  status: 'draft' | 'published'; author: string
  created_at: string; updated_at: string
  published_at: string | null
  scheduled_for: string | null
}
type FullPost = PostSummary & { body: string; keywords: string[] }

// ── Calendar helpers ─────────────────────────────────────────────────────────

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function firstDow(y: number, m: number) { return new Date(y, m, 1).getDay() }
function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function monthLabel(y: number, m: number) {
  return new Date(y, m, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
function fmt(d: string | null) {
  if (!d) return ''
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const inputCls = 'w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-sky-400/50 focus:outline-none'

function calendarStatus(p: PostSummary): 'published' | 'scheduled' | 'draft' {
  if (p.status === 'published') return 'published'
  if (p.scheduled_for) return 'scheduled'
  return 'draft'
}

// A post lives on the calendar on its published_at date (published) or scheduled_for date (scheduled).
function calendarDateKey(p: PostSummary): string | null {
  if (p.status === 'published' && p.published_at) return p.published_at.slice(0, 10)
  if (p.scheduled_for) return p.scheduled_for.slice(0, 10)
  return null
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<PostSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<FullPost | null>(null)
  const [busy, setBusy] = useState(false)

  // Calendar nav state
  const today = useMemo(() => new Date(), [])
  const todayStr = useMemo(() => localDateStr(today), [today])
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  // "Generate for day" panel
  const [generateDay, setGenerateDay] = useState<string | null>(null)
  const [topic, setTopic] = useState('')
  const [generating, setGenerating] = useState(false)

  // Auto Schedule bulk generation
  const [autoScheduleDays, setAutoScheduleDays] = useState(5)
  type FillItem = { date: string; status: 'pending' | 'generating' | 'done' | 'error' }
  const [fillQueue, setFillQueue] = useState<FillItem[]>([])
  const [filling, setFilling] = useState(false)
  const [fillStopped, setFillStopped] = useState(false)
  const fillStopRef = useState<{ stop: boolean }>(() => ({ stop: false }))[0]

  const load = useCallback(async () => {
    try {
      const r = await fetchWithAuth('/api/admin/blog')
      const j = await r.json()
      if (!r.ok) { setError(j.error || 'Failed to load'); return }
      setPosts(j.posts || []); setError('')
    } catch { setError('Failed to load') } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  // Map date string → posts (for calendar rendering)
  const byDate = useMemo(() => {
    const map: Record<string, PostSummary[]> = {}
    for (const p of posts) {
      const key = calendarDateKey(p)
      if (!key) continue
      if (!map[key]) map[key] = []
      map[key].push(p)
    }
    return map
  }, [posts])

  // Unscheduled drafts (not on calendar)
  const unscheduled = useMemo(
    () => posts.filter((p) => p.status === 'draft' && !p.scheduled_for),
    [posts],
  )

  // Month nav bounds
  const minYear = today.getFullYear()
  const minMonth = today.getMonth()
  const maxDate = new Date(today.getFullYear(), today.getMonth() + 2, 1)
  const maxYear = maxDate.getFullYear()
  const maxMonth = maxDate.getMonth()

  const canPrev = viewYear > minYear || viewMonth > minMonth
  const canNext = viewYear < maxYear || viewMonth < maxMonth

  function prevMonth() {
    if (!canPrev) return
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11) }
    else setViewMonth(viewMonth - 1)
  }
  function nextMonth() {
    if (!canNext) return
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0) }
    else setViewMonth(viewMonth + 1)
  }

  // Calendar grid cells
  const cells = useMemo(() => {
    const days = daysInMonth(viewYear, viewMonth)
    const offset = firstDow(viewYear, viewMonth)
    const result: Array<{ day: number | null; dateStr: string | null }> = []
    for (let i = 0; i < offset; i++) result.push({ day: null, dateStr: null })
    for (let d = 1; d <= days; d++) result.push({ day: d, dateStr: toDateStr(viewYear, viewMonth, d) })
    // Pad to complete the last row
    while (result.length % 7 !== 0) result.push({ day: null, dateStr: null })
    return result
  }, [viewYear, viewMonth])

  const openEdit = useCallback(async (id: string) => {
    const r = await fetchWithAuth(`/api/admin/blog/${id}`)
    const j = await r.json()
    if (r.ok) setEditing({ ...j.post, keywords: j.post.keywords || [] })
  }, [])

  const handleDayClick = (dateStr: string) => {
    const postsOnDay = byDate[dateStr]
    if (postsOnDay && postsOnDay.length > 0) {
      openEdit(postsOnDay[0].id)
    } else {
      // Only allow scheduling future days (today included)
      if (dateStr >= todayStr) {
        setGenerateDay(dateStr)
        setTopic('')
      }
    }
  }

  const generate = async (scheduledFor?: string) => {
    if (generating) return
    setGenerating(true); setError('')
    try {
      const body: any = { topic: topic.trim() }
      if (scheduledFor) body.scheduled_for = scheduledFor
      const r = await fetchWithAuth('/api/admin/blog', { method: 'POST', body: JSON.stringify(body) })
      const j = await r.json()
      if (!r.ok) { setError(j.error || 'Generation failed'); return }
      setTopic(''); setGenerateDay(null)
      await load()
      await openEdit(j.post.id)
    } catch { setError('Generation failed') } finally { setGenerating(false) }
  }

  const save = async (opts?: { publish?: boolean; unpublish?: boolean }) => {
    if (!editing || busy) return
    setBusy(true); setError('')
    try {
      const payload: any = {
        title: editing.title,
        description: editing.description,
        body: editing.body,
        slug: editing.slug,
        keywords: editing.keywords,
        scheduled_for: editing.scheduled_for || null,
      }
      if (opts?.publish) payload.status = 'published'
      if (opts?.unpublish) payload.status = 'draft'
      const r = await fetchWithAuth(`/api/admin/blog/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
      const j = await r.json()
      if (!r.ok) { setError(j.error || 'Save failed'); return }
      setEditing(null); await load()
    } catch { setError('Save failed') } finally { setBusy(false) }
  }

  const del = async (p: PostSummary) => {
    if (!confirm(`Delete "${p.title}"?`)) return
    setBusy(true)
    try { await fetchWithAuth(`/api/admin/blog/${p.id}`, { method: 'DELETE' }); await load() }
    finally { setBusy(false) }
  }

  // Next N empty weekdays (Mon-Fri) with no existing post
  const nextEmptyWeekdays = useCallback((count: number): string[] => {
    const dates: string[] = []
    const cursor = new Date(todayStr + 'T12:00:00')
    let guard = 365
    while (dates.length < count && guard-- > 0) {
      const dow = cursor.getDay() // 0=Sun, 6=Sat
      const d = localDateStr(cursor)
      if (dow >= 1 && dow <= 5 && !byDate[d]) dates.push(d)
      cursor.setDate(cursor.getDate() + 1)
    }
    return dates
  }, [todayStr, byDate])

  const fillPreview = useMemo(
    () => nextEmptyWeekdays(autoScheduleDays),
    [autoScheduleDays, nextEmptyWeekdays],
  )

  const startFill = async () => {
    if (fillPreview.length === 0 || filling) return
    const queue: FillItem[] = fillPreview.map((date) => ({ date, status: 'pending' }))
    setFillQueue(queue)
    setFilling(true)
    setFillStopped(false)
    fillStopRef.stop = false

    const live = [...queue]
    for (let i = 0; i < live.length; i++) {
      if (fillStopRef.stop) { setFillStopped(true); break }
      live[i] = { ...live[i], status: 'generating' }
      setFillQueue([...live])
      try {
        const r = await fetchWithAuth('/api/admin/blog', {
          method: 'POST',
          body: JSON.stringify({ topic: '', scheduled_for: live[i].date }),
        })
        live[i] = { ...live[i], status: r.ok ? 'done' : 'error' }
      } catch {
        live[i] = { ...live[i], status: 'error' }
      }
      setFillQueue([...live])
    }

    setFilling(false)
    await load()
  }

  const stopFill = () => { fillStopRef.stop = true }

  return (
    <AdminShell activeLabel="Blog">
      <RisingFade>
        <PanelHeader eyebrow="Content" title="Blog" />

        {error && <Panel className="mb-4 text-sm text-amber-300">{error}</Panel>}

        {/* Calendar */}
        <Panel padding="none" className="mb-5">
          {/* Month nav */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
            <button
              onClick={prevMonth}
              disabled={!canPrev}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 disabled:opacity-25"
            >
              <CaretLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-white">{monthLabel(viewYear, viewMonth)}</span>
            <button
              onClick={nextMonth}
              disabled={!canNext}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 disabled:opacity-25"
            >
              <CaretRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 border-b border-white/[0.06]">
            {DOW.map((d) => (
              <div key={d} className="py-2 text-center text-[11px] font-medium uppercase tracking-wider text-gray-500">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
              <CircleNotch className="h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {cells.map((cell, i) => {
                if (!cell.day || !cell.dateStr) {
                  return <div key={i} className={`h-[88px] border-b border-white/[0.04] ${i % 7 !== 6 ? 'border-r' : ''}`} />
                }
                const postsOnDay = byDate[cell.dateStr] || []
                const isPast = cell.dateStr < todayStr
                const isToday = cell.dateStr === todayStr
                const isFuture = cell.dateStr > todayStr
                const post = postsOnDay[0]
                const status = post ? calendarStatus(post) : null

                return (
                  <div
                    key={i}
                    onClick={() => handleDayClick(cell.dateStr!)}
                    className={[
                      `group relative h-[88px] cursor-pointer border-b border-white/[0.04] p-2 transition-colors${i % 7 !== 6 ? ' border-r' : ''}`,
                      isToday ? 'bg-sky-500/5' : '',
                      !isPast || post ? 'hover:bg-white/[0.03]' : 'cursor-default',
                    ].join(' ')}
                  >
                    {/* Day number */}
                    <div className={[
                      'mb-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                      isToday ? 'bg-sky-500 text-white' : isPast ? 'text-gray-600' : 'text-gray-300',
                    ].join(' ')}>
                      {cell.day}
                    </div>

                    {/* Post chip */}
                    {post ? (
                      <div className={[
                        'flex items-start gap-1.5 rounded-md px-1.5 py-1 text-[11px] leading-tight',
                        status === 'published' ? 'bg-emerald-500/15 text-emerald-200' :
                          status === 'scheduled' ? 'bg-sky-500/15 text-sky-200' :
                            'bg-gray-500/15 text-gray-300',
                      ].join(' ')}>
                        {status === 'published'
                          ? <CheckCircle weight="fill" className="mt-px h-3 w-3 shrink-0 text-emerald-400" />
                          : status === 'scheduled'
                            ? <Clock weight="fill" className="mt-px h-3 w-3 shrink-0 text-sky-400" />
                            : <span className="mt-px h-3 w-3 shrink-0" />}
                        <span className="line-clamp-2">{post.title}</span>
                      </div>
                    ) : (isFuture || isToday) ? (
                      <div className="flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="flex items-center gap-1 text-[11px] text-gray-500">
                          <Plus className="h-3 w-3" /> Schedule
                        </span>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 border-t border-white/[0.06] px-5 py-3">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <CheckCircle weight="fill" className="h-3 w-3 text-emerald-400" /> Published
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <Clock weight="fill" className="h-3 w-3 text-sky-400" /> Scheduled
            </div>
          </div>
        </Panel>

        {/* Generate for a specific day */}
        {generateDay && (
          <Panel className="mb-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white">
                  Generate post for {new Date(generateDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">Saves as draft and auto-publishes at 9 AM UTC on that date.</div>
              </div>
              <button onClick={() => setGenerateDay(null)} className="text-xs text-gray-500 hover:text-gray-300">Cancel</button>
            </div>
            <div className="flex gap-2">
              <input
                className={inputCls}
                placeholder='Optional topic — or leave blank and Claude picks one'
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') generate(generateDay) }}
                disabled={generating}
              />
              <button
                onClick={() => generate(generateDay)}
                disabled={generating}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400 disabled:opacity-50 whitespace-nowrap"
              >
                {generating ? <><CircleNotch className="h-4 w-4 animate-spin" /> Writing…</> : <><Sparkle className="h-4 w-4" weight="fill" /> Generate</>}
              </button>
            </div>
          </Panel>
        )}

        {/* Generate without a date */}
        {!generateDay && (
          <Panel className="mb-5">
            <div className="text-sm font-medium text-white mb-1">Generate a post</div>
            <div className="text-xs text-gray-500 mb-3">
              Saves as a draft. Click a future date on the calendar to schedule it, or publish manually.
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                className={inputCls}
                placeholder='Optional — e.g. "answering service cost" (or leave blank to let Claude pick)'
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') generate() }}
                disabled={generating}
              />
              <button
                onClick={() => generate()}
                disabled={generating}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400 disabled:opacity-50 whitespace-nowrap"
              >
                {generating ? <><CircleNotch className="h-4 w-4 animate-spin" /> Drafting…</> : <><Sparkle className="h-4 w-4" weight="fill" /> {topic.trim() ? 'Generate draft' : 'Pick topic & draft'}</>}
              </button>
            </div>
            {generating && <div className="mt-2 text-xs text-gray-500">Writing the post… takes ~30-60 seconds.</div>}
          </Panel>
        )}

        {/* Auto Schedule */}
        <Panel className="mb-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-white mb-0.5">
                <CalendarDots className="h-4 w-4 text-sky-400" weight="fill" />
                Auto Schedule
              </div>
              <div className="text-xs text-gray-500">
                Generates one post per weekday (Mon-Fri), skipping days that already have content.
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-gray-500 whitespace-nowrap">Fill next</span>
              <input
                type="number"
                min={1}
                max={30}
                className="w-14 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-center text-sm text-white focus:border-sky-400/50 focus:outline-none"
                value={autoScheduleDays}
                onChange={(e) => setAutoScheduleDays(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                disabled={filling}
              />
              <span className="text-xs text-gray-500 whitespace-nowrap">weekdays</span>
              {filling ? (
                <button
                  onClick={stopFill}
                  className="rounded-lg border border-rose-400/30 px-4 py-2 text-sm text-rose-300 hover:bg-rose-500/10 whitespace-nowrap"
                >
                  Stop
                </button>
              ) : (
                <button
                  onClick={startFill}
                  disabled={fillPreview.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400 disabled:opacity-40 whitespace-nowrap"
                >
                  <Sparkle className="h-4 w-4" weight="fill" />
                  Schedule
                </button>
              )}
            </div>
          </div>

          {/* Date preview chips */}
          {!filling && fillPreview.length > 0 && fillQueue.length === 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {fillPreview.map((d) => (
                <span key={d} className="rounded-md bg-sky-500/10 px-2 py-0.5 text-[11px] text-sky-300">
                  {new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              ))}
            </div>
          )}

          {/* Progress list */}
          {fillQueue.length > 0 && (
            <div className="mt-4 space-y-1.5 max-h-48 overflow-y-auto">
              {fillQueue.map((item) => (
                <div key={item.date} className="flex items-center gap-2.5 text-xs">
                  {item.status === 'done' && <CheckCircle weight="fill" className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
                  {item.status === 'error' && <span className="h-3.5 w-3.5 shrink-0 rounded-full bg-rose-500/30 text-rose-300 text-[9px] flex items-center justify-center font-bold">!</span>}
                  {item.status === 'generating' && <CircleNotch className="h-3.5 w-3.5 shrink-0 animate-spin text-sky-400" />}
                  {item.status === 'pending' && <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/10" />}
                  <span className={item.status === 'done' ? 'text-gray-300' : item.status === 'generating' ? 'text-sky-300' : item.status === 'error' ? 'text-rose-300' : 'text-gray-600'}>
                    {new Date(item.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  {item.status === 'error' && <span className="text-rose-400">failed — retry manually</span>}
                  {item.status === 'generating' && <span className="text-gray-500">writing…</span>}
                </div>
              ))}
            </div>
          )}
          {fillStopped && (
            <div className="mt-3 text-xs text-amber-400">Stopped. Posts generated so far are saved and scheduled.</div>
          )}
          {!filling && fillQueue.length > 0 && !fillStopped && fillQueue.every((i) => i.status === 'done' || i.status === 'error') && (
            <div className="mt-3 text-xs text-emerald-400">
              Done — {fillQueue.filter((i) => i.status === 'done').length} posts scheduled. They'll auto-publish at 9 AM UTC each day.
            </div>
          )}
        </Panel>

        {/* Unscheduled drafts */}
        {unscheduled.length > 0 && (
          <>
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">Unscheduled drafts</div>
            <Panel padding="none" className="divide-y divide-white/[0.06]">
              {unscheduled.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white">{p.title}</div>
                    <div className="text-xs text-gray-500">Draft · {fmt(p.created_at)}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button onClick={() => openEdit(p.id)} title="Edit" className="rounded-lg border border-white/10 p-1.5 text-gray-300 hover:bg-white/5">
                      <PencilSimple className="h-4 w-4" />
                    </button>
                    <button onClick={() => del(p)} disabled={busy} title="Delete" className="rounded-lg border border-white/10 p-1.5 text-rose-300 hover:bg-rose-500/10">
                      <TrashSimple className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </Panel>
          </>
        )}
      </RisingFade>

      {/* Editor drawer */}
      {editing && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => !busy && setEditing(null)}>
          <div
            className="h-full w-full max-w-2xl overflow-y-auto bg-[#0c0e12] border-l border-white/10 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Edit post</h2>
              <button onClick={() => setEditing(null)} className="text-sm text-gray-400 hover:text-white">Close</button>
            </div>

            {/* Schedule date */}
            <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                <Clock className="inline h-3.5 w-3.5 mr-1 text-sky-400" />
                Scheduled publish date
              </label>
              <input
                type="date"
                className={inputCls + ' [color-scheme:dark]'}
                value={editing.scheduled_for ? editing.scheduled_for.slice(0, 10) : ''}
                min={todayStr}
                onChange={(e) => setEditing({ ...editing, scheduled_for: e.target.value || null })}
                disabled={editing.status === 'published'}
              />
              <div className="mt-1.5 text-[11px] text-gray-600">
                {editing.status === 'published'
                  ? `Published ${fmt(editing.published_at)}`
                  : editing.scheduled_for
                    ? `Will auto-publish at 9 AM UTC on ${fmt(editing.scheduled_for)}`
                    : 'No schedule — publish manually or pick a date above'}
              </div>
            </div>

            <label className="block text-xs text-gray-400 mb-1">Title</label>
            <input className={inputCls} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />

            <label className="block text-xs text-gray-400 mb-1 mt-3">Slug (URL)</label>
            <input className={inputCls} value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />

            <label className="block text-xs text-gray-400 mb-1 mt-3">Meta description</label>
            <textarea className={inputCls} rows={2} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />

            <label className="block text-xs text-gray-400 mb-1 mt-3">Keywords (comma-separated)</label>
            <input
              className={inputCls}
              value={editing.keywords.join(', ')}
              onChange={(e) => setEditing({ ...editing, keywords: e.target.value.split(',').map((k) => k.trim()).filter(Boolean) })}
            />

            <label className="block text-xs text-gray-400 mb-1 mt-3">Body (markdown)</label>
            <textarea
              className={`${inputCls} font-mono text-[13px] leading-relaxed`}
              rows={22}
              value={editing.body}
              onChange={(e) => setEditing({ ...editing, body: e.target.value })}
            />

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button onClick={() => save()} disabled={busy} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/5 disabled:opacity-50">
                Save draft
              </button>
              {editing.status === 'published' ? (
                <button onClick={() => save({ unpublish: true })} disabled={busy} className="rounded-lg border border-amber-400/30 px-4 py-2 text-sm text-amber-200 hover:bg-amber-500/10 disabled:opacity-50">
                  Unpublish
                </button>
              ) : (
                <button onClick={() => save({ publish: true })} disabled={busy} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-400 disabled:opacity-50">
                  Publish now
                </button>
              )}
              <button onClick={() => del(editing)} disabled={busy} className="ml-auto rounded-lg border border-white/10 p-2 text-rose-300 hover:bg-rose-500/10 disabled:opacity-50">
                <TrashSimple className="h-4 w-4" />
              </button>
              {busy && <CircleNotch className="h-4 w-4 animate-spin text-gray-400" />}
            </div>

            {editing.status === 'published' && (
              <a
                href={`/blog/${editing.slug}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300"
              >
                <ArrowSquareOut className="h-3.5 w-3.5" /> View live post
              </a>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  )
}
