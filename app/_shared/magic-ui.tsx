'use client'

/**
 * Magic UI components (adapted from magicui.design, MIT) tuned to the cg
 * design system, dependency-free beyond framer-motion (already a project
 * dependency). Shared across dashboards - not admin-specific like
 * app/admin/_components/magic.tsx's ambient effects.
 */

import React, { useEffect, useMemo, useRef } from 'react'
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Filler,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'

// Idempotent - chart.js no-ops re-registering the same elements, so this
// is safe to run alongside app/components/RealCharts.tsx's own
// ChartJS.register call if both mount on the same page.
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Filler)

/** Counts up from 0 to `value` once it scrolls into view. */
export function NumberTicker({
  value,
  decimalPlaces = 0,
  className = '',
}: {
  value: number
  decimalPlaces?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px' })
  const motionValue = useMotionValue(0)
  const springValue = useSpring(motionValue, { damping: 60, stiffness: 100 })

  useEffect(() => {
    if (inView) motionValue.set(value)
  }, [inView, value, motionValue])

  useEffect(() => {
    return springValue.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent = Intl.NumberFormat('en-US', {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        }).format(Number(latest.toFixed(decimalPlaces)))
      }
    })
  }, [springValue, decimalPlaces])

  return <span ref={ref} className={className}>0</span>
}

/** Circular gauge that animates its fill to `value`/`max` on mount. */
export function AnimatedCircularProgressBar({
  value,
  max = 100,
  min = 0,
  gaugePrimaryColor = '#4f46e5',
  gaugeSecondaryColor = '#e5e7eb',
  size = 96,
  strokeWidth = 9,
  className = '',
  children,
}: {
  value: number
  max?: number
  min?: number
  gaugePrimaryColor?: string
  gaugeSecondaryColor?: string
  size?: number
  strokeWidth?: number
  className?: string
  children?: React.ReactNode
}) {
  const pct = Math.min(100, Math.max(0, max === min ? 0 : ((value - min) / (max - min)) * 100))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct / 100)

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={gaugeSecondaryColor} strokeWidth={strokeWidth} fill="none"
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={gaugePrimaryColor} strokeWidth={strokeWidth} fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}

/** Small axis-less trend line for a hero/KPI card - no grid, no legend. */
export function MiniSparkline({
  data,
  color = '#4f46e5',
  height = 44,
  className = '',
}: {
  data: number[]
  color?: string
  height?: number
  className?: string
}) {
  const chartData = useMemo(() => ({
    labels: data.map((_, i) => String(i)),
    datasets: [{
      data,
      borderColor: color,
      backgroundColor: `${color}22`,
      fill: true,
      tension: 0.4,
      borderWidth: 2,
      pointRadius: 0,
    }],
  }), [data, color])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      x: { display: false },
      y: { display: false },
    },
    elements: { line: { borderJoinStyle: 'round' as const } },
  }), [])

  return (
    <div className={className} style={{ height }}>
      <Line data={chartData} options={options} />
    </div>
  )
}

/**
 * Bar chart matching the reference template's "Vendor Activity" card:
 * top-rounded (not full capsule) bars with a vertical gradient fade,
 * visible Y-axis gridlines/labels. One bar (defaults to the last = today)
 * highlighted in the bold color; the rest fade toward transparent.
 */
export function MiniBarChart({
  labels,
  data,
  color = '#bfdbfe',
  highlightColor = '#2563eb',
  highlightIndex,
  height = 160,
  className = '',
}: {
  labels: string[]
  data: number[]
  color?: string
  highlightColor?: string
  highlightIndex?: number
  height?: number
  className?: string
}) {
  const hi = highlightIndex ?? data.length - 1

  const chartData = useMemo(() => ({
    labels,
    datasets: [{
      data,
      // Scriptable gradient (chart.js reruns this per render/resize) -
      // solid at the top, fading to near-transparent at the base, same
      // vertical-fade treatment the reference's bars use.
      backgroundColor: (ctx: any) => {
        const { chart } = ctx
        const { chartArea } = chart
        if (!chartArea) return color
        const isHighlight = ctx.dataIndex === hi
        const base = isHighlight ? highlightColor : color
        const gradient = chart.ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
        gradient.addColorStop(0, base)
        gradient.addColorStop(1, `${base}0d`)
        return gradient
      },
      borderRadius: { topLeft: 8, topRight: 8, bottomLeft: 0, bottomRight: 0 },
      borderSkipped: 'bottom' as const,
      maxBarThickness: 26,
    }],
  }), [labels, data, color, highlightColor, hi])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#111827',
        titleColor: '#e5e7eb',
        bodyColor: '#ffffff',
        displayColors: false,
        cornerRadius: 8,
        padding: 10,
      },
    },
    scales: {
      x: {
        ticks: { color: '#9ca3af', font: { size: 11 } },
        grid: { display: false },
        border: { display: false },
      },
      y: {
        ticks: { color: '#9ca3af', font: { size: 11 }, precision: 0 },
        grid: { color: '#f1f5f9' },
        border: { display: false },
        beginAtZero: true,
      },
    },
  }), [])

  return (
    <div className={className} style={{ height }}>
      <Bar data={chartData} options={options} />
    </div>
  )
}

/**
 * Two-series line chart for a hero card - matches the reference's
 * Revenue chart (two overlapping trend lines + dot legend), fed real
 * data instead of the template's placeholder revenue numbers.
 */
export function DualLineChart({
  labels,
  seriesA,
  seriesB,
  colorA = '#2563eb',
  colorB = '#06b6d4',
  height = 140,
  className = '',
}: {
  labels: string[]
  seriesA: number[]
  seriesB: number[]
  colorA?: string
  colorB?: string
  height?: number
  className?: string
}) {
  const chartData = useMemo(() => ({
    labels,
    datasets: [
      {
        data: seriesA, borderColor: colorA, backgroundColor: 'transparent',
        tension: 0.4, borderWidth: 2.5, pointRadius: 0,
      },
      {
        data: seriesB, borderColor: colorB, backgroundColor: 'transparent',
        tension: 0.4, borderWidth: 2.5, pointRadius: 0,
      },
    ],
  }), [labels, seriesA, seriesB, colorA, colorB])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#111827', titleColor: '#e5e7eb', bodyColor: '#ffffff',
        displayColors: false, cornerRadius: 8, padding: 10,
      },
    },
    scales: {
      x: { ticks: { color: '#9ca3af', font: { size: 11 } }, grid: { display: false }, border: { display: false } },
      y: { ticks: { color: '#9ca3af', font: { size: 11 }, precision: 0 }, grid: { color: '#f1f5f9' }, border: { display: false }, beginAtZero: true },
    },
  }), [])

  return (
    <div className={className} style={{ height }}>
      <Line data={chartData} options={options} />
    </div>
  )
}
