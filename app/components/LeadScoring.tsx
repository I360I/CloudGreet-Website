'use client'

import React from 'react'

interface LeadScoringProps {
  businessId: string
}

export default function LeadScoring({ businessId }: LeadScoringProps) {
  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Lead Scoring</h3>
      <div className="text-sm text-gray-300">
        Lead Scoring component - Coming soon
      </div>
    </div>
  )
}