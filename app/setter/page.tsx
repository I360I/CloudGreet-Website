'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { PhoneCall, PhoneIncoming, Target, CaretRight, Coffee, CalendarCheck } from '@phosphor-icons/react'
import { SetterShell, SetterLoadingState } from './_components/SetterShell'
import { SalesPageHeader } from '@/app/sales/_components/SalesShell'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { NumberTicker, AnimatedCircularProgressBar } from '@/app/_shared/magic-ui'

const EASE = [0.22, 1, 0.36, 1] as const

type Overview = {
  calls: {
    today: { attempts: number; connects: number; talk_seconds: number }
    week: { attempts: number; connects: number; talk_seconds: number }
  }
  leads: {
    total: number
    new: number
    interested: number
    dead_or_dnc: number
    demos_booked_today: number
    demos_booked_week: number
  }
}

const fmtMinutes = (seconds: number) => {
  const m = Math.round(seconds / 60)
  return `${m}m`
}

export default function SetterHome() {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetchWithAuth('/api/setter/overview')
        const j = await res.json().catch(() => ({}))
        if (!cancelled && j?.success) setData(j)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  if (loading || !data) {
    return (
      <SetterShell activeLabel="Overview">
        <section className="max-w-3xl mx-auto px-6 py-10">
          <SetterLoadingState />
        </section>
      </SetterShell>
    )
  }

  const stats = [
    { label: 'Dials today', value: data.calls.today.attempts, icon: PhoneCall },
    { label: 'Connects today', value: data.calls.today.connects, icon: PhoneIncoming },
  ]
  const connectRate =
    data.calls.today.attempts > 0
      ? (data.calls.today.connects / data.calls.today.attempts) * 100
      : 0

  return (
    <SetterShell activeLabel="Overview">
      <section className="max-w-3xl mx-auto px-6 py-10">
        <SalesPageHeader eyebrow="overview" title="Your day" />

        {/* Demos booked - the headline setter metric */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="bg-gray-900 text-white rounded-2xl p-5 mb-5 shadow-lg shadow-gray-900/10"
        >
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                Demos booked this week
              </div>
              <div className="text-3xl font-medium tabular-nums mt-1">
                <NumberTicker value={data.leads.demos_booked_week} />
              </div>
              <div className="text-xs text-gray-400 mt-1">
                <NumberTicker value={data.leads.demos_booked_today} /> today
              </div>
            </div>
            <CalendarCheck weight="duotone" className="w-8 h-8 text-emerald-400" />
          </div>
        </motion.div>

        {/* Today's dial activity */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.05 }}
          className="grid grid-cols-3 gap-3 mb-5"
        >
          {stats.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.label} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                <Icon weight="duotone" className="w-4 h-4 text-gray-400 mb-2" />
                <div className="text-xl font-medium tabular-nums text-gray-900">
                  <NumberTicker value={s.value} />
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">{s.label}</div>
              </div>
            )
          })}
          <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm flex flex-col items-center justify-center">
            <AnimatedCircularProgressBar
              value={connectRate}
              size={56}
              strokeWidth={6}
              gaugePrimaryColor="#111827"
              gaugeSecondaryColor="#f3f4f6"
            >
              <span className="text-xs font-medium tabular-nums text-gray-900">
                {Math.round(connectRate)}%
              </span>
            </AnimatedCircularProgressBar>
            <div className="text-[11px] text-gray-500 mt-2 text-center">
              Connect rate · {fmtMinutes(data.calls.today.talk_seconds)} talk
            </div>
          </div>
        </motion.div>

        {/* Lead pipeline snapshot */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.1 }}
          className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
                Your leads
              </div>
              <div className="text-sm font-medium text-gray-900">
                {data.leads.total === 0 ? 'No leads yet' : `${data.leads.total} total`}
              </div>
            </div>
            <Link
              href="/setter/leads"
              className="text-xs text-gray-500 hover:text-gray-900 inline-flex items-center gap-1"
            >
              Open leads <CaretRight className="w-3 h-3" />
            </Link>
          </div>

          {data.leads.total === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gray-100 text-gray-400 mb-3">
                <Coffee weight="duotone" className="w-5 h-5" />
              </div>
              <p className="text-sm text-gray-700 font-medium">Nothing to work yet</p>
              <p className="text-xs text-gray-500 mt-0.5">Scrape a fresh list to start dialing.</p>
              <Link
                href="/setter/leads/scrape"
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-gray-700 hover:text-gray-900"
              >
                <Target weight="fill" className="w-3 h-3" /> Scrape leads
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              <li className="px-5 py-3 flex items-center justify-between text-sm">
                <span className="text-gray-600">Untouched</span>
                <span className="font-medium tabular-nums text-gray-900">{data.leads.new}</span>
              </li>
              <li className="px-5 py-3 flex items-center justify-between text-sm">
                <span className="text-gray-600">Interested</span>
                <span className="font-medium tabular-nums text-emerald-700">{data.leads.interested}</span>
              </li>
              <li className="px-5 py-3 flex items-center justify-between text-sm">
                <span className="text-gray-600">Dead / DNC</span>
                <span className="font-medium tabular-nums text-gray-400">{data.leads.dead_or_dnc}</span>
              </li>
            </ul>
          )}
        </motion.div>
      </section>
    </SetterShell>
  )
}
