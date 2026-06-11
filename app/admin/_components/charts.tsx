'use client'

/**
 * Admin chart kit - hand-built SVG. No chart library: every gradient,
 * glow and face is deliberate so the depth reads premium, not plugin.
 *
 *  - CountUp     animated numerals (rAF, ease-out, reduced-motion aware)
 *  - AreaChart   smooth multi-series area w/ crosshair + tooltip
 *  - Bars3D      isometric extruded bars (the "3D graph")
 *  - DonutGauge  radial gauge for percentages (margin)
 *  - MeterBar    horizontal comparison bar (provider costs)
 */

import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1] as const

/* --------------------------------- utils --------------------------------- */

export function fmtMoney(cents: number): string {
 const dollars = cents / 100
 if (Math.abs(dollars) >= 1000) {
  return `$${Math.round(dollars).toLocaleString()}`
 }
 return dollars % 1 === 0
  ? `$${dollars.toLocaleString()}`
  : `$${dollars.toFixed(2)}`
}

function useMeasure<T extends HTMLElement>(): [React.RefObject<T>, { width: number }] {
 const ref = useRef<T>(null)
 const [size, setSize] = useState({ width: 0 })
 useEffect(() => {
  if (!ref.current) return
  const el = ref.current
  const ro = new ResizeObserver((entries) => {
   for (const e of entries) setSize({ width: e.contentRect.width })
  })
  ro.observe(el)
  setSize({ width: el.getBoundingClientRect().width })
  return () => ro.disconnect()
 }, [])
 return [ref, size]
}

function prefersReducedMotion(): boolean {
 if (typeof window === 'undefined') return false
 return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
}

/** Round a max up to a friendly tick value so charts never look cramped. */
function niceMax(n: number): number {
 if (n <= 5) return 5
 const pow = Math.pow(10, Math.floor(Math.log10(n)))
 const unit = n / pow
 const nice = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10
 return nice * pow
}

/** Catmull-Rom → cubic bezier for a silky line through every point. */
function smoothPath(pts: [number, number][]): string {
 if (pts.length < 2) return ''
 if (pts.length === 2) return `M${pts[0][0]},${pts[0][1]} L${pts[1][0]},${pts[1][1]}`
 let d = `M${pts[0][0]},${pts[0][1]}`
 for (let i = 0; i < pts.length - 1; i++) {
  const p0 = pts[Math.max(0, i - 1)]
  const p1 = pts[i]
  const p2 = pts[i + 1]
  const p3 = pts[Math.min(pts.length - 1, i + 2)]
  const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
  const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
  d += ` C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`
 }
 return d
}

/* -------------------------------- CountUp -------------------------------- */

export function CountUp({
 value, format = (n) => Math.round(n).toLocaleString(), duration = 0.9, className = '',
}: {
 value: number
 format?: (n: number) => string
 duration?: number
 className?: string
}) {
 const [display, setDisplay] = useState(() => (prefersReducedMotion() ? value : 0))
 const fromRef = useRef(0)
 useEffect(() => {
  if (prefersReducedMotion()) { setDisplay(value); return }
  const from = fromRef.current
  const start = performance.now()
  let raf: number
  const tick = (now: number) => {
   const t = Math.min(1, (now - start) / (duration * 1000))
   const eased = 1 - Math.pow(1 - t, 3)
   setDisplay(from + (value - from) * eased)
   if (t < 1) raf = requestAnimationFrame(tick)
   else fromRef.current = value
  }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
 }, [value, duration])
 return <span className={`tabular-nums ${className}`}>{format(display)}</span>
}

/* -------------------------------- AreaChart ------------------------------ */

export type AreaSeries = { name: string; color: string; data: number[] }

