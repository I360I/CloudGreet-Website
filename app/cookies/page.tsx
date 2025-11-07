"use client"

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ErrorBoundary } from '@/app/components/ErrorBoundary'

function CookiesPageContent() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-black to-slate-900 text-white">
      {/* Navigation */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="border-b border-gray-800/50 backdrop-blur-md bg-black/20 sticky top-0 z-50"
      >
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/landing" className="flex items-center">
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-purple-300">CloudGreet</span>
            </Link>
            <Link
              href="/landing"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </motion.nav>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="prose prose-invert max-w-none"
        >
          <h1 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-200 to-purple-300">
            Cookie Policy
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            Last updated: 10/14/2025
          </p>

          <div className="bg-gray-800/30 backdrop-blur-lg rounded-2xl p-8 border border-gray-700/50">
            <h2 className="text-2xl font-bold text-white mb-6">1. What Are Cookies?</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              Cookies are small text files that are placed on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and understanding how you use our service.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">2. Types of Cookies We Use</h2>
            <div className="space-y-4 mb-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Essential Cookies</h3>
                <p className="text-gray-300 leading-relaxed mb-2">
                  These cookies are necessary for the website to function properly. They enable core functionality such as security, authentication, and session management.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Analytics Cookies</h3>
                <p className="text-gray-300 leading-relaxed mb-2">
                  We use analytics cookies to understand how visitors interact with our website. This helps us improve our service and user experience.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Preference Cookies</h3>
                <p className="text-gray-300 leading-relaxed mb-2">
                  These cookies remember your preferences and settings to provide a personalized experience on future visits.
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-6">3. Third-Party Cookies</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We may use third-party services that set their own cookies, including:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-6">
              <li><strong>Analytics Services:</strong> Google Analytics and similar tools</li>
              <li><strong>Payment Processors:</strong> Stripe for secure payment processing</li>
              <li><strong>Authentication:</strong> Session management and security</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-6">4. Managing Cookies</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              You can control and manage cookies in several ways:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-6">
              <li><strong>Browser Settings:</strong> Most browsers allow you to refuse or delete cookies through their settings</li>
              <li><strong>Opt-Out Tools:</strong> You can use browser extensions or opt-out tools provided by third-party services</li>
              <li><strong>Impact:</strong> Note that disabling cookies may affect the functionality of our website</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-6">5. Cookie Duration</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              Cookies may be either "persistent" or "session" cookies. Persistent cookies remain on your device for a set period or until you delete them, while session cookies are deleted when you close your browser.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">6. Updates to This Policy</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              We may update this cookie policy from time to time. We will notify you of any material changes by posting the new policy on this page.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">7. Contact Us</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              If you have questions about our use of cookies, please contact us at privacy@cloudgreet.ai or through our contact page.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function CookiesPage() {
  return (
    <ErrorBoundary>
      <CookiesPageContent />
    </ErrorBoundary>
  )
}

