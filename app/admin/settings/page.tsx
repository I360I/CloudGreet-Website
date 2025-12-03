'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  BellRing,
  Bot,
  CreditCard,
  Database,
  Mail,
  PhoneForwarded,
  Slack,
  Sparkles,
  Target,
  Loader2,
  ArrowRight
} from 'lucide-react'

import { useToast } from '@/app/contexts/ToastContext'
import { Modal } from '@/app/components/ui/Modal'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { IntegrationConfig, IntegrationSlug } from '@/lib/integrations/config'

interface FieldState {
  key: string
  label: string
  description: string
  inputType: 'secret' | 'text'
  optional: boolean
  status: string
  lastVerifiedAt: string | null
  error: string | null
  hasValue: boolean
}

interface IntegrationState {
  slug: IntegrationSlug
  name: string
  description: string
  category: string
  icon: string
  docsUrl?: string
  status: string
  lastVerifiedAt: string | null
  fields: FieldState[]
}

interface IntegrationsResponse {
  success: boolean
  integrations: IntegrationState[]
}

const CATEGORY_LABELS: Record<string, string> = {
  billing: 'Billing & Payments',
  telephony: 'Telephony',
  ai: 'AI & Automation',
  communications: 'Messaging & Email',
  acquisition: 'Lead Acquisition',
  alerts: 'Monitoring & Alerts'
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'credit-card': CreditCard,
  'phone-forwarded': PhoneForwarded,
  bot: Bot,
  sparkles: Sparkles,
  mail: Mail,
  slack: Slack,
  'bell-ring': BellRing,
  target: Target,
  database: Database
}

const STATUS_COLORS: Record<string, string> = {
  connected: 'text-emerald-300 bg-emerald-500/10 border border-emerald-500/30',
  'action_required': 'text-amber-300 bg-amber-500/10 border border-amber-500/30',
  error: 'text-rose-300 bg-rose-500/10 border border-rose-500/30',
  pending: 'text-slate-300 bg-slate-500/10 border border-slate-500/30',
  optional: 'text-slate-400 bg-slate-500/5 border border-slate-500/20'
}

type FormValues = Record<string, string>
type DirtyFlags = Record<string, boolean>

type ProspectingFormState = {
  industries: string
  titles: string
  locations: string
  keywords: string
  employeeMin: string
  employeeMax: string
}

type AISettingsState = {
  tone: 'professional' | 'friendly' | 'casual'
  greetingMessage: string
  confidenceThreshold: string
  maxSilenceSeconds: string
  escalationMessage: string
  additionalInstructions: string
}

type ProspectingFiltersResponse = {
  provider: string
  filters: {
    industries?: string[]
    titles?: string[]
    locations?: string[]
    keywords?: string[]
    employeeCount?: {
      min?: number
      max?: number
    }
  }
  lastSync?: {
    provider: string
    status: string
    fetched_count: number
    inserted_count: number
    skipped_count: number
    started_at: string
    completed_at: string | null
    message: string | null
  } | null
}

