'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Play } from 'lucide-react'

export type Call = {
 id: string
 call_id: string
 from_number: string
 caller_name: string | null
 duration: number | null
 created_at: string
 status: string
 sentiment: string | null
 summary: string | null
 transcript: string | null
 recording_url: string | null
 outcome: string | null
}

export type Outcome = 'booked' | 'message' | 'dropped'

export function tagOutcome(c: Pick<Call, 'outcome' | 'status' | 'duration'>): Outcome {
 const o = (c.outcome || '').toLowerCase()
 if (o.includes('book') || o.includes('appoint')) return 'booked'
 if (o.includes('message') || o.includes('voicemail')) return 'message'
 if (c.status === 'failed' || (c.duration ?? 0) < 5) return 'dropped'
 return 'message'
}

export function OutcomeDot({ outcome }: { outcome: Outcome }) {
 const cls = outcome === 'booked' ? 'bg-sky-500' : outcome === 'dropped' ? 'bg-rose-300' : 'bg-gray-300'
 return <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cls}`} />
}

export function OutcomeBadge({ outcome }: { outcome: Outcome }) {
 const map = {
  booked: 'bg-sky-50 text-sky-700',
  message: 'bg-gray-100 text-gray-600',
  dropped: 'bg-rose-50 text-rose-700',
 } as const
 return (
  <span className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${map[outcome]}`}>
   {outcome}
  </span>
 )
}

export function fmtDur(sec: number): string {
 if (!sec) return '0s'
 const m = Math.floor(sec / 60)
 const s = sec % 60
 return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export function relTime(iso: string): string {
 const d = new Date(iso)
 const min = Math.floor((Date.now() - d.getTime()) / 60000)
 if (min < 1) return 'just now'
 if (min < 60) return `${min}m ago`
 const hr = Math.floor(min / 60)
 if (hr < 24) return `${hr}h ago`
 const days = Math.floor(hr / 24)
 if (days < 7) return `${days}d ago`
 return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function fmtDateTime(iso: string): string {
 const d = new Date(iso)
 const sameYear = d.getFullYear() === new Date().getFullYear()
 return d.toLocaleString('en-US', {
  month: 'short', day: 'numeric',
  ...(sameYear ? {} : { year: 'numeric' }),
  hour: 'numeric', minute: '2-digit',
 })
}

export function CallDrawer({ call, onClose }: { call: Call; onClose: () => void }) {
 useEffect(() => {
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
 }, [onClose])

 return (
  <motion.div
   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
   className="fixed inset-0 z-50 flex justify-end"
  >
   <button onClick={onClose} aria-label="Close" className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
   <motion.aside
    initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
    transition={{ type: 'spring', damping: 30, stiffness: 280 }}
    className="relative bg-white w-full max-w-xl h-full overflow-y-auto shadow-2xl flex flex-col"
   >
    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
     <div>
      <div className="text-sm font-semibold text-gray-900">{call.caller_name || call.from_number || 'Unknown caller'}</div>
      <div className="text-xs text-gray-500">{fmtDateTime(call.created_at)} · {fmtDur(call.duration || 0)}</div>
     </div>
     <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-gray-100">
      <X className="w-4 h-4 text-gray-500" />
     </button>
    </div>

    <div className="px-6 py-5 space-y-5">
     <div className="flex flex-wrap gap-1.5">
      <OutcomeBadge outcome={tagOutcome(call)} />
      {call.sentiment && <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{call.sentiment}</span>}
     </div>

     {call.recording_url && (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
       <div className="flex items-center gap-2 mb-2">
        <Play className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-xs text-gray-500 font-medium">Recording</span>
       </div>
       <audio controls src={call.recording_url} className="w-full">
        Your browser does not support audio playback.
       </audio>
      </div>
     )}

     {call.summary && (
      <div>
       <h4 className="text-xs uppercase tracking-wider text-gray-400 mb-2">Summary</h4>
       <p className="text-sm text-gray-700 leading-relaxed">{call.summary}</p>
      </div>
     )}

     {call.transcript ? (
      <div>
       <h4 className="text-xs uppercase tracking-wider text-gray-400 mb-2">Transcript</h4>
       <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-[60vh] overflow-y-auto">
        {call.transcript}
       </div>
      </div>
     ) : (
      <p className="text-xs text-gray-400">No transcript available for this call.</p>
     )}
    </div>
   </motion.aside>
  </motion.div>
 )
}
