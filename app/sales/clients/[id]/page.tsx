'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, CircleNotch, WarningCircle, CheckCircle, Plus, X, Robot, Lightning, ChatCircle, Phone, CalendarBlank } from '@phosphor-icons/react'
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
  voice_speed?: number | null
  retell_agent_id: string | null
  subscription_status: string | null
  calcom_connected?: boolean | null
  cal_com_username?: string | null
  cal_com_event_type_slug?: string | null
}

type Voice = {
  voice_id: string
  voice_name?: string | null
  gender?: string | null
  accent?: string | null
}

type EdgeCase = {
  id: string
  label: string
  instruction: string
  created_at: string
}

/**
 * Placeholder detection in edge-case instructions. Templates ship with
 * fake numbers / addresses ("(555) 123-4567", "123 Main St") that
 * will be read to real callers verbatim if a rep saves without
 * editing. We block save until they're swapped out.
 *
 * Patterns we flag:
 *   - 555 numbers in any common US format
 *   - "123 Main St" / "123 Anywhere"
 *   - "your.email@example.com"
 *   - "[brackets]" since templates often use them as fill-me hints
 */
const PLACEHOLDER_PATTERNS: RegExp[] = [
  /\(?555\)?[\s.-]?\d{3}[\s.-]?\d{4}/,         // (555) 123-4567 / 555.123.4567
  /\b1[\s.-]?\(?555\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/,
  /\b123\s+(main|anywhere|elm|first)\s+(st|street|ave|road|rd)\b/i,
  /\bexample\.(com|org|net)\b/i,
  /\[[^\]]+\]/,                                 // [your name], [their address]
]

function firstPlaceholder(text: string): string | null {
  for (const re of PLACEHOLDER_PATTERNS) {
    const m = text.match(re)
    if (m) return m[0]
  }
  return null
}

