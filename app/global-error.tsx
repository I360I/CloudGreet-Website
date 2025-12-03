'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { logger } from '@/lib/monitoring'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    logger.error('Global application error:', { error: error instanceof Error ? error.message : 'Unknown error' })
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            <div className="mb-8">
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-12 h-12 text-red-600" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Application Error</h1>
              <p className="text-base md:text-lg text-gray-600 mb-8">
                A critical error occurred. Please refresh the page or contact support if the problem persists.
              </p>
            </div>

            <button
              onClick={reset}
              className="inline-flex items-center justify-center w-full bg-blue-600 text-white px-6 py-3 min-h-[44px] rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Refresh page to retry"
            >
              <RefreshCw className="w-5 h-5 mr-2" aria-hidden="true" />
              Refresh Page
            </button>

            <div className="mt-8 text-sm text-gray-500">
              <p>Error ID: {error.digest || 'Unknown'}</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