export function AreaChart({
 series, labels, height = 210, formatValue = (n) => n.toLocaleString(),
}: {
 series: AreaSeries[]
 labels: string[]
 height?: number
 formatValue?: (n: number) => string
}) {
 const uid = useId().replace(/:/g, '')
 const [ref, { width }] = useMeasure<HTMLDivElement>()
 const [hover, setHover] = useState<number | null>(null)

 const pad = { l: 6, r: 6, t: 14, b: 24 }
 const innerW = Math.max(0, width - pad.l - pad.r)
 const innerH = height - pad.t - pad.b
 const n = labels.length
 const yMax = niceMax(Math.max(1, ...series.flatMap((s) => s.data)))

 const pointsFor = (data: number[]): [number, number][] =>
  data.map((v, i) => [
   pad.l + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW),
   pad.t + innerH - (v / yMax) * innerH,
  ])

 const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
  if (!width || n < 2) return
  const rect = e.currentTarget.getBoundingClientRect()
  const x = e.clientX - rect.left - pad.l
  const idx = Math.round((x / innerW) * (n - 1))
  setHover(Math.max(0, Math.min(n - 1, idx)))
 }

 // sparse x ticks: first, quarter points, last
 const tickIdx = useMemo(() => {
  if (n <= 6) return labels.map((_, i) => i)
  const step = (n - 1) / 4
  return [0, 1, 2, 3, 4].map((k) => Math.round(k * step))
 }, [n, labels])

 const hoverX = hover !== null && n > 1 ? pad.l + (hover / (n - 1)) * innerW : null

 return (
  <div ref={ref} className="relative w-full select-none" style={{ height }}>
   {width > 0 && (
    <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)} className="block overflow-visible">
     <defs>
      {series.map((s, si) => (
       <linearGradient key={si} id={`${uid}-fill-${si}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={s.color} stopOpacity="0.34" />
        <stop offset="55%" stopColor={s.color} stopOpacity="0.10" />
        <stop offset="100%" stopColor={s.color} stopOpacity="0" />
       </linearGradient>
      ))}
      <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
       <feGaussianBlur stdDeviation="3.5" result="b" />
       <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <clipPath id={`${uid}-reveal`}>
       <motion.rect
        x={0} y={0} height={height}
        initial={{ width: 0 }}
        animate={{ width }}
        transition={{ duration: 1.1, ease: EASE }}
       />
      </clipPath>
     </defs>

     {/* hairline grid */}
     {[0.25, 0.5, 0.75].map((f) => (
      <line
       key={f}
       x1={pad.l} x2={pad.l + innerW}
       y1={pad.t + innerH * f} y2={pad.t + innerH * f}
       stroke="var(--cg-grid)" strokeWidth="1"
      />
     ))}
     <line x1={pad.l} x2={pad.l + innerW} y1={pad.t + innerH} y2={pad.t + innerH} stroke="var(--cg-grid-strong)" strokeWidth="1" />

     <g clipPath={`url(#${uid}-reveal)`}>
      {series.map((s, si) => {
       if (s.data.length < 2) return null
       const pts = pointsFor(s.data)
       const line = smoothPath(pts)
       const area = `${line} L${(pad.l + innerW).toFixed(2)},${(pad.t + innerH).toFixed(2)} L${pad.l},${(pad.t + innerH).toFixed(2)} Z`
       return (
        <g key={si}>
         <path d={area} fill={`url(#${uid}-fill-${si})`} />
         <path d={line} fill="none" stroke={s.color} strokeOpacity="0.5" strokeWidth="4" filter={`url(#${uid}-glow)`} />
         <path d={line} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" />
        </g>
       )
      })}
     </g>

     {/* crosshair */}
     {hoverX !== null && (
      <g>
       <line x1={hoverX} x2={hoverX} y1={pad.t} y2={pad.t + innerH} stroke="var(--cg-grid-strong)" strokeWidth="1" strokeDasharray="2 3" />
       {series.map((s, si) => {
        const v = s.data[hover!] ?? 0
        const y = pad.t + innerH - (v / yMax) * innerH
        return (
         <g key={si}>
          <circle cx={hoverX} cy={y} r={7} fill={s.color} opacity="0.18" />
          <circle cx={hoverX} cy={y} r={3.2} fill="var(--cg-bg)" stroke={s.color} strokeWidth="2" />
         </g>
        )
       })}
      </g>
     )}

     {/* x labels */}
     {tickIdx.map((i) => (
      <text
       key={i}
       x={pad.l + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)}
       y={height - 6}
       textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
       className="fill-gray-600"
       style={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}
      >
       {labels[i]}
      </text>
     ))}
    </svg>
   )}

   {/* tooltip */}
   {hover !== null && hoverX !== null && width > 0 && (
    <div
     className="absolute z-10 pointer-events-none -translate-y-2 rounded-xl border backdrop-blur px-3 py-2 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.45)]"
     style={{
      top: 0,
      left: Math.max(4, Math.min(width - 148, hoverX + 10)),
      width: 144,
      background: 'var(--cg-tooltip-bg)',
      borderColor: 'var(--cg-tooltip-border)',
     }}
    >
     <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">{labels[hover]}</div>
     {series.map((s, si) => (
      <div key={si} className="flex items-center justify-between gap-3 py-0.5">
       <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-400">
        <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
        {s.name}
       </span>
       <span className="text-[11px] font-mono tabular-nums text-white">{formatValue(s.data[hover] ?? 0)}</span>
      </div>
     ))}
    </div>
   )}
  </div>
 )
}

/* --------------------------------- Bars3D -------------------------------- */

export function Bars3D({
 items, height = 240, formatValue = (n) => n.toLocaleString(), color = '#38bdf8',
}: {
 items: { label: string; value: number }[]
 height?: number
 formatValue?: (n: number) => string
 color?: string
}) {
 const uid = useId().replace(/:/g, '')
 const [ref, { width }] = useMeasure<HTMLDivElement>()
 const [hover, setHover] = useState<number | null>(null)

 const DX = 12 // isometric depth offset →
 const DY = 8  // isometric depth offset ↑
 const pad = { l: 6, r: 6 + DX, t: 18, b: 30 }
 const innerW = Math.max(0, width - pad.l - pad.r)
 const innerH = height - pad.t - pad.b
 const n = items.length
 const yMax = niceMax(Math.max(1, ...items.map((i) => i.value)))

 const slot = n > 0 ? innerW / n : 0
 const barW = Math.min(54, Math.max(14, slot * 0.52))

 // shade helpers - top face lighter, side face darker
 const shade = (hex: string, f: number): string => {
  const c = hex.replace('#', '')
  const num = parseInt(c, 16)
  const r = Math.min(255, Math.max(0, Math.round(((num >> 16) & 255) * f)))
  const g = Math.min(255, Math.max(0, Math.round(((num >> 8) & 255) * f)))
  const b = Math.min(255, Math.max(0, Math.round((num & 255) * f)))
  return `rgb(${r},${g},${b})`
 }

 return (
  <div ref={ref} className="relative w-full select-none" style={{ height }}>
   {width > 0 && n > 0 && (
    <svg width={width} height={height} className="block overflow-visible" onMouseLeave={() => setHover(null)}>
     <defs>
      <linearGradient id={`${uid}-front`} x1="0" y1="0" x2="0" y2="1">
       <stop offset="0%" stopColor={color} stopOpacity="0.95" />
       <stop offset="100%" stopColor={shade(color, 0.45)} stopOpacity="0.9" />
      </linearGradient>
      <linearGradient id={`${uid}-front-dim`} x1="0" y1="0" x2="0" y2="1">
       <stop offset="0%" stopColor={color} stopOpacity="0.55" />
       <stop offset="100%" stopColor={shade(color, 0.4)} stopOpacity="0.5" />
      </linearGradient>
     </defs>

     {/* floor + grid */}
     {[0.25, 0.5, 0.75].map((f) => (
      <line
       key={f}
       x1={pad.l} x2={pad.l + innerW + DX}
       y1={pad.t + innerH * f - DY * (1 - f) * 0} y2={pad.t + innerH * f}
       stroke="var(--cg-grid)" strokeWidth="1"
      />
     ))}
     <line x1={pad.l} x2={pad.l + innerW + DX} y1={pad.t + innerH} y2={pad.t + innerH} stroke="var(--cg-grid-strong)" strokeWidth="1" />

     {items.map((it, i) => {
      const hFrac = it.value / yMax
      const barH = Math.max(it.value > 0 ? 3 : 0, hFrac * innerH)
      const x = pad.l + slot * i + (slot - barW) / 2
      const y = pad.t + innerH - barH
      const isHover = hover === i
      const frontFill = isHover || hover === null ? `url(#${uid}-front)` : `url(#${uid}-front-dim)`
      return (
       <motion.g
        key={i}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.06 * i }}
        onMouseEnter={() => setHover(i)}
        style={{ cursor: 'default' }}
       >
        {barH > 0 && (
         <>
          {/* side face */}
          <polygon
           points={`${x + barW},${y} ${x + barW + DX},${y - DY} ${x + barW + DX},${y + barH - DY} ${x + barW},${y + barH}`}
           fill={shade(color, isHover ? 0.5 : 0.38)}
           opacity={hover === null || isHover ? 0.95 : 0.5}
          />
          {/* top face */}
          <polygon
           points={`${x},${y} ${x + DX},${y - DY} ${x + barW + DX},${y - DY} ${x + barW},${y}`}
           fill={shade(color, isHover ? 1.35 : 1.15)}
           opacity={hover === null || isHover ? 0.95 : 0.5}
          />
          {/* front face */}
          <rect x={x} y={y} width={barW} height={barH} fill={frontFill} rx="1.5" />
          {/* glow under hovered bar */}
          {isHover && (
           <ellipse cx={x + barW / 2 + DX / 2} cy={pad.t + innerH + 6} rx={barW * 0.9} ry={5} fill={color} opacity="0.14" />
          )}
         </>
        )}
        {/* value on hover */}
        {isHover && (
         <text
          x={x + barW / 2 + DX / 2} y={y - DY - 8}
          textAnchor="middle"
          className="fill-white"
          style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600 }}
         >
          {formatValue(it.value)}
         </text>
        )}
        {/* x label */}
        <text
         x={x + barW / 2} y={height - 8}
         textAnchor="middle"
         className={isHover ? 'fill-gray-300' : 'fill-gray-600'}
         style={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}
        >
         {it.label.length > 11 ? `${it.label.slice(0, 10)}…` : it.label}
        </text>
        {/* invisible hit area, full column */}
        <rect x={pad.l + slot * i} y={pad.t - DY} width={slot} height={innerH + DY + 18} fill="transparent" />
       </motion.g>
      )
     })}
    </svg>
   )}
  </div>
 )
}

