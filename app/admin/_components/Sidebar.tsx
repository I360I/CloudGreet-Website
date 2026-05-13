'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SquaresFour, Phone, CurrencyDollar, ListChecks, MagicWand, SignOut, Users, FileText, Robot, PhoneOutgoing } from '@phosphor-icons/react'

type Item = {
 icon: React.ElementType
 label: string
 href: string
 match: (pathname: string) => boolean
}

const items: Item[] = [
 { icon: SquaresFour, label: 'Overview', href: '/admin', match: (p) => p === '/admin' || p.startsWith('/admin/clients') },
 { icon: Phone, label: 'Calls', href: '/admin/calls', match: (p) => p.startsWith('/admin/calls') },
 { icon: CurrencyDollar, label: 'Billing', href: '/admin/billing', match: (p) => p.startsWith('/admin/billing') },
 { icon: Users, label: 'Sales', href: '/admin/sales', match: (p) => p.startsWith('/admin/sales') },
 { icon: PhoneOutgoing, label: 'Dialer', href: '/admin/dialer', match: (p) => p.startsWith('/admin/dialer') },
 { icon: Robot, label: 'Agents Due', href: '/admin/agents-due', match: (p) => p.startsWith('/admin/agents-due') },
 { icon: FileText, label: 'Applications', href: '/admin/applications', match: (p) => p.startsWith('/admin/applications') },
 { icon: ListChecks, label: 'Leads', href: '/admin/leads', match: (p) => p.startsWith('/admin/leads') },
 { icon: MagicWand, label: 'Tools', href: '/admin/tools', match: (p) => p.startsWith('/admin/tools') },
]

export type AdminActiveLabel =
 | 'Overview' | 'Calls' | 'Billing' | 'Sales' | 'Dialer' | 'Applications' | 'Leads' | 'Tools' | 'Agents Due'

export function AdminSidebar({ adminEmail, onSignOut, activeLabel }: {
 adminEmail: string
 onSignOut: () => void
 activeLabel?: AdminActiveLabel
}) {
 const pathname = usePathname() || '/admin'

 return (
  <>
   <AdminMobileNav pathname={pathname} activeLabel={activeLabel} />
   <aside className="hidden lg:flex w-60 flex-col bg-[#0c0c10]/80 backdrop-blur border-r border-white/[0.06] sticky top-0 h-screen">
    <div className="px-5 py-5 flex items-center gap-2.5">
     <Link href="/admin" className="flex items-center" aria-label="CloudGreet Admin">
      <Image
       src="/cloudgreet-logo-white.png"
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

    <nav className="px-3 flex-1">
     {items.map((item) => {
      const active = activeLabel ? item.label === activeLabel : item.match(pathname)
      return (
       <Link
        key={item.label}
        href={item.href}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-300 ease-out mb-0.5 ${
         active
          ? 'bg-white/[0.06] text-white'
          : 'text-gray-400 hover:text-white hover:bg-white/[0.03]'
        }`}
       >
        <item.icon className={`w-4 h-4 ${active ? 'text-sky-400' : ''}`} />
        {item.label}
       </Link>
      )
     })}
    </nav>

    <div className="px-3 pb-5 border-t border-white/[0.06] pt-4 mt-4">
     <div className="px-3 mb-3">
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-1">Signed in</div>
      <div className="text-sm font-medium text-white truncate">{adminEmail}</div>
     </div>
     <button
      onClick={onSignOut}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/[0.03] transition-all duration-300 ease-out"
     >
      <SignOut className="w-4 h-4" /> Sign out
     </button>
    </div>
   </aside>
  </>
 )
}

function AdminMobileNav({ pathname, activeLabel }: { pathname: string; activeLabel?: AdminActiveLabel }) {
 const mobileItems = items.filter((it) => it.label !== 'Tools')
 return (
  <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0c0c10]/95 backdrop-blur border-t border-white/[0.06] px-2 pt-1.5 pb-[env(safe-area-inset-bottom)]">
   <div className="flex items-stretch justify-around">
    {mobileItems.map((item) => {
     const active = activeLabel ? item.label === activeLabel : item.match(pathname)
     return (
      <Link
       key={item.label}
       href={item.href}
       className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
        active ? 'text-white' : 'text-gray-500 hover:text-white'
       }`}
      >
       <item.icon className={`w-5 h-5 ${active ? 'text-sky-400' : ''}`} />
       {item.label}
      </Link>
     )
    })}
   </div>
  </nav>
 )
}

export function AdminSidebarSkeleton() {
 return (
  <aside className="hidden lg:block w-60 border-r border-white/[0.06] sticky top-0 h-screen bg-[#0c0c10]/80">
   <div className="p-5"><div className="h-7 w-32 bg-white/[0.06] rounded animate-pulse" /></div>
   <div className="px-5 space-y-2.5">
    {[...Array(6)].map((_, i) => <div key={i} className="h-7 bg-white/[0.04] rounded animate-pulse" />)}
   </div>
  </aside>
 )
}
