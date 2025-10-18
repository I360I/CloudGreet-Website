'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Clock, AlertCircle, Play, Pause, X } from 'lucide-react'

interface BulkEnrichmentJob {
  id: string
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'
  totalLeads: number
  processedLeads: number
  successfulLeads: number
  failedLeads: number
  progressPercentage: number
  startedAt: string
  completedAt?: string
  estimatedTimeRemaining?: string
  errorSummary?: string
}

interface BulkEnrichmentLog {
  id: string
  leadId: string
  status: 'success' | 'failed' | 'skipped'
  message: string
  processingTimeMs?: number
  score?: number
  createdAt: string
}

interface BulkEnrichmentProgressProps {
  jobId: string
  onComplete?: (job: BulkEnrichmentJob) => void
  onClose?: () => void
}

export default function BulkEnrichmentProgress({ 
  jobId, 
  onComplete, 
  onClose 
}: BulkEnrichmentProgressProps) {
  const [job, setJob] = useState<BulkEnrichmentJob | null>(null)
  const [logs, setLogs] = useState<BulkEnrichmentLog[]>([])
  const [isPolling, setIsPolling] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastProgressRef = useRef<number>(0)

  useEffect(() => {
    if (!jobId || !isPolling) return

    const pollProgress = async () => {
      try {
        const response = await fetch(`/api/apollo-killer/bulk-enrichment?jobId=${jobId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          }
        })

        const data = await response.json()

        if (data.success) {
          setJob(data.job)
          setLogs(data.recentLogs || [])
          
          // Stop polling if job is complete
          if (data.job.status === 'completed' || data.job.status === 'failed' || data.job.status === 'cancelled') {
            setIsPolling(false)
            if (onComplete) {
              onComplete(data.job)
            }
          }
          
          lastProgressRef.current = data.job.progressPercentage
        } else {
          setError(data.error || 'Failed to get job status')
          setIsPolling(false)
        }
      } catch (err) {
        setError('Network error while checking progress')
        setIsPolling(false)
      }
    }

    // Poll immediately
    pollProgress()

    // Set up interval polling
    if (job?.status === 'processing' || job?.status === 'queued') {
      pollingIntervalRef.current = setInterval(pollProgress, 3000) // Poll every 3 seconds
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [jobId, isPolling, job?.status, onComplete])

  const handleClose = () => {
    setIsPolling(false)
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }
    if (onClose) {
      onClose()
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-500" />
      case 'failed':
        return <XCircle className="w-6 h-6 text-red-500" />
      case 'processing':
        return <Clock className="w-6 h-6 text-blue-500 animate-spin" />
      case 'queued':
        return <Clock className="w-6 h-6 text-yellow-500" />
      default:
        return <AlertCircle className="w-6 h-6 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400'
      case 'failed':
        return 'text-red-400'
      case 'processing':
        return 'text-blue-400'
      case 'queued':
        return 'text-yellow-400'
      default:
        return 'text-gray-400'
    }
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 backdrop-blur-lg"
      >
        <div className="flex items-center gap-3 mb-4">
          <XCircle className="w-6 h-6 text-red-500" />
          <h3 className="text-lg font-semibold text-red-400">Bulk Enrichment Error</h3>
          <button
            onClick={handleClose}
            className="ml-auto p-1 hover:bg-red-500/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-red-300 mb-4">{error}</p>
        
        <button
          onClick={() => { setError(null); setIsPolling(true) }}
          className="px-4 py-2 bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-600/30 transition-all"
        >
          Try Again
        </button>
      </motion.div>
    )
  }

  if (!job) {
    return (
      <div className="bg-gray-800/50 border border-gray-600 rounded-xl p-6 backdrop-blur-lg">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-blue-500 animate-spin" />
          <span className="text-gray-300">Loading bulk enrichment status...</span>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-gray-800/50 border border-gray-600 rounded-xl p-6 backdrop-blur-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {getStatusIcon(job.status)}
          <div>
            <h3 className="text-lg font-semibold text-white">
              Bulk Lead Enrichment
            </h3>
            <p className={`text-sm capitalize ${getStatusColor(job.status)}`}>
              {job.status}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {job.status === 'processing' && (
            <button
              onClick={() => setIsPolling(!isPolling)}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
              title={isPolling ? 'Pause updates' : 'Resume updates'}
            >
              {isPolling ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
          )}
          
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>Progress</span>
          <span>{job.processedLeads} / {job.totalLeads} leads</span>
        </div>
        
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${job.progressPercentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{job.progressPercentage}% complete</span>
          {job.estimatedTimeRemaining && job.status === 'processing' && (
            <span>~{job.estimatedTimeRemaining} remaining</span>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">
            {job.successfulLeads}
          </div>
          <div className="text-xs text-gray-400">Successful</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-red-400">
            {job.failedLeads}
          </div>
          <div className="text-xs text-gray-400">Failed</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-400">
            {job.totalLeads - job.processedLeads}
          </div>
          <div className="text-xs text-gray-400">Remaining</div>
        </div>
      </div>

      {/* Error Summary */}
      {job.errorSummary && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">Job Failed:</span>
          </div>
          <p className="text-red-300 text-sm mt-1">{job.errorSummary}</p>
        </div>
      )}

      {/* Recent Activity */}
      {logs.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">Recent Activity</h4>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            <AnimatePresence>
              {logs.slice(0, 10).map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-2 bg-gray-700/30 rounded-lg text-sm"
                >
                  {log.status === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-300 truncate">{log.message}</div>
                    {log.score && (
                      <div className="text-xs text-gray-500">
                        Score: {log.score}/100
                        {log.processingTimeMs && (
                          <span className="ml-2">
                            ({(log.processingTimeMs / 1000).toFixed(1)}s)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-500 flex-shrink-0">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Completion Actions */}
      {(job.status === 'completed' || job.status === 'failed') && (
        <div className="mt-6 pt-4 border-t border-gray-600">
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 py-2 px-4 bg-gray-600/20 border border-gray-500/30 text-gray-300 rounded-lg hover:bg-gray-600/30 transition-all"
            >
              Close
            </button>
            
            {job.status === 'completed' && (
              <button
                onClick={() => window.location.reload()} // Refresh to see updated leads
                className="flex-1 py-2 px-4 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-all"
              >
                View Results
              </button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}
