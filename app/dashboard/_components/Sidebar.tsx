'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SquaresFour, PhoneCall, Calendar, ChatTeardropDots, Gear, CreditCard, SignOut, MagicWand } from '@phosphor-icons/react'
import { SupportButton } from './SupportButton'
import { ThemeToggle } from './theme'
import '../dash-ios.css'

type Item = { icon: React.ElementType; label: string; href: string; match: (pathname: string) => boolean }

const items: Item[] = [
 { icon: SquaresFour, label: 'Overview', href: '/dashboard', match: (p) => p === '/dashboard' },
 { icon: PhoneCall, label: 'Calls', href: '/dashboard/calls', match: (p) => p.startsWith('/dashboard/calls') },
 { icon: ChatTeardropDots, label: 'Conversations', href: '/dashboard/conversations', match: (p) => p.startsWith('/dashboard/conversations') },
 { icon: Calendar, label: 'Bookings', href: '/dashboard/appointments', match: (p) => p.startsWith('/dashboard/appointments') },
 { icon: Gear, label: 'Settings', href: '/dashboard/settings', match: (p) => p.startsWith('/dashboard/settings') },
 { icon: CreditCard, label: 'Billing', href: '/dashboard/billing', match: (p) => p.startsWith('/dashboard/billing') },
 { icon: MagicWand, label: 'Setup', href: '/dashboard/onboarding', match: (p) => p.startsWith('/dashboard/onboarding') },
]

export function Sidebar({ businessName, onSignOut, activeLabel }: {
 businessName: string
 onSignOut: () => void
 activeLabel?: 'Overview' | 'Calls' | 'Conversations' | 'Bookings' | 'Settings' | 'Billing' | 'Setup'
}) {
 const pathname = usePathname() || '/dashboard'

 return (
  <>
   <MobileNav pathname={pathname} activeLabel={activeLabel} />
   <aside className="ios-sidebar hidden lg:flex w-60 flex-col h-full">
   <div className="px-5 py-5">
    <Link href="/dashboard" className="flex items-center" aria-label="CloudGreet">
     <Image src="/cloudgreet-logo.png" alt="CloudGreet" width={140} height={40} priority className="ios-logo h-7 w-auto" />
    </Link>
   </div>

   <nav className="px-3 flex-1 min-h-0 overflow-y-auto">
    {items.map((item) => {
     const active = activeLabel ? item.label === activeLabel : item.match(pathname)
     return (
      <Link key={item.label} href={item.href}
       className={`ios-nav-item ${active ? 'on' : ''}`}
      >
       <item.icon className="w-[18px] h-[18px]" weight={active ? 'fill' : 'regular'} />
       {item.label}
      </Link>
     )
    })}
   </nav>

   <div className="pb-5 border-t pt-4 mt-4" style={{ borderColor: 'var(--dline2)' }}>
    <div className="px-6 mb-3">
     <div className="text-xs mb-1" style={{ color: 'var(--dmut)' }}>Signed in as</div>
     <div className="text-sm font-medium truncate" style={{ color: 'var(--dink)' }}>{businessName}</div>
    </div>
    <ThemeToggle />
    <div className="px-3">
     <SupportButton />
     <button onClick={onSignOut} className="ios-nav-item w-full">
      <SignOut className="w-[18px] h-[18px]" /> Sign out
     </button>
    </div>
   </div>
   </aside>
  </>
 )
}

function MobileNav({ pathname, activeLabel }: { pathname: string; activeLabel?: string }) {
 // Bottom-tab nav for phones. We trim to the 5 most-used destinations
 // because anything more crowds the bar; Setup is reachable inside Settings.
 const mobileItems = items.filter((it) => it.label !== 'Setup')
 return (
  <nav className="ios-tabbar lg:hidden fixed bottom-0 inset-x-0 z-40 px-2 pt-1.5 pb-[env(safe-area-inset-bottom)]">
   <div className="flex items-stretch justify-around">
    {mobileItems.map((item) => {
     const active = activeLabel ? item.label === activeLabel : item.match(pathname)
     return (
      <Link
       key={item.label}
       href={item.href}
       className="flex-1 flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-medium transition-colors"
       style={{ color: active ? 'var(--dblue)' : 'var(--dmut)' }}
      >
       <item.icon className="w-5 h-5" weight={active ? 'fill' : 'regular'} />
       {item.label}
      </Link>
     )
    })}
   </div>
  </nav>
 )
}

export function SidebarSkeleton() {
 return (
  <aside className="ios-sidebar hidden lg:block w-60 h-full">
   <div className="p-5"><div className="h-7 w-32 bg-gray-200/70 rounded animate-pulse" /></div>
   <div className="px-5 space-y-2.5">
    {[...Array(5)].map((_, i) => <div key={i} className="h-7 bg-gray-200/50 rounded animate-pulse" />)}
   </div>
  </aside>
 )
}
