'use client'

/**
 * Territory map: a flat, straight-on continental US drawn as plain SVG
 * directly on the page background - no card, no WebGL, no orbiting.
 * States shade toward iOS blue with the rep's lead count (hot/cold),
 * thin arcs run from the rep's home metro (their dialer DID) to every
 * booked demo (blue) and live client (green), endpoints are crisp
 * card-rimmed dots. Hover states and dots for details; nothing moves.
 * All colors ride the .sales-crm CSS tokens so dark mode just works.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react'

export type MapPoint = { id: string; name: string; lat: number; lng: number; kind: 'demo' | 'client'; href?: string }
export type MapHome = { lat: number; lng: number }
type Hover = { x: number; y: number; title: string; sub: string }

/* ------------------------------------------------------------------ */
/* Albers equal-area conic projection (continental US)                 */
/* ------------------------------------------------------------------ */
const D2R = Math.PI / 180
const P1 = 29.5 * D2R, P2 = 45.5 * D2R, LAT0 = 38 * D2R, LON0 = -96 * D2R
const N = (Math.sin(P1) + Math.sin(P2)) / 2
const C = Math.cos(P1) ** 2 + 2 * N * Math.sin(P1)
const RHO0 = Math.sqrt(C - 2 * N * Math.sin(LAT0)) / N
const SCALE = 800

/** lat/lng → SVG-space [x, y] (y grows south, ready to draw). */
function project(lat: number, lng: number): [number, number] {
  const rho = Math.sqrt(C - 2 * N * Math.sin(lat * D2R)) / N
  const theta = N * (lng * D2R - LON0)
  return [rho * Math.sin(theta) * SCALE, -(RHO0 - rho * Math.cos(theta)) * SCALE]
}

/* ------------------------------------------------------------------ */
/* GeoJSON → path strings                                              */
/* ------------------------------------------------------------------ */
type StateShape = { name: string; d: string }

const SKIP_STATES = new Set(['Alaska', 'Hawaii', 'Puerto Rico'])

function buildStates(geo: any): { shapes: StateShape[]; viewBox: string } {
  const shapes: StateShape[] = []
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const f of geo.features || []) {
    const name = f?.properties?.name || ''
    if (SKIP_STATES.has(name)) continue
    const polys: number[][][][] =
      f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
    let d = ''
    for (const poly of polys) {
      const ring = poly[0]
      if (!ring || ring.length < 4) continue
      ring.forEach(([lng, lat], i) => {
        const [x, y] = project(lat, lng)
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
        d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
      })
      d += 'Z'
    }
    if (d) shapes.push({ name, d })
  }
  if (!shapes.length) return { shapes, viewBox: '0 0 100 60' }
  const pad = 12
  return {
    shapes,
    viewBox: `${(minX - pad).toFixed(1)} ${(minY - pad).toFixed(1)} ${(maxX - minX + pad * 2).toFixed(1)} ${(maxY - minY + pad * 2).toFixed(1)}`,
  }
}

