'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  CheckCircle, EnvelopeSimple, Phone, Robot, Lightning, ArrowRight,
} from '@phosphor-icons/react'

export const dynamic = 'force-dynamic'

const EASE = [0.22, 1, 0.36, 1] as const

function PaymentSuccessContent() {
  const search = useSearchParams()
  const closeId = search?.get('close') || null
  const sessionId = search?.get('session_id') || null

  const [businessName, setBusinessName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!closeId) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/payment/close-info?close=${closeId}`, { cache: 'no-store' })
        const j = await res.json().catch(() => ({}))
        if (!cancelled && j?.success) {
          setBusinessName(j.business_name || null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [closeId])

  return (
    <main className="min-h-screen bg-[#f6f5f1] flex items-center justify-center px-6 py-12">
      <div className="max-w-xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="bg-white border border-gray-200 rounded-3xl shadow-lg shadow-gray-900/5 p-8 sm:p-10"
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 mb-6"
          >
            <CheckCircle weight="duotone" className="w-9 h-9" />
          </motion.div>

          <h1 className="font-display text-3xl sm:text-4xl font-medium tracking-tight text-gray-900 mb-3">
            You&apos;re in.
          </h1>

          <p className="text-base text-gray-600 mb-6 leading-relaxed">
            {businessName
              ? <>Payment received for <strong className="text-gray-900">{businessName}</strong>. Your CloudGreet AI receptionist is being set up right now.</>
              : <>Payment received. Your CloudGreet AI receptionist is being set up right now.</>
            }
          </p>

          <div className="bg-[#f6f5f1] border border-gray-100 rounded-2xl p-5 mb-6">
            <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-3">
              What happens next
            </div>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex-shrink-0">
                  <EnvelopeSimple weight="duotone" className="w-4 h-4" />
                </span>
                <span>
                  Check your email — we just sent your dashboard login + a Stripe receipt.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex-shrink-0">
                  <Robot weight="duotone" className="w-4 h-4" />
                </span>
                <span>
                  Your sales rep will reach out within a business day to wire up your phone number and tune the agent for your business.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex-shrink-0">
                  <Lightning weight="duotone" className="w-4 h-4" />
                </span>
                <span>
                  Most receptionists are answering live calls within 24 hours.
                </span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-medium rounded-xl px-5 py-3 hover:bg-gray-800 transition-colors"
            >
              Log in to your dashboard <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="mailto:anthony@cloudgreet.com"
              className="inline-flex items-center justify-center gap-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl px-5 py-3 hover:bg-gray-50 transition-colors"
            >
              <EnvelopeSimple weight="bold" className="w-4 h-4" /> Contact support
            </a>
          </div>
        </motion.div>

        <p className="text-xs text-gray-400 text-center mt-6">
          {sessionId && <span className="font-mono">{sessionId.slice(0, 16)}…</span>}
          {!sessionId && 'CloudGreet · AI receptionist for service businesses'}
        </p>
      </div>
    </main>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={null}>
      <PaymentSuccessContent />
    </Suspense>
  )
}
