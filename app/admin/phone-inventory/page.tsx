'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/Button'
import { logger } from '@/lib/monitoring'

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

export default function AdminPhoneInventoryPage() {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [statistics, setStatistics] = useState<PhoneNumbersResponse['statistics']>({
    total: 0,
    available: 0,
    assigned: 0,
    suspended: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showBuyForm, setShowBuyForm] = useState(false)
  const [buying, setBuying] = useState(false)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  
  // Buy form state
  const [buyCount, setBuyCount] = useState<string>('1')
  const [areaCode, setAreaCode] = useState<string>('')

  // Fetch phone numbers
  const fetchPhoneNumbers = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      if (searchQuery) params.append('search', searchQuery)

      const response = await fetch(`/api/admin/phone-numbers?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch phone numbers')
      }

      const data: PhoneNumbersResponse = await response.json()
      
      if (data.success) {
        // Filter by search query if provided
        let filtered = data.numbers
        if (searchQuery) {
          filtered = data.numbers.filter(num => 
            num.number.includes(searchQuery) ||
            num.business_name?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        }
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
    }
  }

  // Buy phone numbers
  const handleBuyNumbers = async (e: React.FormEvent) => {
    e.preventDefault()
    setBuying(true)
    
    try {
      const response = await fetch('/api/admin/phone-numbers/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          count: parseInt(buyCount) || 1,
          areaCode: areaCode || undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to buy phone numbers')
      }

      const data = await response.json()
      
      if (data.success) {
        alert(`Successfully purchased ${data.purchased || 0} phone number(s)`)
        setShowBuyForm(false)
        setBuyCount('1')
        setAreaCode('')
        fetchPhoneNumbers()
      } else {
        throw new Error(data.error || 'Failed to buy phone numbers')
      }
    } catch (err) {
      logger.error('Error buying phone numbers', { error: err instanceof Error ? err.message : 'Unknown error' })
      alert(err instanceof Error ? err.message : 'Failed to buy phone numbers')
    } finally {
      setBuying(false)
    }
  }

  // Update phone number status
  const handleUpdateStatus = async (phoneId: string, newStatus: PhoneNumber['status']) => {
    try {
      const response = await fetch('/api/admin/phone-numbers', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          id: phoneId,
          status: newStatus
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update phone number status')
      }

      fetchPhoneNumbers()
    } catch (err) {
      logger.error('Error updating phone number status', { error: err instanceof Error ? err.message : 'Unknown error' })
      alert(err instanceof Error ? err.message : 'Failed to update phone number status')
    }
  }

  useEffect(() => {
    fetchPhoneNumbers()
  }, [statusFilter])

  const getStatusColor = (status: PhoneNumber['status']) => {
    switch (status) {
      case 'available': return 'bg-green-500/20 text-green-300 border border-green-500/30'
      case 'assigned': return 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
      case 'suspended': return 'bg-red-500/20 text-red-300 border border-red-500/30'
      default: return 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Phone Number Inventory</h1>
              <p className="text-gray-300 mt-2">
                Manage toll-free phone numbers for client assignment.
              </p>
            </div>
        <Button 
          onClick={() => setShowBuyForm(!showBuyForm)}
          className="bg-white/15 backdrop-blur-xl text-white border border-white/30 hover:bg-white/25 hover:border-white/50 transition-all"
        >
          {showBuyForm ? 'Cancel' : '+ Buy Numbers'}
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-900/50 border border-gray-700/50 backdrop-blur-xl rounded-xl shadow-md p-5">
          <div className="text-sm font-medium text-gray-400 mb-1">Total</div>
          <div className="text-2xl font-bold text-white">{statistics.total}</div>
        </div>
        <div className="bg-gray-900/50 border border-gray-700/50 backdrop-blur-xl rounded-xl shadow-md p-5">
          <div className="text-sm font-medium text-gray-400 mb-1">Available</div>
          <div className="text-2xl font-bold text-green-400">{statistics.available}</div>
        </div>
        <div className="bg-gray-900/50 border border-gray-700/50 backdrop-blur-xl rounded-xl shadow-md p-5">
          <div className="text-sm font-medium text-gray-400 mb-1">Assigned</div>
          <div className="text-2xl font-bold text-blue-400">{statistics.assigned}</div>
        </div>
        <div className="bg-gray-900/50 border border-gray-700/50 backdrop-blur-xl rounded-xl shadow-md p-5">
          <div className="text-sm font-medium text-gray-400 mb-1">Suspended</div>
          <div className="text-2xl font-bold text-red-400">{statistics.suspended}</div>
        </div>
      </div>

      {/* Buy Numbers Form */}
      {showBuyForm && (
        <div className="bg-gray-900/50 border border-gray-700/50 backdrop-blur-xl rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Buy Phone Numbers</h2>
          <form onSubmit={handleBuyNumbers} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Number of Numbers *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="10"
                  value={buyCount}
                  onChange={(e) => setBuyCount(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Enter number of phone numbers to purchase (1-10)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Area Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., 800"
                  value={areaCode}
                  onChange={(e) => setAreaCode(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Optional: Specify area code preference</p>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                onClick={() => {
                  setShowBuyForm(false)
                  setBuyCount('1')
                  setAreaCode('')
                }}
                variant="outline"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-white/15 backdrop-blur-xl text-white border border-white/30 hover:bg-white/25 hover:border-white/50 transition-all"
                disabled={buying}
              >
                {buying ? 'Purchasing...' : 'Buy Numbers'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-900/50 border border-gray-700/50 backdrop-blur-xl rounded-xl shadow-md p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by phone number or business name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="available">Available</option>
              <option value="assigned">Assigned</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Phone Numbers Table */}
      <div className="bg-gray-900/50 border border-gray-700/50 backdrop-blur-xl rounded-xl shadow-md p-6">
        {loading ? (
          <div className="text-center py-8 text-gray-300">Loading phone numbers...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-400">{error}</div>
        ) : phoneNumbers.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No phone numbers found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700/50">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Phone Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
                <tbody className="bg-transparent divide-y divide-gray-700/50">
                  {phoneNumbers.map((phone) => (
                    <tr key={phone.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{phone.number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={phone.status}
                          onChange={(e) => handleUpdateStatus(phone.id, e.target.value as PhoneNumber['status'])}
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(phone.status)} border-0 focus:ring-2 focus:ring-blue-500 bg-gray-800/50 text-white`}
                        >
                          <option value="available" className="bg-gray-800">Available</option>
                          <option value="assigned" className="bg-gray-800">Assigned</option>
                          <option value="suspended" className="bg-gray-800">Suspended</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">{phone.business_name || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {phone.assigned_at ? new Date(phone.assigned_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {phone.status === 'assigned' && (
                          <span className="text-blue-400">In Use</span>
                        )}
                        {phone.status === 'available' && (
                          <span className="text-green-400">Ready</span>
                        )}
                        {phone.status === 'suspended' && (
                          <span className="text-red-400">Suspended</span>
                        )}
                      </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </div>
      </div>
    </div>
  )
}

