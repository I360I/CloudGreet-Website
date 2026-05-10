'use client'

import Link from 'next/link'
import { Database, MagicWand, ArrowUpRight, Plug, ChatCircle, ShoppingCart, ArrowsClockwise, FileText, Pulse, Gauge, Lifebuoy } from '@phosphor-icons/react'
import { AdminShell } from '../_components/Shell'
import { Panel } from '../_components/ui'

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
 return (
  <AdminShell activeLabel="Tools">
   <section className="px-4 lg:px-8 py-6 lg:py-10">
    <div className="max-w-3xl">
     <div className="mb-8">
      <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500 mb-1.5">
       Operator utilities
      </div>
      <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight text-white">Tools</h1>
     </div>

     <div className="space-y-3">
      {TOOLS.map((t) => (
       <Link key={t.href} href={t.href} className="block group">
        <Panel className="hover:border-sky-400/30 transition-colors duration-300">
         <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
           <t.icon className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex-1 min-w-0">
           <h2 className="text-base font-medium text-white">{t.label}</h2>
           <p className="text-sm text-gray-500 mt-1">{t.description}</p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-gray-600 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all duration-300 ease-out" />
         </div>
        </Panel>
       </Link>
      ))}
     </div>
    </div>
   </section>
  </AdminShell>
 )
}
