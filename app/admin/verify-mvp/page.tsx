'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { Button } from '@/app/components/ui/Button'

interface CheckResult {
  status: 'ok' | 'missing' | 'error'
  message?: string
}

interface VerificationResult {
  ready: boolean
  summary: {
    total: number
    ok: number
    missing: number
    errors: number
  }
  checks: Record<string, CheckResult>
  message: string
}

export default function VerifyMVPPage() {
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const verify = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetchWithAuth('/api/admin/verify-mvp')
      
      if (!response.ok) {
        throw new Error(`Verification failed: ${response.status}`)
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    verify()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case 'missing':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
        return 'text-green-400'
      case 'missing':
        return 'text-red-400'
      case 'error':
        return 'text-yellow-400'
      default:
        return 'text-slate-400'
    }
  }

  const groupChecks = (checks: Record<string, CheckResult>) => {
    const groups: Record<string, Array<[string, CheckResult]>> = {
      'Environment Variables': [],
      'Database Tables': [],
      'Database Functions': []
    }

    Object.entries(checks).forEach(([key, value]) => {
      if (key.startsWith('env_')) {
        groups['Environment Variables'].push([key.replace('env_', ''), value])
      } else if (key.startsWith('table_')) {
        groups['Database Tables'].push([key.replace('table_', ''), value])
      } else if (key.startsWith('function_')) {
        groups['Database Functions'].push([key.replace('function_', ''), value])
      }
    })

    return groups
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Verifying MVP status...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-600/20 border border-red-500/30 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-400" />
            <div>
              <h2 className="text-xl font-semibold text-red-400 mb-1">Verification Error</h2>
              <p className="text-red-300">{error}</p>
            </div>
          </div>
        </div>
        <Button onClick={verify}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry Verification
        </Button>
      </div>
    )
  }

  if (!result) {
    return null
  }

  const groupedChecks = groupChecks(result.checks)

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">MVP Status Verification</h1>
        <p className="text-slate-400">Check if all critical components are in place</p>
      </div>

      {/* Overall Status */}
      <div className={`mb-8 rounded-xl p-6 border-2 ${
        result.ready 
          ? 'bg-green-600/20 border-green-500/30' 
          : 'bg-yellow-600/20 border-yellow-500/30'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {result.ready ? (
              <CheckCircle2 className="w-12 h-12 text-green-400" />
            ) : (
              <AlertCircle className="w-12 h-12 text-yellow-400" />
            )}
            <div>
              <h2 className={`text-2xl font-bold mb-1 ${
                result.ready ? 'text-green-400' : 'text-yellow-400'
              }`}>
                {result.ready ? 'MVP IS READY!' : 'MVP NEEDS SETUP'}
              </h2>
              <p className="text-slate-300">{result.message}</p>
            </div>
          </div>
          <Button onClick={verify} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white">{result.summary.total}</div>
            <div className="text-sm text-slate-400">Total Checks</div>
          </div>
          <div className="bg-green-600/20 rounded-lg p-4 text-center border border-green-500/30">
            <div className="text-2xl font-bold text-green-400">{result.summary.ok}</div>
            <div className="text-sm text-green-300">OK</div>
          </div>
          <div className="bg-red-600/20 rounded-lg p-4 text-center border border-red-500/30">
            <div className="text-2xl font-bold text-red-400">{result.summary.missing}</div>
            <div className="text-sm text-red-300">Missing</div>
          </div>
          <div className="bg-yellow-600/20 rounded-lg p-4 text-center border border-yellow-500/30">
            <div className="text-2xl font-bold text-yellow-400">{result.summary.errors}</div>
            <div className="text-sm text-yellow-300">Errors</div>
          </div>
        </div>
      </div>

      {/* Detailed Checks */}
      <div className="space-y-6">
        {Object.entries(groupedChecks).map(([groupName, checks]) => (
          <div key={groupName} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">{groupName}</h3>
            <div className="space-y-2">
              {checks.map(([name, check]) => (
                <div
                  key={name}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-700/30"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(check.status)}
                    <span className="text-white font-medium">{name}</span>
                  </div>
                  {check.message && (
                    <span className={`text-sm ${getStatusColor(check.status)}`}>
                      {check.message}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Action Items */}
      {!result.ready && (
        <div className="mt-8 bg-yellow-600/20 border border-yellow-500/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-yellow-400 mb-4">Next Steps</h3>
          <ul className="space-y-2 text-slate-300">
            {result.summary.missing > 0 && (
              <li>• Run database migrations for missing tables/functions</li>
            )}
            {result.summary.errors > 0 && (
              <li>• Check error messages above and resolve issues</li>
            )}
            <li>• Verify all environment variables are set in Vercel</li>
            <li>• Test critical flows: registration, onboarding, appointment booking</li>
          </ul>
        </div>
      )}
    </div>
  )
}

