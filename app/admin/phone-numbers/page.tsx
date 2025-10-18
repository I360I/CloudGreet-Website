'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface TollFreeNumber {
  id: string
  number: string
  status: 'available' | 'assigned' | 'pending_verification' | 'verified' | 'rejected'
  verification_status?: 'pending' | 'verified' | 'rejected'
  verification_submitted_at?: string
  verification_completed_at?: string
  verification_failure_reason?: string
  business_id?: string
  business_name?: string
  created_at: string
  updated_at: string
}

export default function PhoneNumbersPage() {
  const [numbers, setNumbers] = useState<TollFreeNumber[]>([])
  const [loading, setLoading] = useState(true)
  const [buyingCount, setBuyingCount] = useState(5)
  const [buying, setBuying] = useState(false)

  useEffect(() => {
    loadNumbers()
  }, [])

  async function loadNumbers() {
    try {
      const response = await fetch('/api/admin/phone-numbers')
      if (response.ok) {
        const data = await response.json()
        setNumbers(data.numbers || [])
      }
    } catch (error) {
      console.error('Failed to load phone numbers:', error)
    } finally {
      setLoading(false)
    }
  }

  async function buyNumbers() {
    if (buying) return
    
    setBuying(true)
    try {
      const response = await fetch('/api/admin/phone-numbers/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: buyingCount })
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Successfully purchased ${data.purchased} toll-free numbers!\n\nPlease verify them in Telnyx portal.`)
        loadNumbers()
      } else {
        const error = await response.json()
        alert(`Failed to purchase numbers: ${error.error}`)
      }
    } catch (error) {
      alert('Failed to purchase numbers')
    } finally {
      setBuying(false)
    }
  }

  const stats = {
    total: numbers.length,
    available: numbers.filter(n => n.status === 'available' && n.verification_status === 'verified').length,
    pending: numbers.filter(n => n.verification_status === 'pending').length,
    assigned: numbers.filter(n => n.status === 'assigned').length,
    rejected: numbers.filter(n => n.verification_status === 'rejected').length
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading phone numbers...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Phone Number Pool</h1>
          <p className="text-gray-600">Manage your toll-free number inventory</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500"
          >
            <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600 mt-1">Total Numbers</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500"
          >
            <div className="text-3xl font-bold text-green-600">{stats.available}</div>
            <div className="text-sm text-gray-600 mt-1">Available & Verified</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500"
          >
            <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-600 mt-1">Pending Verification</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500"
          >
            <div className="text-3xl font-bold text-purple-600">{stats.assigned}</div>
            <div className="text-sm text-gray-600 mt-1">Assigned to Clients</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500"
          >
            <div className="text-3xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-gray-600 mt-1">Rejected</div>
          </motion.div>
        </div>

        {/* Buy Numbers Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-lg p-6 mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Purchase Toll-Free Numbers</h2>
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How many numbers?
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={buyingCount}
                onChange={(e) => setBuyingCount(parseInt(e.target.value) || 1)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cost Estimate
              </label>
              <div className="text-2xl font-bold text-indigo-600">
                ${(buyingCount * 2).toFixed(2)}/month
              </div>
            </div>
            <div className="pt-6">
              <button
                onClick={buyNumbers}
                disabled={buying}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {buying ? 'Purchasing...' : `Buy ${buyingCount} Numbers`}
              </button>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            💡 After purchase, verify each number in the Telnyx portal. Verification takes 1-3 business days.
          </p>
        </motion.div>

        {/* Numbers Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl shadow-lg overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">All Numbers</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Verification
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {numbers.map((number) => (
                  <tr key={number.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{number.number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        number.status === 'available' ? 'bg-green-100 text-green-800' :
                        number.status === 'assigned' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {number.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        number.verification_status === 'verified' ? 'bg-green-100 text-green-800' :
                        number.verification_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        number.verification_status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {number.verification_status || 'not submitted'}
                      </span>
                      {number.verification_failure_reason && (
                        <div className="text-xs text-red-600 mt-1">{number.verification_failure_reason}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {number.business_name || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(number.created_at).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Alert if pool is low */}
        {stats.available < 3 && stats.available > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg"
          >
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Low Number Pool
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    You only have {stats.available} verified numbers available. Consider purchasing more to avoid delays when new clients sign up.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {stats.available === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 bg-red-50 border-l-4 border-red-400 p-6 rounded-lg"
          >
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  No Available Numbers!
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    You have no verified numbers available. New client signups will be delayed until you purchase and verify more numbers.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

