"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { House, ArrowLeft, Question, Phone, Brain } from '@phosphor-icons/react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-gray-100 flex items-center justify-center">
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mb-8"
          >
            <div className="text-7xl md:text-9xl font-bold tracking-tight bg-gradient-to-br from-sky-400 to-indigo-500 bg-clip-text text-transparent mb-4">
              404
            </div>
            <div className="text-3xl md:text-5xl font-medium tracking-tight text-gray-100">
              Page not found
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-base sm:text-lg text-gray-400 mb-10 max-w-xl mx-auto leading-relaxed"
          >
            The page you&apos;re looking for doesn&apos;t exist. It may have been moved, deleted, or the URL was mistyped.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-3 justify-center mb-16"
          >
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-900 hover:bg-gray-200 rounded-lg font-medium text-sm transition-colors"
            >
              <House className="w-4 h-4" />
              Go home
            </Link>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-gray-200 rounded-lg font-medium text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Go back
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="grid sm:grid-cols-3 gap-3 max-w-3xl mx-auto"
          >
            <Link
              href="/#how-it-works"
              className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-5 transition-colors"
            >
              <Question className="w-6 h-6 text-sky-400 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-gray-100 mb-1">How it works</h3>
              <p className="text-xs text-gray-500 leading-relaxed">Learn how CloudGreet helps service businesses.</p>
            </Link>

            <Link
              href="/contact"
              className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-5 transition-colors"
            >
              <Phone className="w-6 h-6 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-gray-100 mb-1">Contact</h3>
              <p className="text-xs text-gray-500 leading-relaxed">Get in touch with the team.</p>
            </Link>

            <Link
              href="/dashboard"
              className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-5 transition-colors"
            >
              <Brain className="w-6 h-6 text-indigo-400 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-gray-100 mb-1">Dashboard</h3>
              <p className="text-xs text-gray-500 leading-relaxed">Sign in to your CloudGreet dashboard.</p>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
