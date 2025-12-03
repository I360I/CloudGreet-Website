'use client'

import { useState } from 'react'
import { Card } from '@/app/components/ui/Card'
import { Button } from '@/app/components/ui/Button'
import { logger } from '@/lib/monitoring'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

interface TestResult {
  name: string,
  status: 'passed' | 'failed' | 'warning',
  details: string
}

interface TestResponse {
  success: boolean
  testType: string
  results: TestResult[]
  timestamp: string
}

export default function ManualTestsPage() {
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set())
  const [testResults, setTestResults] = useState<Record<string, TestResponse>>({})

  const testTypes = [
    { id: 'database', name: 'Database', description: 'Test database connection, queries, and tenant isolation' },
    { id: 'retell', name: 'Retell AI', description: 'Test Retell API connection and webhook verification' },
    { id: 'telnyx', name: 'Telnyx', description: 'Test Telnyx API connection and webhook verification' },
    { id: 'email', name: 'Email Services', description: 'Test Resend and SendGrid email services' },
    { id: 'webhook', name: 'Webhooks', description: 'Test webhook endpoints and signature verification' },
    { id: 'auth', name: 'Authentication', description: 'Test JWT generation, verification, and rate limiting' },
    { id: 'performance', name: 'Performance', description: 'Test database queries, API response times, and memory usage' },
    { id: 'security', name: 'Security', description: 'Test environment variables, CORS, and input validation' }
  ]

  const runTest = async (testType: string) => {
    setRunningTests(prev => new Set(prev).add(testType))
    
    try {
      const response = await fetchWithAuth('/api/admin/manual-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testType })
      })

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        logger.error('Test failed:', errorData?.error || `HTTP ${response.status}`)
        return
      }

      let result
      try {
        result = await response.json()
      } catch (jsonError) {
        logger.error('Test failed: Invalid response from server')
        return
      }
      
      if (result.success) {
        setTestResults(prev => ({ ...prev, [testType]: result }))
      } else {
        logger.error('Test failed:', result.error)
      }
    } catch (error) {
      logger.error('Test execution error', { error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev)
        newSet.delete(testType)
        return newSet
      })
    }
  }

  const runAllTests = async () => {
    for (const testType of testTypes) {
      await runTest(testType.id)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-green-600 bg-green-50'
      case 'failed': return 'text-red-600 bg-red-50'
      case 'warning': return 'text-yellow-600 bg-yellow-50'
  default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return '✓'
      case 'failed': return '✗'
      case 'warning': return '⚠'
  default: return '?'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manual Tests</h1>
          <p className="text-gray-600 mt-2">
            Run comprehensive tests to verify system functionality and identify issues.
          </p>
        </div>
        <Button 
          onClick={runAllTests}
          disabled={runningTests.size > 0}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {runningTests.size > 0 ? 'Running Tests...' : 'Run All Tests'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testTypes.map((test) => (
          <Card key={test.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{test.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{test.description}</p>
              </div>
              <Button
                onClick={() => runTest(test.id)}
                disabled={runningTests.has(test.id)}
                size="sm"
                variant="outline"
              >
                {runningTests.has(test.id) ? 'Running...' : 'Run Test'}
              </Button>
            </div>

            {testResults[test.id] && (
              <div className="space-y-3">
                <div className="text-sm text-gray-500">
                  Last run: {new Date(testResults[test.id].timestamp).toLocaleString()}
                </div>
                
                <div className="space-y-2">
                  {testResults[test.id].results.map((result, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(result.status)}`}>
                        {getStatusIcon(result.status)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {result.name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {result.details}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {Object.keys(testResults).length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Summary</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {Object.values(testResults).reduce((acc, result) => 
                  acc + result.results.filter(r => r.status === 'passed').length, 0
                )}
              </div>
              <div className="text-sm text-green-600">Passed</div>
            </div>
            
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {Object.values(testResults).reduce((acc, result) => 
                  acc + result.results.filter(r => r.status === 'warning').length, 0
                )}
              </div>
              <div className="text-sm text-yellow-600">Warnings</div>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {Object.values(testResults).reduce((acc, result) => 
                  acc + result.results.filter(r => r.status === 'failed').length, 0
                )}
              </div>
              <div className="text-sm text-red-600">Failed</div>
            </div>
          </div>

          <div className="space-y-4">
            {Object.entries(testResults).map(([testType, result]) => (
              <div key={testType} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900 capitalize">{testType} Tests</h3>
                  <span className="text-sm text-gray-500">
                    {result.results.filter(r => r.status === 'passed').length} / {result.results.length} passed
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {result.results.map((testResult, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(testResult.status)}`}>
                        {getStatusIcon(testResult.status)}
                      </span>
                      <span className="text-gray-900">{testResult.name}</span>
                      <span className="text-gray-500 text-xs">({testResult.details})</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
