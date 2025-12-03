'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Sparkles,
  Target,
  Users
} from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { useToast } from '@/app/contexts/ToastContext'

type LeadSummary = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  company_name: string | null
  status: string
  score: number | null
  tags: string[] | null
  last_outreach_at: string | null
  next_touch_at: string | null
  sequence_status: string | null
  updated_at: string | null
}

type LeadStats = {
  total: number
  statusCounts: Record<string, number>
  upcomingFollowUps: number
  overdueFollowUps: number
}

type SalesTask = {
  id: string
  task_type: string
  status: 'pending' | 'completed' | 'overdue'
  priority: 'low' | 'normal' | 'high'
  due_at: string
  completed_at: string | null
  prospect_id: string
  notes: string | null
}

type SalesActivity = {
  id: string
  activity_type: string
  direction: string | null
  outcome: string | null
  notes: string | null
  logged_at: string
  follow_up_at: string | null
  user_id: string
}

type OutreachEvent = {
  id: string
  channel: string
  status: string
  created_at: string
  metadata: Record<string, unknown> | null
}

type LeadDetail = LeadSummary & {
  industry: string | null
  job_title: string | null
  city: string | null
  state: string | null
  country: string | null
  assigned_to: string | null
  last_contacted_at: string | null
  outreach_events: OutreachEvent[]
  activities: SalesActivity[]
  tasks: SalesTask[]
}

type CommissionSummary = {
  totalPending: number
  totalApproved: number
  totalPaid: number
  leaderboard: Array<{
    rep_id: string
    amount: number
    pending: number
    paid: number
  }>
  recent: Array<{
    id: string
    rep_id: string
    amount: number
    status: string
    recorded_at: string
  }>
}

const statusFilters = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'in_progress', label: 'Working' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'customer', label: 'Won' }
]

const activityTypes: Array<{ value: SalesActivity['activity_type']; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: 'call', label: 'Call', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'sms', label: 'SMS', icon: MessageSquare },
  { value: 'meeting', label: 'Meeting', icon: CalendarDays },
  { value: 'note', label: 'Note', icon: Activity }
]

