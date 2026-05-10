'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle, WarningCircle, CircleNotch, ArrowSquareOut, Database, Users, BookOpen, ArrowUpRight, ArrowsClockwise } from '@phosphor-icons/react'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { AdminShell } from '@/app/admin/_components/Shell'
import { Panel, PanelHeader, GhostButton } from '@/app/admin/_components/ui'

type EnvCheck = {
 name: string
 configured: boolean
 purpose: string
 group: 'auth' | 'billing' | 'leads' | 'app'
 doc?: string
}

type EnvGroup = {
 id: 'auth' | 'billing' | 'leads' | 'app'
 label: string
 checks: EnvCheck[]
}

const SETTINGS_LINKS: { label: string; description: string; href: string; icon: React.ElementType }[] = [
 {
  label: 'Per-client tuning',
  description: 'Edit a contractor\'s name, services, plan, AI greeting/tone via /admin/clients/[id].',
  href: '/admin',
  icon: Users,
 },
 {
  label: 'Lead scraper',
  description: 'TDLR / TSBPE / TDA license databases and Google Places sources.',
  href: '/admin/tools/scraper',
  icon: Database,
 },
 {
  label: 'Knowledge base',
  description: 'Public FAQ entries the AI agent can reference.',
  href: '/admin/knowledge',
  icon: BookOpen,
 },
]

export default function OwnerSettingsPage() {
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [groups, setGroups] = useState<EnvGroup[]>([])
 const [totals, setTotals] = useState<{ total: number; configured: number }>({ total: 0, configured: 0 })

 const load = async () => {
  setLoading(true); setError('')
  try {
   const res = await fetchWithAuth('/api/admin/env-status')
   const json = await res.json().catch(() => ({}))
   if (!res.ok || !json.success) throw new Error(json?.error || `Failed (${res.status})`)
   setGroups(json.groups || [])
   setTotals(json.totals || { total: 0, configured: 0 })
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Failed to load env status')
  } finally {
   setLoading(false)
  }
 }

 useEffect(() => { load() }, [])

 const allConfigured = totals.total > 0 && totals.configured === totals.total
 const headerTone = allConfigured ? 'emerald' : 'amber'

 return (
  <AdminShell activeLabel="Tools">
   <section className="px-4 lg:px-8 py-6 lg:py-10">
    <div className="max-w-4xl space-y-4">
     <header className="space-y-2 mb-6">
      <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500">
       owner console
      </div>
      <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight text-white">
       Operational status
      </h1>
      <p className="text-sm text-gray-400 max-w-2xl">
       Read-only checklist of the environment variables this deployment depends on. Values stay
       in Vercel - only presence is exposed here.
      </p>
     </header>

     {/* Status pill */}
     <Panel>
      <div className="flex items-center justify-between gap-4 flex-wrap">
       <div className="flex items-center gap-3">
        <span className={`inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full border ${
         headerTone === 'emerald'
          ? 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20'
          : 'bg-amber-400/10 text-amber-300 border-amber-400/20'
        }`}>
         <span className={`w-1.5 h-1.5 rounded-full ${headerTone === 'emerald' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
         {allConfigured ? 'all wired' : 'partial'}
        </span>
        <div className="text-sm text-gray-300 font-mono">
         <span className="text-white">{totals.configured}</span>
         <span className="text-gray-500"> / </span>
         <span>{totals.total}</span>
         <span className="text-gray-500"> env vars set</span>
        </div>
       </div>
       <GhostButton onClick={load} disabled={loading}>
        <ArrowsClockwise className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
       </GhostButton>
      </div>
     </Panel>

     {/* Env groups */}
     {error && (
      <Panel>
       <div className="flex items-start gap-3">
        <WarningCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
        <div>
         <h3 className="text-sm font-medium text-white">Couldn&apos;t load env status</h3>
         <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
       </div>
      </Panel>
     )}

     {loading && groups.length === 0 ? (
      <Panel>
       <div className="py-10 flex items-center justify-center">
        <CircleNotch className="w-5 h-5 text-gray-500 animate-spin" />
       </div>
      </Panel>
     ) : (
      groups.map((g) => (
       <Panel key={g.id} padding="none">
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-white/[0.06]">
         <PanelHeader
          title={g.label}
          eyebrow={`${g.checks.filter((c) => c.configured).length} / ${g.checks.length}`}
         />
        </div>
        <ul className="divide-y divide-white/[0.04]">
         {g.checks.map((c) => (
          <li key={c.name} className="px-5 sm:px-6 py-4 flex items-start gap-3">
           {c.configured ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
           ) : (
            <span className="w-4 h-4 rounded-full border border-amber-400/40 bg-amber-400/10 flex-shrink-0 mt-0.5" />
           )}
           <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
             <code className="font-mono text-sm text-white break-all">{c.name}</code>
             {c.doc && (
              <a
               href={c.doc} target="_blank" rel="noreferrer"
               className="text-[10px] font-mono uppercase tracking-wider text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"
              >
               where to set <ArrowSquareOut className="w-3 h-3" />
              </a>
             )}
            </div>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{c.purpose}</p>
            {!c.configured && (
             <p className="text-[10px] font-mono uppercase tracking-wider text-amber-300 mt-1.5">
              missing - add in vercel · settings · environment variables, then redeploy
             </p>
            )}
           </div>
          </li>
         ))}
        </ul>
       </Panel>
      ))
     )}

     {/* Where settings actually live */}
     <Panel className="mt-6">
      <PanelHeader title="Where settings live" eyebrow="Quick links" />
      <p className="text-xs text-gray-500 mb-3">
       This page used to host integration credential editing, AI prompt tuning, and prospecting
       filters - none of that is the source of truth anymore. Configuration lives in three places:
      </p>
      <ul className="space-y-2">
       {SETTINGS_LINKS.map((l) => (
        <li key={l.href}>
         <Link
          href={l.href}
          className="block group bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 transition-all duration-300 ease-out"
         >
          <div className="flex items-start gap-3">
           <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
            <l.icon className="w-4 h-4 text-sky-400" />
           </div>
           <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white">{l.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{l.description}</div>
           </div>
           <ArrowUpRight className="w-4 h-4 text-gray-600 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all duration-300 ease-out" />
          </div>
         </Link>
        </li>
       ))}
      </ul>
     </Panel>
    </div>
   </section>
  </AdminShell>
 )
}