/** Arc path: chord lifted perpendicular, always bowing north. */
function arcPath(a: [number, number], b: [number, number]): string {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const dist = Math.hypot(dx, dy) || 1
  let nx = -dy / dist, ny = dx / dist
  if (ny > 0) { nx = -nx; ny = -ny } // bow upward (north) in SVG coords
  const lift = Math.min(dist * 0.22, 90)
  return `M${a[0].toFixed(1)},${a[1].toFixed(1)} Q${(mx + nx * lift).toFixed(1)},${(my + ny * lift).toFixed(1)} ${b[0].toFixed(1)},${b[1].toFixed(1)}`
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export default function TerritoryMap({ points, home, density }: {
  points: MapPoint[]
  home: MapHome | null
  density: Record<string, number>
}) {
  const [geo, setGeo] = useState<{ shapes: StateShape[]; viewBox: string } | null>(null)
  const [hover, setHover] = useState<Hover | null>(null)
  const [hoveredState, setHoveredState] = useState<string | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let dead = false
    fetch('/geo/us-states.json')
      .then((r) => r.json())
      .then((g) => { if (!dead) setGeo(buildStates(g)) })
      .catch(() => {})
    return () => { dead = true }
  }, [])

  const maxLeads = useMemo(() => Math.max(0, ...Object.values(density)), [density])

  const origin = useMemo<[number, number] | null>(() => {
    if (home) return project(home.lat, home.lng)
    if (points.length) return project(points[0].lat, points[0].lng)
    return null
  }, [home, points])

  if (!geo) return <div style={{ height: 380 }} />

  const place = (e: React.MouseEvent, title: string, sub: string) => {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, title, sub })
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg viewBox={geo.viewBox} className="w-full h-auto block" role="img" aria-label="Map of your demos, clients and lead territory across the US">
        {/* states - shaded by the rep's lead count */}
        {geo.shapes.map((s) => {
          const leads = density[s.name] || 0
          const d = maxLeads > 0 ? Math.sqrt(leads / maxLeads) : 0
          const active = hoveredState === s.name
          return (
            <path
              key={s.name}
              d={s.d}
              fill={leads > 0 ? `rgba(0, 122, 255, ${(0.08 + d * 0.3) + (active ? 0.1 : 0)})` : (active ? 'rgba(120, 120, 128, 0.22)' : 'var(--dseg)')}
              stroke="var(--dbg)"
              strokeWidth="0.8"
              strokeLinejoin="round"
              style={{ transition: 'fill 0.15s' }}
              onMouseMove={(e) => {
                setHoveredState(s.name)
                place(e, s.name, leads > 0 ? `${leads} lead${leads === 1 ? '' : 's'} assigned to you` : 'No leads here yet')
              }}
              onMouseLeave={() => { setHoveredState(null); setHover(null) }}
            />
          )
        })}

        {/* arcs home → demo (blue) / client (green) */}
        {origin && points.map((p) => (
          <path
            key={`arc-${p.id}`}
            d={arcPath(origin, project(p.lat, p.lng))}
            fill="none"
            stroke={p.kind === 'client' ? 'var(--dgreen)' : 'var(--dblue)'}
            strokeOpacity={p.kind === 'client' ? 0.55 : 0.4}
            strokeWidth="1.1"
            strokeLinecap="round"
            pointerEvents="none"
          />
        ))}

        {/* demo + client dots */}
        {points.map((p) => {
          const [x, y] = project(p.lat, p.lng)
          const dot = (
            <g
              onMouseMove={(e) => place(e, p.name, p.kind === 'client' ? 'Live client · you closed this' : 'Demo on the calendar')}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: p.href ? 'pointer' : 'default' }}
            >
              {/* generous invisible hit area so the 4px dot is easy to click */}
              {p.href && <circle cx={x} cy={y} r="9" fill="transparent" />}
              <circle cx={x} cy={y} r="4.2" fill="var(--dcard)" stroke="rgba(15, 23, 42, 0.16)" strokeWidth="0.5" />
              <circle cx={x} cy={y} r="2.3" fill={p.kind === 'client' ? 'var(--dgreen-deep)' : 'var(--dblue)'} pointerEvents="none" />
            </g>
          )
          return p.href
            ? <a key={p.id} href={p.href} aria-label={`Open ${p.name}`}>{dot}</a>
            : <React.Fragment key={p.id}>{dot}</React.Fragment>
        })}

        {/* home base */}
        {home && (() => {
          const [x, y] = project(home.lat, home.lng)
          return (
            <g
              onMouseMove={(e) => place(e, 'Home base', 'CloudGreet HQ · Austin, TX')}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'default' }}
            >
              <circle cx={x} cy={y} r="5.2" fill="var(--dblue)" stroke="var(--dcard)" strokeWidth="1.2" />
              <circle cx={x} cy={y} r="1.7" fill="var(--dcard)" pointerEvents="none" />
            </g>
          )
        })()}
      </svg>

      {hover && (
        <div
          className="absolute z-10 pointer-events-none rounded-xl px-3.5 py-2.5"
          style={{
            left: Math.max(4, Math.min((wrapRef.current?.clientWidth || 300) - 212, hover.x + 14)),
            top: Math.max(4, hover.y - 14),
            width: 208,
            background: 'var(--dcard)',
            boxShadow: 'var(--dshadow-pop)',
          }}
        >
          <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--dink)' }}>{hover.title}</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--dmut)' }}>{hover.sub}</div>
        </div>
      )}
    </div>
  )
}