/* ------------------------------- DonutGauge ------------------------------ */

export function DonutGauge({
 pct, label, size = 132, danger = false,
}: {
 pct: number | null
 label: string
 size?: number
 danger?: boolean
}) {
 const uid = useId().replace(/:/g, '')
 const stroke = 10
 const r = (size - stroke) / 2
 const c = 2 * Math.PI * r
 const clamped = pct === null ? 0 : Math.max(0, Math.min(100, pct))
 const offset = c * (1 - clamped / 100)
 const negative = danger || (pct !== null && pct < 0)

 return (
  <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
   <svg width={size} height={size} className="-rotate-90">
    <defs>
     <linearGradient id={`${uid}-arc`} x1="0" y1="0" x2="1" y2="1">
      {negative ? (
       <>
        <stop offset="0%" stopColor="#fb7185" />
        <stop offset="100%" stopColor="#f43f5e" />
       </>
      ) : (
       <>
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#0ea5e9" />
       </>
      )}
     </linearGradient>
    </defs>
    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--cg-track)" strokeWidth={stroke} />
    <motion.circle
     cx={size / 2} cy={size / 2} r={r}
     fill="none"
     stroke={`url(#${uid}-arc)`}
     strokeWidth={stroke}
     strokeLinecap="round"
     strokeDasharray={c}
     initial={{ strokeDashoffset: c }}
     animate={{ strokeDashoffset: offset }}
     transition={{ duration: 1.2, ease: EASE, delay: 0.2 }}
     style={{ filter: `drop-shadow(0 0 6px ${negative ? 'rgba(244,63,94,0.45)' : 'rgba(52,211,153,0.35)'})` }}
    />
   </svg>
   <div className="absolute inset-0 flex flex-col items-center justify-center">
    <div className={`font-display font-semibold tracking-tight text-2xl tabular-nums ${negative ? 'text-rose-300' : 'text-white'}`}>
     {pct === null ? '-' : <CountUp value={pct} format={(n) => `${Math.round(n)}%`} />}
    </div>
    <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-gray-500 mt-0.5">{label}</div>
   </div>
  </div>
 )
}

/* -------------------------------- MeterBar ------------------------------- */

export function MeterBar({
 label, value, max, format = (n) => n.toLocaleString(), color = '#38bdf8',
}: {
 label: string
 value: number
 max: number
 format?: (n: number) => string
 color?: string
}) {
 const frac = max > 0 ? Math.min(1, value / max) : 0
 return (
  <div className="flex items-center gap-3">
   <div className="w-20 text-[11px] font-mono text-gray-500 capitalize truncate">{label}</div>
   <div className="flex-1 h-2 rounded-full bg-white/[0.05] overflow-hidden">
    <motion.div
     className="h-full rounded-full"
     style={{
      background: `linear-gradient(90deg, ${color}55, ${color})`,
      boxShadow: `0 0 10px ${color}66`,
     }}
     initial={{ width: 0 }}
     animate={{ width: `${frac * 100}%` }}
     transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
    />
   </div>
   <div className="w-16 text-right text-[11px] font-mono tabular-nums text-gray-300">{format(value)}</div>
  </div>
 )
}
