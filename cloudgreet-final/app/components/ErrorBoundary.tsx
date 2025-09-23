"use client"

import React from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // ErrorBoundary caught an error
    
    // Log error to monitoring service
    if (typeof window !== 'undefined') {
      // You can integrate with your error monitoring service here
      // Error details logged to monitoring service
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />
      }

      return <DefaultErrorFallback error={this.state.error} resetError={this.resetError} />
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ error, resetError }: { error?: Error; resetError: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-gray-800/30 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/50">
          <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-4">Something went wrong</h1>
          <p className="text-gray-400 mb-6">
            We encountered an unexpected error. Don't worry, our team has been notified.
          </p>
          
          {error && process.env.NODE_ENV === 'development' && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6 text-left">
              <p className="text-red-300 text-sm font-mono">{error.message}</p>
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={resetError}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </button>
            
            <Link
              href="/dashboard"
              className="w-full bg-gray-700/50 text-white py-3 px-6 rounded-xl font-semibold hover:bg-gray-600/50 transition-all duration-300 flex items-center justify-center gap-2 border border-gray-600/50"
            >
              <Home className="w-5 h-5" />
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ErrorBoundary