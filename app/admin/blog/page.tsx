'use client'

import { useEffect, useState, useCallback } from 'react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../_components/Shell'
import { Panel, PanelHeader, RisingFade } from '../_components/ui'
import { CircleNotch, Sparkle, ArrowSquareOut, TrashSimple, PencilSimple } from '@phosphor-icons/react'

type PostSummary = {
  id: string; slug: string; title: string; description: string
  status: 'draft' | 'published'; author: string
  created_at: string; updated_at: string; published_at: string | null
}
type FullPost = PostSummary & { body: string; keywords: string[] }

function fmt(d: string | null): string {
  if (!d) return ''
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const inputCls = 'w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-sky-400/50 focus:outline-none'

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<PostSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [topic, setTopic] = useState('')
  const [generating, setGenerating] = useState(false)
  const [editing, setEditing] = useState<FullPost | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await fetchWithAuth('/api/admin/blog')
      const j = await r.json()
      if (!r.ok) { setError(j.error || 'Failed to load'); return }
      setPosts(j.posts || []); setError('')
    } catch { setError('Failed to load') } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const generate = async () => {
    if (!topic.trim() || generating) return
    setGenerating(true); setError('')
    try {
      const r = await fetchWithAuth('/api/admin/blog', { method: 'POST', body: JSON.stringify({ topic: topic.trim() }) })
      const j = await r.json()
      if (!r.ok) { setError(j.error || 'Generation failed'); return }
      setTopic('')
      await load()
      await openEdit(j.post.id)
    } catch { setError('Generation failed') } finally { setGenerating(false) }
  }

  const openEdit = async (id: string) => {
    const r = await fetchWithAuth(`/api/admin/blog/${id}`)
    const j = await r.json()
    if (r.ok) setEditing({ ...j.post, keywords: j.post.keywords || [] })
  }

  const save = async (opts?: { publish?: boolean; unpublish?: boolean }) => {
    if (!editing || busy) return
    setBusy(true); setError('')
    try {
      const payload: any = { title: editing.title, description: editing.description, body: editing.body, slug: editing.slug, keywords: editing.keywords }
      if (opts?.publish) payload.status = 'published'
      if (opts?.unpublish) payload.status = 'draft'
      const r = await fetchWithAuth(`/api/admin/blog/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
      const j = await r.json()
      if (!r.ok) { setError(j.error || 'Save failed'); return }
      setEditing(null); await load()
    } catch { setError('Save failed') } finally { setBusy(false) }
  }

  const togglePublish = async (p: PostSummary) => {
    setBusy(true)
    try {
      await fetchWithAuth(`/api/admin/blog/${p.id}`, { method: 'PATCH', body: JSON.stringify({ status: p.status === 'published' ? 'draft' : 'published' }) })
      await load()
    } finally { setBusy(false) }
  }

  const del = async (p: PostSummary) => {
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return
    setBusy(true)
    try { await fetchWithAuth(`/api/admin/blog/${p.id}`, { method: 'DELETE' }); await load() } finally { setBusy(false) }
  }

  return (
    <AdminShell activeLabel="Blog">
      <RisingFade>
        <PanelHeader eyebrow="Content" title="Blog" />

        {/* Generate */}
        <Panel className="mb-5">
          <div className="text-sm font-medium text-white mb-1">Generate a post</div>
          <div className="text-xs text-gray-500 mb-3">Enter a topic or search phrase. Claude drafts an SEO post; it saves as a draft for you to review and publish.</div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              className={inputCls}
              placeholder='e.g. "how much does an answering service cost"'
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') generate() }}
              disabled={generating}
            />
            <button
              onClick={generate}
              disabled={generating || !topic.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400 disabled:opacity-50 whitespace-nowrap"
            >
              {generating ? <><CircleNotch className="h-4 w-4 animate-spin" /> Drafting…</> : <><Sparkle className="h-4 w-4" weight="fill" /> Generate draft</>}
            </button>
          </div>
          {generating && <div className="mt-2 text-xs text-gray-500">Writing the post… this takes ~30-60 seconds.</div>}
        </Panel>

        {error && <Panel className="mb-5 text-sm text-amber-300">{error}</Panel>}

        {/* List */}
        {loading ? (
          <div className="flex items-center gap-2 py-12 text-gray-400"><CircleNotch className="h-5 w-5 animate-spin" /> Loading…</div>
        ) : posts.length === 0 ? (
          <Panel className="text-center text-sm text-gray-500">No posts yet. Generate one above.</Panel>
        ) : (
          <Panel padding="none" className="divide-y divide-white/[0.06]">
            {posts.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${p.status === 'published' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' : 'bg-gray-500/15 text-gray-300 border-gray-500/25'}`}>
                  {p.status === 'published' ? 'Published' : 'Draft'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-white">{p.title}</div>
                  <div className="truncate text-xs text-gray-500">/blog/{p.slug} · {fmt(p.published_at || p.created_at)}</div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button onClick={() => openEdit(p.id)} title="Edit" className="rounded-lg border border-white/10 p-1.5 text-gray-300 hover:bg-white/5"><PencilSimple className="h-4 w-4" /></button>
                  <button onClick={() => togglePublish(p)} disabled={busy} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-gray-200 hover:bg-white/5">
                    {p.status === 'published' ? 'Unpublish' : 'Publish'}
                  </button>
                  {p.status === 'published' && (
                    <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" title="View" className="rounded-lg border border-white/10 p-1.5 text-gray-300 hover:bg-white/5"><ArrowSquareOut className="h-4 w-4" /></a>
                  )}
                  <button onClick={() => del(p)} disabled={busy} title="Delete" className="rounded-lg border border-white/10 p-1.5 text-rose-300 hover:bg-rose-500/10"><TrashSimple className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </Panel>
        )}
      </RisingFade>

      {/* Editor drawer */}
      {editing && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => !busy && setEditing(null)}>
          <div className="h-full w-full max-w-2xl overflow-y-auto bg-[#0c0e12] border-l border-white/10 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Edit post</h2>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-white text-sm">Close</button>
            </div>
            <label className="block text-xs text-gray-400 mb-1">Title</label>
            <input className={inputCls} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            <label className="block text-xs text-gray-400 mb-1 mt-3">Slug (URL)</label>
            <input className={inputCls} value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
            <label className="block text-xs text-gray-400 mb-1 mt-3">Meta description</label>
            <textarea className={inputCls} rows={2} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            <label className="block text-xs text-gray-400 mb-1 mt-3">Keywords (comma-separated)</label>
            <input className={inputCls} value={editing.keywords.join(', ')} onChange={(e) => setEditing({ ...editing, keywords: e.target.value.split(',').map((k) => k.trim()).filter(Boolean) })} />
            <label className="block text-xs text-gray-400 mb-1 mt-3">Body (markdown)</label>
            <textarea className={`${inputCls} font-mono text-[13px] leading-relaxed`} rows={22} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button onClick={() => save()} disabled={busy} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/5 disabled:opacity-50">Save draft</button>
              {editing.status === 'published' ? (
                <button onClick={() => save({ unpublish: true })} disabled={busy} className="rounded-lg border border-amber-400/30 px-4 py-2 text-sm text-amber-200 hover:bg-amber-500/10 disabled:opacity-50">Unpublish</button>
              ) : (
                <button onClick={() => save({ publish: true })} disabled={busy} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-400 disabled:opacity-50">Save &amp; publish</button>
              )}
              {busy && <CircleNotch className="h-4 w-4 animate-spin text-gray-400" />}
            </div>
            <p className="mt-3 text-xs text-gray-500">Markdown: ## for headings, **bold**, - for bullets, [text](/contact) for links. Published posts go live within a minute.</p>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
