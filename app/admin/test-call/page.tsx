'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/Button'
import { logger } from '@/lib/monitoring'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { PhoneCall, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react'
import { useToast } from '@/app/contexts/ToastContext'

interface Business {
  id: string
  business_name: string
  phone_number: string | null
  phone: string | null
  retell_agent_id: string | null
}

interface TestCallResult {
  success: boolean
  callControlId?: string
  business?: {
    id: string
    name: string
    phone: string
    retellAgentId: string
  }
  message?: string
  error?: string
}

export default function AdminTestCallPage() {
  const { showError } = useToast()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('')
  const [testPhoneNumber, setTestPhoneNumber] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [testResult, setTestResult] = useState<TestCallResult | null>(null)
  const [recentCalls, setRecentCalls] = useState<any[]>([])

  useEffect(() => {
    loadBusinesses()
  }, [])

  const loadBusinesses = async () => {
    try {
      const response = await fetchWithAuth('/api/admin/clients?limit=100')
      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        throw new Error(errorData?.error || `Failed to load businesses (${response.status})`)
      }
      
      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error('Invalid response from server')
      }
      // Filter to only businesses with Retell agents and phone numbers
      const eligibleBusinesses = (data.clients || []).filter((client: BusinessClient) => 
        client.retell_agent_id && (client.phone_number || client.phone)
      )
      setBusinesses(eligibleBusinesses)
    } catch (error) {
      logger.error('Failed to load businesses', { error })
    }
  }

  const placeTestCall = async () => {
    if (!selectedBusinessId && !testPhoneNumber.trim()) {
      showError('Validation Error', 'Please select a business or enter a phone number')
      return
    }

    setIsLoading(true)
    setTestResult(null)

    try {
      const payload: TestCallPayload = {}
      if (selectedBusinessId) {
        payload.businessId = selectedBusinessId
      } else {
        payload.phoneNumber = testPhoneNumber.trim()
      }

      const response = await fetchWithAuth('/api/admin/test-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        setTestResult({
          success: false,
          error: errorData?.error || `Failed to place test call (${response.status})`
        })
        return
      }

      let result
      try {
        result = await response.json()
      } catch (jsonError) {
        setTestResult({
          success: false,
          error: 'Invalid response from server'
        })
        return
      }
      
      setTestResult(result)
      // Load recent calls for this business
      if (result.business?.id) {
        loadRecentCalls(result.business.id, result.callControlId)
      }
    } catch (error) {
      logger.error('Error placing test call', { error })
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadRecentCalls = async (businessId: string, callControlId: string) => {
    try {
      // Poll for call status updates
      const checkCallStatus = async () => {
        const response = await fetchWithAuth(`/api/admin/clients/${businessId}`)
        if (response.ok) {
          const data = await response.json()
          const calls = data.client?.activity?.calls?.recent || []
          setRecentCalls(calls.filter((call: { call_id?: string; [key: string]: unknown }) => call.call_id === callControlId))
        }
      }

      // Check immediately
      await checkCallStatus()
      
      // Check again after 3 seconds
      setTimeout(checkCallStatus, 3000)
    } catch (error) {
      logger.error('Failed to load recent calls', { error })
    }
  }

  const selectedBusiness = businesses.find(b => b.id === selectedBusinessId)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Test Call Routing</h1>
          <p className="text-gray-400">
            Place test calls to verify SIP bridge and call routing to Retell AI
          </p>
        </div>

        <div className="bg-white bg-opacity-5 backdrop-filter backdrop-blur-lg border border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Select Business</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Business with Retell Agent
            </label>
            <select
              value={selectedBusinessId}
              onChange={(e) => setSelectedBusinessId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select a business...</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.business_name} - {business.phone_number || business.phone} 
                  {business.retell_agent_id ? ' ✓' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Or Enter Phone Number
            </label>
            <input
              type="text"
              value={testPhoneNumber}
              onChange={(e) => setTestPhoneNumber(e.target.value)}
              placeholder="+18005551234"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {selectedBusiness && (
            <div className="bg-gray-800 bg-opacity-50 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Business Details</h3>
              <div className="space-y-1 text-sm text-gray-400">
                <div>Name: <span className="text-white">{selectedBusiness.business_name}</span></div>
                <div>Phone: <span className="text-white">{selectedBusiness.phone_number || selectedBusiness.phone}</span></div>
                <div>Retell Agent: <span className="text-white">{selectedBusiness.retell_agent_id || 'Not configured'}</span></div>
              </div>
            </div>
          )}

          <Button
            onClick={placeTestCall}
            disabled={isLoading || (!selectedBusinessId && !testPhoneNumber.trim())}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="inline-block mr-2 animate-spin" />
                Placing Call...
              </>
            ) : (
              <>
                <PhoneCall className="inline-block mr-2" />
                Place Test Call
              </>
            )}
          </Button>
        </div>

        {testResult && (
          <div className={`bg-white bg-opacity-5 backdrop-filter backdrop-blur-lg border rounded-xl p-6 mb-6 ${
            testResult.success ? 'border-green-500' : 'border-red-500'
          }`}>
            <div className="flex items-start">
              {testResult.success ? (
                <CheckCircle className="text-green-400 mr-3 mt-1" size={24} />
              ) : (
                <XCircle className="text-red-400 mr-3 mt-1" size={24} />
              )}
              <div className="flex-1">
                <h3 className={`text-lg font-semibold mb-2 ${
                  testResult.success ? 'text-green-400' : 'text-red-400'
                }`}>
                  {testResult.success ? 'Test Call Placed Successfully' : 'Test Call Failed'}
                </h3>
                
                {testResult.success && testResult.callControlId && (
                  <div className="space-y-2 text-sm text-gray-300">
                    <div>Call Control ID: <code className="bg-gray-800 px-2 py-1 rounded">{testResult.callControlId}</code></div>
                    {testResult.business && (
                      <>
                        <div>Business: {testResult.business.name}</div>
                        <div>Phone: {testResult.business.phone}</div>
                        <div>Retell Agent: {testResult.business.retellAgentId}</div>
                      </>
                    )}
                    <div className="mt-4 p-3 bg-gray-800 bg-opacity-50 rounded-lg">
                      <p className="text-yellow-400 font-medium mb-1">Next Steps:</p>
                      <ul className="list-disc list-inside space-y-1 text-gray-400">
                        <li>Check application logs for "Call successfully bridged to Retell AI"</li>
                        <li>Look for "sipFormat" in the log entry to see which format succeeded</li>
                        <li>Verify call connected to Retell AI (check Retell dashboard)</li>
                        <li>If call failed, check logs for SIP transfer errors</li>
                      </ul>
                    </div>
                  </div>
                )}

                {!testResult.success && testResult.error && (
                  <div className="text-red-400">
                    <p className="font-medium mb-2">Error:</p>
                    <p className="text-sm">{testResult.error}</p>
                  </div>
                )}

                {testResult.message && (
                  <p className="text-gray-400 text-sm mt-2">{testResult.message}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white bg-opacity-5 backdrop-filter backdrop-blur-lg border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">How to Verify SIP Format</h2>
          <div className="space-y-3 text-gray-300">
            <div className="flex items-start">
              <AlertCircle className="text-yellow-400 mr-2 mt-1" size={20} />
              <div>
                <p className="font-medium mb-1">Check Application Logs</p>
                <p className="text-sm text-gray-400">
                  Look for log entries with "Call successfully bridged to Retell AI" and check the "sipFormat" field
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <AlertCircle className="text-yellow-400 mr-2 mt-1" size={20} />
              <div>
                <p className="font-medium mb-1">Check Retell Dashboard</p>
                <p className="text-sm text-gray-400">
                  Verify the call appears in Retell's call logs and was handled by the AI agent
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <AlertCircle className="text-yellow-400 mr-2 mt-1" size={20} />
              <div>
                <p className="font-medium mb-1">Monitor Call Status</p>
                <p className="text-sm text-gray-400">
                  Check the calls table in the database to see if the call was logged and its status
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

