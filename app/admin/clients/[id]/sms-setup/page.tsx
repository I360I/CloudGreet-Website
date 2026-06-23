'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, CircleNotch, CheckCircle, WarningCircle,
  FloppyDisk, ArrowCounterClockwise, ChatTeardropText,
  Phone, DeviceMobile, ToggleLeft, ToggleRight,
} from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '../../../_components/Shell'
import { Panel, PanelHeader } from '../../../_components/ui'

type SmsConfig = {
  business_name: string
  sms_phone_number: string | null
  notifications_phone: string | null
  dispatch_mode: boolean
  sms_agent_enabled: boolean
  agent_sms_prompt: string | null
  tfv: { status: string; request_id: string | null; reason: string | null } | null
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
        on
          ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
          : 'border-white/[0.08] bg-white/[0.03] text-gray-400'
      }`}
    >
      {on
        ? <ToggleRight weight="fill" className="w-4 h-4" />
        : <ToggleLeft className="w-4 h-4" />}
      {on ? 'Enabled' : 'Disabled'}
    </button>
  )
}

function SaveRow({ saving, saved, error, onSave, dirty }: {
  saving: boolean; saved: boolean; error: string; onSave: () => void; dirty: boolean
}) {
  return (
    <div className="flex items-center gap-3 mt-4">
      <button
        onClick={onSave}
        disabled={saving || !dirty}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium disabled:opacity-40 transition-colors"
      >
        {saving
          ? <CircleNotch className="w-4 h-4 animate-spin" />
          : saved
          ? <CheckCircle className="w-4 h-4 text-emerald-300" />
          : <FloppyDisk className="w-4 h-4" />}
        {saving ? 'Saving...' : 'Save'}
      </button>
      {error && <span className="text-xs text-rose-300">{error}</span>}
      {saved && !dirty && <span className="text-xs text-emerald-400">Saved</span>}
    </div>
  )
}

export default function SmsSetupPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id

  const [cfg, setCfg] = useState<SmsConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState('')

  // Connection section
  const [smsPhone, setSmsPhone] = useState('')
  const [notifPhone, setNotifPhone] = useState('')
  const [dispatchMode, setDispatchMode] = useState(false)
  const [agentEnabled, setAgentEnabled] = useState(true)
  const [connSaving, setConnSaving] = useState(false)
  const [connSaved, setConnSaved] = useState(false)
  const [connErr, setConnErr] = useState('')

  // Prompt section
  const [prompt, setPrompt] = useState('')
  const [promptSaving, setPromptSaving] = useState(false)
  const [promptSaved, setPromptSaved] = useState(false)
  const [promptErr, setPromptErr] = useState('')
  const [loadingDefault, setLoadingDefault] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true); setLoadErr('')
    try {
      const r = await fetchWithAuth(`/api/admin/clients/${id}/sms-number`)
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j.success) throw new Error(j?.error || 'Failed to load')
      setCfg(j)
      setSmsPhone(j.sms_phone_number || '')
      setNotifPhone(j.notifications_phone || '')
      setDispatchMode(!!j.dispatch_mode)
      setAgentEnabled(j.sms_agent_enabled !== false)
      setPrompt(j.agent_sms_prompt || '')
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Failed to load')
    } finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  const connDirty =
    smsPhone !== (cfg?.sms_phone_number || '') ||
    notifPhone !== (cfg?.notifications_phone || '') ||
    dispatchMode !== !!cfg?.dispatch_mode ||
    agentEnabled !== (cfg?.sms_agent_enabled !== false)

  const promptDirty = prompt !== (cfg?.agent_sms_prompt || '')

  const saveConnection = async () => {
    if (!id) return
    setConnSaving(true); setConnErr(''); setConnSaved(false)
    try {
      // Save phone number via sms-number endpoint (validates against Telnyx)
      if (smsPhone.trim() && smsPhone.trim() !== cfg?.sms_phone_number) {
        const r = await fetchWithAuth(`/api/admin/clients/${id}/sms-number`, {
          method: 'POST',
          body: JSON.stringify({ phone_number: smsPhone.trim(), sms_agent_enabled: agentEnabled }),
        })
        const j = await r.json().catch(() => ({}))
        if (!r.ok || !j.success) throw new Error(j?.error || 'Phone assign failed')
      }
      // Save other connection fields via PATCH
      const r2 = await fetchWithAuth(`/api/admin/clients/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          notifications_phone: notifPhone.trim() || null,
          dispatch_mode: dispatchMode,
          sms_agent_enabled: agentEnabled,
        }),
      })
      const j2 = await r2.json().catch(() => ({}))
      if (!r2.ok || !j2.success) throw new Error(j2?.error || 'Save failed')
      setConnSaved(true)
      await load()
    } catch (e) {
      setConnErr(e instanceof Error ? e.message : 'Save failed')
    } finally { setConnSaving(false) }
  }

  const savePrompt = async () => {
    if (!id) return
    setPromptSaving(true); setPromptErr(''); setPromptSaved(false)
    try {
      const r = await fetchWithAuth(`/api/admin/clients/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ agent_sms_prompt: prompt.trim() || null }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j.success) throw new Error(j?.error || 'Save failed')
      setPromptSaved(true)
      await load()
    } catch (e) {
      setPromptErr(e instanceof Error ? e.message : 'Save failed')
    } finally { setPromptSaving(false) }
  }

  const loadDefaultPrompt = async () => {
    if (!id) return
    setLoadingDefault(true)
    try {
      const r = await fetchWithAuth(`/api/admin/clients/${id}/sms-prompt-preview`)
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j.body) throw new Error(j?.error || 'Failed')
      setPrompt(j.body)
    } catch (e) {
      setPromptErr(e instanceof Error ? e.message : 'Failed to load default')
    } finally { setLoadingDefault(false) }
  }

  const tfvBadge = (() => {
    const s = (cfg?.tfv?.status || '').toLowerCase()
    if (s.includes('verified')) return { label: 'Verified', cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/30' }
    if (s.includes('action') || s.includes('customer')) return { label: 'Action required', cls: 'text-rose-300 bg-rose-500/10 border-rose-400/30' }
    if (s.includes('pending') || s.includes('waiting') || s.includes('review')) return { label: 'Pending TFV', cls: 'text-amber-300 bg-amber-500/10 border-amber-400/30' }
    if (s === 'not_submitted') return { label: 'Not submitted', cls: 'text-gray-400 bg-white/[0.03] border-white/[0.08]' }
    return { label: 'Not provisioned', cls: 'text-gray-500 bg-white/[0.02] border-white/[0.06]' }
  })()

  if (loading) return (
    <AdminShell activeLabel="Overview">
      <div className="flex items-center justify-center py-20">
        <CircleNotch className="w-5 h-5 text-gray-500 animate-spin" />
      </div>
    </AdminShell>
  )

  if (loadErr || !cfg) return (
    <AdminShell activeLabel="Overview">
      <div className="px-4 lg:px-8 py-10 max-w-2xl">
        <Link href={`/admin/clients/${id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <p className="text-sm text-rose-300">{loadErr || 'Client not found.'}</p>
      </div>
    </AdminShell>
  )

  return (
    <AdminShell activeLabel="Overview">
      <div className="px-4 lg:px-8 py-8 max-w-3xl">
        {/* Breadcrumb */}
        <Link
          href={`/admin/clients/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.2em] text-gray-500 hover:text-gray-300 transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {cfg.business_name}
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-center">
            <ChatTeardropText className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">SMS line</div>
            <h1 className="text-xl font-medium text-white">{cfg.business_name}</h1>
          </div>
          <span className={`ml-auto text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border ${tfvBadge.cls}`}>
            {tfvBadge.label}
          </span>
        </div>

        <div className="space-y-4">
          {/* Connection */}
          <Panel>
            <PanelHeader eyebrow="Telnyx" title="Connection" />

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Inbound SMS number</span>
                  <span className="text-gray-600 font-normal ml-0.5">— customers text this</span>
                </label>
                <input
                  value={smsPhone}
                  onChange={e => { setSmsPhone(e.target.value); setConnSaved(false) }}
                  placeholder="+18336940507"
                  className="w-full bg-[#0a0a0c] border border-white/[0.08] rounded-xl px-3 py-2 text-sm font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-sky-400/40"
                />
                <p className="mt-1 text-[11px] text-gray-600">Must already be on the CloudGreet Telnyx account. Validated on save.</p>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  <span className="flex items-center gap-1.5"><DeviceMobile className="w-3.5 h-3.5" /> Dispatch-to number</span>
                  <span className="text-gray-600 font-normal ml-0.5">— owner receives dispatch alerts here</span>
                </label>
                <input
                  value={notifPhone}
                  onChange={e => { setNotifPhone(e.target.value); setConnSaved(false) }}
                  placeholder="+16145467661"
                  className="w-full bg-[#0a0a0c] border border-white/[0.08] rounded-xl px-3 py-2 text-sm font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-sky-400/40"
                />
              </div>

              <div className="flex items-center justify-between gap-4 flex-wrap pt-1">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-28">Agent</span>
                    <Toggle on={agentEnabled} onToggle={() => { setAgentEnabled(v => !v); setConnSaved(false) }} />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-28">Dispatch mode</span>
                    <Toggle on={dispatchMode} onToggle={() => { setDispatchMode(v => !v); setConnSaved(false) }} />
                  </div>
                </div>
                <div className="text-[11px] text-gray-600 max-w-xs">
                  Dispatch mode = owner handles all bookings manually via text; agent never books a calendar slot.
                </div>
              </div>

              {cfg.tfv?.reason && (
                <div className="rounded-xl border border-rose-400/20 bg-rose-500/[0.05] px-3 py-2 text-xs text-rose-200">
                  <div className="font-medium mb-0.5">TFV feedback</div>
                  {cfg.tfv.reason}
                </div>
              )}
            </div>

            <SaveRow saving={connSaving} saved={connSaved} error={connErr} onSave={saveConnection} dirty={connDirty} />
          </Panel>

          {/* Agent prompt */}
          <Panel>
            <PanelHeader
              eyebrow="AI brain"
              title="Agent prompt"
              trailing={
                <button
                  onClick={loadDefaultPrompt}
                  disabled={loadingDefault}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-gray-400 hover:text-gray-200 hover:bg-white/[0.06] transition-colors disabled:opacity-50"
                >
                  {loadingDefault
                    ? <CircleNotch className="w-3.5 h-3.5 animate-spin" />
                    : <ArrowCounterClockwise className="w-3.5 h-3.5" />}
                  Load current default
                </button>
              }
            />

            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              The agent uses this prompt verbatim. Runtime context (current time, customer phone, name on file) is auto-injected before this text. Leave blank to use the hardcoded SmartRide default.
            </p>

            <textarea
              value={prompt}
              onChange={e => { setPrompt(e.target.value); setPromptSaved(false) }}
              rows={24}
              placeholder="Paste the full agent prompt here. Start with CHANNEL RULES or your first section heading..."
              className="w-full bg-[#0a0a0c] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs font-mono text-gray-300 placeholder-gray-700 focus:outline-none focus:border-sky-400/40 resize-y leading-relaxed"
            />
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-[11px] text-gray-600">{prompt.length.toLocaleString()} chars</span>
              {prompt && (
                <button
                  onClick={() => { setPrompt(''); setPromptSaved(false) }}
                  className="text-[11px] text-gray-600 hover:text-rose-400 transition-colors"
                >
                  Clear (revert to default)
                </button>
              )}
            </div>

            <SaveRow saving={promptSaving} saved={promptSaved} error={promptErr} onSave={savePrompt} dirty={promptDirty} />
          </Panel>
        </div>
      </div>
    </AdminShell>
  )
}
