'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Shield, CheckCircle, AlertCircle, Lock, Users, 
  Database, Eye, EyeOff, Key, Building
} from 'lucide-react'

interface TenantIsolationProps {
  businessId: string
  businessName: string
}

export default function TenantIsolationIndicator({ businessId, businessName }: TenantIsolationProps) {
  const [isolationStatus, setIsolationStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    testTenantIsolation()
  }, [businessId])

  const testTenantIsolation = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('token')
      if (!token) {
        setError('Please log in to test tenant isolation')
        return
      }

      // Test tenant isolation
      const response = await fetch('/api/test-tenant-isolation', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setIsolationStatus(data.tests)
      } else {
        setError('Failed to test tenant isolation')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('An error occurred while testing tenant isolation')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center animate-pulse">
            <Shield className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Testing Tenant Isolation</h3>
            <p className="text-sm text-gray-400">Verifying data security...</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-2 bg-gray-700/50 rounded animate-pulse"></div>
          <div className="h-2 bg-gray-700/50 rounded animate-pulse w-3/4"></div>
        </div>
      </div>
    )
  }

  if (error || !isolationStatus) {
    return (
      <div className="bg-red-600/20 border border-red-500/30 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-red-400">Isolation Test Failed</h3>
            <p className="text-red-300 text-sm">{error || 'Unable to verify tenant isolation'}</p>
          </div>
        </div>
      </div>
    )
  }

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="w-4 h-4 text-green-400" />
    ) : (
      <AlertCircle className="w-4 h-4 text-red-400" />
    )
  }

  const getStatusColor = (success: boolean) => {
    return success ? 'text-green-400' : 'text-red-400'
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
          <Shield className="w-4 h-4 text-green-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Tenant Isolation Status</h3>
          <p className="text-sm text-gray-400">
            {businessName} (ID: {businessId})
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Business Data Access */}
        <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Building className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium">Business Data Access</span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(isolationStatus.businessAccess?.success)}
            <span className={`text-xs ${getStatusColor(isolationStatus.businessAccess?.success)}`}>
              {isolationStatus.businessAccess?.success ? 'Secured' : 'Failed'}
            </span>
          </div>
        </div>

        {/* Calls Data Access */}
        <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Database className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium">Calls Data Access</span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(isolationStatus.callsAccess?.success)}
            <span className={`text-xs ${getStatusColor(isolationStatus.callsAccess?.success)}`}>
              {isolationStatus.callsAccess?.recordCount || 0} records
            </span>
          </div>
        </div>

        {/* Appointments Data Access */}
        <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Users className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium">Appointments Data Access</span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(isolationStatus.appointmentsAccess?.success)}
            <span className={`text-xs ${getStatusColor(isolationStatus.appointmentsAccess?.success)}`}>
              {isolationStatus.appointmentsAccess?.recordCount || 0} records
            </span>
          </div>
        </div>

        {/* Cross-Tenant Protection */}
        <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Lock className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium">Cross-Tenant Protection</span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(!isolationStatus.crossTenantTest?.canSeeOtherBusinesses)}
            <span className={`text-xs ${getStatusColor(!isolationStatus.crossTenantTest?.canSeeOtherBusinesses)}`}>
              {isolationStatus.crossTenantTest?.canSeeOtherBusinesses ? 'Vulnerable' : 'Protected'}
            </span>
          </div>
        </div>

        {/* Analytics Isolation */}
        <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Key className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-medium">Analytics Isolation</span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(isolationStatus.analyticsIsolation?.onlyMyCalls)}
            <span className={`text-xs ${getStatusColor(isolationStatus.analyticsIsolation?.onlyMyCalls)}`}>
              {isolationStatus.analyticsIsolation?.filteredCalls || 0} calls
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700/50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Last tested: {new Date().toLocaleTimeString()}</span>
          <button
            onClick={testTenantIsolation}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Refresh Test
          </button>
        </div>
      </div>
    </div>
  )
}
