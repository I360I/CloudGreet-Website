"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Phone, Plus, CheckCircle, XCircle, Clock, 
  DollarSign, Search, Filter, Download
} from 'lucide-react'

interface TollFreeNumber {
  id: string
  number: string
  status: 'available' | 'assigned' | 'pending'
  verification_status: 'pending' | 'verified' | 'failed'
  assigned_to: string | null
  business_name: string | null
  assigned_at: string | null
  created_at: string
  telnyx_phone_id: string
}

export default function PhoneInventoryPage() {
  const [numbers, setNumbers] = useState<TollFreeNumber[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseCount, setPurchaseCount] = useState(5)
  const [filter, setFilter] = useState<'all' | 'available' | 'assigned'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchNumbers()
  }, [])

  const fetchNumbers = async () => {
    try {
      const response = await fetch('/api/admin/phone-numbers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setNumbers(data.numbers || [])
      }
    } catch (error) {
      console.error('Failed to fetch numbers:', error)
    } finally {
      setLoading(false)
    }
  }

  const purchaseNumbers = async () => {
    setPurchasing(true)
    try {
      const response = await fetch('/api/admin/phone-numbers/buy', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ count: purchaseCount })
      })
      
      if (response.ok) {
        const data = await response.json()
        alert(`Successfully purchased ${data.purchased} toll-free numbers!`)
        fetchNumbers()
      } else {
        const error = await response.json()
        alert(`Purchase failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Purchase failed:', error)
      alert('Purchase failed. Please try again.')
    } finally {
      setPurchasing(false)
    }
  }

  const filteredNumbers = numbers.filter(number => {
    const matchesFilter = filter === 'all' || number.status === filter
    const matchesSearch = number.number.includes(searchTerm) || 
                         (number.business_name && number.business_name.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesFilter && matchesSearch
  })

  const stats = {
    total: numbers.length,
    available: numbers.filter(n => n.status === 'available').length,
    assigned: numbers.filter(n => n.status === 'assigned').length,
    pending: numbers.filter(n => n.status === 'pending').length
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
            Toll-Free Number Inventory
          </h1>
          <p className="text-gray-300 text-lg">
            Manage your pre-approved toll-free numbers for automatic assignment to new businesses
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Numbers</p>
                <p className="text-3xl font-bold text-white">{stats.total}</p>
              </div>
              <Phone className="w-8 h-8 text-blue-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Available</p>
                <p className="text-3xl font-bold text-green-400">{stats.available}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Assigned</p>
                <p className="text-3xl font-bold text-blue-400">{stats.assigned}</p>
              </div>
              <XCircle className="w-8 h-8 text-blue-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pending</p>
                <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </motion.div>
        </div>

        {/* Purchase Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 mb-8"
        >
          <h2 className="text-xl font-semibold mb-4">Purchase New Numbers</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-300">Quantity:</label>
              <select
                value={purchaseCount}
                onChange={(e) => setPurchaseCount(Number(e.target.value))}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
              >
                <option value={1}>1</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            <button
              onClick={purchaseNumbers}
              disabled={purchasing}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              {purchasing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Purchasing...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Purchase Numbers
                </>
              )}
            </button>
            <div className="text-sm text-gray-400">
              ~${purchaseCount * 15}/month for {purchaseCount} numbers
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
            >
              <option value="all">All Numbers</option>
              <option value="available">Available</option>
              <option value="assigned">Assigned</option>
            </select>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by number or business name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white flex-1"
            />
          </div>
        </div>

        {/* Numbers Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/10">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Phone Number</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Business</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Assigned Date</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Verification</th>
                </tr>
              </thead>
              <tbody>
                {filteredNumbers.map((number, index) => (
                  <motion.tr
                    key={number.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-white/10 hover:bg-white/5"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-blue-400" />
                        <span className="font-mono text-white">{number.number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        number.status === 'available' 
                          ? 'bg-green-500/20 text-green-400' 
                          : number.status === 'assigned'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {number.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {number.business_name ? (
                        <span className="text-white">{number.business_name}</span>
                      ) : (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {number.assigned_at ? (
                        <span className="text-gray-300">
                          {new Date(number.assigned_at).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        number.verification_status === 'verified' 
                          ? 'bg-green-500/20 text-green-400' 
                          : number.verification_status === 'failed'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {number.verification_status}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {loading && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading phone numbers...</p>
          </div>
        )}
      </div>
    </div>
  )
}
