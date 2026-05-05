'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, CircleNotch, WarningCircle, CheckCircle, Plus, X, Robot,
  Lightning, ChatCircle, Phone, CalendarBlank,
} from '@phosphor-icons/react'
import { SalesShell, SalesPageHeader, SalesLoadingState } from '../../_components/SalesShell'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

const EASE = [0.22, 1, 0.36, 1] as const

type Business = {
  id: string
  business_name: string
  business_type: string | null
  phone_number: string | null
  email: string | null
  greeting_message: string | null
  voice_id: string | null
  retell_agent_id: string | null
  subscription_status: string | null
  cal_com_enabled?: boolean | null
  cal_com_event_type_uri?: string | null
}

type EdgeCase = {
  id: string
  label: string
  instruction: string
  created_at: string
}

const STARTER_TEMPLATES: Array<{ label: string; instruction: string; tag: string }> = [
  {
    tag: 'Pricing',
    label: 'Pricing asked',
    instruction: 'When the caller asks for a price, say we do all quotes in person and ask for their address to schedule a free estimate.',
  },
  {
    tag: 'Emergency',
    label: 'After-hours emergency',
    instruction: 'If the caller mentions an emergency or no heat / no water / leak, transfer immediately to (555) 123-4567 and don\'t collect more info.',
  },
  {
    tag: 'Service area',
    label: 'Out of area',
    instruction: 'If the caller is outside our service area, politely apologize and let them know we don\'t cover their area, but ask if they\'d like a referral.',
  },
  {
    tag: 'Schedule',
    label: 'Same-day request',
    instruction: 'If the caller asks for same-day service, check our hours: if before 2pm we can usually fit them in, after 2pm offer next-day morning.',
  },
  {
    tag: 'Owner',
    label: 'Asks for owner',
    instruction: 'If the caller asks to speak with the owner specifically, take their name + number and say the owner will call them back personally.',
  },
]

