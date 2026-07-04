'use client'

import { useEffect, useState } from 'react'
import { SetterShell, SetterLoadingState } from './_components/SetterShell'
import { OverviewDashboard, Overview } from './_components/OverviewDashboard'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

export default function SetterHome() {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [firstName, setFirstName] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [ovRes, meRes] = await Promise.all([
          fetchWithAuth('/api/setter/overview'),
          fetchWithAuth('/api/me/profile'),
        ])
        const ov = await ovRes.json().catch(() => ({}))
        if (!cancelled && ov?.success) setData(ov)
        const me = await meRes.json().catch(() => ({}))
        if (!cancelled) {
          setFirstName(me?.profile?.first_name || me?.profile?.name?.split(' ')?.[0] || null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  return (
    <SetterShell activeLabel="Overview">
      {loading || !data ? (
        <section className="max-w-7xl mx-auto px-6 md:px-8 py-8">
          <SetterLoadingState />
        </section>
      ) : (
        <OverviewDashboard data={data} firstName={firstName} />
      )}
    </SetterShell>
  )
}
