'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash, CircleNotch, CheckCircle, Phone } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

const EASE = [0.22, 1, 0.36, 1] as const

type RepNumber = {
  id: string
  phone_number: string
  phone_id: string
  label: string | null
  is_active: boolean
  created_at: string
}

/**
 * Inline popover that lets a rep pick or order their outbound DID.
 *
 * Positioned by the parent (Dialer); this component just renders the
 * card and handles the API plumbing. Cap is enforced server-side at 3
 * - adding a 4th evicts the oldest non-active and releases it from
 * Telnyx (~$1/mo each saved).
 */
export function NumberPicker({
  open, onClose, onActiveChanged,
}: {
  open: boolean
  onClose: () => void
  /** Called with the new active number whenever the rep switches or
   *  orders one, so the parent dialer can update its from-number ref
   *  + reconnect the Telnyx session if the auth token needs refreshing. */
  onActiveChanged: (phoneNumber: string) => void
}) {
  const [numbers, setNumbers] = useState<RepNumber[]>([])
  const [max, setMax] = useState(3)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [areaCode, setAreaCode] = useState('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetchWithAuth('/api/sales/dialer/numbers')
      const j = await r.json().catch(() => ({}))
      if (r.ok && j?.success) {
        setNumbers(j.numbers || [])
        setMax(j.max || 3)
      } else if (r.status !== 401) {
        setError(j?.error || 'Could not load numbers')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      void load()
      setError(null)
    }
  }, [open])

  const setActive = async (n: RepNumber) => {
    if (n.is_active || busyId) return
    setBusyId(n.id); setError(null)
    try {
      const r = await fetchWithAuth(`/api/sales/dialer/numbers/${n.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: true }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) {
        setError(j?.error || 'Switch failed')
        return
      }
      setNumbers((prev) => prev.map((row) => ({ ...row, is_active: row.id === n.id })))
      onActiveChanged(n.phone_number)
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (n: RepNumber) => {
    if (n.is_active) {
      setError('Switch active to a different number before deleting this one.')
      return
    }
    if (!confirm(`Release ${n.phone_number} back to Telnyx? This stops the ~$1/mo charge for it and frees the slot.`)) return
    setBusyId(n.id); setError(null)
    try {
      const r = await fetchWithAuth(`/api/sales/dialer/numbers/${n.id}`, { method: 'DELETE' })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) {
        setError(j?.error || 'Delete failed')
        return
      }
      setNumbers((prev) => prev.filter((row) => row.id !== n.id))
    } finally {
      setBusyId(null)
    }
  }

  const orderNew = async () => {
    setAdding(true); setError(null)
    try {
      const r = await fetchWithAuth('/api/sales/dialer/numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          area_code: areaCode.trim() || undefined,
          label: label.trim() || undefined,
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.success) {
        setError(j?.error || 'Could not order number')
        return
      }
      setAreaCode(''); setLabel(''); setShowAddForm(false)
      await load()
      // If the new number ended up active (first-ever number case), bubble.
      if (j.created?.is_active) onActiveChanged(j.created.phone_number)
    } finally {
      setAdding(false)
    }
  }

  if (!open) return null

  const atCap = numbers.length >= max

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[110] bg-black/30"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 4 }}
          transition={{ duration: 0.18, ease: EASE }}
          onClick={(e) => e.stopPropagation()}
          className="fixed top-24 right-5 w-80 bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone weight="fill" className="w-4 h-4 text-gray-700" />
              <div className="text-sm font-medium text-gray-900">From numbers</div>
              <span className="text-[10px] font-mono text-gray-400">
                {numbers.length}/{max}
              </span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 -m-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 space-y-1.5 max-h-[280px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-6 text-xs text-gray-500">
                <CircleNotch className="w-3.5 h-3.5 inline animate-spin mr-1.5" />
                Loading…
              </div>
            ) : numbers.length === 0 ? (
              <div className="text-center py-4 text-xs text-gray-500">
                No numbers yet. Add one below.
              </div>
            ) : (
              numbers.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-2 border transition-colors ${
                    n.is_active
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <button
                    onClick={() => setActive(n)}
                    disabled={n.is_active || !!busyId}
                    className="flex-1 text-left disabled:cursor-default"
                  >
                    <div className="flex items-center gap-1.5">
                      {n.is_active && <CheckCircle weight="fill" className="w-3.5 h-3.5 text-emerald-600" />}
                      <span className="text-sm font-mono text-gray-900">{n.phone_number}</span>
                    </div>
                    {n.label && (
                      <div className="text-[10px] text-gray-500 mt-0.5">{n.label}</div>
                    )}
                  </button>
                  <button
                    onClick={() => remove(n)}
                    disabled={n.is_active || busyId === n.id}
                    title={n.is_active ? 'Switch active first' : 'Release from Telnyx'}
                    className="p-1.5 text-gray-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {busyId === n.id ? <CircleNotch className="w-3.5 h-3.5 animate-spin" /> : <Trash className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))
            )}
          </div>

          {error && (
            <div className="mx-3 mb-2 text-[11px] bg-rose-50 border border-rose-200 text-rose-800 rounded-lg px-2.5 py-1.5">
              {error}
            </div>
          )}

          <div className="border-t border-gray-100 p-3">
            {showAddForm ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    value={areaCode}
                    onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    placeholder="Area code"
                    maxLength={3}
                    className="w-24 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:border-gray-400"
                  />
                  <input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Label (optional)"
                    maxLength={40}
                    className="flex-1 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={orderNew}
                    disabled={adding}
                    className="inline-flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs rounded-lg px-3 py-1.5 disabled:opacity-60"
                  >
                    {adding ? <CircleNotch className="w-3 h-3 animate-spin" /> : <Plus weight="bold" className="w-3 h-3" />}
                    {adding ? 'Ordering…' : 'Order number'}
                  </button>
                  <button
                    onClick={() => { setShowAddForm(false); setAreaCode(''); setLabel(''); setError(null) }}
                    className="text-xs text-gray-500 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  {atCap && (
                    <span className="text-[10px] text-amber-700 ml-auto">
                      Will replace oldest unused
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Leave area code blank to take any available US local number. ~$1/mo per saved number, billed by Telnyx.
                </p>
              </div>
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 border border-dashed border-gray-300 text-gray-700 text-xs rounded-lg px-3 py-2"
              >
                <Plus weight="bold" className="w-3.5 h-3.5" /> Add new number
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
