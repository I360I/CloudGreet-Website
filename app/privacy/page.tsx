"use client"

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <div className="bg-gray-800/30 backdrop-blur-lg rounded-2xl p-8 border border-gray-700/50">
            <h2 className="text-2xl font-bold text-white mb-6">1. Information We Collect</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We collect information to provide and improve our services:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-6">
              <li><strong>Account Information:</strong> Business name, contact details, billing information</li>
              <li><strong>Call Data:</strong> Recordings, transcripts, caller information</li>
              <li><strong>Customer Data:</strong> Information from callers including names, phone numbers, service requests</li>
              <li><strong>Usage Data:</strong> How you interact with our service and dashboard</li>
              <li><strong>Technical Data:</strong> IP addresses, device information, browser type</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-6">2. How We Use Your Information</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We use collected information to:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-6">
              <li>Provide AI call answering and lead qualification services</li>
              <li>Schedule appointments and send confirmations</li>
              <li>Process payments and manage billing</li>
              <li>Provide customer support and technical assistance</li>
              <li>Improve our services and develop new features</li>
              <li>Comply with legal obligations and protect our rights</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-6">3. Information Sharing</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We do not sell your personal information. We may share information only in these circumstances:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-6">
              <li><strong>Service Providers:</strong> Third-party vendors who help us operate our service</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale</li>
              <li><strong>Consent:</strong> When you explicitly authorize us to share information</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-6">4. Data Security</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              We implement industry-standard security measures to protect your data, including encryption in transit and at rest, secure data centers, and regular security audits. However, no system is 100% secure, and we cannot guarantee absolute security.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">5. Data Retention</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              We retain your data for as long as your account is active or as needed to provide services. Call recordings and transcripts are kept for up to 2 years unless you request earlier deletion. You can request data deletion at any time.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">6. Your Rights</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-6">
              <li>Access your personal data</li>
              <li>Correct inaccurate information</li>
              <li>Delete your data (subject to legal obligations)</li>
              <li>Export your data in a portable format</li>
              <li>Opt out of marketing communications</li>
              <li>Withdraw consent for data processing</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-6">7. Cookies and Tracking</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              We use cookies and similar technologies to improve your experience, analyze usage, and provide personalized content. You can control cookie settings through your browser, though some features may not work properly without cookies.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">8. Third-Party Services</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              Our service integrates with third-party services like calendar providers and payment processors. These services have their own privacy policies, and we encourage you to review them.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">9. International Transfers</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">10. Children's Privacy</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              Our service is not intended for children under 13. We do not knowingly collect personal information from children under 13.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">11. Changes to This Policy</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              We may update this privacy policy from time to time. We will notify you of any material changes via email or through our service.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">12. Contact Us</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              For questions about this privacy policy or to exercise your rights, contact us at privacy@cloudgreet.ai or through our contact page.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
