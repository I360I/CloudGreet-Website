import React, { Suspense } from 'react'
import RealAnalytics from '@/app/components/RealAnalytics'
import RealActivityFeed from '@/app/components/RealActivityFeed'
import RealCharts from '@/app/components/RealCharts'
import { DashboardSkeleton } from '@/app/components/DashboardSkeleton'

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>
      <Suspense fallback={<DashboardSkeleton />}> 
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RealAnalytics />
            <div className="mt-6">
              <RealCharts />
            </div>
          </div>
          <div className="lg:col-span-1">
            <RealActivityFeed />
          </div>
        </div>
      </Suspense>
    </div>
  )
}


