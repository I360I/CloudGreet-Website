'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ClipboardList, Loader2, Play, RefreshCw, Star, ArrowLeftRight } from 'lucide-react'
import { useToast } from '@/app/contexts/ToastContext'
import { Modal } from '@/app/components/ui/Modal'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

type QAReview = {
  id: string
  call_id: string | null
  call_url: string | null
  rating: number
  highlights: string | null
  action_items: string | null
  status: 'open' | 'in_progress' | 'resolved'
  created_at: string
  updated_at: string
}

type FormState = {
  callId: string
  callUrl: string
  rating: number
  highlights: string
  actionItems: string
}

export default function QAWorkspacePage() {
  const { showError, showSuccess } = useToast()
  const [reviews, setReviews] = useState<QAReview[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<FormState>({
    callId: '',
    callUrl: '',
    rating: 5,
    highlights: '',
    actionItems: ''
  })
  const [activeReview, setActiveReview] = useState<QAReview | null>(null)
  const [savingReview, setSavingReview] = useState(false)

  const loadReviews = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }
      const response = await fetch(`/api/admin/qa-reviews${params.toString() ? `?${params.toString()}` : ''}`, {
        headers: {
        }
      })
      
      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        throw new Error(errorData?.error || `Failed to load QA reviews (${response.status})`)
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error('Invalid response from server')
      }

      if (!data.success) {
        throw new Error(data?.error || 'Failed to load QA reviews')
      }
      setReviews(data.reviews)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load QA reviews'
      showError('Failed to load QA workspace', message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReviews()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      setCreating(true)
      const response = await fetch('/api/admin/qa-reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callId: form.callId.trim() || undefined,
          callUrl: form.callUrl.trim() || undefined,
          rating: form.rating,
          highlights: form.highlights.trim() || undefined,
          actionItems: form.actionItems.trim() || undefined
        })
      })

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        throw new Error(errorData?.error || `Failed to log QA review (${response.status})`)
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error('Invalid response from server')
      }

      if (!data.success) {
        throw new Error(data?.error || 'Failed to log QA review')
      }

      setReviews((prev) => [data.review, ...prev])
      setForm({
        callId: '',
        callUrl: '',
        rating: 5,
        highlights: '',
        actionItems: ''
      })
      showSuccess('Review saved', 'We captured this call for follow-up and tuning.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to log QA review'
      showError('Could not log review', message)
    } finally {
      setCreating(false)
    }
  }

  const openReviewModal = (review: QAReview) => {
    setActiveReview(review)
  }

  const updateReview = async (updates: Partial<Pick<QAReview, 'status' | 'highlights' | 'action_items'>>) => {
    if (!activeReview) return
    try {
      setSavingReview(true)
      const response = await fetch(`/api/admin/qa-reviews/${activeReview.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: updates.status ?? activeReview.status,
          highlights: updates.highlights ?? activeReview.highlights ?? undefined,
          actionItems: updates.action_items ?? activeReview.action_items ?? undefined
        })
      })

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        throw new Error(errorData?.error || `Failed to update review (${response.status})`)
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error('Invalid response from server')
      }

      if (!data.success) {
        throw new Error(data?.error || 'Failed to update review')
      }

      setReviews((prev) => prev.map((review) => (review.id === data.review.id ? data.review : review)))
      setActiveReview(data.review)
      showSuccess('Review updated', 'Changes synced. Make sure action items feed back into knowledge prompts.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update review'
      showError('Could not update review', message)
    } finally {
      setSavingReview(false)
    }
  }

  const filteredReviews = useMemo(() => reviews, [reviews])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-black to-slate-950 text-white">
      <div className="mx-auto max-w-6xl space-y-12 px-4 py-12 sm:px-8">
        <header className="space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.4em] text-slate-300">
            Call QA workspace
          </span>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold sm:text-4xl">Keep the AI conversational quality high</h1>
            <p className="max-w-3xl text-base leading-relaxed text-slate-300">
              Audit real conversations, score quality, and capture coaching notes. Escalations and learnings should
              loop into the knowledge base or prompt tuning so the agent improves every week.
            </p>
          </div>
        </header>

        <section className="rounded-3xl border border-white/10 bg-black/40 p-6 shadow-2xl shadow-blue-900/20">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <label className="space-y-2 text-sm text-slate-300">
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Call recording URL</span>
              <input
                value={form.callUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, callUrl: event.target.value }))}
                placeholder="https://retell.ai/recording/..."
                className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-300">
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Internal call ID</span>
              <input
                value={form.callId}
                onChange={(event) => setForm((prev) => ({ ...prev, callId: event.target.value }))}
                placeholder="Call UUID or internal identifier"
                className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-300">
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Rating</span>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, rating }))}
                    className={`flex-1 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                      form.rating === rating
                        ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-100'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Star className="h-4 w-4" />
                      {rating}
                    </div>
                  </button>
                ))}
              </div>
            </label>

            <div className="space-y-2 text-sm text-slate-300">
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Highlights</span>
              <textarea
                value={form.highlights}
                onChange={(event) => setForm((prev) => ({ ...prev, highlights: event.target.value }))}
                rows={4}
                placeholder="Great rapport-building, asked about budget early, suggested maintenance plan..."
                className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
              />
            </div>

            <div className="space-y-2 text-sm text-slate-300 md:col-span-2">
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Action items</span>
              <textarea
                value={form.actionItems}
                onChange={(event) => setForm((prev) => ({ ...prev, actionItems: event.target.value }))}
                rows={4}
                placeholder="Add pricing objection rebuttal to knowledge base, tighten escalation copy for financing questions..."
                className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
              />
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-5 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                Log QA review
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'open', 'in_progress', 'resolved'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                    statusFilter === status
                      ? 'border border-white/10 bg-white/20 text-white'
                      : 'border border-white/5 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={loadReviews}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex min-h-[200px] items-center justify-center rounded-3xl border border-white/10 bg-black/40">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-black/40 p-12 text-center text-slate-400">
              No QA reviews yet. Start scoring calls weekly to keep the agent sharp.
            </div>
          ) : (
            <div className="grid gap-5">
              {filteredReviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-white/0 to-white/10 p-6 transition hover:border-emerald-400/40"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 text-sm text-emerald-300">
                      <Star className="h-4 w-4" />
                      <span className="font-semibold">{review.rating}/5</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
                        {review.status.replace('_', ' ')}
                      </span>
                      <button
                        type="button"
                        onClick={() => openReviewModal(review)}
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
                      >
                        <ClipboardList className="h-3.5 w-3.5" />
                        Open
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-slate-200">
                    {review.highlights && (
                      <p>
                        <span className="font-semibold text-slate-100">Highlights:</span> {review.highlights}
                      </p>
                    )}
                    {review.action_items && (
                      <p>
                        <span className="font-semibold text-slate-100">Action items:</span> {review.action_items}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    {review.call_url && (
                      <a
                        href={review.call_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/20"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Listen to call
                      </a>
                    )}
                    {review.call_id && <span>Call ID: {review.call_id}</span>}
                    <span>Logged {new Date(review.created_at).toLocaleString()}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <Modal
        open={Boolean(activeReview)}
        onClose={() => setActiveReview(null)}
        title={activeReview ? `QA review – ${activeReview.rating}/5` : 'QA review'}
      >
        {activeReview && (
          <div className="space-y-4">
            {activeReview.call_url && (
              <a
                href={activeReview.call_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
              >
                <Play className="h-3.5 w-3.5" />
                Open call recording
              </a>
            )}

            <label className="space-y-1 text-sm text-slate-300">
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Highlights</span>
              <textarea
                value={activeReview.highlights ?? ''}
                onChange={(event) =>
                  setActiveReview((prev) =>
                    prev ? { ...prev, highlights: event.target.value } : prev
                  )
                }
                rows={4}
                className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
              />
            </label>

            <label className="space-y-1 text-sm text-slate-300">
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Action items</span>
              <textarea
                value={activeReview.action_items ?? ''}
                onChange={(event) =>
                  setActiveReview((prev) =>
                    prev ? { ...prev, action_items: event.target.value } : prev
                  )
                }
                rows={4}
                className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {(['open', 'in_progress', 'resolved'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => updateReview({ status })}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                    activeReview.status === status
                      ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-100'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {status === 'resolved' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ArrowLeftRight className="h-3.5 w-3.5" />}
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveReview(null)}
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() =>
                  updateReview({
                    highlights: activeReview.highlights ?? undefined,
                    action_items: activeReview.action_items ?? undefined
                  })
                }
                disabled={savingReview}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-5 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingReview && <Loader2 className="h-4 w-4 animate-spin" />}
                Save updates
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

