'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
 LayoutDashboard, PhoneCall, Calendar, Settings, CreditCard, LogOut, Wand2,
} from 'lucide-react'

type Item = { icon: React.ElementType; label: string; href: string; match: (pathname: string) => boolean }

const items: Item[] = [
 { icon: LayoutDashboard, label: 'Overview', href: '/dashboard', match: (p) => p === '/dashboard' },
 { icon: PhoneCall, label: 'Calls', href: '/dashboard/calls', match: (p) => p.startsWith('/dashboard/calls') },
 { icon: Calendar, label: 'Appointments', href: '/dashboard/appointments', match: (p) => p.startsWith('/dashboard/appointments') },
 { icon: Settings, label: 'Settings', href: '/dashboard/settings', match: (p) => p.startsWith('/dashboard/settings') },
 { icon: CreditCard, label: 'Billing', href: '/dashboard/billing', match: (p) => p.startsWith('/dashboard/billing') },
 { icon: Wand2, label: 'Setup', href: '/dashboard/onboarding', match: (p) => p.startsWith('/dashboard/onboarding') },
]

export function Sidebar({ businessName, onSignOut, activeLabel }: {
 businessName: string
 onSignOut: () => void
 activeLabel?: 'Overview' | 'Calls' | 'Appointments' | 'Settings' | 'Billing' | 'Setup'
}) {
 const pathname = usePathname() || '/dashboard'

 return (
  <aside className="hidden lg:flex w-60 flex-col bg-white/40 border-r border-black/5 sticky top-0 h-screen">
   <div className="px-5 py-5">
    <Link href="/dashboard" className="flex items-center" aria-label="CloudGreet">
     <Image src="/cloudgreet-logo.png" alt="CloudGreet" width={140} height={40} priority className="h-7 w-auto" />
    </Link>
   </div>

   <nav className="px-3 flex-1">
    {items.map((item) => {
     const active = activeLabel ? item.label === activeLabel : item.match(pathname)
     return (
      <Link key={item.label} href={item.href}
       className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-300 ease-out mb-0.5 ${
        active
         ? 'bg-gray-900 text-white'
         : 'text-gray-600 hover:text-gray-900 hover:bg-black/[.04]'
       }`}
      >
       <item.icon className="w-4 h-4" strokeWidth={1.75} />
       {item.label}
      </Link>
     )
    })}
   </nav>

   <div className="px-3 pb-5 border-t border-black/5 pt-4 mt-4">
    <div className="px-3 mb-3">
     <div className="text-xs text-gray-500 mb-1">Signed in as</div>
     <div className="text-sm font-medium text-gray-900 truncate">{businessName}</div>
    </div>
    <button onClick={onSignOut}
     className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-black/[.04] transition-all duration-300 ease-out"
    >
     <LogOut className="w-4 h-4" strokeWidth={1.75} /> Sign out
    </button>
   </div>
  </aside>
 )
}

export function SidebarSkeleton() {
 return (
  <aside className="hidden lg:block w-60 border-r border-black/5 sticky top-0 h-screen">
   <div className="p-5"><div className="h-7 w-32 bg-gray-200/70 rounded animate-pulse" /></div>
   <div className="px-5 space-y-2.5">
    {[...Array(5)].map((_, i) => <div key={i} className="h-7 bg-gray-200/50 rounded animate-pulse" />)}
   </div>
  </aside>
 )
}
