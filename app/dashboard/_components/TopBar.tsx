'use client'

const DEMO_NUMBER = '+1 (737) 937-0084'

export function TopBar() {
 return (
  <div className="border-b border-black/5 bg-[#f6f5f1]/80 backdrop-blur-md sticky top-0 z-30">
   <div className="px-8 py-3 flex items-center justify-between gap-4 flex-wrap">
    <div className="inline-flex items-center gap-2.5">
     <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full rounded-full bg-sky-500 animate-breathe" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
     </span>
     <span className="text-xs font-mono text-gray-600 tracking-tight">
      listening on{' '}
      <span className="text-gray-900">{DEMO_NUMBER}</span>
      <span className="ml-0.5 text-sky-500 animate-blink">_</span>
     </span>
    </div>
   </div>
  </div>
 )
}
