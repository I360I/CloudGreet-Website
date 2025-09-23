"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  FileText, 
  Phone, 
  Mail, 
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Brain,
  Settings,
  Eye,
  Send,
  X
} from 'lucide-react'

interface Quote {
  id: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  service_type: 'hvac' | 'roofing' | 'painting'
  job_details: any
  estimated_price: number
  ai_generated_description: string
  ai_recommendations: string
  status: 'pending' | 'sent' | 'accepted' | 'declined' | 'expired'
  expires_at: string
  created_at: string
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [businessId, setBusinessId] = useState('')

  useEffect(() => {
    // Get business ID from localStorage or API
    const token = localStorage.getItem('token')
    if (token) {
      // Get business ID from user data
      const user = localStorage.getItem('user')
      if (user) {
        const userData = JSON.parse(user)
        setBusinessId(userData.business_id || userData.id)
        loadQuotes()
      }
    }
  }, [])

  const loadQuotes = async () => {
    try {
      const response = await fetch(`/api/quotes?business_id=${businessId}`)
      if (response.ok) {
        const data = await response.json()
        setQuotes(data.quotes || [])
      }
    } catch (error) {
      // Console error removed for production
    } finally {
      setIsLoading(false)
    }
  }

  const updateQuoteStatus = async (quoteId: string, status: string) => {
    try {
      const response = await fetch('/api/quotes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          id: quoteId,
          status: status
        })
      })

      if (response.ok) {
        await loadQuotes()
        setSelectedQuote(null)
      }
    } catch (error) {
      // Console error removed for production
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'sent': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'accepted': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'declined': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'expired': return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />
      case 'sent': return <Send className="w-4 h-4" />
      case 'accepted': return <CheckCircle className="w-4 h-4" />
      case 'declined': return <XCircle className="w-4 h-4" />
      case 'expired': return <AlertCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Quotes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="flex items-center space-x-4 hover:opacity-80 transition-opacity">
                <ArrowLeft className="w-6 h-6 text-gray-300" />
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">CloudGreet</h1>
                    <p className="text-xs text-gray-400 font-medium">AI RECEPTIONIST</p>
                  </div>
                </div>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                <Settings className="w-5 h-5 text-gray-300" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">AI-Generated Quotes</h2>
          <p className="text-gray-400">Review and manage quotes generated by your AI receptionist</p>
        </div>

        {/* Quotes Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {quotes.map((quote) => (
            <div key={quote.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-blue-600">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{quote.customer_name}</h3>
                    <p className="text-gray-400 text-sm capitalize">{quote.service_type}</p>
                  </div>
                </div>
                
                <div className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center space-x-1 ${getStatusColor(quote.status)}`}>
                  {getStatusIcon(quote.status)}
                  <span className="capitalize">{quote.status}</span>
                </div>
              </div>
              
              <div className="space-y-3 mb-4">
                <div className="flex items-center space-x-2 text-gray-300">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">{quote.customer_phone}</span>
                </div>
                
                {quote.customer_email && (
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">{quote.customer_email}</span>
                  </div>
                )}
                
                <div className="flex items-center space-x-2 text-gray-300">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">{formatDate(quote.created_at)}</span>
                </div>
                
                {quote.job_details.square_footage && (
                  <div className="flex items-center space-x-2 text-gray-300">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-sm">{quote.job_details.square_footage} sq ft</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-2xl font-bold text-white">${quote.estimated_price.toLocaleString()}</p>
                  <p className="text-gray-400 text-sm">Estimated Price</p>
                </div>
                
                {isExpired(quote.expires_at) && (
                  <div className="text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    Expired
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedQuote(quote)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Details</span>
                </button>
                
                {quote.status === 'pending' && (
                  <button
                    onClick={() => updateQuoteStatus(quote.id, 'sent')}
                    className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {quotes.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Quotes Yet</h3>
            <p className="text-gray-400 mb-6">AI-generated quotes will appear here when customers call</p>
            <Link
              href="/pricing"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Set Up Pricing Rules
            </Link>
          </div>
        )}

        {/* Quote Details Modal */}
        {selectedQuote && (
          <QuoteDetailsModal
            quote={selectedQuote}
            onClose={() => setSelectedQuote(null)}
            onUpdateStatus={updateQuoteStatus}
          />
        )}
      </main>
    </div>
  )
}

function QuoteDetailsModal({ quote, onClose, onUpdateStatus }: {
  quote: Quote
  onClose: () => void
  onUpdateStatus: (id: string, status: string) => void
}) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Quote Details</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-3">Customer Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Name</p>
                <p className="text-white font-medium">{quote.customer_name}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Phone</p>
                <p className="text-white font-medium">{quote.customer_phone}</p>
              </div>
              {quote.customer_email && (
                <div>
                  <p className="text-gray-400 text-sm">Email</p>
                  <p className="text-white font-medium">{quote.customer_email}</p>
                </div>
              )}
              <div>
                <p className="text-gray-400 text-sm">Service Type</p>
                <p className="text-white font-medium capitalize">{quote.service_type}</p>
              </div>
            </div>
          </div>

          {/* Job Details */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-3">Job Details</h4>
            <div className="space-y-2">
              <p className="text-gray-300">
                <span className="font-medium">Issue:</span> {quote.job_details.issue_description}
              </p>
              {quote.job_details.square_footage && (
                <p className="text-gray-300">
                  <span className="font-medium">Square Footage:</span> {quote.job_details.square_footage} sq ft
                </p>
              )}
              <p className="text-gray-300">
                <span className="font-medium">Urgency:</span> <span className="capitalize">{quote.job_details.urgency}</span>
              </p>
              {quote.job_details.location && (
                <p className="text-gray-300">
                  <span className="font-medium">Location:</span> {quote.job_details.location}
                </p>
              )}
              {quote.job_details.additional_notes && (
                <p className="text-gray-300">
                  <span className="font-medium">Additional Notes:</span> {quote.job_details.additional_notes}
                </p>
              )}
            </div>
          </div>

          {/* AI Generated Content */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-3">AI-Generated Quote</h4>
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm mb-2">Description</p>
                <p className="text-gray-300">{quote.ai_generated_description}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-2">Recommendations</p>
                <p className="text-gray-300">{quote.ai_recommendations}</p>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-3">Pricing</h4>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Estimated Price</p>
                <p className="text-3xl font-bold text-white">${quote.estimated_price.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm">Expires</p>
                <p className="text-gray-300">{formatDate(quote.expires_at)}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {quote.status === 'pending' && (
              <>
                <button
                  onClick={() => onUpdateStatus(quote.id, 'sent')}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <Send className="w-5 h-5" />
                  <span>Send Quote</span>
                </button>
                <button
                  onClick={() => onUpdateStatus(quote.id, 'declined')}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Decline
                </button>
              </>
            )}
            
            {quote.status === 'sent' && (
              <>
                <button
                  onClick={() => onUpdateStatus(quote.id, 'accepted')}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  Mark as Accepted
                </button>
                <button
                  onClick={() => onUpdateStatus(quote.id, 'declined')}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Mark as Declined
                </button>
              </>
            )}
            
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
