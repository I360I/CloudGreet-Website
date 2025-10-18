"use client"

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ErrorBoundary } from '@/app/components/ErrorBoundary'

function TermsPageContent() {
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
            Terms of Service
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            Last updated: 10/14/2025
          </p>

          <div className="bg-gray-800/30 backdrop-blur-lg rounded-2xl p-8 border border-gray-700/50">
            <h2 className="text-2xl font-bold text-white mb-6">1. Acceptance of Terms</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              By accessing and using CloudGreet&apos;s services, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">2. Description of Service</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              CloudGreet provides AI-powered call answering, lead qualification, and appointment scheduling services for service businesses. Our service includes:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-6">
              <li>AI receptionist answering calls 24/7</li>
              <li>Lead qualification and information gathering</li>
              <li>Calendar integration and appointment scheduling</li>
              <li>SMS confirmations and follow-up</li>
              <li>Call recordings and transcripts</li>
              <li>Dashboard analytics and reporting</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-6">3. Pricing and Billing</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Our pricing is $200 per month plus $50 per qualified booking. You will be charged:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-6">
              <li>$200 monthly base fee, billed in advance</li>
              <li>$50 per qualified booking that results in a scheduled appointment</li>
              <li>All fees are non-refundable except as required by law</li>
              <li>Pricing may change with 30 days notice</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-6">4. User Responsibilities</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              As a CloudGreet user, you agree to:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-6">
              <li>Provide accurate business information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Use the service in compliance with applicable laws</li>
              <li>Not use the service for illegal or fraudulent activities</li>
              <li>Respect customer privacy and data protection requirements</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-6">5. Data and Privacy</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              We collect and process data as described in our Privacy Policy. You retain ownership of your business data, and we will not share your customer information with third parties without your consent, except as required by law.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">6. Service Availability</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              While we strive for 99.9% uptime, we cannot guarantee uninterrupted service. We are not liable for any downtime, service interruptions, or data loss that may occur.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">7. Limitation of Liability</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              CloudGreet&apos;s liability is limited to the amount you paid for the service in the 12 months preceding the claim. We are not liable for indirect, incidental, or consequential damages.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">8. Termination</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              Either party may terminate this agreement at any time. Upon termination, your access to the service will cease, but you may export your data for 30 days after termination.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">9. Changes to Terms</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              We may modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">10. Contact Information</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              For questions about these terms, please contact us at legal@cloudgreet.ai or through our contact page.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function TermsPage() {
  return (
    <ErrorBoundary>
      <TermsPageContent />
    </ErrorBoundary>
  )
}
