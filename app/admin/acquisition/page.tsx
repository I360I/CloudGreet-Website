'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowRight,
  BarChart3,
  FilePlus2,
  Flame,
  Loader2,
  Mail,
  Pause,
  Phone,
  Play,
  Plus,
  RefreshCw,
  Trash2
} from 'lucide-react'
import { useToast } from '@/app/contexts/ToastContext'
import { Modal } from '@/app/components/ui/Modal'
import { ConfirmationModal } from '@/app/components/ui/ConfirmationModal'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

type SequenceStep = {
  id?: string
  stepOrder: number
  channel: 'email' | 'sms' | 'call'
  waitMinutes: number
  templateId?: string
}

type Sequence = {
  id: string
  name: string
  description?: string | null
  throttlePerDay: number
  sendWindowStart?: string | null
  sendWindowEnd?: string | null
  timezone: string
  status: 'draft' | 'active' | 'paused'
  autoPauseOnReply: boolean
  steps: SequenceStep[]
  metrics: {
    sent?: number
    delivered?: number
    replied?: number
    failed?: number
  }
}

type Template = {
  id: string
  name: string
  channel: 'email' | 'sms'
  subject?: string | null
  body: string
  complianceFooter: string
  isActive: boolean
  isDefault: boolean
}

type OutreachStats = {
  totalSent: number
  delivered: number
  replies: number
  failed: number
  replyRate: number
  deliveryRate: number
  byChannel: Array<{
    channel: string
    sent: number
    delivered: number
    replies: number
    failed: number
    replyRate: number
  }>
}

const CHANNEL_OPTIONS: Array<{ label: string; value: SequenceStep['channel']; icon: React.ComponentType<{ className?: string }> }> = [
  { label: 'Email', value: 'email', icon: Mail },
  { label: 'SMS', value: 'sms', icon: Flame },
  { label: 'Call', value: 'call', icon: Phone }
]

const tabs: Array<{ key: 'sequences' | 'templates' | 'analytics'; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'sequences', label: 'Sequences', icon: Play },
  { key: 'templates', label: 'Templates', icon: FilePlus2 },
  { key: 'analytics', label: 'Performance', icon: BarChart3 }
]

const defaultCompliance = 'Reply STOP to opt out; HELP for help.'

const defaultSteps: SequenceStep[] = [
  { stepOrder: 1, channel: 'email', waitMinutes: 0 },
  { stepOrder: 2, channel: 'sms', waitMinutes: 1440 },
  { stepOrder: 3, channel: 'call', waitMinutes: 2880 }
]

