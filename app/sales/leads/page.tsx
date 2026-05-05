'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Phone, Mail, Plus, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { SalesShell, SalesPageHeader, SalesLoadingState } from '../_components/SalesShell'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

type Lead = {
  id: string
  business_name: string
  contact_name?: string | null
  phone?: string | null
  email?: string | null
  source?: string | null
  status?: string | null
  notes?: string | null
  created_at?: string
  claimed_at?: string
}

export default function SalesLeadsPage() {
  const [available, setAvailable] = useState<Lead[]>([])
  const [claimed, setClaimed] = useState<Lead[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetchWithAuth('/api/sales/leads')
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(j?.error || 'Failed to load leads')
      } else {
        setAvailable(j.available || [])
        setClaimed(j.claimed || [])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const claimSelected = async () => {
    if (selected.size === 0) return
    setWorking(true)
    setError('')
    setFlash('')
    try {
      const res = await fetchWithAuth('/api/sales/leads/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_ids: Array.from(selected) }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(j?.error || 'Claim failed')
      } else {
        const parts: string[] = []
        if (j.claimed) parts.push(`${j.claimed} claimed`)
        if (j.skipped_taken) parts.push(`${j.skipped_taken} already taken`)
        if (j.skipped_already_mine) parts.push(`${j.skipped_already_mine} already yours`)
        setFlash(parts.join(' · ') || 'Done')
        setSelected(new Set())
        await load()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Claim failed')
    } finally {
      setWorking(false)
    }
  }

  const selectAllAvailable = () => {
    if (selected.size === available.length) setSelected(new Set())
    else setSelected(new Set(available.map((l) => l.id)))
  }

  const formatPhone = (p?: string | null) => {
    if (!p) return ''
    const digits = p.replace(/\D/g, '')
    if (digits.length === 11 && digits.startsWith('1')) {
      return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    }
    return p
  }

  const allSelected = useMemo(
    () => available.length > 0 && selected.size === available.length,
    [available.length, selected.size],
  )

  return (
    <SalesShell activeLabel="Leads">
      <section className="max-w-5xl mx-auto px-6 py-10">
        <SalesPageHeader
          eyebrow="leads"
          title="Pool"
          action={
            selected.size > 0 ? (
              <button
                onClick={claimSelected}
                disabled={working}
                className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm rounded-lg px-4 py-2 hover:bg-gray-800 disabled:opacity-60"
              >
                {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Claim {selected.size}
              </button>
            ) : null
          }
        />

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {flash && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-800 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{flash}</span>
          </div>
        )}

        {loading ? (
          <SalesLoadingState />
        ) : (
          <>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-10">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Available</div>
                  <div className="text-sm font-medium text-gray-900">{available.length} unclaimed</div>
                </div>
                {available.length > 0 && (
                  <button
                    onClick={selectAllAvailable}
                    className="text-xs text-gray-500 hover:text-gray-900"
                  >
                    {allSelected ? 'Deselect all' : 'Select all'}
                  </button>
                )}
              </div>

              {available.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">
                  No unclaimed leads right now. Check back later.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {available.map((l) => {
                    const checked = selected.has(l.id)
                    return (
                      <li
                        key={l.id}
                        onClick={() => toggle(l.id)}
                        className={`px-5 py-3 flex items-start gap-3 cursor-pointer transition-colors ${
                          checked ? 'bg-gray-50' : 'hover:bg-gray-50/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(l.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {l.business_name}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                            {l.contact_name && <span>{l.contact_name}</span>}
                            {l.phone && (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {formatPhone(l.phone)}
                              </span>
                            )}
                            {l.email && (
                              <span className="inline-flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {l.email}
                              </span>
                            )}
                            {l.source && <span className="text-gray-400">· {l.source}</span>}
                          </div>
                          {l.notes && (
                            <div className="text-xs text-gray-500 mt-1 line-clamp-2">{l.notes}</div>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Yours</div>
                <div className="text-sm font-medium text-gray-900">{claimed.length} claimed</div>
              </div>
              {claimed.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">
                  Nothing claimed yet. Pick some from the pool above.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {claimed.map((l) => (
                    <li key={l.id} className="px-5 py-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{l.business_name}</div>
                        <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                          {l.contact_name && <span>{l.contact_name}</span>}
                          {l.phone && (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {formatPhone(l.phone)}
                            </span>
                          )}
                          {l.email && (
                            <span className="inline-flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {l.email}
                            </span>
                          )}
                        </div>
                      </div>
                      <Link
                        href={`/sales/closes/new?lead_id=${l.id}`}
                        className="text-xs font-medium text-gray-700 hover:text-gray-900 border border-gray-200 rounded-lg px-2.5 py-1"
                      >
                        Mark closed
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </section>
    </SalesShell>
  )
}
