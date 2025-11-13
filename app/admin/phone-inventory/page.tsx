'use client'

import { useState, useEffect, useMemo } from 'react'
import { logger } from '@/lib/monitoring'
import { Button } from '@/app/components/ui/Button'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import {
  Upload,
  Check,
  AlertTriangle,
  Search,
  Filter,
  PhoneCall,
  ListFilter,
  RefreshCw,
  Link as LinkIcon,
  Copy,
  ExternalLink
} from 'lucide-react'

interface PhoneNumber {
  id: string
  number: string
  status: 'available' | 'assigned' | 'suspended'
  assigned_to: string | null
  business_name: string | null
  assigned_at: string | null
  created_at: string
  updated_at: string
}

interface PhoneNumbersResponse {
  success: boolean
  numbers: PhoneNumber[]
  statistics: {
    total: number
    available: number
    assigned: number
    suspended: number
  }
}

type Feedback = {
  type: 'success' | 'error'
  title: string
  details?: string[]
}

const sanitizePhoneNumber = (input: string): string | null => {
  const trimmed = input.trim()
  if (!trimmed) return null
  const digits = trimmed.replace(/[^0-9]/g, '')
  if (digits.length < 10) {
    return null
  }

  if (trimmed.startsWith('+')) {
    return `+${digits}`
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }

  if (digits.length === 10) {
    return `+1${digits}`
  }

  return `+${digits}`
}

const computeBulkPreview = (value: string) => {
  const tokens = value
    .split(/[\n,;\u200B]/)
    .map((token) => token.trim())
    .filter(Boolean)

  const valid = new Map<string, string>()
  const invalid: string[] = []

  tokens.forEach((token) => {
    const sanitized = sanitizePhoneNumber(token)
    if (sanitized) {
      valid.set(sanitized, sanitized)
    } else {
      invalid.push(token)
    }
  })

  return {
    valid: Array.from(valid.keys()),
    invalid
  }
}

