'use client'

import React from 'react'

interface BusinessHoursSettingsProps {
  businessId: string
}

export default function BusinessHoursSettings({ businessId }: BusinessHoursSettingsProps) {
  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Business Hours Settings</h3>
      <div className="text-sm text-gray-300">
        Business Hours Settings component - Coming soon
      </div>
    </div>
  )
}
