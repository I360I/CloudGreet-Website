'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
 SquaresFour, Phone, CurrencyDollar, ListChecks, MagicWand, SignOut, Users,
 FileText, Robot, PhoneOutgoing, TestTube, ChatText, CalendarCheck, DotsThree, X, Article, Envelope, UserPlus, BookOpen,
} from '@phosphor-icons/react'
import { useAdminTheme } from './Shell'

type Item = {
 icon: React.ElementType
 label: string
 href: string
 match: (pathname: string) => boolean
}

type Group = { heading: string | null; items: Item[] }

const groups: Group[] = [
 {
  heading: null,
  items: [
   { icon: SquaresFour, label: 'Overview', href: '/admin', match: (p) => p === '/admin' || p.startsWith('/admin/clients') },
  ],
 },
 {
  heading: 'Operations',
  items: [
   { icon: Phone, label: 'Calls', href: '/admin/calls', match: (p) => p.startsWith('/admin/calls') },
   { icon: ChatText, label: 'Texts', href: '/admin/conversations', match: (p) => p.startsWith('/admin/conversations') },
   { icon: CalendarCheck, label: 'Demos', href: '/admin/demos', match: (p) => p.startsWith('/admin/demos') },
   { icon: TestTube, label: 'Quality', href: '/admin/quality', match: (p) => p.startsWith('/admin/quality') },
  ],
 },
 {
  heading: 'Revenue',
  items: [
   { icon: CurrencyDollar, label: 'Billing', href: '/admin/billing', match: (p) => p.startsWith('/admin/billing') },
   { icon: Users, label: 'Sales', href: '/admin/sales', match: (p) => p.startsWith('/admin/sales') },
   { icon: UserPlus, label: 'Setters', href: '/admin/setters', match: (p) => p.startsWith('/admin/setters') },
   { icon: ListChecks, label: 'Leads', href: '/admin/leads', match: (p) => p.startsWith('/admin/leads') },
   { icon: FileText, label: 'Applications', href: '/admin/applications', match: (p) => p.startsWith('/admin/applications') },
   { icon: PhoneOutgoing, label: 'Dialer', href: '/admin/dialer', match: (p) => p.startsWith('/admin/dialer') },
   { icon: FileText, label: 'Scripts', href: '/admin/scripts', match: (p) => p.startsWith('/admin/scripts') },
   { icon: BookOpen, label: 'Knowledge', href: '/admin/sales-knowledge', match: (p) => p.startsWith('/admin/sales-knowledge') },
   { icon: Envelope, label: 'Email Campaigns', href: '/admin/email-campaigns', match: (p) => p.startsWith('/admin/email-campaigns') },
  ],
 },
 {
  heading: 'Intelligence',
  items: [
   { icon: Robot, label: 'Agents Due', href: '/admin/agents-due', match: (p) => p.startsWith('/admin/agents-due') },
   { icon: Article, label: 'Blog', href: '/admin/blog', match: (p) => p.startsWith('/admin/blog') },
   { icon: MagicWand, label: 'Tools', href: '/admin/tools', match: (p) => p.startsWith('/admin/tools') },
  ],
 },
]

const items: Item[] = groups.flatMap((g) => g.items)

export type AdminActiveLabel =
 | 'Overview' | 'Calls' | 'Texts' | 'Demos' | 'Billing' | 'Sales' | 'Setters' | 'Dialer' | 'Scripts' | 'Knowledge' | 'Applications' | 'Leads' | 'Tools' | 'Agents Due' | 'Quality' | 'Blog' | 'Email Campaigns'