const formatDate = (value: string | null) => {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

const formatTimeAgo = (date: string | null) => {
  if (!date) return 'Never'
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const statusBadgeColors: Record<string, string> = {
  new: 'bg-blue-500/20 border border-blue-400/40 text-blue-100',
  in_progress: 'bg-amber-500/20 border border-amber-400/40 text-amber-100',
  qualified: 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-100',
  customer: 'bg-purple-500/20 border border-purple-400/40 text-purple-100',
  lost: 'bg-rose-500/20 border border-rose-400/40 text-rose-100'
}

type ActivityFormState = {
  activityType: SalesActivity['activity_type']
  direction: 'outbound' | 'inbound'
  outcome: string
  notes: string
  followUpAt: string
  updateStatus: string
  commissionAmount: string
}

const defaultActivityForm: ActivityFormState = {
  activityType: 'call',
  direction: 'outbound',
  outcome: '',
  notes: '',
  followUpAt: '',
  updateStatus: '',
  commissionAmount: ''
}

export default function EmployeeDashboardPage() {
  const { showError, showSuccess } = useToast()
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<LeadSummary[]>([])
  const [stats, setStats] = useState<LeadStats | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [leadDetail, setLeadDetail] = useState<LeadDetail | null>(null)
  const [tasks, setTasks] = useState<SalesTask[]>([])
  const [commissions, setCommissions] = useState<CommissionSummary | null>(null)
  const [activityForm, setActivityForm] = useState<ActivityFormState>(defaultActivityForm)
  const [loggingActivity, setLoggingActivity] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [activeScope, setActiveScope] = useState<'self' | 'team'>('self')

  const authHeaders = useMemo(() => {
    // Token is automatically included via fetchWithAuth
    // No need to manually add headers - fetchWithAuth handles it
    return {}
  }, [])

  const fetchLeads = useCallback(
    async (statusFilter: string, scope: 'self' | 'team') => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }
      if (scope === 'team') {
        params.set('scope', 'team')
      }
      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim())
      }

      const response = await fetchWithAuth(`/api/employee/leads?${params.toString()}`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load leads')
      }
      setLeads(data.leads ?? [])
      setStats(data.stats ?? null)
      if (data.leads?.length && !selectedLeadId) {
        setSelectedLeadId(data.leads[0].id)
      }
    },
    [authHeaders, searchTerm, selectedLeadId]
  )

  const fetchLeadDetail = useCallback(
    async (leadId: string) => {
      setLoadingDetail(true)
      try {
        const response = await fetchWithAuth(`/api/employee/leads/${leadId}`)
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load lead')
        }
        setLeadDetail(data.lead)
      } catch (error) {
        showError('Unable to load lead', error instanceof Error ? error.message : 'Unknown error')
      } finally {
        setLoadingDetail(false)
      }
    },
    [authHeaders, showError]
  )

  const fetchTasks = useCallback(
    async (scope: 'self' | 'team') => {
      const params = new URLSearchParams()
      if (scope === 'team') {
        params.set('scope', 'team')
      }
      params.set('limit', '20')

      const response = await fetchWithAuth(`/api/employee/tasks?${params.toString()}`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load tasks')
      }
      setTasks(data.tasks ?? [])
    },
    [authHeaders]
  )

  const fetchCommissions = useCallback(
    async (scope: 'self' | 'team') => {
      const params = new URLSearchParams()
      if (scope === 'team') {
        params.set('scope', 'team')
      }
      params.set('period', '90d')

      const response = await fetchWithAuth(`/api/employee/commissions?${params.toString()}`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load commissions')
      }
      setCommissions(data.summary ?? null)
    },
    [authHeaders]
  )

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        await Promise.all([
          fetchLeads(selectedStatus, activeScope),
          fetchTasks(activeScope),
          fetchCommissions(activeScope)
        ])
      } catch (error) {
        showError('Failed to load sales workspace', error instanceof Error ? error.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [activeScope, fetchCommissions, fetchLeads, fetchTasks, selectedStatus, showError])

  useEffect(() => {
    if (selectedLeadId) {
      fetchLeadDetail(selectedLeadId)
    } else if (leads.length > 0) {
      setSelectedLeadId(leads[0].id)
    } else {
      setLeadDetail(null)
    }
  }, [fetchLeadDetail, leads, selectedLeadId])

  const handleSelectLead = async (leadId: string) => {
    setSelectedLeadId(leadId)
    await fetchLeadDetail(leadId)
  }

  const handleStatusFilter = async (status: string) => {
    setSelectedStatus(status)
    await fetchLeads(status, activeScope)
  }

  const handleScopeChange = async (scope: 'self' | 'team') => {
    setActiveScope(scope)
    await Promise.all([fetchLeads(selectedStatus, scope), fetchTasks(scope), fetchCommissions(scope)])
  }

  const handleLogActivity = async () => {
    if (!leadDetail) return
    try {
      setLoggingActivity(true)
      const payload = {
        prospectId: leadDetail.id,
        activityType: activityForm.activityType,
        direction: activityForm.direction,
        outcome: activityForm.outcome || undefined,
        notes: activityForm.notes || undefined,
        followUpAt: activityForm.followUpAt || undefined,
        updateStatus: activityForm.updateStatus || undefined,
        commissionAmount: activityForm.commissionAmount ? Number(activityForm.commissionAmount) : undefined
      }

      const response = await fetch('/api/employee/activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(payload)
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to log activity')
      }
      showSuccess('Activity saved', 'Timeline updated successfully.')
      setActivityForm(defaultActivityForm)
      await Promise.all([
        fetchLeadDetail(leadDetail.id),
        fetchLeads(selectedStatus, activeScope),
        fetchTasks(activeScope),
        fetchCommissions(activeScope)
      ])
    } catch (error) {
      showError('Unable to log activity', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoggingActivity(false)
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    try {
      const response = await fetch('/api/employee/tasks', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({ taskId, status: 'completed' })
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to complete task')
      }
      showSuccess('Task completed', 'Great job staying on top of follow-ups.')
      await Promise.all([
        fetchTasks(activeScope),
        selectedLeadId ? fetchLeadDetail(selectedLeadId) : Promise.resolve()
      ])
    } catch (error) {
      showError('Unable to complete task', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const filteredLeads = useMemo(() => {
    if (!searchTerm.trim()) return leads
    const query = searchTerm.toLowerCase()
    return leads.filter((lead) => {
      return (
        lead.first_name?.toLowerCase().includes(query) ||
        lead.last_name?.toLowerCase().includes(query) ||
        lead.company_name?.toLowerCase().includes(query) ||
        lead.email?.toLowerCase().includes(query)
      )
    })
  }, [leads, searchTerm])

  const statusCards = useMemo(() => {
    if (!stats) {
      return []
    }
    return statusFilters
      .filter((filter) => filter.key !== 'all')
      .map((filter) => ({
        label: filter.label,
        value: stats.statusCounts[filter.key] ?? 0
      }))
  }, [stats])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-black to-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8">
        <header className="space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.4em] text-slate-300">
            Sales cockpit
          </span>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <h1 className="text-3xl font-semibold sm:text-4xl">Close more deals with less guesswork</h1>
              <p className="text-base text-slate-300 sm:text-lg">
                Your pipeline, follow-ups, and commission tracking all live here. Every prospect is sourced,
                sequenced, and ready for personal attention.
              </p>
            </div>
            <div className="flex gap-2 rounded-full bg-white/5 p-1 text-xs font-semibold text-slate-200">
              <button
                type="button"
                onClick={() => handleScopeChange('self')}
                className={`rounded-full px-4 py-2 transition ${
                  activeScope === 'self'
                    ? 'bg-blue-500/30 text-blue-100'
                    : 'hover:bg-white/10'
                }`}
              >
                My desk
              </button>
              <button
                type="button"
                onClick={() => handleScopeChange('team')}
                className={`rounded-full px-4 py-2 transition ${
                  activeScope === 'team'
                    ? 'bg-blue-500/30 text-blue-100'
                    : 'hover:bg-white/10'
                }`}
              >
                Team view
              </button>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="mt-16 flex justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            <section className="mt-12 grid gap-4 md:grid-cols-4">
              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/10 via-transparent to-blue-500/5 p-6">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-blue-200">
                  <span>Open leads</span>
                  <Users className="h-5 w-5 text-blue-200" />
                </div>
                <p className="mt-3 text-3xl font-semibold">
                  {stats?.total ?? 0}
                </p>
                <p className="mt-1 text-xs text-blue-100">
                  {activeScope === 'team' ? 'Team-wide pipeline' : 'Assigned to you'}
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-amber-500/10 via-transparent to-amber-500/5 p-6">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-amber-200">
                  <span>Follow-ups due</span>
                  <Clock className="h-5 w-5 text-amber-200" />
                </div>
                <p className="mt-3 text-3xl font-semibold">{stats?.overdueFollowUps ?? 0}</p>
                <p className="mt-1 text-xs text-amber-100">Past due follow-ups</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/10 via-transparent to-emerald-500/5 p-6">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-emerald-200">
                  <span>Upcoming</span>
                  <CalendarDays className="h-5 w-5 text-emerald-200" />
                </div>
                <p className="mt-3 text-3xl font-semibold">{stats?.upcomingFollowUps ?? 0}</p>
                <p className="mt-1 text-xs text-emerald-100">Scheduled follow-ups</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-purple-500/10 via-transparent to-purple-500/5 p-6">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-purple-200">
                  <span>Commission pipeline</span>
                  <DollarSign className="h-5 w-5 text-purple-200" />
                </div>
                <p className="mt-3 text-3xl font-semibold">
                  ${commissions ? (commissions.totalPending + commissions.totalApproved + commissions.totalPaid).toLocaleString() : '0'}
                </p>
                <p className="mt-1 text-xs text-purple-100">Across the last 90 days</p>
              </div>
            </section>

            <section className="mt-12 grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <div className="space-y-4 rounded-3xl border border-white/10 bg-black/40 p-6 shadow-2xl shadow-blue-900/10">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-blue-300" />
                      <h2 className="text-lg font-semibold text-white">Lead inbox</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {statusFilters.map((filter) => (
                        <button
                          key={filter.key}
                          type="button"
                          onClick={() => handleStatusFilter(filter.key)}
                          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                            selectedStatus === filter.key
                              ? 'bg-blue-500/30 text-blue-100'
                              : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {filter.label}
                          {filter.key !== 'all' && statusCards.find((card) => card.label === filter.label)?.value ? (
                            <span className="ml-1 text-[10px] text-slate-400">
                              {statusCards.find((card) => card.label === filter.label)?.value}
                            </span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="search"
                      placeholder="Search by name, company, or email..."
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      onBlur={() => fetchLeads(selectedStatus, activeScope)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-9 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                    />
                  </div>

                  <div className="space-y-3">
                    {filteredLeads.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-slate-300">
                        No leads found. Adjust your filters or expand your search.
                      </div>
                    ) : (
                      filteredLeads.map((lead) => {
                        const statusClass =
                          statusBadgeColors[lead.status] ?? 'bg-white/10 border border-white/10 text-slate-200'
                        return (
                          <button
                            key={lead.id}
                            type="button"
                            onClick={() => handleSelectLead(lead.id)}
                            className={`w-full rounded-2xl border px-4 py-4 text-left transition hover:border-white/30 hover:bg-white/10 ${
                              selectedLeadId === lead.id
                                ? 'border-blue-400/50 bg-blue-500/10'
                                : 'border-white/10 bg-white/5'
                            }`}
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                                  <span>
                                    {lead.first_name} {lead.last_name}
                                  </span>
                                  {lead.company_name && (
                                    <>
                                      <ArrowRight className="h-3 w-3 text-slate-500" />
                                      <span className="text-slate-300">{lead.company_name}</span>
                                    </>
                                  )}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                                  {lead.email && <span>{lead.email}</span>}
                                  {lead.phone && <span>{lead.phone}</span>}
                                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-xs uppercase tracking-wider text-slate-400">
                                    Last touch {formatTimeAgo(lead.last_outreach_at)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2 text-xs text-slate-400">
                                <span className={`inline-flex items-center rounded-full px-3 py-1 font-semibold ${statusClass}`}>
                                  {lead.status.replace('_', ' ')}
                                </span>
                                <span className="flex items-center gap-2">
                                  <Clock className="h-3 w-3" />
                                  {lead.next_touch_at ? new Date(lead.next_touch_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }) : 'No follow-up'}
                                </span>
                              </div>
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/40 p-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Target className="h-4 w-4 text-purple-300" />
                    Commission leaderboard
                  </div>
                  <div className="mt-4 space-y-3">
                    {(commissions?.leaderboard ?? []).length === 0 ? (
                      <p className="text-sm text-slate-400">No commission data yet.</p>
                    ) : (
                      commissions!.leaderboard.map((entry, index) => (
                        <div
                          key={entry.rep_id}
                          className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
                        >
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xs font-semibold text-white">
                              {index + 1}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-white">Rep {entry.rep_id.slice(0, 6)}</p>
                              <p className="text-xs text-slate-400">
                                Pending ${entry.pending.toLocaleString()} · Paid ${entry.paid.toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right text-sm font-semibold text-purple-200">
                            ${entry.amount.toLocaleString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-white/0 to-white/10 p-6 shadow-2xl shadow-blue-900/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                      Action list
                    </div>
                    <span className="text-xs uppercase tracking-[0.3em] text-slate-500">
                      {tasks.filter((task) => task.status !== 'completed').length} open
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {tasks.length === 0 ? (
                      <p className="text-sm text-slate-400">No outstanding tasks. Stay frosty.</p>
                    ) : (
                      tasks.map((task) => (
                        <div
                          key={task.id}
                          className={`rounded-2xl border px-4 py-3 text-sm ${
                            task.status === 'overdue'
                              ? 'border-rose-400/40 bg-rose-500/10 text-rose-50'
                              : 'border-white/10 bg-white/5 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-white capitalize">{task.task_type.replace('_', ' ')}</p>
                              <p className="text-xs text-slate-400">
                                Due {new Date(task.due_at).toLocaleString()} · Lead #{task.prospect_id.slice(0, 6)}
                              </p>
                              {task.notes && (
                                <p className="mt-1 text-xs text-slate-300">{task.notes}</p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCompleteTask(task.id)}
                              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:bg-white/20"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Complete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-black/40 p-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Activity className="h-4 w-4 text-blue-300" />
                    Log activity
                  </div>
                  {!leadDetail ? (
                    <p className="mt-3 text-sm text-slate-400">
                      Select a lead to log outreach, add notes, or schedule follow-ups.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        {activityTypes.map((type) => {
                          const Icon = type.icon
                          return (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() =>
                                setActivityForm((prev) => ({ ...prev, activityType: type.value }))
                              }
                              className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold transition ${
                                activityForm.activityType === type.value
                                  ? 'border-blue-400/40 bg-blue-500/20 text-blue-100'
                                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                              }`}
                            >
                              <Icon className="h-3 w-3" />
                              {type.label}
                            </button>
                          )
                        })}
                      </div>
                      <div className="grid gap-3 text-xs text-slate-200">
                        <label className="space-y-1">
                          <span className="uppercase tracking-[0.3em] text-slate-500">Direction</span>
                          <div className="flex gap-2">
                            {['outbound', 'inbound'].map((direction) => (
                              <button
                                key={direction}
                                type="button"
                                onClick={() =>
                                  setActivityForm((prev) => ({
                                    ...prev,
                                    direction: direction as 'outbound' | 'inbound'
                                  }))
                                }
                                className={`flex-1 rounded-2xl border px-3 py-2 text-xs font-semibold transition ${
                                  activityForm.direction === direction
                                    ? 'border-blue-400/40 bg-blue-500/20 text-blue-100'
                                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                                }`}
                              >
                                {direction}
                              </button>
                            ))}
                          </div>
                        </label>
                        <label className="space-y-1">
                          <span className="uppercase tracking-[0.3em] text-slate-500">Outcome</span>
                          <input
                            type="text"
                            value={activityForm.outcome}
                            onChange={(event) =>
                              setActivityForm((prev) => ({ ...prev, outcome: event.target.value }))
                            }
                            className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                            placeholder="Reached decision maker, left voicemail, etc."
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="uppercase tracking-[0.3em] text-slate-500">Notes</span>
                          <textarea
                            value={activityForm.notes}
                            onChange={(event) =>
                              setActivityForm((prev) => ({ ...prev, notes: event.target.value }))
                            }
                            rows={4}
                            className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                            placeholder="Add color or commitments captured during the conversation."
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="uppercase tracking-[0.3em] text-slate-500">Schedule follow-up</span>
                          <input
                            type="datetime-local"
                            value={activityForm.followUpAt}
                            onChange={(event) =>
                              setActivityForm((prev) => ({ ...prev, followUpAt: event.target.value }))
                            }
                            className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-2 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="uppercase tracking-[0.3em] text-slate-500">Update status</span>
                          <select
                            value={activityForm.updateStatus}
                            onChange={(event) =>
                              setActivityForm((prev) => ({ ...prev, updateStatus: event.target.value }))
                            }
                            className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-2 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                          >
                            <option value="">Keep current status</option>
                            <option value="in_progress">Working</option>
                            <option value="qualified">Qualified</option>
                            <option value="customer">Won</option>
                            <option value="lost">Lost</option>
                          </select>
                        </label>
                        <label className="space-y-1">
                          <span className="uppercase tracking-[0.3em] text-slate-500">Commission (optional)</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={activityForm.commissionAmount}
                            onChange={(event) =>
                              setActivityForm((prev) => ({ ...prev, commissionAmount: event.target.value }))
                            }
                            className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-2 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                            placeholder="0.00"
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={handleLogActivity}
                        disabled={loggingActivity}
                        className="w-full rounded-full border border-blue-400/40 bg-blue-500/20 px-6 py-3 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loggingActivity ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Logging activity...
                          </span>
                        ) : (
                          'Log activity'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="mt-12 rounded-3xl border border-white/10 bg-black/40 p-6">
              {loadingDetail ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : !leadDetail ? (
                <p className="text-sm text-slate-400">
                  Select a lead to view timeline, outreach, and recent activity.
                </p>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-lg font-semibold text-white">
                        <span>
                          {leadDetail.first_name} {leadDetail.last_name}
                        </span>
                        {leadDetail.company_name && (
                          <>
                            <ChevronRight className="h-4 w-4 text-slate-500" />
                            <span className="text-slate-300">{leadDetail.company_name}</span>
                          </>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        {leadDetail.email && <span>{leadDetail.email}</span>}
                        {leadDetail.phone && <span>{leadDetail.phone}</span>}
                        {leadDetail.city && (
                          <span>
                            {leadDetail.city}, {leadDetail.state ?? leadDetail.country}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-400">
                        Status
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          statusBadgeColors[leadDetail.status] ?? 'bg-white/10 border border-white/10 text-slate-200'
                        }`}
                      >
                        {leadDetail.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
                      <span className="uppercase tracking-[0.3em] text-slate-500">Last outreach</span>
                      <p className="mt-1 text-sm text-white">{formatDate(leadDetail.last_outreach_at)}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
                      <span className="uppercase tracking-[0.3em] text-slate-500">Next touch</span>
                      <p className="mt-1 text-sm text-white">{formatDate(leadDetail.next_touch_at)}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
                      <span className="uppercase tracking-[0.3em] text-slate-500">Sequence</span>
                      <p className="mt-1 text-sm text-white">
                        {leadDetail.sequence_status ? leadDetail.sequence_status.replace('_', ' ') : 'Not sequenced'}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        <Activity className="h-4 w-4 text-blue-300" />
                        Activity timeline
                      </div>
                      <div className="mt-4 space-y-4">
                        {leadDetail.activities.length === 0 ? (
                          <p className="text-sm text-slate-400">No activity logged yet.</p>
                        ) : (
                          leadDetail.activities.map((activity) => (
                            <div key={activity.id} className="relative pl-6 text-sm text-slate-200">
                              <span className="absolute left-0 top-1 inline-flex h-3 w-3 rounded-full bg-blue-400" />
                              <div className="flex items-center justify-between text-xs text-slate-400">
                                <span className="capitalize">{activity.activity_type}</span>
                                <span>{new Date(activity.logged_at).toLocaleString()}</span>
                              </div>
                              {activity.outcome && (
                                <p className="mt-1 text-xs text-slate-300">{activity.outcome}</p>
                              )}
                              {activity.notes && (
                                <p className="mt-1 text-xs text-slate-400">{activity.notes}</p>
                              )}
                              {activity.follow_up_at && (
                                <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">
                                  Follow-up {formatDate(activity.follow_up_at)}
                                </p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        <Mail className="h-4 w-4 text-emerald-300" />
                        Outreach history
                      </div>
                      <div className="mt-4 space-y-4">
                        {leadDetail.outreach_events.length === 0 ? (
                          <p className="text-sm text-slate-400">No automated outreach logged yet.</p>
                        ) : (
                          leadDetail.outreach_events.map((event) => (
                            <div key={event.id} className="rounded-2xl border border-white/10 bg-black/60 p-3 text-xs text-slate-200">
                              <div className="flex items-center justify-between">
                                <span className="capitalize">{event.channel}</span>
                                <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-xs uppercase tracking-wider">
                                  {event.status}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-slate-400">
                                {new Date(event.created_at).toLocaleString()}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}