export default function AdminPhoneInventoryPage() {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [statistics, setStatistics] = useState<PhoneNumbersResponse['statistics']>({
    total: 0,
    available: 0,
    assigned: 0,
    suspended: 0
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const [bulkInput, setBulkInput] = useState('')
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null)
  const [retellLinkingModal, setRetellLinkingModal] = useState<{
    phoneNumber: string
    businessId: string | null
    retellAgentId: string | null
  } | null>(null)

  const bulkPreview = useMemo(() => computeBulkPreview(bulkInput), [bulkInput])

  const fetchPhoneNumbers = async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }
    setError(null)

    try {
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)

      const response = await fetch(`/api/admin/phone-numbers?${params.toString()}`, {
        headers: {
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch phone numbers')
      }

      const data: PhoneNumbersResponse = await response.json()

      if (data.success) {
        const filtered = data.numbers.filter((number) => {
          if (!searchQuery) return true
          const query = searchQuery.toLowerCase()
          return (
            number.number.includes(searchQuery) ||
            number.business_name?.toLowerCase().includes(query) ||
            number.status.toLowerCase().includes(query)
          )
        })

        setPhoneNumbers(filtered)
        setStatistics(data.statistics)
      } else {
        throw new Error('Failed to fetch phone numbers')
      }
    } catch (err) {
      logger.error('Error fetching phone numbers', { error: err instanceof Error ? err.message : 'Unknown error' })
      setError(err instanceof Error ? err.message : 'Failed to fetch phone numbers')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleBulkUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback(null)

    if (bulkPreview.valid.length === 0) {
      setFeedback({
        type: 'error',
        title: 'No valid numbers detected. Enter toll-free numbers separated by commas or new lines.'
      })
      return
    }

    setBulkSubmitting(true)

    try {
      const response = await fetch('/api/admin/phone-numbers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ numbers: bulkPreview.valid })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to add phone numbers')
      }

      setFeedback({
        type: 'success',
        title: `Processed ${data.inserted + data.duplicates} number${data.inserted + data.duplicates === 1 ? '' : 's'}: ${data.inserted} added, ${data.duplicates} duplicate${data.duplicates === 1 ? '' : 's'}, ${data.invalid} invalid.`,
        details: data.numbers?.inserted || []
      })

      setBulkInput('')
      fetchPhoneNumbers({ silent: true })
    } catch (err) {
      logger.error('Error uploading phone numbers', { error: err instanceof Error ? err.message : 'Unknown error' })
      setFeedback({
        type: 'error',
        title: err instanceof Error ? err.message : 'Failed to add phone numbers'
      })
    } finally {
      setBulkSubmitting(false)
    }
  }

  const handleUpdateStatus = async (phoneId: string, newStatus: PhoneNumber['status']) => {
    setStatusUpdatingId(phoneId)
    try {
      const response = await fetchWithAuth('/api/admin/phone-numbers', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: phoneId, status: newStatus })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data?.error || 'Failed to update phone number status')
      }

      await fetchPhoneNumbers({ silent: true })
    } catch (err) {
      logger.error('Error updating phone number status', { error: err instanceof Error ? err.message : 'Unknown error' })
      setFeedback({
        type: 'error',
        title: err instanceof Error ? err.message : 'Failed to update phone number status'
      })
    } finally {
      setStatusUpdatingId(null)
    }
  }

  const handleShowRetellLinking = async (phone: PhoneNumber) => {
    if (!phone.assigned_to) {
      alert('Phone number is not assigned to a business')
      return
    }

    try {
      // Get business details including Retell agent ID
      const response = await fetchWithAuth(`/api/admin/clients/${phone.assigned_to}`)
      if (!response.ok) throw new Error('Failed to fetch business details')
      
      const data = await response.json()
      const business = data.client
      
      setRetellLinkingModal({
        phoneNumber: phone.number,
        businessId: phone.assigned_to,
        retellAgentId: business?.retell_agent_id || null
      })
    } catch (error) {
      logger.error('Error fetching business details for Retell linking', { error })
      setFeedback({
        type: 'error',
        title: 'Failed to load Retell linking information'
      })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setFeedback({
      type: 'success',
      title: 'Copied to clipboard!'
    })
    setTimeout(() => setFeedback(null), 2000)
  }

  useEffect(() => {
    fetchPhoneNumbers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  const filteredPhoneNumbers = useMemo(() => {
    if (!searchQuery) return phoneNumbers
    const query = searchQuery.toLowerCase()
    return phoneNumbers.filter((number) =>
      number.number.includes(searchQuery) ||
      number.business_name?.toLowerCase().includes(query) ||
      number.status.toLowerCase().includes(query)
    )
  }, [phoneNumbers, searchQuery])

  const getStatusBadgeClasses = (status: PhoneNumber['status']) => {
    switch (status) {
      case 'available':
        return 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/30'
      case 'assigned':
        return 'bg-blue-500/15 text-blue-200 border border-blue-500/30'
      case 'suspended':
        return 'bg-rose-500/15 text-rose-200 border border-rose-500/30'
      default:
        return 'bg-slate-500/15 text-slate-200 border border-slate-500/30'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-black to-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-blue-400/70 mb-2">Telephony</p>
            <h1 className="text-3xl sm:text-4xl font-semibold text-white">Toll-Free Number Inventory</h1>
            <p className="text-slate-300 mt-3 max-w-2xl">
              Upload your pre-provisioned toll-free numbers, monitor assignments in real time, and keep the onboarding queue stocked.
            </p>
          </div>
          <Button
            onClick={() => fetchPhoneNumbers({ silent: true })}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center gap-2"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </header>

        {feedback && (
          <div
            className={`rounded-2xl border px-6 py-4 backdrop-blur-lg ${
              feedback.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-100'
            }`}
          >
            <div className="flex items-start gap-3">
              {feedback.type === 'success' ? (
                <Check className="h-5 w-5 mt-1" />
              ) : (
                <AlertTriangle className="h-5 w-5 mt-1" />
              )}
              <div>
                <p className="font-medium text-sm sm:text-base">{feedback.title}</p>
                {feedback.details && feedback.details.length > 0 && (
                  <div className="mt-2 text-xs sm:text-sm text-white/80">
                    <p className="font-semibold mb-1">Inserted:</p>
                    <div className="flex flex-wrap gap-2">
                      {feedback.details.map((item) => (
                        <span key={item} className="inline-flex items-center rounded-full bg-white/10 px-3 py-1">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-blue-500/5 backdrop-blur">
                <p className="text-xs uppercase tracking-widest text-slate-400">Total</p>
                <p className="mt-2 text-3xl font-semibold text-white">{statistics.total}</p>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 shadow-lg shadow-emerald-500/10 backdrop-blur">
                <p className="text-xs uppercase tracking-widest text-emerald-200/80">Available</p>
                <p className="mt-2 text-3xl font-semibold text-emerald-100">{statistics.available}</p>
              </div>
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5 shadow-lg shadow-blue-500/10 backdrop-blur">
                <p className="text-xs uppercase tracking-widest text-blue-200/80">Assigned</p>
                <p className="mt-2 text-3xl font-semibold text-blue-100">{statistics.assigned}</p>
              </div>
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 shadow-lg shadow-rose-500/10 backdrop-blur">
                <p className="text-xs uppercase tracking-widest text-rose-200/80">Suspended</p>
                <p className="mt-2 text-3xl font-semibold text-rose-100">{statistics.suspended}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-2xl shadow-blue-900/20">
              <div className="flex items-start gap-4 mb-6">
                <div className="rounded-2xl bg-blue-500/20 border border-blue-500/40 p-3">
                  <Upload className="h-6 w-6 text-blue-200" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Bulk add toll-free numbers</h2>
                  <p className="text-sm text-slate-300 mt-1">
                    Paste one number per line (or comma-separated). We’ll sanitize, deduplicate, and keep the inventory synced with onboarding.
                  </p>
                </div>
              </div>

              <form onSubmit={handleBulkUpload} className="space-y-4">
                <textarea
                  value={bulkInput}
                  onChange={(event) => setBulkInput(event.target.value)}
                  placeholder="+18885550123\n(888) 555-0124\n888-555-0125"
                  rows={6}
                  className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                />

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1">
                    <Check className="h-3.5 w-3.5" /> {bulkPreview.valid.length} valid
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> {bulkPreview.invalid.length} invalid
                  </span>
                </div>

                {bulkPreview.invalid.length > 0 && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
                    <p className="font-medium mb-1">We couldn’t recognize these entries:</p>
                    <div className="flex flex-wrap gap-2">
                      {bulkPreview.invalid.map((item) => (
                        <span key={item} className="rounded-full bg-white/10 px-3 py-1">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-400 border border-blue-400/50 text-white px-6"
                    disabled={bulkSubmitting}
                  >
                    {bulkSubmitting ? 'Processing…' : 'Add to inventory'}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-blue-950/60 via-black/60 to-slate-950/60 p-6 backdrop-blur-xl shadow-2xl shadow-blue-900/40">
            <div className="flex items-center gap-3 text-blue-200 mb-5">
              <PhoneCall className="h-5 w-5" />
              <h3 className="text-sm font-semibold uppercase tracking-[0.3em]">Inventory health</h3>
            </div>
            <p className="text-sm text-slate-300 mb-6">
              Keep at least <strong>5 available</strong> numbers in reserve. Onboarding will automatically draw from this pool as new businesses sign up.
            </p>
            <div className="space-y-4 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-medium text-white mb-1">Recommended actions</p>
                <ul className="list-disc list-inside space-y-2 marker:text-blue-300">
                  <li>Add numbers in bulk after provisioning them in Telnyx.</li>
                  <li>Suspend numbers that are quarantined or awaiting KYC.</li>
                  <li>Archive numbers before releasing them from Telnyx.</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-blue-100">
                <p className="font-semibold mb-1">Heads-up</p>
                <p className="text-sm">Numbers marked as <strong>available</strong> are eligible for automatic assignment during onboarding.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-2xl shadow-blue-900/20">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="relative flex items-center rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/40">
                <Search className="mr-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by number, business, or status…"
                  className="flex-1 bg-transparent outline-none placeholder:text-slate-500"
                />
              </label>
              <label className="relative flex items-center rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/40">
                <Filter className="mr-3 h-4 w-4 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="flex-1 bg-transparent outline-none"
                >
                  <option value="">All statuses</option>
                  <option value="available">Available</option>
                  <option value="assigned">Assigned</option>
                  <option value="suspended">Suspended</option>
                </select>
              </label>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ListFilter className="h-4 w-4" /> Showing {filteredPhoneNumbers.length} of {statistics.total}
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-black/30 overflow-hidden">
            {loading ? (
              <div className="py-12 text-center text-slate-300">Loading phone numbers…</div>
            ) : error ? (
              <div className="py-12 text-center text-rose-300">{error}</div>
            ) : filteredPhoneNumbers.length === 0 ? (
              <div className="py-12 text-center text-slate-400">No phone numbers match your filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-white/5 text-xs uppercase tracking-wider text-slate-400">
                      <th className="px-6 py-3 text-left">Number</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-left">Assigned to</th>
                      <th className="px-6 py-3 text-left">Assigned at</th>
                      <th className="px-6 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {filteredPhoneNumbers.map((phone) => (
                      <tr key={phone.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-medium text-white">{phone.number}</td>
                        <td className="px-6 py-4">
                          <div className="inline-flex items-center rounded-full border border-white/10 bg-black/30 p-1 text-xs">
                            <select
                              value={phone.status}
                              onChange={(event) =>
                                handleUpdateStatus(phone.id, event.target.value as PhoneNumber['status'])
                              }
                              className={`rounded-full px-3 py-1 font-semibold ${getStatusBadgeClasses(phone.status)} bg-transparent outline-none`}
                              disabled={statusUpdatingId === phone.id}
                            >
                              <option value="available" className="text-black">available</option>
                              <option value="assigned" className="text-black">assigned</option>
                              <option value="suspended" className="text-black">suspended</option>
                            </select>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-white/80">
                          {phone.business_name ? (
                            <div>
                              <p className="font-medium text-white">{phone.business_name}</p>
                              {phone.assigned_to && (
                                <p className="text-xs text-slate-400">Tenant: {phone.assigned_to}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {phone.assigned_at ? new Date(phone.assigned_at).toLocaleString() : '—'}
                        </td>
                        <td className="px-6 py-4">
                          {phone.status === 'assigned' && phone.assigned_to ? (
                            <Button
                              onClick={() => handleShowRetellLinking(phone)}
                              className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-200 text-xs px-3 py-1"
                            >
                              <LinkIcon className="h-3 w-3 mr-1" />
                              Retell Link
                            </Button>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Retell Linking Modal */}
        {retellLinkingModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-2xl w-full shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Retell Phone Linking</h2>
                <button
                  onClick={() => setRetellLinkingModal(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-2">Phone Number</p>
                  <div className="flex items-center gap-2">
                    <code className="text-white font-mono">{retellLinkingModal.phoneNumber}</code>
                    <button
                      onClick={() => copyToClipboard(retellLinkingModal.phoneNumber)}
                      className="text-blue-400 hover:text-blue-300"
                      title="Copy phone number"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {retellLinkingModal.retellAgentId ? (
                  <>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <p className="text-sm text-gray-400 mb-2">Retell Agent ID</p>
                      <div className="flex items-center gap-2">
                        <code className="text-white font-mono">{retellLinkingModal.retellAgentId}</code>
                        <button
                          onClick={() => copyToClipboard(retellLinkingModal.retellAgentId || '')}
                          className="text-blue-400 hover:text-blue-300"
                          title="Copy agent ID"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                      <p className="text-sm font-medium text-blue-200 mb-2">Manual Linking Steps:</p>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300">
                        <li>Log into <a href="https://dashboard.retellai.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1">Retell Dashboard <ExternalLink className="h-3 w-3" /></a></li>
                        <li>Navigate to Agents section</li>
                        <li>Find agent ID: <code className="bg-gray-800 px-1 rounded">{retellLinkingModal.retellAgentId}</code></li>
                        <li>Click on the agent to edit</li>
                        <li>Go to Phone Numbers section</li>
                        <li>Add phone number: <code className="bg-gray-800 px-1 rounded">{retellLinkingModal.phoneNumber}</code></li>
                        <li>Save changes</li>
                      </ol>
                    </div>
                  </>
                ) : (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <p className="text-sm text-yellow-200">
                      This business does not have a Retell agent configured yet. 
                      Create an agent first, then link the phone number.
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => setRetellLinkingModal(null)}
                    className="bg-gray-700 hover:bg-gray-600 text-white"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

