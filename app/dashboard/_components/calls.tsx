'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Play } from '@phosphor-icons/react'

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
 call_extractions?: Record<string, any> | null
}

export type Outcome = 'booked' | 'cancelled' | 'message' | 'dropped'

function formatExtraction(v: any): string {
 if (v === null || v === undefined || v === '') return '-'
 if (typeof v === 'boolean') return v ? 'Yes' : 'No'
 if (typeof v === 'number') return v.toLocaleString()
 if (typeof v === 'string') return v
 try { return JSON.stringify(v) } catch { return String(v) }
}

export function tagOutcome(c: Pick<Call, 'outcome' | 'status' | 'duration' | 'call_extractions'>): Outcome {
 const o = (c.outcome || '').toLowerCase()
 // Cancellations come in two flavors: from Retell's post-call extraction
 // (booking_type='cancelled') OR the legacy outcome field containing
 // 'cancel'. Check booking_type first so it wins over generic strings.
 const bt = String((c.call_extractions as any)?.booking_type || '').toLowerCase()
 if (bt === 'cancelled' || bt === 'canceled' || bt === 'cancellation') return 'cancelled'
 if (o.includes('cancel')) return 'cancelled'
 if (o.includes('book') || o.includes('appoint') || o === 'emergency') return 'booked'
 if (o.includes('message') || o.includes('voicemail')) return 'message'
 if (c.status === 'failed' || (c.duration ?? 0) < 5) return 'dropped'
 return 'message'
}

export function OutcomeDot({ outcome }: { outcome: Outcome }) {
 const cls =
  outcome === 'booked' ? 'bg-sky-500'
  : outcome === 'cancelled' ? 'bg-rose-500'
  : outcome === 'dropped' ? 'bg-rose-300'
  : 'bg-gray-300'
 return <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cls}`} />
}

export function OutcomeBadge({ outcome }: { outcome: Outcome }) {
 const map = {
  booked: 'bg-sky-50 text-sky-700',
  cancelled: 'bg-rose-50 text-rose-700',
  message: 'bg-gray-100 text-gray-600',
  dropped: 'bg-rose-50 text-rose-700',
 } as const
 return (
  <span className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${map[outcome]}`}>
   {outcome}
  </span>
 )
}

const BOOKING_TYPE_TONE: Record<string, string> = {
 booked: 'bg-emerald-50 text-emerald-700 border-emerald-200',
 cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
 quote: 'bg-sky-50 text-sky-700 border-sky-200',
 emergency: 'bg-rose-50 text-rose-700 border-rose-200',
 callback: 'bg-amber-50 text-amber-700 border-amber-200',
 info_only: 'bg-gray-100 text-gray-600 border-gray-200',
 not_a_fit: 'bg-gray-100 text-gray-500 border-gray-200',
}
const BOOKING_TYPE_LABEL: Record<string, string> = {
 booked: 'Booked',
 cancelled: 'Cancelled',
 quote: 'Quote',
 emergency: 'Emergency',
 callback: 'Callback',
 info_only: 'Info only',
 not_a_fit: 'Not a fit',
}

/**
 * Renders the auto-extracted booking_type as a colored tag. Returns
 * null if the call hasn't been analyzed yet or the value isn't a
 * known label (forward-compat with future Retell-extracted values).
 */
export function BookingTypeTag({ call }: { call: Pick<Call, 'call_extractions'> }) {
 const raw = (call.call_extractions as any)?.booking_type
 if (!raw || typeof raw !== 'string') return null
 const key = raw.toLowerCase().replace(/\s+/g, '_')
 const label = BOOKING_TYPE_LABEL[key] || raw
 const tone = BOOKING_TYPE_TONE[key] || 'bg-gray-100 text-gray-600 border-gray-200'
 return (
  <span className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded border ${tone}`}>
   {label}
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

/**
 * Format a phone string for display. Empty for missing or sentinel
 * 'unknown' values; passthrough for non-US-shaped numbers.
 */
export function fmtPhone(raw?: string | null): string {
 if (!raw) return ''
 const v = String(raw).trim()
 if (!v || v.toLowerCase() === 'unknown') return ''
 const digits = v.replace(/\D/g, '')
 if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
 if (digits.length === 11 && digits.startsWith('1')) return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
 return v
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
      <div className="text-sm font-semibold text-gray-900">{call.caller_name || fmtPhone(call.from_number) || '(no caller info)'}</div>
      {call.caller_name && call.from_number && (
       <div className="text-xs text-gray-500 font-mono">{fmtPhone(call.from_number)}</div>
      )}
      <div className="text-xs text-gray-500">{fmtDateTime(call.created_at)} · {fmtDur(call.duration || 0)}</div>
     </div>
     <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-gray-100">
      <X className="w-4 h-4 text-gray-500" />
     </button>
    </div>

    <div className="px-6 py-5 space-y-5">
     <div className="flex flex-wrap gap-1.5">
      <BookingTypeTag call={call} />
      <OutcomeBadge outcome={tagOutcome(call)} />
      {call.sentiment && <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{call.sentiment}</span>}
     </div>

     {call.recording_url && (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
       <div className="flex items-center gap-2 mb-2">
        <Play className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-xs text-gray-500 font-medium">Recording</span>
       </div>
       <audio
        controls
        preload="metadata"
        src={`/api/calls/${call.id}/audio`}
        className="w-full"
       >
        Your browser does not support audio playback.
       </audio>
      </div>
     )}

     {call.call_extractions && Object.keys(call.call_extractions).length > 0 && (
      <div>
       <h4 className="text-xs uppercase tracking-wider text-gray-400 mb-2">Captured from call</h4>
       <div className="bg-gray-50 border border-gray-200 rounded-xl divide-y divide-gray-200">
        {Object.entries(call.call_extractions)
         .filter(([k]) => k && !k.startsWith('_'))
         .map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-4 px-4 py-2.5">
           <span className="text-[11px] font-medium uppercase tracking-wider text-gray-500 mt-0.5">
            {k.replace(/_/g, ' ')}
           </span>
           <span className="text-sm text-gray-800 text-right break-words flex-1">
            {formatExtraction(v)}
           </span>
          </div>
         ))}
       </div>
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
