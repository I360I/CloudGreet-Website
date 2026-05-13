'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Database, ArrowUpRight, Plug, ChatCircle, ShoppingCart, ArrowsClockwise, FileText, Pulse, Gauge, Lifebuoy, CaretDown } from '@phosphor-icons/react'
import { AdminShell } from '../_components/Shell'

const EASE = [0.22, 1, 0.36, 1] as const

const TOOLS: { href: string; label: string; description: string; icon: React.ElementType }[] = [
 {
  href: '/admin/support-requests',
  label: 'Support requests',
  description: 'Contractor-submitted change requests + messages from the dashboard support button. Triage queue with admin notes and status flips. Slack pings on every new submission.',
  icon: Lifebuoy,
 },
 {
  href: '/admin/system-health',
  label: 'System health',
  description: 'One-page operator dashboard. Env vars, Telnyx balance, demos in next 24h, abandoned onboardings, stuck agents, dunning, recent paid closes, calls under 30s, cron heartbeat. No fake values - sections that can\'t be computed say so explicitly.',
  icon: Gauge,
 },
 {
  href: '/admin/telnyx-health',
  label: 'Telnyx health',
  description: 'Verify env vars, copy webhook URLs to paste into Telnyx, see recent inbound opt-outs + outbound sends + failures. Walk this when setting up a new number or when SMS isn\'t flowing.',
  icon: Pulse,
 },
 {
  href: '/admin/tools/scraper',
  label: 'Lead scraper',
  description: 'Pull verified Texas contractors from public licensing databases. HVAC, electrical, plumbing, pest control, plus Google Places for roofing/painting/handyman/landscaping.',
  icon: Database,
 },
 {
  href: '/admin/buy-sms-number',
  label: 'Buy SMS number',
  description: 'One-click: searches Telnyx for an SMS-capable local US number, orders it, and attaches it to the messaging profile. Paste the result into CLOUDGREET_NOTIFICATIONS_FROM.',
  icon: ShoppingCart,
 },
 {
  href: '/admin/sms-test',
  label: 'SMS tester',
  description: 'Fire a single booking-notification SMS to any number to verify the wiring before onboarding a contractor. Surfaces raw Telnyx response on failure.',
  icon: ChatCircle,
 },
 {
  href: '/admin/agent-prompt',
  label: 'Agent prompt preview',
  description: 'See exactly what the universal agent prompt renders to per industry. Copy it into Claude to iterate, then paste back into the codebase.',
  icon: FileText,
 },
 {
  href: '/admin/agent-backfill',
  label: 'Returning-caller backfill',
  description: 'Push the returning-caller prompt block into every existing Retell agent so contractors who onboarded before the feature shipped get the new behavior. Idempotent.',
  icon: ArrowsClockwise,
 },
 {
  href: '/admin/review-consent-backfill',
  label: 'Review-consent tool param',
  description: 'Add review_consent (boolean) to the book_appointment tool on every existing Retell agent. Required before review-request SMS will start firing. Idempotent.',
  icon: ArrowsClockwise,
 },
 {
  href: '/admin/settings',
  label: 'Integrations',
  description: 'Connect Stripe, Twilio, Retell, OpenAI, and other providers. Credential health is checked live.',
  icon: Plug,
 },
]

export default function AdminToolsPage() {
 const [openHref, setOpenHref] = useState<string | null>(null)

 return (
  <AdminShell activeLabel="Tools">
   <section className="px-4 lg:px-8 py-6 lg:py-10">
    <div className="max-w-3xl">
     <div className="mb-8">
      <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1.5">
       Operator utilities
      </div>
      <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight text-white">Tools</h1>
      <p className="text-sm text-gray-500 mt-2">Tap a tool to see what it does, then open it.</p>
     </div>

     <div className="bg-[#101015] border border-white/[0.06] rounded-2xl overflow-hidden">
      {TOOLS.map((t, i) => {
       const isOpen = openHref === t.href
       return (
        <div key={t.href} className={i > 0 ? 'border-t border-white/[0.04]' : ''}>
         <button
          onClick={() => setOpenHref(isOpen ? null : t.href)}
          className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-white/[0.02] transition-colors group"
         >
          <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
           <t.icon className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex-1 min-w-0 text-left">
           <h2 className="text-sm font-medium text-white truncate">{t.label}</h2>
          </div>
          <CaretDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ease-out ${isOpen ? 'rotate-180 text-sky-400' : ''}`} />
         </button>
         <AnimatePresence initial={false}>
          {isOpen && (
           <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden"
           >
            <div className="px-4 sm:px-5 pb-4 pl-[68px] sm:pl-[72px]">
             <p className="text-sm text-gray-400 leading-relaxed">{t.description}</p>
             <Link
              href={t.href}
              className="mt-3 inline-flex items-center gap-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 hover:text-sky-200 border border-sky-400/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
             >
              Open {t.label} <ArrowUpRight className="w-3.5 h-3.5" />
             </Link>
            </div>
           </motion.div>
          )}
         </AnimatePresence>
        </div>
       )
      })}
     </div>
    </div>
   </section>
  </AdminShell>
 )
}
