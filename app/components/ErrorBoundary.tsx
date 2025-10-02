"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import Link from 'next/link'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Log error to monitoring service
    this.logError(error, errorInfo)
  }

  logError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      await fetch('/api/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'error_boundary',
          data: {
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
          },
          severity: 'error'
        })
      })
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 text-white flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl w-full bg-black/30 backdrop-blur-xl rounded-2xl p-8 border border-red-500/20"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <AlertTriangle className="w-10 h-10 text-red-400" />
              </motion.div>

              <h1 className="text-3xl font-bold mb-4 text-red-400">
                Something went wrong
              </h1>
              
              <p className="text-gray-300 mb-6 text-lg">
                We're sorry, but something unexpected happened. Our team has been notified and is working to fix this issue.
              </p>

              <div className="space-y-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={this.handleRetry}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  Try Again
                </motion.button>

                <Link href="/dashboard">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    <Home className="w-5 h-5" />
                    Go to Dashboard
                  </motion.button>
                </Link>
              </div>

              {process.env.NODE_ENV === 'development' && (
                <details className="mt-8 text-left">
                  <summary className="cursor-pointer text-gray-400 hover:text-gray-300 flex items-center gap-2">
                    <Bug className="w-4 h-4" />
                    Error Details (Development)
                  </summary>
                  <div className="mt-4 p-4 bg-gray-900/50 rounded-lg text-sm">
                    <pre className="text-red-400 whitespace-pre-wrap">
                      {this.state.error?.message}
                    </pre>
                    <pre className="text-gray-400 whitespace-pre-wrap mt-2">
                      {this.state.error?.stack}
                    </pre>
                  </div>
                </details>
              )}
            </div>
          </motion.div>
        </div>
      )
    }

    return this.props.children
  }
}

// HOC for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

// Hook for error boundary functionality
export function useErrorHandler() {
  return (error: Error, errorInfo?: { componentStack: string }) => {
    console.error('Error caught by useErrorHandler:', error)
    
    // Log to monitoring service
    fetch('/api/monitoring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'error_handler',
        data: {
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo?.componentStack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        },
        severity: 'error'
      })
    }).catch(console.error)
  }
}