'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MagnifyingGlass, X, CaretRight } from '@phosphor-icons/react'
import { SalesShell, SalesPageHeader } from '../_components/SalesShell'
import { PLAYBOOK_SECTIONS, type PlaybookSection } from '@/lib/sales-playbook/content'

const EASE = [0.22, 1, 0.36, 1] as const

export default function PlaybookPage() {
  const [activeId, setActiveId] = useState<string>(PLAYBOOK_SECTIONS[0].id)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return PLAYBOOK_SECTIONS
    return PLAYBOOK_SECTIONS.filter((s) =>
      s.title.toLowerCase().includes(q) ||
      s.blurb.toLowerCase().includes(q) ||
      s.body.toLowerCase().includes(q)
    )
  }, [search])

  const active = PLAYBOOK_SECTIONS.find((s) => s.id === activeId) || PLAYBOOK_SECTIONS[0]

  return (
    <SalesShell activeLabel="Playbook">
      <SalesPageHeader eyebrow="Sales rep playbook" title="Playbook" />
      <p className="text-sm text-gray-500 -mt-6 mb-8">
        The basics. Read it once, come back when you&apos;re stuck.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 mt-2">
        {/* Sidebar TOC */}
        <aside className="md:sticky md:top-4 md:self-start">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the playbook"
              className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-9 py-2 text-sm focus:outline-none focus:border-gray-400"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700"
                aria-label="Clear"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <ul className="mt-3 space-y-0.5">
            {filtered.map((s) => {
              const isActive = s.id === activeId
              return (
                <li key={s.id}>
                  <button
                    onClick={() => setActiveId(s.id)}
                    className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors group flex items-start gap-2 ${
                      isActive
                        ? 'bg-gray-900 text-white'
                        : 'hover:bg-gray-100 text-gray-800'
                    }`}
                  >
                    <CaretRight
                      weight="bold"
                      className={`w-3 h-3 mt-1 flex-shrink-0 transition-transform ${
                        isActive ? 'rotate-90 text-white' : 'text-gray-400 group-hover:text-gray-700'
                      }`}
                    />
                    <span className="flex-1">
                      <span className="block font-medium leading-tight">{s.title}</span>
                      <span className={`block text-[11px] leading-snug mt-0.5 ${
                        isActive ? 'text-white/70' : 'text-gray-500'
                      }`}>
                        {s.blurb}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-xs text-gray-500">
                No matches for "{search}".
              </li>
            )}
          </ul>

        </aside>

        {/* Main content */}
        <AnimatePresence mode="wait">
          <motion.article
            key={active.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8"
          >
            <h2 className="text-2xl font-medium text-gray-900 tracking-tight">{active.title}</h2>
            <p className="text-sm text-gray-500 mt-1">{active.blurb}</p>
            <div className="mt-6">
              <PlaybookBody body={active.body} />
            </div>
          </motion.article>
        </AnimatePresence>
      </div>
    </SalesShell>
  )
}

/**
 * Tiny markdown-ish renderer. Supports the subset we actually use in
 * lib/sales-playbook/content.ts: blank-line paragraphs, **bold**, and
 * lines starting with `- ` as bullets. Keeps the bundle from pulling in
 * a real markdown lib for nine pieces of static content.
 */
function PlaybookBody({ body }: { body: string }) {
  const blocks = body.split(/\n\n+/)
  return (
    <div className="space-y-4 text-[14px] leading-relaxed text-gray-800">
      {blocks.map((block, i) => {
        const lines = block.split('\n')
        const isBulletBlock = lines.every((l) => l.trim().startsWith('- '))
        if (isBulletBlock) {
          return (
            <ul key={i} className="list-disc pl-5 space-y-1.5">
              {lines.map((l, j) => (
                <li key={j}>{renderInline(l.trim().replace(/^- /, ''))}</li>
              ))}
            </ul>
          )
        }
        // single-line bold heading like **Foo** by itself
        if (lines.length === 1 && /^\*\*[^*]+\*\*$/.test(lines[0].trim())) {
          return (
            <h3 key={i} className="text-[15px] font-semibold text-gray-900 mt-2">
              {lines[0].trim().replace(/\*\*/g, '')}
            </h3>
          )
        }
        // paragraph - render each line, preserving line breaks within
        return (
          <p key={i} className="whitespace-pre-line">
            {lines.map((l, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {renderInline(l)}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}

function renderInline(s: string): React.ReactNode {
  // Split on **bold** while preserving the rest. No nested formatting.
  const parts = s.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) {
      return <strong key={i} className="font-semibold text-gray-900">{p.replace(/\*\*/g, '')}</strong>
    }
    return <span key={i}>{p}</span>
  })
}
