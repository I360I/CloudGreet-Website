'use client'

import { Pulse } from '@phosphor-icons/react'
import { NotificationsBell } from '@/components/NotificationsBell'

export function AdminTopBar() {
 return (
  <div className="border-b border-white/[0.06] bg-[#0a0a0c]/80 backdrop-blur-md sticky top-0 z-30">
   <div className="px-4 lg:px-8 py-3 flex items-center justify-between gap-4 flex-wrap">
    <div className="inline-flex items-center gap-2.5">
     <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-breathe" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
     </span>
     <span className="text-xs font-mono text-gray-400 tracking-tight">
      <span className="text-gray-300">admin console</span>
      <span className="text-gray-600 mx-1.5">·</span>
      <span className="text-gray-500">production</span>
     </span>
    </div>
    <div className="inline-flex items-center gap-3">
     <NotificationsBell basePath="/api/admin/notifications" theme="dark" />
     <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 inline-flex items-center gap-1.5">
      <Pulse className="w-3 h-3 text-emerald-400" />
      all systems
     </div>
    </div>
   </div>
  </div>
 )
}