function hasPlaceholder(text: string): boolean {
  return firstPlaceholder(text) !== null
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
    instruction: 'If the caller mentions an emergency or no heat / no water / leak, transfer immediately to [forwarding number] and don\'t collect more info.',
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
  const [syncWarning, setSyncWarning] = useState<string | null>(null)
  const [resyncBusy, setResyncBusy] = useState(false)

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
    setSaving(true); setErr(''); setSyncWarning(null)
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
        setSyncWarning(j.retell_warning || null)
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
    setSyncWarning(null)
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
        setSyncWarning(j.retell_warning || null)
      }
    } catch {
      load()
    }
  }

  const resyncToRetell = async () => {
    setResyncBusy(true); setErr('')
    try {
      const res = await fetchWithAuth(`/api/sales/clients/${id}/agent/edge-cases`, {
        method: 'PATCH',
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) setErr(j?.error || 'Resync failed')
      else {
        setEdgeCases(j.edge_cases || [])
        setSyncWarning(j.retell_warning || null)
      }
    } finally {
      setResyncBusy(false)
    }
  }

  /**
   * Open the add form pre-filled from a starter template instead of
   * saving immediately. Templates contain placeholder values like
   * "(555) 123-4567" that would otherwise hit the live agent verbatim.
   * Reps must edit + confirm before save.
   */
  const useTemplate = (label: string, instruction: string) => {
    setNewLabel(label)
    setNewInstruction(instruction)
    setShowAdd(true)
    // Smooth scroll the add form into view so the rep sees what just opened.
    setTimeout(() => {
      try {
        document.getElementById('cg-edge-add-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } catch { /* noop */ }
    }, 0)
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
                Edge cases below still save - they apply once the agent is linked.
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
        </motion.div>

        {/* Voice + greeting */}
        <VoicePanel businessId={id} business={business} onSaved={load} />

        {/* Cal.com */}
        <CalcomPanel businessId={id} business={business} onSaved={load} />

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
                section - saved + pushed to Retell instantly.
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

          {syncWarning && (
            <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl px-3.5 py-3 flex items-start gap-3">
              <WarningCircle weight="fill" className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-amber-900">
                  Saved to your dashboard, but the live agent didn&apos;t accept the update.
                </div>
                <div className="text-[11px] text-amber-800 mt-0.5 break-words">
                  {syncWarning}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={resyncToRetell}
                    disabled={resyncBusy}
                    className="inline-flex items-center gap-1.5 text-xs bg-amber-900 text-amber-50 hover:bg-black rounded-md px-2.5 py-1 disabled:opacity-60"
                  >
                    {resyncBusy ? <CircleNotch className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                    {resyncBusy ? 'Retrying…' : 'Retry sync'}
                  </button>
                  <button
                    onClick={() => setSyncWarning(null)}
                    className="text-[11px] text-amber-800 hover:text-amber-900"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          <AnimatePresence>
            {showAdd && (
              <motion.div
                id="cg-edge-add-form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden mb-4"
              >
                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 space-y-3">
                  {hasPlaceholder(newInstruction) && (
                    <div className="bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-[12px] text-rose-900">
                      <strong>Edit the placeholder before saving.</strong>{' '}
                      The current text contains a fake number / value (
                      <span className="font-mono">{firstPlaceholder(newInstruction)}</span>
                      ) that will be read to real callers exactly as written.
                    </div>
                  )}
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
                      disabled={!newInstruction.trim() || saving || hasPlaceholder(newInstruction)}
                      title={hasPlaceholder(newInstruction)
                        ? `Edit the placeholder ${firstPlaceholder(newInstruction)} first.`
                        : ''}
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
                      onClick={() => useTemplate(t.label, t.instruction)}
                      disabled={saving}
                      className="w-full text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-3 py-2.5 transition-colors disabled:opacity-60"
                      title="Opens the editor pre-filled - edit any placeholders before saving"
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
          stay locked - these rules layer on top under a SPECIAL HANDLING section.
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

/* ----------------------------- Voice + greeting ----------------------------- */

function VoicePanel({
  businessId, business, onSaved,
}: {
  businessId: string
  business: Business
  onSaved: () => void
}) {
  const [voices, setVoices] = useState<Voice[]>([])
  const [greeting, setGreeting] = useState(business.greeting_message || '')
  const [voiceId, setVoiceId] = useState(business.voice_id || '')
  const [voiceSpeed, setVoiceSpeed] = useState<number>(business.voice_speed ?? 1.0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { setGreeting(business.greeting_message || '') }, [business.greeting_message])
  useEffect(() => { setVoiceId(business.voice_id || '') }, [business.voice_id])
  useEffect(() => { setVoiceSpeed(business.voice_speed ?? 1.0) }, [business.voice_speed])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetchWithAuth('/api/dashboard/retell/voices')
        const j = await res.json().catch(() => ({}))
        if (!cancelled && Array.isArray(j?.voices)) setVoices(j.voices)
      } catch { /* non-fatal */ }
    })()
    return () => { cancelled = true }
  }, [])

  const dirty =
    (greeting || '') !== (business.greeting_message || '') ||
    (voiceId || null) !== (business.voice_id || null) ||
    voiceSpeed !== (business.voice_speed ?? 1.0)

  const save = async () => {
    setSaving(true); setErr(''); setSaved(false)
    try {
      const res = await fetchWithAuth(`/api/sales/clients/${businessId}/agent`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          greeting_message: greeting,
          voice_id: voiceId || undefined,
          voice_speed: voiceSpeed,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(j?.error || 'Save failed')
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
        if (j?.agent_sync_error) setErr(`Saved, but agent sync warning: ${j.agent_sync_error}`)
        onSaved()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-5"
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Robot weight="duotone" className="w-4 h-4 text-sky-500" />
        <span className="text-sm font-medium text-gray-900">Voice &amp; greeting</span>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Live tweaks. Saves push to the agent in seconds.
      </p>

      <label className="block mb-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5">
          Greeting (what the agent says first)
        </div>
        <textarea
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder={`Hi, thanks for calling ${business.business_name}, how can I help?`}
          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 resize-none"
        />
      </label>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block">
            <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5">
              Voice
            </div>
            <select
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
            >
              <option value="">- Default -</option>
              {voices.map((v) => (
                <option key={v.voice_id} value={v.voice_id}>
                  {v.voice_name || v.voice_id}
                  {v.gender ? ` · ${v.gender}` : ''}
                  {v.accent ? ` · ${v.accent}` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <label className="block">
            <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1.5 flex items-center justify-between">
              <span>Voice speed</span>
              <span className="tabular-nums text-gray-700">{voiceSpeed.toFixed(2)}×</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.05}
              value={voiceSpeed}
              onChange={(e) => setVoiceSpeed(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
              <span>0.5×</span><span>1.0×</span><span>2.0×</span>
            </div>
          </label>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-1.5 bg-gray-900 text-white text-sm rounded-lg px-4 py-2 hover:bg-gray-800 disabled:opacity-60"
        >
          {saving ? <CircleNotch className="w-4 h-4 animate-spin" /> : 'Save'}
        </button>
        {saved && <span className="text-xs text-emerald-700 inline-flex items-center gap-1"><CheckCircle weight="fill" className="w-3.5 h-3.5" /> Saved</span>}
        {err && <span className="text-xs text-amber-700 truncate max-w-md">{err}</span>}
      </div>
    </motion.div>
  )
}

/* --------------------------------- Cal.com --------------------------------- */

type CalEventType = { id: number; title: string; slug: string; lengthInMinutes?: number }

function CalcomPanel({
  businessId, business, onSaved,
}: {
  businessId: string
  business: Business
  onSaved: () => void
}) {
  const [apiKey, setApiKey] = useState('')
  const [step, setStep] = useState<'idle' | 'key' | 'event' | 'connected'>(
    business.calcom_connected ? 'connected' : 'idle',
  )
  const [eventTypes, setEventTypes] = useState<CalEventType[]>([])
  const [eventTypeId, setEventTypeId] = useState<number | ''>('')
  const [account, setAccount] = useState<{ username: string; email?: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    setStep(business.calcom_connected ? 'connected' : 'idle')
  }, [business.calcom_connected])

  const submit = async (withEventType?: number) => {
    setBusy(true); setErr('')
    try {
      const res = await fetchWithAuth(`/api/sales/clients/${businessId}/calcom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          eventTypeId: withEventType ?? eventTypeId ?? undefined,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (j?.success) {
        setStep('connected')
        onSaved()
      } else if (j?.needsEventType) {
        setEventTypes(j.eventTypes || [])
        setAccount(j.account || null)
        setStep('event')
      } else {
        setErr(j?.errors?.apiKey || j?.error || 'Connection failed')
      }
    } finally {
      setBusy(false)
    }
  }

  const disconnect = async () => {
    if (!confirm('Disconnect Cal.com from this client? The agent will stop booking until reconnected.')) return
    setBusy(true)
    try {
      await fetchWithAuth(`/api/sales/clients/${businessId}/calcom`, { method: 'DELETE' })
      setStep('idle')
      setApiKey('')
      onSaved()
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE, delay: 0.05 }}
      className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-5"
    >
      <div className="flex items-center gap-1.5 mb-1">
        <CalendarBlank weight="duotone" className="w-4 h-4 text-violet-500" />
        <span className="text-sm font-medium text-gray-900">Cal.com integration</span>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Paste your client&apos;s Cal.com personal API key, pick the event type to use,
        and the agent starts booking real appointments on their calendar.{' '}
        <a
          href="https://app.cal.com/settings/developer/api-keys"
          target="_blank"
          rel="noreferrer"
          className="text-gray-700 underline"
        >
          Where to find their key
        </a>
      </p>

      {step === 'connected' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-emerald-900">
            <CheckCircle weight="fill" className="w-4 h-4 text-emerald-600" />
            <span>
              Connected
              {business.cal_com_username ? ` to ${business.cal_com_username}` : ''}
              {business.cal_com_event_type_slug ? ` · ${business.cal_com_event_type_slug}` : ''}
            </span>
          </div>
          <button
            onClick={disconnect}
            disabled={busy}
            className="text-xs text-emerald-800 hover:text-red-700 disabled:opacity-60"
          >
            Disconnect
          </button>
        </div>
      )}

      {step !== 'connected' && (
        <>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="cal_live_..."
              className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-gray-400"
            />
            <button
              onClick={() => submit()}
              disabled={busy || apiKey.trim().length < 10}
              className="inline-flex items-center gap-1.5 bg-gray-900 text-white text-sm rounded-lg px-4 py-2 hover:bg-gray-800 disabled:opacity-60"
            >
              {busy ? <CircleNotch className="w-4 h-4 animate-spin" /> : 'Connect'}
            </button>
          </div>

          {step === 'event' && eventTypes.length > 0 && (
            <div className="mt-4 bg-violet-50 border border-violet-200 rounded-xl p-4">
              <div className="text-xs text-violet-900 mb-2">
                {account?.username ? `Found ${eventTypes.length} event type${eventTypes.length === 1 ? '' : 's'} on @${account.username}.` : `Found ${eventTypes.length} event types.`} Pick which one the agent should book on:
              </div>
              <div className="space-y-1.5">
                {eventTypes.map((et) => (
                  <button
                    key={et.id}
                    onClick={() => submit(et.id)}
                    disabled={busy}
                    className="w-full text-left bg-white hover:bg-gray-50 border border-violet-200 rounded-lg px-3 py-2.5 transition-colors disabled:opacity-60"
                  >
                    <div className="text-sm font-medium text-gray-900">{et.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5 font-mono">
                      /{et.slug}
                      {et.lengthInMinutes ? ` · ${et.lengthInMinutes}min` : ''}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {err && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
              <WarningCircle weight="fill" className="w-4 h-4 mt-0.5" /> {err}
            </div>
          )}
        </>
      )}
    </motion.div>
  )
}
