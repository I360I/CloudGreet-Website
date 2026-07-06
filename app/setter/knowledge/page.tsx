'use client'

import { useEffect, useMemo, useState } from 'react'
import { CircleNotch, MagnifyingGlass, WarningCircle, BookOpen } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { SetterLoadingState } from '../_components/SetterShell'

const NAVY = '#1E3A8A'

type Article = {
  id: string
  title: string
  body: string
  category: string
  sort_order: number
  updated_at: string
}

const CATEGORY_LABELS: Record<string, string> = {
  product: 'The product',
  pricing: 'Pricing',
  process: 'How we work',
  faq: 'FAQ',
  general: 'General',
}

/**
 * Knowledge base for setters/reps: what CloudGreet is, pricing, process,
 * and answers to prospect questions - so nobody has to guess on a live
 * call. Content is admin-managed (admin panel > Knowledge).
 */
export default function SetterKnowledgePage() {
  return <KnowledgeBody />
}

function KnowledgeBody() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState<string>('all')

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetchWithAuth('/api/sales/knowledge')
        const j = await r.json().catch(() => ({}))
        if (!r.ok || !j?.success) setErr(j?.error || 'Failed to load knowledge base')
        else setArticles(j.articles || [])
      } catch {
        setErr('Failed to load knowledge base')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const categories = useMemo(() => {
    const seen: string[] = []
    for (const a of articles) if (!seen.includes(a.category)) seen.push(a.category)
    return seen
  }, [articles])

  const filtered = useMemo(() => {
    let out = articles
    if (activeCat !== 'all') out = out.filter((a) => a.category === activeCat)
    const q = search.trim().toLowerCase()
    if (q) out = out.filter((a) => (a.title + ' ' + a.body).toLowerCase().includes(q))
    return out
  }, [articles, activeCat, search])

  if (loading) return <SetterLoadingState />

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: NAVY }}>Knowledge base</h1>
          <p className="text-sm text-slate-500 mt-1">
            Everything you need to answer prospect questions without guessing.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-[#E3EAF4] rounded-lg px-3 py-2 w-64 focus-within:border-blue-500">
          <MagnifyingGlass className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles..."
            className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none"
          />
        </div>
      </div>

      {err && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700 flex items-start gap-2">
          <WarningCircle className="w-4 h-4 mt-0.5 shrink-0" /> {err}
        </div>
      )}

      {categories.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {['all', ...categories].map((c) => (
            <button
              key={c}
              onClick={() => setActiveCat(c)}
              className={`text-xs rounded-full px-3 py-1.5 border transition-colors duration-150 ${
                activeCat === c
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-[#E3EAF4] hover:border-blue-300'
              }`}
            >
              {c === 'all' ? 'All' : (CATEGORY_LABELS[c] || c)}
            </button>
          ))}
        </div>
      )}

      {!err && filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-[#E3EAF4] p-10 text-center">
          <BookOpen weight="duotone" className="w-8 h-8 text-blue-300 mx-auto mb-2" />
          <div className="text-sm text-slate-500">
            {articles.length === 0
              ? 'Nothing here yet - admin adds articles from the admin panel.'
              : 'No articles match that search.'}
          </div>
        </div>
      )}

      {/* Masonry-style two-column flow on wide screens so the page fills
          the canvas instead of leaving the right third empty. */}
      <div className="columns-1 lg:columns-2 gap-4 [column-fill:_balance]">
        {filtered.map((a) => (
          <article key={a.id} className="break-inside-avoid mb-4 bg-white rounded-xl border border-[#E3EAF4] shadow-[0_1px_2px_rgba(16,24,40,0.04)] p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 rounded-full px-2 py-0.5">
                {CATEGORY_LABELS[a.category] || a.category}
              </span>
            </div>
            <h2 className="text-base font-semibold mb-2" style={{ color: NAVY }}>{a.title}</h2>
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{a.body}</div>
          </article>
        ))}
      </div>
    </div>
  )
}
