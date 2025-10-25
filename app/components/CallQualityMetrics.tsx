'use client'

import React from 'react'

interface CallQualityMetricsProps {
  businessId: string
}

export default function CallQualityMetrics({ businessId }: CallQualityMetricsProps) {
  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Call Quality Metrics</h3>
      <div className="text-sm text-gray-300">
        Call Quality Metrics component - Coming soon
      </div>
    </div>
  )
}