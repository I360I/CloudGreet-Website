'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { XCircle, EnvelopeSimple, ArrowLeft } from '@phosphor-icons/react'

export const dynamic = 'force-dynamic'

const EASE = [0.22, 1, 0.36, 1] as const

function PaymentCancelContent() {
  return (
    <main className="min-h-screen bg-[#f6f5f1] flex items-center justify-center px-6 py-12">
      <div className="max-w-xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="bg-white border border-gray-200 rounded-3xl shadow-lg shadow-gray-900/5 p-8 sm:p-10 text-center"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-100 text-gray-500 mb-5">
            <XCircle weight="duotone" className="w-8 h-8" />
          </div>

          <h1 className="font-display text-3xl font-medium tracking-tight text-gray-900 mb-3">
            No charge made.
          </h1>

          <p className="text-base text-gray-600 mb-7 leading-relaxed">
            You closed the checkout before completing payment. Nothing was charged
            to your card. If this was a mistake, the same payment link should still
            work - just check your email or reach out to the rep who sent it.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="javascript:history.back()"
              className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-medium rounded-xl px-5 py-3 hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to the link
            </a>
            <a
              href="mailto:anthony@cloudgreet.com"
              className="inline-flex items-center justify-center gap-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl px-5 py-3 hover:bg-gray-50 transition-colors"
            >
              <EnvelopeSimple weight="bold" className="w-4 h-4" /> Contact support
            </a>
          </div>
        </motion.div>

        <p className="text-xs text-gray-400 text-center mt-6">
          CloudGreet · AI receptionist for service businesses
        </p>
      </div>
    </main>
  )
}

export default function PaymentCancelPage() {
  return (
    <Suspense fallback={null}>
      <PaymentCancelContent />
    </Suspense>
  )
}