export default function SalesClientDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id as string

  const [business, setBusiness] = useState<Business | null>(null)
  const [edgeCases, setEdgeCases] = useState<EdgeCase[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  // Add-form state
  const [showAdd, setShowAdd] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newInstruction, setNewInstruction] = useState('')

  const load = async () => {
    setLoading(true); setErr('')
    try {
      const res = await fetchWithAuth(`/api/sales/clients/${id}/agent`)
      const j = await res.json().catch(() => ({}))
      if (!res.ok) setErr(j?.error || 'Failed to load')
      else {
        setBusiness(j.business)
        setEdgeCases(j.edge_cases || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (id) load() /* eslint-disable-line */ }, [id])

  const addCase = async (label: string, instruction: string) => {
    if (!instruction.trim()) return
    setSaving(true); setErr('')
    try {
      const res = await fetchWithAuth(`/api/sales/clients/${id}/agent/edge-cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, instruction }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) setErr(j?.error || 'Add failed')
      else {
        setEdgeCases(j.edge_cases || [])
        setShowAdd(false)
        setNewLabel('')
        setNewInstruction('')
      }
    } finally {
      setSaving(false)
    }
  }

  const removeCase = async (caseId: string) => {
    setEdgeCases((prev) => prev.filter((c) => c.id !== caseId))
    try {
      const res = await fetchWithAuth(`/api/sales/clients/${id}/agent/edge-cases?case_id=${caseId}`, {
        method: 'DELETE',
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(j?.error || 'Delete failed')
        load() // re-sync
      } else {
        setEdgeCases(j.edge_cases || [])
      }
    } catch {
      load()
    }
  }

  if (loading || !business) {
    return (
      <SalesShell activeLabel="Clients">
        <section className="max-w-3xl mx-auto px-6 py-10">
          {err
            ? <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start gap-2">
                <WarningCircle weight="fill" className="w-4 h-4 mt-0.5" />{err}
              </div>
            : <SalesLoadingState />}
        </section>
      </SalesShell>
    )
  }

  return (
    <SalesShell activeLabel="Clients">
      <section className="max-w-3xl mx-auto px-6 py-10">
        <Link
          href="/sales/clients"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 mb-3"
        >
          <ArrowLeft className="w-3 h-3" /> Clients
        </Link>

        <SalesPageHeader
          eyebrow="agent · client"
          title={business.business_name}
        />

        {err && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
            <WarningCircle weight="fill" className="w-4 h-4 mt-0.5" /> {err}
          </div>
        )}

        {!business.retell_agent_id && (
          <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <WarningCircle weight="fill" className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <div className="font-medium text-amber-900">No AI agent linked yet</div>
              <p className="text-xs text-amber-800 mt-1">
                Anthony needs to wire a Retell agent to this client before edits go live.
                Edge cases below still save — they apply once the agent is linked.
              </p>
            </div>
          </div>
        )}

        {/* Quick info card */}
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-5"
        >
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {business.business_type && (
              <Field label="Type" value={business.business_type} />
            )}
            {business.phone_number && (
              <Field label="Phone" value={business.phone_number} />
            )}
            {business.email && (
              <Field label="Email" value={business.email} />
            )}
            {business.greeting_message && (
              <Field label="Greeting" value={business.greeting_message} truncate />
            )}
          </div>
          {business.cal_com_enabled === false && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-start gap-2">
              <CalendarBlank weight="duotone" className="w-4 h-4 text-violet-500 mt-0.5" />
              <div className="text-xs text-gray-600">
                <span className="font-medium text-gray-900">Cal.com not connected.</span>{' '}
                The agent can still capture intake info and text it to the client, but
                won&apos;t auto-book real appointments. Help your client connect their
                calendar in their dashboard → Settings → Integrations.
              </div>
            </div>
          )}
        </motion.div>

        {/* Edge cases */}
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE, delay: 0.05 }}
          className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5"
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Lightning weight="duotone" className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-gray-900">Special handling rules</span>
              </div>
              <p className="text-xs text-gray-500 max-w-md">
                Add specific situations the agent should handle in particular ways.
                Each rule appends to the agent&apos;s prompt under a SPECIAL HANDLING
                section — saved + pushed to Retell instantly.
              </p>
            </div>
            {!showAdd && (
              <button
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-1.5 text-xs bg-gray-900 text-white rounded-lg px-3 py-1.5 hover:bg-gray-800 flex-shrink-0"
              >
                <Plus weight="bold" className="w-3 h-3" /> Add rule
              </button>
            )}
          </div>

          <AnimatePresence>
            {showAdd && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden mb-4"
              >
                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-amber-900 mb-1">
                      Label (optional)
                    </label>
                    <input
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="e.g. Pricing"
                      maxLength={60}
                      className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-amber-900 mb-1">
                      Instruction
                    </label>
                    <textarea
                      value={newInstruction}
                      onChange={(e) => setNewInstruction(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder='e.g. "When they ask about pricing, say we do all quotes in person and ask for their address."'
                      className="w-full bg-white border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 resize-none"
                    />
                    <div className="text-[11px] text-amber-700 mt-1">
                      {newInstruction.length}/500
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => { setShowAdd(false); setNewLabel(''); setNewInstruction('') }}
                      className="text-xs text-amber-800 hover:text-amber-900"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => addCase(newLabel, newInstruction)}
                      disabled={!newInstruction.trim() || saving}
                      className="inline-flex items-center gap-1.5 text-xs bg-gray-900 text-white rounded-lg px-3 py-2 hover:bg-gray-800 disabled:opacity-60"
                    >
                      {saving ? <CircleNotch className="w-3 h-3 animate-spin" /> : <CheckCircle weight="fill" className="w-3 h-3" />}
                      Add rule · sync to agent
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {edgeCases.length === 0 ? (
            <>
              <div className="text-xs text-gray-500 mb-3">
                No rules yet. Try one of these starter templates:
              </div>
              <ul className="space-y-2">
                {STARTER_TEMPLATES.map((t, i) => (
                  <li key={i}>
                    <button
                      onClick={() => addCase(t.label, t.instruction)}
                      disabled={saving}
                      className="w-full text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-3 py-2.5 transition-colors disabled:opacity-60"
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500 bg-white border border-gray-200 rounded-full px-1.5 py-0.5">
                          {t.tag}
                        </span>
                        <span className="text-xs font-medium text-gray-900">{t.label}</span>
                      </div>
                      <div className="text-xs text-gray-600 line-clamp-2">{t.instruction}</div>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <ul className="space-y-2">
              {edgeCases.map((c) => (
                <motion.li
                  key={c.id}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {c.label && (
                        <div className="text-xs font-medium text-gray-900 mb-0.5">{c.label}</div>
                      )}
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">{c.instruction}</div>
                    </div>
                    <button
                      onClick={() => removeCase(c.id)}
                      className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      aria-label="Remove rule"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </motion.div>

        <p className="text-[11px] text-gray-400 mt-4">
          Changes sync to the live agent within seconds. The base prompt + greeting
          stay locked — these rules layer on top under a SPECIAL HANDLING section.
        </p>
      </section>
    </SalesShell>
  )
}

function Field({ label, value, truncate }: { label: string; value: string; truncate?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-0.5">{label}</div>
      <div className={`text-gray-900 ${truncate ? 'truncate' : ''}`}>{value}</div>
    </div>
  )
}