export default function AcquisitionDesk() {
  const { showError, showSuccess } = useToast()
  const [activeTab, setActiveTab] = useState<'sequences' | 'templates' | 'analytics'>('sequences')
  const [loading, setLoading] = useState(true)
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [stats, setStats] = useState<OutreachStats | null>(null)
  const [statsRange, setStatsRange] = useState<'7d' | '30d' | '90d'>('7d')

  const [sequenceModalOpen, setSequenceModalOpen] = useState(false)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [savingSequence, setSavingSequence] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ open: boolean; sequenceId: string | null }>({ open: false, sequenceId: null })

  const [sequenceForm, setSequenceForm] = useState({
    name: '',
    description: '',
    throttlePerDay: 100,
    sendWindowStart: '09:00',
    sendWindowEnd: '17:00',
    timezone: 'America/New_York',
    status: 'draft' as Sequence['status'],
    autoPauseOnReply: true,
    steps: defaultSteps
  })

  const [templateForm, setTemplateForm] = useState({
    name: '',
    channel: 'email' as Template['channel'],
    subject: '',
    body: 'Hi {{first_name}},\n\n',
    complianceFooter: defaultCompliance,
    isActive: true,
    isDefault: false
  })

  const fetchSequences = async () => {
    const response = await fetchWithAuth('/api/admin/outreach/sequences')
    
    if (!response.ok) {
      let errorData
      try {
        errorData = await response.json()
      } catch {
        errorData = {}
      }
      throw new Error(errorData?.error || `Failed to load sequences (${response.status})`)
    }

    let data
    try {
      data = await response.json()
    } catch (jsonError) {
      throw new Error('Invalid response from server')
    }
    setSequences(data.sequences as Sequence[])
  }

  const fetchTemplates = async () => {
    const response = await fetchWithAuth('/api/admin/outreach/templates')
    
    if (!response.ok) {
      let errorData
      try {
        errorData = await response.json()
      } catch {
        errorData = {}
      }
      throw new Error(errorData?.error || `Failed to load templates (${response.status})`)
    }

    let data
    try {
      data = await response.json()
    } catch (jsonError) {
      throw new Error('Invalid response from server')
    }
    setTemplates(data.templates as Template[])
  }

  const fetchStats = async (range = statsRange) => {
    const response = await fetch(`/api/admin/outreach/stats?range=${range}`, {
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
      throw new Error(errorData?.error || `Failed to load performance metrics (${response.status})`)
    }

    let data
    try {
      data = await response.json()
    } catch (jsonError) {
      throw new Error('Invalid response from server')
    }
    setStats(data.stats as OutreachStats)
  }

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        await Promise.all([fetchSequences(), fetchTemplates(), fetchStats()])
      } catch (error) {
        showError('Failed to load acquisition desk', error instanceof Error ? error.message : 'Unable to load data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [showError])

  const orderedTemplates = useMemo(() => {
    return templates.filter((template) => template.isActive).sort((a, b) => a.name.localeCompare(b.name))
  }, [templates])

  const resetSequenceForm = () => {
    setSequenceForm({
      name: '',
      description: '',
      throttlePerDay: 100,
      sendWindowStart: '09:00',
      sendWindowEnd: '17:00',
      timezone: 'America/New_York',
      status: 'draft',
      autoPauseOnReply: true,
      steps: defaultSteps
    })
  }

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      channel: 'email',
      subject: '',
      body: 'Hi {{first_name}},\n\n',
      complianceFooter: defaultCompliance,
      isActive: true,
      isDefault: false
    })
  }

  const handleCreateSequence = async () => {
    if (!sequenceForm.name.trim()) {
      showError('Name is required', 'Sequence needs a descriptive title.')
      return
    }
    if (sequenceForm.steps.some((step) => (step.channel === 'email' || step.channel === 'sms') && !step.templateId)) {
      showError('Template required', 'Email and SMS steps must reference a template.')
      return
    }
    try {
      setSavingSequence(true)
      const response = await fetchWithAuth('/api/admin/outreach/sequences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: sequenceForm.name,
          description: sequenceForm.description,
          throttlePerDay: Number(sequenceForm.throttlePerDay),
          sendWindowStart: sequenceForm.sendWindowStart,
          sendWindowEnd: sequenceForm.sendWindowEnd,
          timezone: sequenceForm.timezone,
          status: sequenceForm.status,
          autoPauseOnReply: sequenceForm.autoPauseOnReply,
          steps: sequenceForm.steps.map((step, index) => ({
            stepOrder: index + 1,
            channel: step.channel,
            waitMinutes: Number(step.waitMinutes),
            templateId: step.templateId
          }))
        })
      })
      
      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        throw new Error(errorData?.error || `Failed to create sequence (${response.status})`)
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error('Invalid response from server')
      }
      showSuccess('Sequence created', 'New outreach sequence saved.')
      await fetchSequences()
      setSequenceModalOpen(false)
      resetSequenceForm()
    } catch (error) {
      showError('Failed to create sequence', error instanceof Error ? error.message : 'Unexpected error')
    } finally {
      setSavingSequence(false)
    }
  }

  const handleCreateTemplate = async () => {
    if (!templateForm.name.trim()) {
      showError('Template needs a name', 'Please provide a label you will recognize.')
      return
    }
    if (!templateForm.body.trim()) {
      showError('Body can’t be empty', 'Write the message to send clients.')
      return
    }
    if (templateForm.channel === 'email' && !templateForm.subject.trim()) {
      showError('Subject required', 'Email templates require a subject line.')
      return
    }

    try {
      setSavingTemplate(true)
      const response = await fetchWithAuth('/api/admin/outreach/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateForm)
      })
      
      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        throw new Error(errorData?.error || `Failed to create template (${response.status})`)
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error('Invalid response from server')
      }
      showSuccess('Template saved', 'Template is now available to use.')
      await fetchTemplates()
      setTemplateModalOpen(false)
      resetTemplateForm()
    } catch (error) {
      showError('Failed to create template', error instanceof Error ? error.message : 'Unexpected error')
    } finally {
      setSavingTemplate(false)
    }
  }

  const handleSequenceStatus = async (sequence: Sequence, status: Sequence['status']) => {
    try {
      const response = await fetch(`/api/admin/outreach/sequences/${sequence.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status })
      })
      
      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        throw new Error(errorData?.error || `Failed to update status (${response.status})`)
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error('Invalid response from server')
      }
      showSuccess('Sequence updated', `Status set to ${status}.`)
      await fetchSequences()
    } catch (error) {
      showError('Failed to update sequence', error instanceof Error ? error.message : 'Unexpected error')
    }
  }

  const handleDeleteSequence = async (sequenceId: string) => {
    setDeleteConfirmModal({ open: true, sequenceId })
  }

  const confirmDeleteSequence = async () => {
    if (!deleteConfirmModal.sequenceId) return
    try {
      const response = await fetch(`/api/admin/outreach/sequences/${deleteConfirmModal.sequenceId}`, {
        method: 'DELETE',
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
        throw new Error(errorData?.error || `Failed to delete sequence (${response.status})`)
      }
      showSuccess('Sequence deleted', 'All scheduled outreach has been cancelled.')
      setDeleteConfirmModal({ open: false, sequenceId: null })
      await fetchSequences()
    } catch (error) {
      showError('Failed to delete sequence', error instanceof Error ? error.message : 'Unexpected error')
      setDeleteConfirmModal({ open: false, sequenceId: null })
    }
  }

  const handleRefreshStats = async (range: typeof statsRange) => {
    try {
      setStatsRange(range)
      await fetchStats(range)
    } catch (error) {
      showError('Failed to refresh metrics', error instanceof Error ? error.message : 'Unexpected error')
    }
  }

  const addStep = () => {
    setSequenceForm((prev) => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          stepOrder: prev.steps.length + 1,
          channel: 'email',
          waitMinutes: 1440
        }
      ]
    }))
  }

  const updateStep = (index: number, partial: Partial<SequenceStep>) => {
    setSequenceForm((prev) => {
      const steps = prev.steps.map((step, idx) =>
        idx === index
          ? {
              ...step,
              ...partial,
              stepOrder: idx + 1
            }
          : step
      )
      return { ...prev, steps }
    })
  }

  const removeStep = (index: number) => {
    setSequenceForm((prev) => {
      if (prev.steps.length <= 1) return prev
      const steps = prev.steps.filter((_, idx) => idx !== index).map((step, idx) => ({
        ...step,
        stepOrder: idx + 1
      }))
      return { ...prev, steps }
    })
  }

  const SequenceCards = () => (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Live sequences</h2>
          <p className="text-sm text-slate-400">
            Automate outreach across email, SMS, and calls with TCPA-safe throttling and dayparting.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSequenceModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/20 px-5 py-2 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/30"
        >
          <Plus className="h-4 w-4" />
          New sequence
        </button>
      </div>

      {sequences.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-slate-300">
          No outreach sequences yet. Create your first cadence to start booking meetings automatically.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {sequences.map((sequence) => (
            <article
              key={sequence.id}
              className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-white/0 to-white/10 p-6 shadow-2xl shadow-blue-900/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">{sequence.name}</h3>
                  <p className="text-sm text-slate-400">{sequence.description || 'No description provided.'}</p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    sequence.status === 'active'
                      ? 'border border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                      : sequence.status === 'paused'
                        ? 'border border-amber-400/40 bg-amber-500/10 text-amber-200'
                        : 'border border-slate-400/40 bg-slate-500/10 text-slate-200'
                  }`}
                >
                  {sequence.status}
                </span>
              </div>

              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-300" />
                  <span>
                    {sequence.steps.length} steps • throttle {sequence.throttlePerDay}/day • {sequence.timezone}
                  </span>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <ul className="space-y-2 text-xs text-slate-300">
                    {sequence.steps.map((step) => {
                      const channelLabel = CHANNEL_OPTIONS.find((option) => option.value === step.channel)?.label
                      return (
                        <li key={`${sequence.id}-${step.stepOrder}`} className="flex items-center gap-2">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-white">
                            {step.stepOrder}
                          </span>
                          <span className="font-semibold text-white">{channelLabel}</span>
                          {step.templateId && (
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs uppercase tracking-widest text-slate-400">
                              uses template
                            </span>
                          )}
                          <ArrowRight className="h-3 w-3 text-slate-600" />
                          <span className="text-slate-400">{step.waitMinutes} min delay</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-slate-400">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  <p className="text-slate-500">Sent</p>
                  <p className="text-lg font-semibold text-white">{sequence.metrics.sent ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  <p className="text-slate-500">Replies</p>
                  <p className="text-lg font-semibold text-white">{sequence.metrics.replied ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  <p className="text-slate-500">Delivered</p>
                  <p className="text-lg font-semibold text-white">{sequence.metrics.delivered ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  <p className="text-slate-500">Failed</p>
                  <p className="text-lg font-semibold text-white">{sequence.metrics.failed ?? 0}</p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="flex gap-2">
                  {sequence.status !== 'active' ? (
                    <button
                      type="button"
                      onClick={() => handleSequenceStatus(sequence, 'active')}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/30"
                    >
                      <Play className="h-3 w-3" />
                      Activate
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSequenceStatus(sequence, 'paused')}
                      className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/20 px-4 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-500/30"
                    >
                      <Pause className="h-3 w-3" />
                      Pause
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteSequence(sequence.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-100 hover:bg-rose-500/20"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                </div>
                <span className="text-xs text-slate-500">
                  Sends {sequence.sendWindowStart ?? '00:00'} – {sequence.sendWindowEnd ?? '23:59'} {sequence.timezone}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )

  const TemplatesPane = () => (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Templates</h2>
          <p className="text-sm text-slate-400">
            Manage compliant, branded messaging for each outreach channel. Variables supported: {'{'}{'{'}first_name{'}'}{' '}
            {'{'}{'{'}company{'}'}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTemplateModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/20 px-5 py-2 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/30"
        >
          <Plus className="h-4 w-4" />
          New template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-slate-300">
          No templates yet. Create an email or SMS template to reuse in your sequences.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <div key={template.id} className="rounded-3xl border border-white/10 bg-black/40 p-5 text-sm text-slate-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-white">{template.name}</p>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{template.channel}</p>
                </div>
                {template.isDefault && (
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-widest text-slate-300">
                    Default
                  </span>
                )}
              </div>
              {template.channel === 'email' && (
                <p className="mt-3 text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">Subject:</span> {template.subject || '—'}
                </p>
              )}
              <pre className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/60 p-4 text-xs text-slate-300">
                {template.body}
                {'\n\n'}
                {template.complianceFooter}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const AnalyticsPane = () => (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Campaign performance</h2>
          <p className="text-sm text-slate-400">
            Track delivery, replies, and failures in real-time. Data refreshes every run of the outreach worker.
          </p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => handleRefreshStats(range)}
              className={`rounded-full px-4 py-2 text-xs font-semibold ${
                statsRange === range
                  ? 'border border-blue-400/40 bg-blue-500/30 text-blue-100'
                  : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              Last {range}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleRefreshStats(statsRange)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>
      </div>

      {!stats ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-slate-300">
          Metrics loading...
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/10 via-transparent to-emerald-500/5 p-5 text-white">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">Sent</p>
              <p className="mt-2 text-3xl font-semibold">{stats.totalSent}</p>
              <p className="mt-1 text-xs text-emerald-200">Across all channels</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/10 via-transparent to-blue-500/5 p-5 text-white">
              <p className="text-xs uppercase tracking-[0.3em] text-blue-200">Delivered</p>
              <p className="mt-2 text-3xl font-semibold">{stats.delivered}</p>
              <p className="mt-1 text-xs text-blue-200">Delivery rate {stats.deliveryRate}%</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-amber-500/10 via-transparent to-amber-500/5 p-5 text-white">
              <p className="text-xs uppercase tracking-[0.3em] text-amber-200">Replies</p>
              <p className="mt-2 text-3xl font-semibold">{stats.replies}</p>
              <p className="mt-1 text-xs text-amber-200">Reply rate {stats.replyRate}%</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-rose-500/10 via-transparent to-rose-500/5 p-5 text-white">
              <p className="text-xs uppercase tracking-[0.3em] text-rose-200">Failures</p>
              <p className="mt-2 text-3xl font-semibold">{stats.failed}</p>
              <p className="mt-1 text-xs text-rose-200">Monitor & retry</p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/30 p-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Channel breakdown</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {stats.byChannel.length === 0 ? (
                <p className="text-sm text-slate-400">No recent outreach activity.</p>
              ) : (
                stats.byChannel.map((channel) => (
                  <div key={channel.channel} className="rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-slate-300">
                    <p className="text-sm font-semibold text-white">{channel.channel.toUpperCase()}</p>
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between">
                        <span>Sent</span>
                        <span className="text-white">{channel.sent}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Delivered</span>
                        <span className="text-white">{channel.delivered}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Replies</span>
                        <span className="text-white">{channel.replies}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Failures</span>
                        <span className="text-white">{channel.failed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Reply rate</span>
                        <span className="text-white">{channel.replyRate}%</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-black to-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8">
        <header className="space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.4em] text-slate-300">
            Growth engine
          </span>
          <div className="max-w-4xl space-y-3">
            <h1 className="text-3xl font-semibold sm:text-4xl">Client acquisition cockpit</h1>
            <p className="text-base text-slate-300 sm:text-lg">
              Sync prospects nightly, orchestrate multi-channel cadences, and track the revenue impact—all built into CloudGreet so you never touch a CLI.
            </p>
          </div>
        </header>

        <div className="mt-10 flex flex-wrap gap-3">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.key
                    ? 'border border-blue-400/40 bg-blue-500/20 text-blue-100'
                    : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        <section className="mt-10">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <>
              {activeTab === 'sequences' && <SequenceCards />}
              {activeTab === 'templates' && <TemplatesPane />}
              {activeTab === 'analytics' && <AnalyticsPane />}
            </>
          )}
        </section>
      </div>

      <Modal
        open={sequenceModalOpen}
        onClose={() => setSequenceModalOpen(false)}
        size="xl"
        title="Create outreach sequence"
        description="Build a compliant multi-touch cadence. We’ll throttle volume and respect quiet hours automatically."
      >
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-300">
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Name</span>
              <input
                type="text"
                value={sequenceForm.name}
                onChange={(event) => setSequenceForm((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                placeholder="Outbound - Painting Owners"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-300">
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Throttle per day</span>
              <input
                type="number"
                min={1}
                max={1000}
                value={sequenceForm.throttlePerDay}
                onChange={(event) => setSequenceForm((prev) => ({ ...prev, throttlePerDay: Number(event.target.value) }))}
                className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
              />
            </label>
          </div>

          <label className="space-y-2 text-sm text-slate-300">
            <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Description</span>
            <textarea
              value={sequenceForm.description}
              onChange={(event) => setSequenceForm((prev) => ({ ...prev, description: event.target.value }))}
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
              placeholder="Used for Apollo HVAC owners in Texas."
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-2 text-sm text-slate-300">
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Send window start</span>
              <input
                type="time"
                value={sequenceForm.sendWindowStart ?? ''}
                onChange={(event) => setSequenceForm((prev) => ({ ...prev, sendWindowStart: event.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-300">
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Send window end</span>
              <input
                type="time"
                value={sequenceForm.sendWindowEnd ?? ''}
                onChange={(event) => setSequenceForm((prev) => ({ ...prev, sendWindowEnd: event.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-300">
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Timezone</span>
              <input
                type="text"
                value={sequenceForm.timezone}
                onChange={(event) => setSequenceForm((prev) => ({ ...prev, timezone: event.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                placeholder="America/New_York"
              />
            </label>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">Steps</h4>
              <button
                type="button"
                onClick={addStep}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
              >
                <Plus className="h-3 w-3" />
                Add step
              </button>
            </div>

            <div className="space-y-3">
              {sequenceForm.steps.map((step, index) => {
                const ChannelIcon = CHANNEL_OPTIONS.find((option) => option.value === step.channel)?.icon ?? Mail
                return (
                  <div key={index} className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-slate-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-white">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[11px] font-semibold">
                          {index + 1}
                        </span>
                        <ChannelIcon className="h-4 w-4" />
                        <select
                          value={step.channel}
                          onChange={(event) => updateStep(index, { channel: event.target.value as SequenceStep['channel'] })}
                          className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white"
                        >
                          {CHANNEL_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {sequenceForm.steps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStep(index)}
                          className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    {(step.channel === 'email' || step.channel === 'sms') && (
                      <div className="mt-3">
                        <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Template</label>
                        <select
                          value={step.templateId ?? ''}
                          onChange={(event) => updateStep(index, { templateId: event.target.value || undefined })}
                          className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                        >
                          <option value="">Select template</option>
                          {orderedTemplates
                            .filter((template) => template.channel === step.channel)
                            .map((template) => (
                              <option key={template.id} value={template.id}>
                                {template.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="space-y-1 text-xs text-slate-400">
                        <span className="uppercase tracking-[0.3em]">Delay (minutes)</span>
                        <input
                          type="number"
                          min={0}
                          value={step.waitMinutes}
                          onChange={(event) =>
                            updateStep(index, { waitMinutes: Number(event.target.value) })
                          }
                          className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                        />
                      </label>
                      <label className="space-y-1 text-xs text-slate-400">
                        <span className="uppercase tracking-[0.3em]">Fallback channel</span>
                        <select
                          value={step.channel === 'call' ? step.templateId ?? '' : step.templateId ?? ''}
                          disabled
                          className="w-full cursor-not-allowed rounded-xl border border-white/10 bg-slate-900/40 px-4 py-3 text-sm text-slate-500"
                        >
                          <option>- Coming soon</option>
                        </select>
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setSequenceModalOpen(false)
                resetSequenceForm()
              }}
              className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateSequence}
              disabled={savingSequence}
              className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/20 px-6 py-2 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingSequence && <Loader2 className="h-4 w-4 animate-spin" />}
              Save sequence
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        size="lg"
        title="Create messaging template"
        description="Templates are reusable snippets for email and SMS steps. We automatically append compliance language."
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-300">
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Name</span>
              <input
                type="text"
                value={templateForm.name}
                onChange={(event) => setTemplateForm((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-300">
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Channel</span>
              <select
                value={templateForm.channel}
                onChange={(event) =>
                  setTemplateForm((prev) => ({
                    ...prev,
                    channel: event.target.value as Template['channel'],
                    subject: event.target.value === 'sms' ? '' : prev.subject
                  }))
                }
                className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </label>
          </div>

          {templateForm.channel === 'email' && (
            <label className="space-y-2 text-sm text-slate-300">
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Subject line</span>
              <input
                type="text"
                value={templateForm.subject ?? ''}
                onChange={(event) => setTemplateForm((prev) => ({ ...prev, subject: event.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
              />
            </label>
          )}

          <label className="space-y-2 text-sm text-slate-300">
            <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Body</span>
            <textarea
              value={templateForm.body}
              onChange={(event) => setTemplateForm((prev) => ({ ...prev, body: event.target.value }))}
              rows={8}
              className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-300">
            <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Compliance footer</span>
            <textarea
              value={templateForm.complianceFooter}
              onChange={(event) => setTemplateForm((prev) => ({ ...prev, complianceFooter: event.target.value }))}
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
            />
          </label>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setTemplateModalOpen(false)
                resetTemplateForm()
              }}
              className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateTemplate}
              disabled={savingTemplate}
              className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/20 px-6 py-2 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingTemplate && <Loader2 className="h-4 w-4 animate-spin" />}
              Save template
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        open={deleteConfirmModal.open}
        onClose={() => setDeleteConfirmModal({ open: false, sequenceId: null })}
        onConfirm={confirmDeleteSequence}
        title="Delete Sequence"
        message="Delete this sequence? All scheduled outreach will be cancelled."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  )
}


