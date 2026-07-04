'use client'

import { useEffect, useState } from 'react'
import { CircleNotch, Plus, TrashSimple, CheckCircle } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../_components/Shell'
import { Panel, PanelHeader, PrimaryButton, GhostButton, Input } from '../_components/ui'

type Article = {
  id: string
  title: string
  body: string
  category: string
  sort_order: number
  published: boolean
}

const CATEGORIES = ['product', 'pricing', 'process', 'faq', 'general']

/**
 * Editor for the setter/rep knowledge base (the Knowledge tab in the
 * setter portal). Separate from per-business agent knowledge - this is
 * internal sales enablement content.
 */
export default function AdminSalesKnowledgePage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savedId, setSavedId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [newCategory, setNewCategory] = useState('product')

  const load = async () => {
    setLoading(true); setError('')
    try {
      const r = await fetchWithAuth('/api/admin/sales-knowledge')
      const j = await r.json().catch(() => ({}))
      if (!r.ok) setError(j?.error || 'Failed to load')
      else setArticles(j.articles || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void load() }, [])

  const patchLocal = (id: string, patch: Partial<Article>) =>
    setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))

  const save = async (a: Article) => {
    setBusyId(a.id)
    try {
      const r = await fetchWithAuth(`/api/admin/sales-knowledge/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: a.title, body: a.body, category: a.category,
          sort_order: a.sort_order, published: a.published,
        }),
      })
      if (r.ok) {
        setSavedId(a.id)
        setTimeout(() => setSavedId(null), 1500)
      }
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this article?')) return
    setArticles((prev) => prev.filter((a) => a.id !== id))
    await fetchWithAuth(`/api/admin/sales-knowledge/${id}`, { method: 'DELETE' }).catch(() => load())
  }

  const add = async () => {
    const r = await fetchWithAuth('/api/admin/sales-knowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: newCategory, title: 'New article', body: '…', sort_order: 99 }),
    })
    const j = await r.json().catch(() => ({}))
    if (j?.article) setArticles((prev) => [...prev, j.article])
  }

  return (
    <AdminShell activeLabel="Knowledge">
      <PanelHeader eyebrow="sales enablement" title="Knowledge base" />
      <p className="text-sm opacity-60 mb-6 -mt-4">
        What setters and reps see under their Knowledge tab - product facts, pricing,
        process, and FAQ answers so nobody guesses on a live call. Unpublished drafts stay
        hidden from the portals.
      </p>
      {error && <div className="mb-4 text-sm text-rose-500">{error}</div>}
      {loading ? (
        <div className="flex justify-center py-16"><CircleNotch className="w-5 h-5 animate-spin opacity-60" /></div>
      ) : (
        <div className="space-y-6">
          {CATEGORIES.map((category) => {
            const items = articles.filter((a) => a.category === category).sort((x, y) => x.sort_order - y.sort_order)
            const extra = articles.filter((a) => !CATEGORIES.includes(a.category))
            const list = category === 'general' ? [...items, ...extra] : items
            if (list.length === 0) return null
            return (
              <Panel key={category}>
                <div className="text-sm font-semibold mb-3 capitalize">{category}</div>
                <div className="space-y-4">
                  {list.map((a) => (
                    <div key={a.id} className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Input
                          value={a.title}
                          onChange={(e) => patchLocal(a.id, { title: e.target.value })}
                          placeholder="Title"
                        />
                        <select
                          value={a.category}
                          onChange={(e) => patchLocal(a.id, { category: e.target.value })}
                          className="bg-transparent border border-white/10 rounded-lg px-2 py-2 text-xs focus:outline-none"
                        >
                          {CATEGORIES.map((c) => <option key={c} value={c} className="bg-gray-900">{c}</option>)}
                        </select>
                        <label className="text-xs opacity-70 inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={a.published}
                            onChange={(e) => patchLocal(a.id, { published: e.target.checked })}
                          />
                          published
                        </label>
                        <GhostButton onClick={() => void save(a)} disabled={busyId === a.id}>
                          {busyId === a.id ? <CircleNotch className="w-4 h-4 animate-spin" />
                            : savedId === a.id ? <CheckCircle weight="fill" className="w-4 h-4 text-emerald-500" />
                            : 'Save'}
                        </GhostButton>
                        <button
                          onClick={() => void remove(a.id)}
                          className="p-2 opacity-50 hover:opacity-100 hover:text-rose-400 transition-opacity"
                          aria-label="Delete"
                        >
                          <TrashSimple className="w-4 h-4" />
                        </button>
                      </div>
                      <textarea
                        value={a.body}
                        onChange={(e) => patchLocal(a.id, { body: e.target.value })}
                        onBlur={() => void save(a)}
                        rows={Math.min(14, Math.max(3, a.body.split('\n').length + 1))}
                        className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2 text-sm leading-relaxed focus:outline-none focus:border-white/30 resize-y"
                      />
                    </div>
                  ))}
                </div>
              </Panel>
            )
          })}
          <div className="flex items-center gap-2">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="bg-transparent border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              {CATEGORIES.map((c) => <option key={c} value={c} className="bg-gray-900">{c}</option>)}
            </select>
            <PrimaryButton onClick={() => void add()}>
              <Plus className="w-4 h-4" /> Add article
            </PrimaryButton>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
