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

/** Light-card-themed bar chart - a single series, blue bars, for a KPI card. */
export function MiniBarChart({
  labels,
  data,
  color = '#4f46e5',
  height = 160,
  className = '',
}: {
  labels: string[]
  data: number[]
  color?: string
  height?: number
  className?: string
}) {
  const chartData = useMemo(() => ({
    labels,
    datasets: [{
      data,
      backgroundColor: color,
      borderRadius: 4,
      maxBarThickness: 28,
    }],
  }), [labels, data, color])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: { color: '#6b7280', font: { size: 11 } },
        grid: { display: false },
      },
      y: {
        ticks: { color: '#9ca3af', font: { size: 11 }, precision: 0 },
        grid: { color: '#f3f4f6' },
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
