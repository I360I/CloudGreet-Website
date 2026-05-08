"use client"

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ErrorBoundary } from '@/app/components/ErrorBoundary'

function TCPAA2PPageContent() {
 return (
 <div className="min-h-screen bg-[#f6f5f1] text-gray-900">
 <motion.nav
 initial={{ opacity: 0, y: -20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.6 }}
 className="border-b border-gray-200 bg-white/80 backdrop-blur sticky top-0 z-50"
 >
 <div className="max-w-6xl mx-auto px-4 py-4">
 <div className="flex items-center justify-between">
 <Link href="/" className="flex items-center">
 <span className="text-2xl font-medium tracking-tight text-gray-900">CloudGreet</span>
 </Link>
 <Link
 href="/"
 className="bg-gray-900 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
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
 className="prose prose-gray max-w-none"
 >
 <h1 className="text-4xl md:text-5xl font-medium tracking-tight mb-6 text-gray-900">
 TCPA / A2P Compliance Policy
 </h1>
 <p className="text-base text-gray-500 mb-10">
 Last updated: May 7, 2026
 </p>

 <div className="bg-white rounded-2xl p-8 border border-gray-200">
 <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
 <h3 className="text-lg font-semibold text-amber-900 mb-2">Plain-English summary</h3>
 <p className="text-gray-700">
 CloudGreet is a voice-first AI receptionist. The only automated text
 message we send today is a single booking-confirmation SMS to a
 caller after they schedule an appointment with one of our customers.
 We do not send marketing texts, broadcast campaigns, or proactive
 reminder / follow-up messages. STOP / HELP / UNSTOP keywords are
 honored. This page describes that program in detail.
 </p>
 </div>

 <h2 className="text-2xl font-bold text-gray-900 mb-6">1. What this policy covers</h2>
 <p className="text-gray-700 leading-relaxed mb-6">
 The Telephone Consumer Protection Act (TCPA) and the carrier-driven
 Application-to-Person (A2P) framework regulate automated calls and
 text messages to consumers in the United States. CloudGreet operates
 a narrow text-message program in support of voice calls, described
 below. This policy explains what we send, on whose behalf, and how
 a recipient can opt out.
 </p>

 <h2 className="text-2xl font-bold text-gray-900 mb-6">2. Messages we send today</h2>
 <p className="text-gray-700 leading-relaxed mb-4">
 The only automated message CloudGreet sends in the current product is:
 </p>
 <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 mb-6">
 <h4 className="text-sm font-semibold text-sky-900 mb-1 uppercase tracking-wider">Booking confirmation</h4>
 <p className="text-gray-700 text-sm">
 Triggered when our customer&apos;s AI agent books an appointment during
 a phone call. The SMS contains the appointment date, time, and
 service requested, plus the line <em>&ldquo;Reply STOP to opt out;
 HELP for help.&rdquo;</em> Sent from the customer&apos;s assigned
 outbound number, not a generic CloudGreet number.
 </p>
 </div>
 <p className="text-gray-700 leading-relaxed mb-6">
 We do <strong>not</strong> send marketing messages, broadcast
 campaigns, surveys, drip sequences, reminder messages, follow-up
 messages, or any other text traffic without an explicit policy
 update. If we add new message categories in the future this page
 will be updated and existing recipients will be notified before
 the new traffic begins.
 </p>

 <h2 className="text-2xl font-bold text-gray-900 mb-6">3. Consent</h2>
 <p className="text-gray-700 leading-relaxed mb-6">
 The booking-confirmation SMS is sent only to a phone number that
 the recipient provided directly to our customer&apos;s AI agent
 during a live inbound call for the express purpose of receiving
 that confirmation. This is the kind of transactional, single-message
 confirmation that carriers and regulators treat as having implied
 consent given the call context. We do not import contact lists, buy
 phone numbers, or send messages to numbers obtained outside the
 active call that triggered the message.
 </p>

 <h2 className="text-2xl font-bold text-gray-900 mb-6">4. Opt-out (STOP / HELP / UNSTOP)</h2>
 <p className="text-gray-700 leading-relaxed mb-4">
 Every outbound message ends with the line <em>&ldquo;Reply STOP to
 opt out; HELP for help.&rdquo;</em> Inbound messages on those
 numbers are routed to our SMS webhook which handles the standard
 keywords:
 </p>
 <ul className="list-disc list-inside text-gray-700 space-y-2 mb-6">
 <li><strong>STOP</strong> &mdash; future messages to that number are blocked. We reply once with confirmation: <em>&ldquo;You have been opted out. Reply UNSTOP to rejoin.&rdquo;</em></li>
 <li><strong>UNSTOP</strong> &mdash; reverses an opt-out. We reply once with <em>&ldquo;You have been opted in again. Reply STOP to opt out; HELP for help.&rdquo;</em></li>
 <li><strong>HELP</strong> &mdash; we reply with our identity line and instructions: <em>&ldquo;CloudGreet: Reply STOP to opt out; HELP for help.&rdquo;</em></li>
 </ul>
 <p className="text-gray-700 leading-relaxed mb-6">
 Opt-out status is stored against the phone number; the same number
 cannot be re-messaged until UNSTOP is received. You can also opt out
 by replying to any message with the words <em>cancel, end, quit,</em>
 or <em>unsubscribe</em>; we treat all of these the same as STOP.
 </p>

 <h2 className="text-2xl font-bold text-gray-900 mb-6">5. Identity and disclosures in every message</h2>
 <p className="text-gray-700 leading-relaxed mb-4">
 Every SMS we send includes:
 </p>
 <ul className="list-disc list-inside text-gray-700 space-y-2 mb-6">
 <li>The sending business&apos;s name (our customer&apos;s name &mdash; e.g. &ldquo;ABC Plumbing&rdquo;), so the recipient knows who is texting.</li>
 <li>The purpose of the message (the booked appointment).</li>
 <li>The opt-out instruction (<em>Reply STOP to opt out</em>).</li>
 </ul>

 <h2 className="text-2xl font-bold text-gray-900 mb-6">6. Carrier registration</h2>
 <p className="text-gray-700 leading-relaxed mb-6">
 A2P 10DLC registration is the carrier-mandated process for
 application-originated messaging in the US. Where required by our
 messaging provider for the volume and content of traffic above,
 we register our brand and use cases through Telnyx&apos;s 10DLC
 portal. We do not send messages on a use case for which the
 carrier registration is incomplete or pending.
 </p>

 <h2 className="text-2xl font-bold text-gray-900 mb-6">7. Customer responsibilities</h2>
 <p className="text-gray-700 leading-relaxed mb-4">
 If you are a CloudGreet customer (a business using our service):
 </p>
 <ul className="list-disc list-inside text-gray-700 space-y-2 mb-6">
 <li>You may only use CloudGreet to receive calls from people who chose to call you. You may not import outbound campaigns or contact lists into our service.</li>
 <li>You must be the actual owner of the business name and phone numbers configured on your account.</li>
 <li>You may not configure the AI agent to deceive callers about the sending business&apos;s identity.</li>
 <li>You acknowledge that the booking-confirmation SMS is sent under your business&apos;s name, and you are responsible for honoring the appointment that triggered it.</li>
 </ul>

 <h2 className="text-2xl font-bold text-gray-900 mb-6">8. Recordkeeping</h2>
 <p className="text-gray-700 leading-relaxed mb-6">
 Every outbound message and inbound reply is logged with timestamp,
 phone numbers, and full message text in our <code className="font-mono text-sm">sms_messages</code> table.
 Opt-out events are durable. We retain these records for at least
 four years to support carrier audits and consumer complaints.
 </p>

 <h2 className="text-2xl font-bold text-gray-900 mb-6">9. Reporting violations</h2>
 <p className="text-gray-700 leading-relaxed mb-6">
 If you believe you received an SMS from CloudGreet or one of our
 customers that does not comply with this policy, write to{' '}
 <a href="mailto:anthony@cloudgreet.com" className="text-sky-700 hover:underline">anthony@cloudgreet.com</a>{' '}
 with the message in question (screenshot or forwarded text). We
 investigate every report and respond within 5 business days.
 </p>

 <h2 className="text-2xl font-bold text-gray-900 mb-6">10. Changes to this policy</h2>
 <p className="text-gray-700 leading-relaxed mb-6">
 We may update this page when we change what messages we send,
 add a new use case, or in response to changes in TCPA / A2P rules.
 The &ldquo;Last updated&rdquo; date at the top reflects the most
 recent change. Material changes will be communicated to active
 customers in advance.
 </p>

 <h2 className="text-2xl font-bold text-gray-900 mb-6">11. Contact</h2>
 <p className="text-gray-700 leading-relaxed mb-6">
 Questions, opt-out problems, or compliance reports go to{' '}
 <a href="mailto:anthony@cloudgreet.com" className="text-sky-700 hover:underline">anthony@cloudgreet.com</a>{' '}
 or through our contact page. CloudGreet is operated from Austin, Texas.
 </p>

 <div className="bg-rose-50 border border-rose-200 rounded-lg p-6 mt-8">
 <h3 className="text-lg font-semibold text-rose-900 mb-2">Legal disclaimer</h3>
 <p className="text-gray-700 text-sm">
 This page is provided for informational purposes and does not
 constitute legal advice. It is intended to describe CloudGreet&apos;s
 current SMS practices accurately so consumers and customers can
 make informed decisions; it is not a substitute for advice from
 qualified counsel about your specific situation.
 </p>
 </div>
 </div>
 </motion.div>
 </div>
 </div>
 )
}

export default function TCPAA2PPage() {
 return (
 <ErrorBoundary>
 <TCPAA2PPageContent />
 </ErrorBoundary>
 )
}
