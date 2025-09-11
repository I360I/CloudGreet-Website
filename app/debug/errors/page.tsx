"use client"

import React, { useState, useEffect } from 'react'
import { AlertTriangle, Search, RefreshCw, Copy, ExternalLink } from 'lucide-react'

interface ErrorEntry {
  id: string
  timestamp: string
  message: string
  stack?: string
  componentStack?: string
  userAgent: string
  url: string
  userId?: string
  type: string
}

interface ErrorStats {
  total: number
  byType: Record<string, number>
  recent: number
  last24Hours: number
}

export default function ErrorDebugPage() {
  const [errors, setErrors] = useState<ErrorEntry[]>([])
  const [stats, setStats] = useState<ErrorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchId, setSearchId] = useState('2813744010')
  const [searchedError, setSearchedError] = useState<ErrorEntry | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  useEffect(() => {
    loadErrors()
  }, [])

  const loadErrors = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/error-reporting')
      const data = await response.json()
      
      if (data.success) {
        setErrors(data.errors || [])
        setStats(data.stats || null)
      }
    } catch (error) {
      console.error('Failed to load errors:', error)
    } finally {
      setLoading(false)
    }
  }

  const searchError = async () => {
    if (!searchId.trim()) return

    try {
      setSearchLoading(true)
      const response = await fetch(`/api/error-reporting?errorId=${searchId}`)
      const data = await response.json()
      
      if (data.success) {
        setSearchedError(data.error)
      } else {
        setSearchedError(null)
        alert('Error not found')
      }
    } catch (error) {
      console.error('Failed to search error:', error)
      alert('Failed to search for error')
    } finally {
      setSearchLoading(false)
    }
  }

  const copyErrorDetails = (error: ErrorEntry) => {
    const details = {
      id: error.id,
      message: error.message,
      stack: error.stack,
      componentStack: error.componentStack,
      timestamp: error.timestamp,
      url: error.url,
      userAgent: error.userAgent,
      userId: error.userId,
      type: error.type
    }
    
    navigator.clipboard.writeText(JSON.stringify(details, null, 2))
      .then(() => alert('Error details copied to clipboard'))
      .catch(() => alert('Failed to copy error details'))
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getErrorTypeColor = (type: string) => {
    switch (type) {
      case 'react_error': return 'bg-red-100 text-red-800'
      case 'javascript_error': return 'bg-orange-100 text-orange-800'
      case 'promise_rejection': return 'bg-yellow-100 text-yellow-800'
      case 'react_error_boundary': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Error Debug Dashboard</h1>
          <p className="text-gray-600">Investigate and track application errors</p>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Search for Specific Error</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Enter error ID (e.g., 2813744010)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={searchError}
              disabled={searchLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              {searchLoading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {searchedError && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-800 mb-2">Found Error:</h3>
              <div className="space-y-2 text-sm">
                <p><strong>ID:</strong> {searchedError.id}</p>
                <p><strong>Message:</strong> {searchedError.message}</p>
                <p><strong>Type:</strong> <span className={`px-2 py-1 rounded text-xs ${getErrorTypeColor(searchedError.type)}`}>{searchedError.type}</span></p>
                <p><strong>Timestamp:</strong> {formatTimestamp(searchedError.timestamp)}</p>
                <p><strong>URL:</strong> {searchedError.url}</p>
                {searchedError.userId && <p><strong>User ID:</strong> {searchedError.userId}</p>}
                {searchedError.stack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-red-700 font-medium">Stack Trace</summary>
                    <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                      {searchedError.stack}
                    </pre>
                  </details>
                )}
                <button
                  onClick={() => copyErrorDetails(searchedError)}
                  className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 flex items-center gap-1"
                >
                  <Copy className="h-3 w-3" />
                  Copy Details
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats Section */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-sm font-medium text-gray-600">Total Errors</h3>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-sm font-medium text-gray-600">Last 24 Hours</h3>
              <p className="text-2xl font-bold text-orange-600">{stats.last24Hours}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-sm font-medium text-gray-600">Recent Errors</h3>
              <p className="text-2xl font-bold text-blue-600">{stats.recent}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-sm font-medium text-gray-600">Error Types</h3>
              <p className="text-lg font-semibold text-gray-900">{Object.keys(stats.byType).length}</p>
            </div>
          </div>
        )}

        {/* Error Types Breakdown */}
        {stats && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Error Types</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.byType).map(([type, count]) => (
                <div key={type} className="text-center">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getErrorTypeColor(type)}`}>
                    {type}
                  </span>
                  <p className="text-lg font-bold text-gray-900 mt-1">{count}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Errors List */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Recent Errors</h2>
            <button
              onClick={loadErrors}
              disabled={loading}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading errors...</p>
            </div>
          ) : errors.length === 0 ? (
            <div className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No errors found</p>
            </div>
          ) : (
            <div className="divide-y">
              {errors.map((error) => (
                <div key={error.id} className="p-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm text-gray-600">{error.id}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getErrorTypeColor(error.type)}`}>
                          {error.type}
                        </span>
                        <span className="text-sm text-gray-500">{formatTimestamp(error.timestamp)}</span>
                      </div>
                      <p className="text-gray-900 font-medium mb-1">{error.message}</p>
                      <p className="text-sm text-gray-600">{error.url}</p>
                      {error.userId && (
                        <p className="text-xs text-gray-500 mt-1">User: {error.userId}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyErrorDetails(error)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title="Copy error details"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setSearchId(error.id)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title="View details"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
