'use client'

import Link from 'next/link'
import { Database, Wand2, ArrowUpRight } from 'lucide-react'
import { AdminShell } from '../_components/Shell'
import { Panel } from '../_components/ui'

const TOOLS: { href: string; label: string; description: string; icon: React.ElementType }[] = [
 {
  href: '/admin/tools/scraper',
  label: 'Lead scraper',
  description: 'Pull verified Texas contractors from public licensing databases. HVAC, electrical, plumbing, pest control.',
  icon: Database,
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
           <t.icon className="w-4 h-4 text-sky-400" strokeWidth={1.75} />
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
