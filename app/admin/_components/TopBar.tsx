'use client'

import { useEffect, useState } from 'react'
import { Moon, Pulse, SunDim } from '@phosphor-icons/react'
import { NotificationsBell } from '@/components/NotificationsBell'
import { useAdminTheme } from './Shell'

function Clock() {
 const [now, setNow] = useState<Date | null>(null)
 useEffect(() => {
  setNow(new Date())
  const id = setInterval(() => setNow(new Date()), 30_000)
  return () => clearInterval(id)
 }, [])
 if (!now) return null
 return (
  <span className="hidden sm:inline text-[11px] font-mono tabular-nums text-gray-500">
   {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
   <span className="text-gray-700 mx-1.5">·</span>
   {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
  </span>
 )
}

function ThemeToggle() {
 const { theme, toggleTheme } = useAdminTheme()
 return (
  <button
   onClick={toggleTheme}
   aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
   className="relative inline-flex items-center w-[52px] h-[26px] rounded-full border border-white/[0.1] bg-white/[0.04] transition-colors duration-300 hover:bg-white/[0.08]"
  >
   <span
    className={`absolute top-[2px] w-[20px] h-[20px] rounded-full bg-gradient-to-b from-sky-400 to-sky-600 shadow-[0_2px_8px_rgba(56,189,248,0.5)] transition-all duration-300 ease-out flex items-center justify-center ${
     theme === 'dark' ? 'left-[2px]' : 'left-[28px]'
    }`}
   >
    {theme === 'dark'
     ? <Moon weight="fill" className="w-3 h-3 text-white" />
     : <SunDim weight="fill" className="w-3 h-3 text-white" />}
   </span>
  </button>
 )
}

export function AdminTopBar() {
 return (
  <div className="relative border-b border-white/[0.06] bg-[#07080b]/75 backdrop-blur-xl sticky top-0 z-30">
   {/* hairline accent along the bottom edge */}
   <div className="absolute bottom-[-1px] inset-x-0 h-px bg-gradient-to-r from-transparent via-sky-400/25 to-transparent pointer-events-none" />
   <div className="px-4 lg:px-8 py-3 flex items-center justify-between gap-4 flex-wrap">
    <div className="inline-flex items-center gap-2.5">
     <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-breathe" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
     </span>
     <span className="text-xs font-mono text-gray-400 tracking-tight">
      <span className="text-gray-300">admin console</span>
      <span className="text-gray-600 mx-1.5">·</span>
      <span className="text-gray-500">production</span>
     </span>
    </div>
    <div className="inline-flex items-center gap-4">
     <Clock />
     <ThemeToggle />
     <NotificationsBell basePath="/api/admin/notifications" theme="dark" />
     <div className="hidden md:inline-flex text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 items-center gap-1.5">
      <Pulse className="w-3 h-3 text-emerald-400" />
      all systems
     </div>
    </div>
   </div>
  </div>
 )
}
