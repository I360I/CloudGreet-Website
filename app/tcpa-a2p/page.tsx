"use client"

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function TCPAA2PPage() {
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
            TCPA/A2P Compliance Policy
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <div className="bg-gray-800/30 backdrop-blur-lg rounded-2xl p-8 border border-gray-700/50">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-yellow-300 mb-2">Important Notice</h3>
              <p className="text-gray-300">
                CloudGreet is committed to full compliance with the Telephone Consumer Protection Act (TCPA) and Application-to-Person (A2P) messaging regulations. This policy outlines our compliance measures and your responsibilities.
              </p>
            </div>

            <h2 className="text-2xl font-bold text-white mb-6">1. TCPA Compliance Overview</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              The TCPA regulates telemarketing calls, automated calls, and text messages. CloudGreet operates in full compliance with TCPA requirements, including:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-6">
              <li>Obtaining proper consent before sending automated messages</li>
              <li>Providing clear opt-out mechanisms</li>
              <li>Maintaining detailed consent records</li>
              <li>Respecting the National Do Not Call Registry</li>
              <li>Including required identification in messages</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-6">2. A2P Messaging Compliance</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Application-to-Person (A2P) messaging refers to automated text messages sent from applications to consumers. Our compliance includes:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-6">
              <li>Proper message classification and routing</li>
              <li>Brand registration with messaging aggregators</li>
              <li>Traffic filtering and monitoring</li>
              <li>Compliance with carrier-specific requirements</li>
              <li>Message content and formatting standards</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-6">3. Consent Requirements</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Before sending any automated messages, we ensure:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-6">
              <li><strong>Express Written Consent:</strong> Clear, unambiguous consent to receive messages</li>
              <li><strong>Purpose Disclosure:</strong> Clear explanation of what messages will be sent</li>
              <li><strong>Frequency Disclosure:</strong> Information about message frequency</li>
              <li><strong>Opt-out Instructions:</strong> Clear instructions on how to stop messages</li>
              <li><strong>Consent Records:</strong> Detailed records of when and how consent was obtained</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-6">4. Message Types We Send</h2>
            <div className="space-y-4 mb-6">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-blue-300 mb-2">Appointment Confirmations</h4>
                <p className="text-gray-300 text-sm">Sent when appointments are scheduled or modified</p>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-green-300 mb-2">Reminders</h4>
                <p className="text-gray-300 text-sm">Sent 24 hours before scheduled appointments</p>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-purple-300 mb-2">Follow-up Messages</h4>
                <p className="text-gray-300 text-sm">Sent after service completion or missed appointments</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-6">5. Opt-out Procedures</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Recipients can opt out of messages by:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-6">
              <li>Replying "STOP" to any message</li>
              <li>Replying "UNSUBSCRIBE" to any message</li>
              <li>Calling our support number</li>
              <li>Contacting us through our website</li>
              <li>Emailing us at support@cloudgreet.ai</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-6">6. Message Content Standards</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              All messages include:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-6">
              <li>Clear identification of the sender (your business name)</li>
              <li>Purpose of the message</li>
              <li>Opt-out instructions ("Reply STOP to opt out")</li>
              <li>Contact information for questions</li>
              <li>Professional, non-promotional language</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-6">7. Data Protection</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              We protect customer data in accordance with applicable privacy laws and maintain strict security measures to prevent unauthorized access to personal information.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">8. Your Responsibilities</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              As a CloudGreet customer, you agree to:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mb-6">
              <li>Only use our service for legitimate business purposes</li>
              <li>Ensure you have proper consent before using our messaging features</li>
              <li>Comply with all applicable laws and regulations</li>
              <li>Not use our service for spam or unsolicited communications</li>
              <li>Maintain accurate customer contact information</li>
            </ul>

            <h2 className="text-2xl font-bold text-white mb-6">9. Monitoring and Compliance</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              We continuously monitor our messaging activities for compliance and maintain detailed records of all communications. We also provide tools to help you maintain compliance with your messaging activities.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">10. Violations and Enforcement</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              Violations of TCPA/A2P regulations can result in significant penalties. We take compliance seriously and may suspend or terminate accounts that violate these requirements.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">11. Updates to This Policy</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              We may update this policy to reflect changes in regulations or our practices. We will notify you of any material changes.
            </p>

            <h2 className="text-2xl font-bold text-white mb-6">12. Contact Information</h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              For questions about TCPA/A2P compliance or to report violations, contact us at compliance@cloudgreet.ai or through our contact page.
            </p>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 mt-8">
              <h3 className="text-lg font-semibold text-red-300 mb-2">Legal Disclaimer</h3>
              <p className="text-gray-300 text-sm">
                This policy is for informational purposes only and does not constitute legal advice. 
                You should consult with legal counsel to ensure your specific use case complies with all applicable laws and regulations.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
