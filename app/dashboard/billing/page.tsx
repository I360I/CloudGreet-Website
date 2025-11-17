'use client'

import { useEffect, useState } from 'react'
import {
  CreditCard,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  PhoneCall
} from 'lucide-react'
import { useToast } from '@/app/contexts/ToastContext'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { Button } from '@/app/components/ui/Button'
import { useBusinessData } from '@/app/hooks/useBusinessData'
import Link from 'next/link'

type BillingData = {
  subscriptionStatus: string
  mrrCents: number
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  nextInvoiceDate: string | null
  nextInvoiceAmountCents: number
  bookingFeesLast30DaysCents: number
  bookingsLast30Days: number
  portalUrl: string | null
}

export default function BillingPage() {
  const { theme } = useBusinessData()
  const { showError, showSuccess } = useToast()
  const [loading, setLoading] = useState(true)
  const [billing, setBilling] = useState<BillingData | null>(null)
  const [openingPortal, setOpeningPortal] = useState(false)

  const primaryColor = theme?.primaryColor || '#8b5cf6'

  useEffect(() => {
    loadBilling()
  }, [])

  const loadBilling = async () => {
    try {
      setLoading(true)
      const response = await fetchWithAuth('/api/client/billing')

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        throw new Error(errorData?.error || `Failed to load billing (${response.status})`)
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error('Invalid response from server')
      }

      if (!data.success) {
        throw new Error(data?.error || 'Failed to load billing information')
      }

      setBilling(data.billing)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load billing information'
      showError('Billing unavailable', message)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenPortal = () => {
    if (!billing?.portalUrl) {
      showError('Portal unavailable', 'Please contact support to manage your subscription.')
      return
    }

    setOpeningPortal(true)
    window.location.href = billing.portalUrl
  }

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-400'
      case 'trialing':
        return 'text-blue-400'
      case 'past_due':
        return 'text-yellow-400'
      case 'canceled':
      case 'cancelled':
        return 'text-red-400'
      default:
        return 'text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />
      case 'trialing':
        return <Calendar className="w-5 h-5 text-blue-400" />
      case 'past_due':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-10 w-10 animate-spin" style={{ color: primaryColor }} />
        </div>
      </div>
    )
  }

  if (!billing) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="bg-slate-800/50 border border-red-500/30 rounded-lg p-6">
          <AlertCircle className="w-6 h-6 text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Billing Information Unavailable</h2>
          <p className="text-gray-400 mb-4">
            We couldn't load your billing information. Please try again or contact support.
          </p>
          <Button onClick={loadBilling} style={{ backgroundColor: primaryColor }}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-white mb-2">Billing & Subscription</h1>
        <p className="text-gray-400">Manage your subscription and view billing history</p>
      </div>

      {/* Subscription Status */}
      <div className="bg-slate-800/50 border rounded-lg p-6 mb-6" style={{ borderColor: primaryColor + '30' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {getStatusIcon(billing.subscriptionStatus)}
            <div>
              <h2 className="text-lg font-semibold text-white">Subscription Status</h2>
              <p className={`text-sm font-medium ${getStatusColor(billing.subscriptionStatus)}`}>
                {billing.subscriptionStatus.charAt(0).toUpperCase() + billing.subscriptionStatus.slice(1)}
                {billing.cancelAtPeriodEnd && ' (Cancels at period end)'}
              </p>
            </div>
          </div>
          {billing.portalUrl && (
            <Button
              onClick={handleOpenPortal}
              disabled={openingPortal}
              style={{ backgroundColor: primaryColor }}
            >
              {openingPortal ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Opening...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Manage Subscription
                </>
              )}
            </Button>
          )}
        </div>

        {billing.currentPeriodStart && billing.currentPeriodEnd && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: primaryColor + '20' }}>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Current Period</p>
                <p className="text-white">
                  {formatDate(billing.currentPeriodStart)} - {formatDate(billing.currentPeriodEnd)}
                </p>
              </div>
              {billing.nextInvoiceDate && (
                <div>
                  <p className="text-gray-500 mb-1">Next Invoice</p>
                  <p className="text-white">{formatDate(billing.nextInvoiceDate)}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Billing Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-slate-800/50 border rounded-lg p-6" style={{ borderColor: primaryColor + '30' }}>
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5" style={{ color: primaryColor }} />
            <h3 className="text-sm font-medium text-gray-400">Monthly Subscription</h3>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(billing.mrrCents)}</p>
          <p className="text-xs text-gray-500 mt-1">per month</p>
        </div>

        <div className="bg-slate-800/50 border rounded-lg p-6" style={{ borderColor: primaryColor + '30' }}>
          <div className="flex items-center gap-3 mb-2">
            <PhoneCall className="w-5 h-5" style={{ color: primaryColor }} />
            <h3 className="text-sm font-medium text-gray-400">Per-Booking Fees</h3>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(billing.bookingFeesLast30DaysCents)}</p>
          <p className="text-xs text-gray-500 mt-1">
            {billing.bookingsLast30Days} booking{billing.bookingsLast30Days !== 1 ? 's' : ''} (last 30 days)
          </p>
        </div>

        <div className="bg-slate-800/50 border rounded-lg p-6" style={{ borderColor: primaryColor + '30' }}>
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="w-5 h-5" style={{ color: primaryColor }} />
            <h3 className="text-sm font-medium text-gray-400">Next Invoice</h3>
          </div>
          <p className="text-2xl font-bold text-white">
            {billing.nextInvoiceAmountCents > 0 ? formatCurrency(billing.nextInvoiceAmountCents) : 'N/A'}
          </p>
          {billing.nextInvoiceDate && (
            <p className="text-xs text-gray-500 mt-1">{formatDate(billing.nextInvoiceDate)}</p>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-slate-800/50 border rounded-lg p-6" style={{ borderColor: primaryColor + '30' }}>
        <h3 className="text-lg font-semibold text-white mb-3">Billing Details</h3>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-start gap-2">
            <span style={{ color: primaryColor }}>•</span>
            <span>
              <strong className="text-white">Monthly Subscription:</strong> ${(billing.mrrCents / 100).toFixed(2)}/month
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span style={{ color: primaryColor }}>•</span>
            <span>
              <strong className="text-white">Per-Booking Fee:</strong> $50.00 per appointment booked via AI
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span style={{ color: primaryColor }}>•</span>
            <span>
              <strong className="text-white">Billing:</strong> Subscription charges monthly. Per-booking fees are added to your next invoice.
            </span>
          </li>
        </ul>
      </div>

      {/* Back to Dashboard */}
      <div className="mt-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 transition"
          style={{ color: primaryColor }}
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
