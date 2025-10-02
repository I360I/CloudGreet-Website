'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  resetOnPropsChange?: boolean
  resetKeys?: Array<string | number>
}

interface State {
  hasError: boolean
  error: Error | null
  errorId: string
  retryCount: number
}

interface ErrorFallbackProps {
  error: Error | null
  resetError: () => void
  retryCount: number
  errorId: string
}

export class AdvancedErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorId: '',
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    this.logError(error, errorInfo)
    
    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props
    const { hasError, retryCount } = this.state

    if (hasError && resetOnPropsChange) {
      if (resetKeys) {
        const hasResetKeyChanged = resetKeys.some(
          (key, index) => key !== prevProps.resetKeys?.[index]
        )
        if (hasResetKeyChanged) {
          this.resetError()
        }
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  private logError = async (error: Error, errorInfo: ErrorInfo) => {
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      retryCount: this.state.retryCount
    }

    try {
      // Send to monitoring service
      await fetch('/api/monitoring/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData)
      })
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }
  }

  resetError = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorId: '',
      retryCount: prevState.retryCount + 1
    }))
  }

  handleRetry = () => {
    this.resetError()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return (
          <FallbackComponent
            error={this.state.error}
            resetError={this.resetError}
            retryCount={this.state.retryCount}
            errorId={this.state.errorId}
          />
        )
      }

      return <DefaultErrorFallback
        error={this.state.error}
        resetError={this.resetError}
        retryCount={this.state.retryCount}
        errorId={this.state.errorId}
      />
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ error, resetError, retryCount, errorId }: ErrorFallbackProps) {
  const [showDetails, setShowDetails] = React.useState(false)
  const [isRetrying, setIsRetrying] = React.useState(false)

  const handleRetry = async () => {
    setIsRetrying(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    resetError()
    setIsRetrying(false)
  }

  const handleGoHome = () => {
    window.location.href = '/'
  }

  const copyErrorDetails = () => {
    const errorDetails = {
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace available',
      errorId,
      retryCount,
      timestamp: new Date().toISOString(),
      url: window.location.href
    }
    
    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </motion.div>

        <h1 className="text-2xl font-bold text-white mb-2">
          Oops! Something went wrong
        </h1>
        
        <p className="text-gray-300 mb-6">
          We encountered an unexpected error. Don&apos;t worry, we&apos;re on it!
        </p>

        {retryCount > 0 && (
          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3 mb-6">
            <p className="text-yellow-400 text-sm">
              This is attempt #{retryCount + 1}. If the problem persists, please contact support.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg font-medium hover:bg-blue-500/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'Retrying...' : 'Try Again'}</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoHome}
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-white/10 border border-white/20 text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Go Home</span>
          </motion.button>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            {showDetails ? 'Hide' : 'Show'} Technical Details
          </button>
        </div>

        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 p-4 bg-black/20 rounded-lg text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center">
                <Bug className="w-4 h-4 mr-2" />
                Error Details
              </h3>
              <button
                onClick={copyErrorDetails}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Copy Details
              </button>
            </div>
            
            <div className="space-y-2 text-xs text-gray-300">
              <div>
                <span className="text-gray-400">Error ID:</span> {errorId}
              </div>
              <div>
                <span className="text-gray-400">Message:</span> {error?.message || 'Unknown error'}
              </div>
              <div>
                <span className="text-gray-400">Retry Count:</span> {retryCount}
              </div>
              <div>
                <span className="text-gray-400">Timestamp:</span> {new Date().toLocaleString()}
              </div>
              {error?.stack && (
                <div className="mt-3">
                  <span className="text-gray-400">Stack Trace:</span>
                  <pre className="mt-1 p-2 bg-black/30 rounded text-xs overflow-x-auto">
                    {error.stack}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

// HOC for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <AdvancedErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </AdvancedErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}