export function AdminSidebar({ adminEmail, onSignOut, activeLabel }: {
 adminEmail: string
 onSignOut: () => void
 activeLabel?: AdminActiveLabel
}) {
 const pathname = usePathname() || '/admin'
 const { theme } = useAdminTheme()

 return (
  <>
   <AdminMobileNav pathname={pathname} activeLabel={activeLabel} />
   <aside className="hidden lg:flex w-60 flex-col bg-[#0a0c10]/85 backdrop-blur-xl border-r border-white/[0.06] sticky top-0 h-screen z-[2]">
    <div className="px-5 py-5 flex items-center gap-2.5">
     <Link href="/admin" className="flex items-center" aria-label="CloudGreet Admin">
      <Image
       src={theme === 'light' ? '/cloudgreet-logo.png' : '/cloudgreet-logo-white.png'}
       alt="CloudGreet"
       width={140}
       height={40}
       priority
       className="h-7 w-auto"
       onError={(e) => {
        // Fall back to dark logo if white version isn't deployed yet
        const el = e.currentTarget as HTMLImageElement
        if (el.src.includes('logo-white')) el.src = '/cloudgreet-logo.png'
       }}
      />
     </Link>
     <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-sky-400 bg-sky-500/10 border border-sky-400/20 rounded px-1.5 py-0.5">
      admin
     </span>
    </div>

    {/* Explicit px paddings here: the project's tailwind spacing scale is
        inflated (py-2 = 16px), which made 12 grouped items overflow 1080p. */}
    <nav className="px-[10px] flex-1 overflow-y-auto">
     {groups.map((group, gi) => (
      <div key={gi} className={gi > 0 ? 'mt-[16px]' : ''}>
       {group.heading && (
        <div className="px-[10px] mb-[5px] text-[9px] font-mono uppercase tracking-[0.24em] text-gray-600">
         {group.heading}
        </div>
       )}
       {group.items.map((item) => {
        const active = activeLabel ? item.label === activeLabel : item.match(pathname)
        return (
         <Link
          key={item.label}
          href={item.href}
          className={`relative flex items-center gap-[10px] px-[10px] py-[7px] rounded-xl text-sm transition-all duration-300 ease-out mb-[2px] ${
           active
            ? 'text-white bg-gradient-to-r from-sky-400/[0.14] to-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
            : 'text-gray-400 hover:text-white hover:bg-white/[0.03]'
          }`}
         >
          {active && (
           <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2.5px] rounded-full bg-gradient-to-b from-sky-300 to-sky-500 shadow-[0_0_10px_rgba(56,189,248,0.8)]" />
          )}
          <item.icon weight={active ? 'fill' : 'regular'} className={`w-4 h-4 ${active ? 'text-sky-400' : ''}`} />
          {item.label}
         </Link>
        )
       })}
      </div>
     ))}
    </nav>

    <div className="px-[10px] pb-[16px] border-t border-white/[0.06] pt-[12px] mt-[12px]">
     <div className="px-[10px] mb-[10px] flex items-center gap-[10px]">
      <div className="relative w-9 h-9 rounded-full overflow-hidden bg-gradient-to-b from-sky-400/20 to-indigo-500/10 border border-white/10 flex items-end justify-center">
       <Image
        src="/chat-agent-pose.png"
        alt=""
        width={30}
        height={42}
        className="cg-float w-[26px] h-auto translate-y-1"
       />
      </div>
      <div className="min-w-0">
       <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">Signed in</div>
       <div className="text-sm font-medium text-white truncate">{adminEmail}</div>
      </div>
     </div>
     <button
      onClick={onSignOut}
      className="w-full flex items-center gap-[10px] px-[10px] py-[7px] rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/[0.03] transition-all duration-300 ease-out"
     >
      <SignOut className="w-4 h-4" /> Sign out
     </button>
    </div>
   </aside>
  </>
 )
}

/* ------------------------------- Mobile nav ------------------------------ */

const MOBILE_PRIMARY = ['Overview', 'Calls', 'Texts', 'Billing', 'Sales']

function AdminMobileNav({ pathname, activeLabel }: { pathname: string; activeLabel?: AdminActiveLabel }) {
 const [moreOpen, setMoreOpen] = useState(false)
 const primary = MOBILE_PRIMARY
  .map((l) => items.find((it) => it.label === l))
  .filter(Boolean) as Item[]
 const overflow = items.filter((it) => !MOBILE_PRIMARY.includes(it.label))
 const isActive = (item: Item) => (activeLabel ? item.label === activeLabel : item.match(pathname))
 const overflowActive = overflow.some(isActive)

 return (
  <>
   <AnimatePresence>
    {moreOpen && (
     <>
      <motion.button
       aria-label="Close menu"
       className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
       initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
       onClick={() => setMoreOpen(false)}
      />
      <motion.div
       className="lg:hidden fixed bottom-0 inset-x-0 z-50 rounded-t-3xl border-t border-white/10 bg-[#0b0d12]/98 backdrop-blur-xl px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+76px)]"
       initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
       transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
       <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-gray-500">More</span>
        <button onClick={() => setMoreOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-white">
         <X className="w-4 h-4" />
        </button>
       </div>
       <div className="grid grid-cols-4 gap-2">
        {overflow.map((item) => {
         const active = isActive(item)
         return (
          <Link
           key={item.label}
           href={item.href}
           onClick={() => setMoreOpen(false)}
           className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl text-[10px] font-medium border ${
            active
             ? 'text-white bg-sky-400/10 border-sky-400/25'
             : 'text-gray-400 border-white/[0.06] bg-white/[0.02]'
           }`}
          >
           <item.icon className={`w-5 h-5 ${active ? 'text-sky-400' : ''}`} />
           {item.label}
          </Link>
         )
        })}
       </div>
      </motion.div>
     </>
    )}
   </AnimatePresence>

   <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0a0c10]/95 backdrop-blur-xl border-t border-white/[0.06] px-2 pt-1.5 pb-[env(safe-area-inset-bottom)]">
    <div className="flex items-stretch justify-around">
     {primary.map((item) => {
      const active = isActive(item)
      return (
       <Link
        key={item.label}
        href={item.href}
        className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
         active ? 'text-white' : 'text-gray-500 hover:text-white'
        }`}
       >
        <item.icon weight={active ? 'fill' : 'regular'} className={`w-5 h-5 ${active ? 'text-sky-400' : ''}`} />
        {item.label}
       </Link>
      )
     })}
     <button
      onClick={() => setMoreOpen(true)}
      className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
       overflowActive ? 'text-white' : 'text-gray-500 hover:text-white'
      }`}
     >
      <DotsThree weight="bold" className={`w-5 h-5 ${overflowActive ? 'text-sky-400' : ''}`} />
      More
     </button>
    </div>
   </nav>
  </>
 )
}

export function AdminSidebarSkeleton() {
 return (
  <aside className="hidden lg:block w-60 border-r border-white/[0.06] sticky top-0 h-screen bg-[#0a0c10]/85 z-[2]">
   <div className="p-5"><div className="h-7 w-32 bg-white/[0.06] rounded animate-pulse" /></div>
   <div className="px-5 space-y-2.5">
    {[...Array(6)].map((_, i) => <div key={i} className="h-7 bg-white/[0.04] rounded animate-pulse" />)}
   </div>
  </aside>
 )
}