export default function OwnerSettingsPage() {
  const { showError, showSuccess } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [integrations, setIntegrations] = useState<IntegrationState[]>([])

  const [activeIntegration, setActiveIntegration] = useState<IntegrationState | null>(null)
  const [formValues, setFormValues] = useState<FormValues>({})
  const [dirtyFlags, setDirtyFlags] = useState<DirtyFlags>({})
  const [prospectingFiltersLoading, setProspectingFiltersLoading] = useState(true)
  const [prospectingSaving, setProspectingSaving] = useState(false)
  const [prospectingSyncing, setProspectingSyncing] = useState(false)
  const [prospectingLastSync, setProspectingLastSync] = useState<ProspectingFiltersResponse['lastSync']>(null)
  const [prospectingFilters, setProspectingFilters] = useState<ProspectingFormState>({
    industries: '',
    titles: '',
    locations: '',
    keywords: '',
    employeeMin: '',
    employeeMax: ''
  })
  const [aiSettings, setAiSettings] = useState<AISettingsState>({
    tone: 'professional',
    greetingMessage: '',
    confidenceThreshold: '0.6',
    maxSilenceSeconds: '5',
    escalationMessage: "I'm going to connect you with a teammate who can help further.",
    additionalInstructions: ''
  })
  const [aiSettingsLoading, setAiSettingsLoading] = useState(true)
  const [aiSettingsSaving, setAiSettingsSaving] = useState(false)

  const fetchIntegrations = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetchWithAuth('/api/admin/integrations', {
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
        throw new Error(errorData?.error || `Failed to load integrations (${response.status})`)
      }

      let data: IntegrationsResponse
      try {
        data = await response.json() as IntegrationsResponse
      } catch (jsonError) {
        throw new Error('Invalid response from server')
      }

      if (!data.success) {
        throw new Error(data?.['error'] || 'Failed to load integrations.')
      }
      setIntegrations(data.integrations)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load integrations.'
      setError(message)
      showError('Failed to load settings', message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIntegrations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        setProspectingFiltersLoading(true)
        const response = await fetchWithAuth('/api/admin/prospecting/filters', {
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
          throw new Error(errorData?.error ?? `Failed to load filters (${response.status})`)
        }

        let data: ProspectingFiltersResponse
        try {
          data = await response.json() as ProspectingFiltersResponse
        } catch (jsonError) {
          throw new Error('Invalid response from server')
        }
        setProspectingFilters({
          industries: (data.filters.industries ?? []).join(', '),
          titles: (data.filters.titles ?? []).join(', '),
          locations: (data.filters.locations ?? []).join(', '),
          keywords: (data.filters.keywords ?? []).join(', '),
          employeeMin: data.filters.employeeCount?.min ? String(data.filters.employeeCount.min) : '',
          employeeMax: data.filters.employeeCount?.max ? String(data.filters.employeeCount.max) : ''
        })
        setProspectingLastSync(data.lastSync ?? null)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load filters'
        showError('Failed to load prospecting filters', message)
      } finally {
        setProspectingFiltersLoading(false)
      }
    }

    fetchFilters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const fetchAiSettings = async () => {
      try {
        setAiSettingsLoading(true)
        const response = await fetchWithAuth('/api/admin/ai-settings', {
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
          throw new Error(errorData?.error || `Failed to load AI settings (${response.status})`)
        }

        let data
        try {
          data = await response.json()
        } catch (jsonError) {
          throw new Error('Invalid response from server')
        }

        if (!data.success) {
          throw new Error(data?.error || 'Failed to load AI settings')
        }

        setAiSettings({
          tone: data.settings.tone,
          greetingMessage: data.settings.greetingMessage,
          confidenceThreshold: String(data.settings.confidenceThreshold ?? 0.6),
          maxSilenceSeconds: String(data.settings.maxSilenceSeconds ?? 5),
          escalationMessage: data.settings.escalationMessage,
          additionalInstructions: data.settings.additionalInstructions ?? ''
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load AI settings'
        showError('Failed to load AI tuning controls', message)
      } finally {
        setAiSettingsLoading(false)
      }
    }

    fetchAiSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const groupedIntegrations = useMemo(() => {
    const groups: Record<string, IntegrationState[]> = {}
    integrations.forEach((integration) => {
      if (!groups[integration.category]) {
        groups[integration.category] = []
      }
      groups[integration.category].push(integration)
    })
    return groups
  }, [integrations])

  const openIntegration = (integration: IntegrationState) => {
    setActiveIntegration(integration)
    setFormValues(
      integration.fields.reduce<FormValues>((acc, field) => {
        acc[field.key] = ''
        return acc
      }, {})
    )
    setDirtyFlags({})
  }

  const closeIntegration = () => {
    setActiveIntegration(null)
    setFormValues({})
    setDirtyFlags({})
  }

  const handleValueChange = (fieldKey: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [fieldKey]: value
    }))
    setDirtyFlags((prev) => ({
      ...prev,
      [fieldKey]: true
    }))
  }

  const handleSave = async () => {
    if (!activeIntegration) return

    const dirtyEntries = Object.entries(dirtyFlags).filter(([, dirty]) => dirty)
    if (dirtyEntries.length === 0) {
      closeIntegration()
      return
    }

    const fieldsPayload: FormValues = {}
    for (const [fieldKey] of dirtyEntries) {
      fieldsPayload[fieldKey] = formValues[fieldKey] ?? ''
    }

    try {
      setSaving(true)
      const response = await fetchWithAuth('/api/admin/integrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug: activeIntegration.slug,
          fields: fieldsPayload
        })
      })

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        throw new Error(errorData?.error || `Failed to save integration settings (${response.status})`)
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error('Invalid response from server')
      }

      if (!data.success) {
        throw new Error(data?.error || 'Failed to save integration settings.')
      }

      setIntegrations(data.integrations as IntegrationState[])
      showSuccess('Settings saved', `${activeIntegration.name} updated successfully.`)
      closeIntegration()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save integration settings.'
      showError('Save failed', message)
    } finally {
      setSaving(false)
    }
  }

  const renderStatusBadge = (status: string) => {
    const normalized = status.toLowerCase()
    const className = STATUS_COLORS[normalized] || STATUS_COLORS.pending
    let label = normalized.replace('_', ' ')
    if (normalized === 'action_required') {
      label = 'action required'
    }
    return (
      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
        {label}
      </span>
    )
  }

  const renderIcon = (icon: string) => {
    const IconComponent = ICON_MAP[icon] || Sparkles
    return <IconComponent className="h-5 w-5 text-white" />
  }

  const handleProspectingChange = (field: keyof ProspectingFormState, value: string) => {
    setProspectingFilters((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAiSettingsChange = (field: keyof AISettingsState, value: string) => {
    setAiSettings((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const saveAiSettings = async () => {
    try {
      setAiSettingsSaving(true)
      const response = await fetchWithAuth('/api/admin/ai-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tone: aiSettings.tone,
          greetingMessage: aiSettings.greetingMessage,
          confidenceThreshold: Number(aiSettings.confidenceThreshold),
          maxSilenceSeconds: Number(aiSettings.maxSilenceSeconds),
          escalationMessage: aiSettings.escalationMessage,
          additionalInstructions: aiSettings.additionalInstructions
        })
      })

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        throw new Error(errorData?.error || `Failed to save AI settings (${response.status})`)
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error('Invalid response from server')
      }

      if (!data.success) {
        throw new Error(data?.error || 'Failed to save AI settings')
      }

      showSuccess('AI settings saved', 'Updates will apply on the next agent refresh.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save AI settings'
      showError('Failed to save AI settings', message)
    } finally {
      setAiSettingsSaving(false)
    }
  }

  const buildFiltersPayload = () => {
    const toArray = (value: string) =>
      value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)

    const employeeMin = Number(prospectingFilters.employeeMin)
    const employeeMax = Number(prospectingFilters.employeeMax)

    return {
      industries: toArray(prospectingFilters.industries),
      titles: toArray(prospectingFilters.titles),
      locations: toArray(prospectingFilters.locations),
      keywords: toArray(prospectingFilters.keywords),
      employeeCount: {
        min: Number.isNaN(employeeMin) ? undefined : employeeMin,
        max: Number.isNaN(employeeMax) ? undefined : employeeMax
      }
    }
  }

  const saveProspectingFilters = async () => {
    try {
      setProspectingSaving(true)
      const response = await fetchWithAuth('/api/admin/prospecting/filters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filters: buildFiltersPayload() })
      })

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        throw new Error(errorData?.error || `Failed to save filters (${response.status})`)
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error('Invalid response from server')
      }

      showSuccess('Prospecting filters saved', 'Next sync will use the new criteria.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save prospecting filters'
      showError('Save failed', message)
    } finally {
      setProspectingSaving(false)
    }
  }

  const runProspectingSync = async () => {
    try {
      setProspectingSyncing(true)
      const response = await fetchWithAuth('/api/admin/prospecting/sync', {
        method: 'POST',
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
        throw new Error(errorData?.error || `Prospect sync failed (${response.status})`)
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error('Invalid response from server')
      }

      if (!data.success) {
        throw new Error(data?.error || 'Prospect sync failed')
      }

      showSuccess('Prospect sync complete', `Fetched ${data.stats.fetched} prospects.`)
      setProspectingLastSync({
        provider: 'apollo',
        status: 'success',
        fetched_count: data.stats.fetched,
        inserted_count: data.stats.inserted,
        skipped_count: data.stats.skipped,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        message: null
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Prospect sync failed'
      showError('Sync failed', message)
    } finally {
      setProspectingSyncing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-black to-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 space-y-10">
        <header className="max-w-4xl space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.4em] text-slate-300">
            Owner console
          </span>
          <div className="space-y-4">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-white leading-tight">
              Integration control center
            </h1>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
              Connect billing, telephony, AI, and monitoring providers without touching the terminal.
              Credential health is checked in real-time and encrypted before it ever hits the database.
            </p>
          </div>
        </header>

        <section className="rounded-xl border border-white/10 bg-black/40 p-4 md:p-6 shadow-2xl shadow-blue-900/20">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">AI prompt tuning</h2>
              <p className="mt-2 text-sm text-slate-300">
                Control tone, escalation, and the backup copy the agent uses when it needs a human teammate.
              </p>
            </div>
          </div>

          {aiSettingsLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-300">
                <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Agent tone</span>
                <div className="flex gap-2">
                  {(['professional', 'friendly', 'casual'] as const).map((toneOption) => (
                    <button
                      key={toneOption}
                      type="button"
                      onClick={() => handleAiSettingsChange('tone', toneOption)}
                      className={`flex-1 rounded-full px-4 py-2 text-xs font-semibold transition ${
                        aiSettings.tone === toneOption
                          ? 'border border-blue-400/40 bg-blue-500/20 text-blue-100'
                          : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {toneOption}
                    </button>
                  ))}
                </div>
              </label>

              <label className="space-y-2 text-sm text-slate-300">
                <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Confidence threshold</span>
                <input
                  type="number"
                  min={0.1}
                  max={0.99}
                  step={0.05}
                  value={aiSettings.confidenceThreshold}
                  onChange={(event) => handleAiSettingsChange('confidenceThreshold', event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                />
                <p className="text-xs text-slate-500">
                  Below this number, the agent gracefully hands off to a human teammate.
                </p>
              </label>

              <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
                <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Greeting message</span>
                <textarea
                  value={aiSettings.greetingMessage}
                  onChange={(event) => handleAiSettingsChange('greetingMessage', event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                />
              </label>

              <label className="space-y-2 text-sm text-slate-300">
                <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Max silence (seconds)</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={aiSettings.maxSilenceSeconds}
                  onChange={(event) => handleAiSettingsChange('maxSilenceSeconds', event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                />
                <p className="text-xs text-slate-500">
                  After this many seconds of silence, the agent will re-prompt or escalate.
                </p>
              </label>

              <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
                <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Escalation copy</span>
                <textarea
                  value={aiSettings.escalationMessage}
                  onChange={(event) => handleAiSettingsChange('escalationMessage', event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                />
                <p className="text-xs text-slate-500">
                  Script the phrase used when the agent transitions to a human teammate.
                </p>
              </label>

              <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
                <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Additional instructions</span>
                <textarea
                  value={aiSettings.additionalInstructions}
                  onChange={(event) => handleAiSettingsChange('additionalInstructions', event.target.value)}
                  rows={4}
                  placeholder="Add playbook notes, offers, or compliance guardrails that the agent must follow."
                  className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                />
              </label>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={saveAiSettings}
              disabled={aiSettingsSaving || aiSettingsLoading}
              className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/20 px-6 py-2 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {aiSettingsSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save AI settings
            </button>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-4">
          <article className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 via-white/0 to-white/10 p-4 md:p-6 shadow-2xl shadow-blue-900/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">Knowledge base</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Upload FAQs, policies, scripts, and localized offers. We compress these into the agent prompt so it
                  speaks with authority.
                </p>
              </div>
            </div>
            <div className="mt-6">
              <Link
                href="/admin/knowledge"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Manage knowledge entries
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </article>

          <article className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 via-white/0 to-white/10 p-4 md:p-6 shadow-2xl shadow-blue-900/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">Call QA reviews</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Score real calls, capture highlights, and push action items back into prompt tuning. Keep the AI
                  sounding human.
                </p>
              </div>
            </div>
            <div className="mt-6">
              <Link
                href="/admin/qa"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Open QA workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </article>

          <article className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 via-white/0 to-white/10 p-4 md:p-6 shadow-2xl shadow-blue-900/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">Customer success</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Monitor onboarding milestones, activation health, and proactive alerts. Export CS reports without
                  leaving the browser.
                </p>
              </div>
            </div>
            <div className="mt-6">
              <Link
                href="/admin/customer-success"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Open success cockpit
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </article>

          <article className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 via-white/0 to-white/10 p-4 md:p-6 shadow-2xl shadow-blue-900/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">Usage analytics</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Review voice, outreach, and revenue telemetry with churn-risk scoring and exportable KPI snapshots.
                </p>
              </div>
            </div>
            <div className="mt-6">
              <Link
                href="/admin/analytics/usage"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Launch analytics
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </article>
        </section>

        <section className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 via-white/0 to-white/10 p-4 md:p-6 shadow-2xl shadow-blue-900/20">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Prospecting filters</h2>
              <p className="mt-2 text-sm text-slate-300">
                Define who we pull from Apollo (fallback Clearbit). Nightly sync will use these criteria.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={runProspectingSync}
                disabled={prospectingSyncing || prospectingFiltersLoading}
                className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/20 px-5 py-2 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {prospectingSyncing && <Loader2 className="h-4 w-4 animate-spin" />}
                Run sync now
              </button>
              <button
                type="button"
                onClick={saveProspectingFilters}
                disabled={prospectingSaving || prospectingFiltersLoading}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {prospectingSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save filters
              </button>
            </div>
          </div>

          {prospectingFiltersLoading ? (
            <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="h-28 animate-pulse rounded-xl border border-white/10 bg-white/5" />
              ))}
            </div>
          ) : (
            <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-200">Industries</label>
                <input
                  type="text"
                  value={prospectingFilters.industries}
                  onChange={(event) => handleProspectingChange('industries', event.target.value)}
                  placeholder="e.g. HVAC, Roofing, Painting"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                />
                <p className="text-xs text-slate-400">Comma separated industries to target.</p>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-200">Job titles</label>
                <input
                  type="text"
                  value={prospectingFilters.titles}
                  onChange={(event) => handleProspectingChange('titles', event.target.value)}
                  placeholder="Owner, CEO, Founder"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                />
                <p className="text-xs text-slate-400">We only import prospects with these titles.</p>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-200">Locations</label>
                <input
                  type="text"
                  value={prospectingFilters.locations}
                  onChange={(event) => handleProspectingChange('locations', event.target.value)}
                  placeholder="Austin, TX; Phoenix, AZ"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                />
                <p className="text-xs text-slate-400">City/state names; leave blank for nationwide.</p>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-200">Keywords</label>
                <input
                  type="text"
                  value={prospectingFilters.keywords}
                  onChange={(event) => handleProspectingChange('keywords', event.target.value)}
                  placeholder="Residential painting, commercial HVAC"
                  className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                />
                <p className="text-xs text-slate-400">Optional keywords to tighten the search.</p>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-200">Employee count</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    min={0}
                    value={prospectingFilters.employeeMin}
                    onChange={(event) => handleProspectingChange('employeeMin', event.target.value)}
                    placeholder="Min"
                    className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                  />
                  <input
                    type="number"
                    min={0}
                    value={prospectingFilters.employeeMax}
                    onChange={(event) => handleProspectingChange('employeeMax', event.target.value)}
                    placeholder="Max"
                    className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                  />
                </div>
                <p className="text-xs text-slate-400">Use this to focus on mid-market operators.</p>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-200">Last sync</label>
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-slate-300">
                  {prospectingLastSync ? (
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt>Status</dt>
                        <dd className="capitalize">{prospectingLastSync.status}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Fetched</dt>
                        <dd>{prospectingLastSync.fetched_count}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Inserted</dt>
                        <dd>{prospectingLastSync.inserted_count}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Skipped</dt>
                        <dd>{prospectingLastSync.skipped_count}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Completed</dt>
                        <dd>
                          {prospectingLastSync.completed_at
                            ? new Date(prospectingLastSync.completed_at).toLocaleString()
                            : 'In progress'}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p>No syncs yet. Save filters and run the first sync.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, idx) => (
              <div
                key={idx}
                className="h-44 animate-pulse rounded-xl border border-white/10 bg-white/5"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 md:p-6 text-center text-rose-100">
            {error}
          </div>
        ) : (
          Object.entries(groupedIntegrations).map(([category, items]) => (
            <section key={category} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-200">
                  {CATEGORY_LABELS[category] ?? category}
                </h2>
                <span className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  {items.length} integration{items.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {items.map((integration) => (
                  <article
                    key={integration.slug}
                    className="group relative flex h-full flex-col justify-between rounded-xl border border-white/10 bg-gradient-to-br from-white/5 via-white/0 to-white/10 p-4 md:p-6 shadow-2xl shadow-blue-900/10 transition hover:-translate-y-1 hover:border-white/20 hover:shadow-blue-900/30"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-white/10 p-3 shadow-inner shadow-black/40">
                          {renderIcon(integration.icon)}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">{integration.name}</h3>
                          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-500">
                            {CATEGORY_LABELS[integration.category] ?? integration.category}
                          </p>
                        </div>
                      </div>
                      {renderStatusBadge(integration.status)}
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-slate-300">
                      {integration.description}
                    </p>
                    <div className="mt-6 flex items-center justify-between">
                      <div className="text-xs text-slate-500">
                        {integration.lastVerifiedAt ? (
                          <span>
                            Last verified{' '}
                            {new Date(integration.lastVerifiedAt).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </span>
                        ) : (
                          <span>Not yet verified</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => openIntegration(integration)}
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
                      >
                        Manage
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      <Modal
        open={Boolean(activeIntegration)}
        onClose={closeIntegration}
        title={activeIntegration?.name}
        description={activeIntegration?.description}
        size="lg"
      >
        {activeIntegration && (
          <div className="space-y-8">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              <p>
                Secrets are encrypted with AES-256-GCM before being stored. You&apos;ll need to
                re-enter values to rotate them—existing keys are never revealed.
              </p>
              {activeIntegration.docsUrl && (
                <a
                  href={activeIntegration.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center text-xs font-semibold text-blue-300 hover:text-blue-200"
                >
                  View provider documentation →
                </a>
              )}
            </div>

            <div className="space-y-6">
              {activeIntegration.fields.map((field) => (
                <div key={field.key} className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white">{field.label}</h4>
                        {field.optional && (
                          <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-slate-400">
                            Optional
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-xs ${
                          field.error ? 'text-rose-300' : 'text-slate-400'
                        } leading-relaxed`}
                      >
                        {field.error || field.description}
                      </p>
                    </div>
                    {renderStatusBadge(field.status)}
                  </div>

                  <div className="space-y-2">
                    <input
                      type={field.inputType === 'secret' ? 'password' : 'text'}
                      placeholder={field.optional ? 'Leave blank to remove' : 'Enter new value'}
                      value={formValues[field.key] ?? ''}
                      onChange={(event) => handleValueChange(field.key, event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                    />
                    <p className="text-xs text-slate-400">
                      {field.status === 'connected' && !dirtyFlags[field.key]
                        ? 'Connected — enter a new value to rotate.'
                        : 'Value will be encrypted and stored securely.'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeIntegration}
                className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/20 px-6 py-2 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save changes
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}


