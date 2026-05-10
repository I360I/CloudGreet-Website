'use client'

import { motion } from 'framer-motion'
import { CircleNotch } from '@phosphor-icons/react'

const EASE = [0.22, 1, 0.36, 1] as const

/** Standard card surface. One source of truth for borders + bg in admin. */
export function Panel({
 className = '', children, padding = 'normal',
}: {
 className?: string
 children: React.ReactNode
 padding?: 'normal' | 'tight' | 'none'
}) {
 const pad = padding === 'none' ? '' : padding === 'tight' ? 'p-4' : 'p-5 sm:p-6'
 return (
  <div className={`bg-[#101015] border border-white/[0.06] rounded-2xl ${pad} ${className}`}>
   {children}
  </div>
 )
}

/** Section heading with optional eyebrow + trailing slot. */
export function PanelHeader({
 eyebrow, title, trailing,
}: {
 eyebrow?: string
 title: string
 trailing?: React.ReactNode
}) {
 return (
  <div className="flex items-end justify-between gap-4 mb-4 flex-wrap">
   <div>
    {eyebrow && (
     <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-1">
      {eyebrow}
     </div>
    )}
    <h2 className="text-base font-medium text-white">{title}</h2>
   </div>
   {trailing}
  </div>
 )
}

/** Mono number with caption. Used in KPI cards. */
export function Stat({
 label, value, sub, accent = false,
}: {
 label: string
 value: string
 sub?: string
 accent?: boolean
}) {
 return (
  <Panel>
   <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-2">{label}</div>
   <div className={`font-mono font-medium tracking-tight tabular-nums text-3xl md:text-4xl ${
    accent ? 'text-sky-400' : 'text-white'
   }`}>{value}</div>
   {sub && <div className="text-xs text-gray-500 mt-1.5">{sub}</div>}
  </Panel>
 )
}

/** Status pill with consistent color tones across the admin. */
export function StatusPill({ status }: { status: string }) {
 const tone = STATUS_TONES[status?.toLowerCase()] || STATUS_TONES.unknown
 return (
  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider ${tone.bg} ${tone.text} border ${tone.border}`}>
   <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
   {tone.label || status}
  </span>
 )
}

const STATUS_TONES: Record<string, {
 bg: string; text: string; border: string; dot: string; label?: string
}> = {
 active:    { bg: 'bg-emerald-400/10', text: 'text-emerald-300', border: 'border-emerald-400/20', dot: 'bg-emerald-400', label: 'active' },
 trialing:  { bg: 'bg-sky-400/10', text: 'text-sky-300', border: 'border-sky-400/20', dot: 'bg-sky-400', label: 'non-paying' },
 past_due:  { bg: 'bg-amber-400/10', text: 'text-amber-300', border: 'border-amber-400/20', dot: 'bg-amber-400', label: 'past due' },
 paused:    { bg: 'bg-gray-400/10', text: 'text-gray-300', border: 'border-gray-400/20', dot: 'bg-gray-400', label: 'paused' },
 inactive:  { bg: 'bg-gray-400/10', text: 'text-gray-400', border: 'border-gray-400/20', dot: 'bg-gray-500', label: 'inactive' },
 cancelled: { bg: 'bg-rose-400/10', text: 'text-rose-300', border: 'border-rose-400/20', dot: 'bg-rose-400', label: 'cancelled' },
 canceled:  { bg: 'bg-rose-400/10', text: 'text-rose-300', border: 'border-rose-400/20', dot: 'bg-rose-400', label: 'cancelled' },
 pending:   { bg: 'bg-gray-400/10', text: 'text-gray-300', border: 'border-gray-400/20', dot: 'bg-gray-400', label: 'pending' },
 unknown:   { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20', dot: 'bg-gray-500', label: '-' },
}

/** Primary button - sky-accented, fills/loads with spinner. */
export function PrimaryButton({
 children, onClick, type = 'button', disabled, loading, className = '',
}: {
 children: React.ReactNode
 onClick?: () => void
 type?: 'button' | 'submit' | 'reset'
 disabled?: boolean
 loading?: boolean
 className?: string
}) {
 return (
  <button
   type={type} onClick={onClick} disabled={disabled || loading}
   className={`inline-flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ease-out disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_30px_-12px_rgba(56,189,248,0.6)] ${className}`}
  >
   {loading && <CircleNotch className="w-4 h-4 animate-spin" />}
   {children}
  </button>
 )
}

/** Secondary button - ghost on dark, fades in on hover. */
export function GhostButton({
 children, onClick, type = 'button', disabled, className = '',
}: {
 children: React.ReactNode
 onClick?: () => void
 type?: 'button' | 'submit' | 'reset'
 disabled?: boolean
 className?: string
}) {
 return (
  <button
   type={type} onClick={onClick} disabled={disabled}
   className={`inline-flex items-center justify-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] text-gray-200 hover:text-white px-4 py-2 rounded-xl text-sm font-medium border border-white/[0.06] transition-all duration-300 ease-out disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
  >
   {children}
  </button>
 )
}

/** Danger button - red ghost. */
export function DangerButton({
 children, onClick, type = 'button', disabled, loading, className = '',
}: {
 children: React.ReactNode
 onClick?: () => void
 type?: 'button' | 'submit' | 'reset'
 disabled?: boolean
 loading?: boolean
 className?: string
}) {
 return (
  <button
   type={type} onClick={onClick} disabled={disabled || loading}
   className={`inline-flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 px-4 py-2 rounded-xl text-sm font-medium border border-rose-500/20 transition-all duration-300 ease-out disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
  >
   {loading && <CircleNotch className="w-4 h-4 animate-spin" />}
   {children}
  </button>
 )
}

/** Text input - dark variant. */
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
 const { className = '', ...rest } = props
 return (
  <input
   {...rest}
   className={`w-full px-4 py-2.5 bg-[#0c0c10] border border-white/[0.06] rounded-xl text-gray-100 placeholder-gray-600 focus:outline-none focus:border-sky-400/50 transition-colors text-sm ${className}`}
  />
 )
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
 const { className = '', children, ...rest } = props
 return (
  <select
   {...rest}
   className={`w-full px-4 py-2.5 bg-[#0c0c10] border border-white/[0.06] rounded-xl text-gray-100 focus:outline-none focus:border-sky-400/50 transition-colors text-sm ${className}`}
  >
   {children}
  </select>
 )
}

/** Mini sparkline used in client rows. */
export function Sparkline({ data, accent = false }: { data: number[]; accent?: boolean }) {
 if (!data || data.length < 2) return <div className="h-4" />
 const max = Math.max(...data, 1)
 const w = 80, h = 18
 const pts = data.map((v, i) => {
  const x = (i / (data.length - 1)) * w
  const y = h - (v / max) * (h - 2) - 1
  return `${x.toFixed(1)},${y.toFixed(1)}`
 }).join(' ')
 return (
  <svg width={w} height={h} className="overflow-visible">
   <polyline
    fill="none"
    stroke={accent ? '#38bdf8' : '#52525b'}
    strokeLinecap="round"
    strokeLinejoin="round"
    points={pts}
   />
  </svg>
 )
}

/** Tiny rising badge animation utility - used for new entries. */
export function RisingFade({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
 return (
  <motion.div
   initial={{ opacity: 0, y: 6 }}
   animate={{ opacity: 1, y: 0 }}
   transition={{ duration: 0.35, ease: EASE, delay }}
  >
   {children}
  </motion.div>
 )
}
