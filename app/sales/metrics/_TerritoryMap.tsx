'use client'

/**
 * Territory map: a gently tilted 3D continental US rendered as clean
 * data-viz on a CloudGreet-blue tile. States are frosted glass shaded
 * by the rep's lead count (the hot/cold read), thin white arcs connect
 * the rep's home metro to every booked demo, soft green arcs to every
 * live client, and the endpoints are crisp white-rimmed dots. No glow
 * fog, no radar pulses, no sparks - it should read like Stripe, not a
 * game. Hover any state or dot for details; drag to orbit.
 */

import React, { Component, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

export type MapPoint = { id: string; name: string; lat: number; lng: number; kind: 'demo' | 'client' }
export type MapHome = { lat: number; lng: number }
export type MapHover = { x: number; y: number; title: string; sub: string }

const CLIENT_GREEN = '#4ADE80'
const DEMO_CORE = '#1D4ED8'

/* ------------------------------------------------------------------ */
/* Albers equal-area conic projection (continental US)                 */
/* ------------------------------------------------------------------ */
const D2R = Math.PI / 180
const P1 = 29.5 * D2R, P2 = 45.5 * D2R, LAT0 = 38 * D2R, LON0 = -96 * D2R
const N = (Math.sin(P1) + Math.sin(P2)) / 2
const C = Math.cos(P1) ** 2 + 2 * N * Math.sin(P1)
const RHO0 = Math.sqrt(C - 2 * N * Math.sin(LAT0)) / N
const SCALE = 88

/** lat/lng → map-space [x, y] (map lies in XY, +y = north). */
function project(lat: number, lng: number): [number, number] {
  const rho = Math.sqrt(C - 2 * N * Math.sin(lat * D2R)) / N
  const theta = N * (lng * D2R - LON0)
  return [rho * Math.sin(theta) * SCALE, (RHO0 - rho * Math.cos(theta)) * SCALE]
}

/* ------------------------------------------------------------------ */
/* States layer - frosted glass, shaded by lead density                */
/* ------------------------------------------------------------------ */
type StateFeature = { name: string; shapes: THREE.Shape[] }

// Continental only - the Albers frame is tuned for the lower 48.
const SKIP_STATES = new Set(['Alaska', 'Hawaii', 'Puerto Rico'])

function buildStates(geo: any): StateFeature[] {
  const out: StateFeature[] = []
  for (const f of geo.features || []) {
    const name = f?.properties?.name || ''
    if (SKIP_STATES.has(name)) continue
    const polys: number[][][][] =
      f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
    const shapes: THREE.Shape[] = []
    for (const poly of polys) {
      const ring = poly[0]
      if (!ring || ring.length < 4) continue
      const shape = new THREE.Shape()
      ring.forEach(([lng, lat], i) => {
        const [x, y] = project(lat, lng)
        if (i === 0) shape.moveTo(x, y)
        else shape.lineTo(x, y)
      })
      shapes.push(shape)
    }
    if (shapes.length) out.push({ name, shapes })
  }
  return out
}

function StateMesh({ feature, leads, maxLeads, onHover }: {
  feature: StateFeature
  leads: number
  maxLeads: number
  onHover: (h: MapHover | null) => void
}) {
  const [hovered, setHovered] = useState(false)

  const { fillGeo, lineGeo } = useMemo(() => {
    const fillGeo = new THREE.ShapeGeometry(feature.shapes, 24)
    const pts: number[] = []
    for (const s of feature.shapes) {
      const p = s.getPoints(96)
      for (let i = 0; i < p.length - 1; i++) {
        pts.push(p[i].x, p[i].y, 0, p[i + 1].x, p[i + 1].y, 0)
      }
    }
    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return { fillGeo, lineGeo }
  }, [feature])

  // Choropleth: cold states stay near-transparent, the rep's busiest
  // states frost toward white. sqrt keeps mid-size counts visible.
  const density = maxLeads > 0 ? Math.sqrt(leads / maxLeads) : 0
  const fillOpacity = 0.06 + density * 0.3

  return (
    <group>
      <mesh
        geometry={fillGeo}
        onPointerMove={(e: any) => {
          e.stopPropagation()
          setHovered(true)
          onHover({
            x: e.clientX, y: e.clientY, title: feature.name,
            sub: leads > 0 ? `${leads} lead${leads === 1 ? '' : 's'} assigned to you` : 'No leads here yet',
          })
        }}
        onPointerOut={() => { setHovered(false); onHover(null) }}
      >
        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={hovered ? Math.min(fillOpacity + 0.12, 0.5) : fillOpacity}
        />
      </mesh>
      <lineSegments geometry={lineGeo} position={[0, 0, 0.05]}>
        <lineBasicMaterial color="#FFFFFF" transparent opacity={hovered ? 0.55 : 0.22} />
      </lineSegments>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Arcs - thin, calm, no particles                                     */
/* ------------------------------------------------------------------ */
function Arc({ from, to, color, opacity }: {
  from: [number, number]; to: [number, number]; color: string; opacity: number
}) {
  const geo = useMemo(() => {
    const a = new THREE.Vector3(from[0], from[1], 0.3)
    const b = new THREE.Vector3(to[0], to[1], 0.3)
    const dist = a.distanceTo(b)
    const mid = a.clone().lerp(b, 0.5)
    mid.z = 1.6 + dist * 0.22
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b)
    return new THREE.TubeGeometry(curve, 44, 0.07, 6, false)
  }, [from, to])
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  )
}

/* ------------------------------------------------------------------ */
/* Markers - crisp white-rimmed dots                                   */
/* ------------------------------------------------------------------ */
function Dot({ x, y, core, size, onHover, hoverInfo }: {
  x: number; y: number; core: string; size: number
  onHover: (h: MapHover | null) => void
  hoverInfo: { title: string; sub: string }
}) {
  const [hovered, setHovered] = useState(false)
  const s = hovered ? size * 1.3 : size
  return (
    <group position={[x, y, 0.5]}>
      {/* anchoring shadow keeps the dot readable over any state shade */}
      <mesh position={[0, 0, -0.05]}>
        <circleGeometry args={[s * 1.45, 24]} />
        <meshBasicMaterial color="#0B245C" transparent opacity={0.25} depthWrite={false} />
      </mesh>
      <mesh>
        <circleGeometry args={[s, 28]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <circleGeometry args={[s * 0.56, 28]} />
        <meshBasicMaterial color={core} />
      </mesh>
      <mesh
        position={[0, 0, 0.03]}
        onPointerMove={(e: any) => {
          e.stopPropagation()
          setHovered(true)
          onHover({ x: e.clientX, y: e.clientY, ...hoverInfo })
        }}
        onPointerOut={() => { setHovered(false); onHover(null) }}
      >
        <circleGeometry args={[Math.max(s * 2.2, 2.2), 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */
function Scene({ states, points, home, density, onHover }: {
  states: StateFeature[]
  points: MapPoint[]
  home: MapHome | null
  density: Record<string, number>
  onHover: (h: MapHover | null) => void
}) {
  const { camera } = useThree()

  useEffect(() => {
    camera.position.set(0, -58, 56)
    camera.lookAt(0, 0, 0)
  }, [camera])

  const maxLeads = useMemo(
    () => Math.max(0, ...Object.values(density)),
    [density],
  )

  const origin = useMemo<[number, number] | null>(() => {
    if (home) return project(home.lat, home.lng)
    if (points.length) return project(points[0].lat, points[0].lng)
    return null
  }, [home, points])

  return (
    <group rotation={[-Math.PI / 2.7, 0, 0]} position={[0, -6, 0]}>
      <group position={[0, 6, 0]}>
        {states.map((f) => (
          <StateMesh
            key={f.name}
            feature={f}
            leads={density[f.name] || 0}
            maxLeads={maxLeads}
            onHover={onHover}
          />
        ))}
        {origin && points.map((p) => (
          <Arc
            key={`arc-${p.id}`}
            from={origin}
            to={project(p.lat, p.lng)}
            color={p.kind === 'client' ? CLIENT_GREEN : '#FFFFFF'}
            opacity={p.kind === 'client' ? 0.6 : 0.5}
          />
        ))}
        {points.map((p) => {
          const [x, y] = project(p.lat, p.lng)
          return (
            <Dot
              key={p.id}
              x={x} y={y}
              core={p.kind === 'client' ? '#16A34A' : DEMO_CORE}
              size={0.95}
              onHover={onHover}
              hoverInfo={{
                title: p.name,
                sub: p.kind === 'client' ? 'Live client · you closed this' : 'Demo on the calendar',
              }}
            />
          )
        })}
        {home && (() => {
          const [x, y] = project(home.lat, home.lng)
          return (
            <Dot
              x={x} y={y}
              core="#FFFFFF"
              size={1.15}
              onHover={onHover}
              hoverInfo={{ title: 'Home base', sub: 'Your dialer number lives here' }}
            />
          )
        })()}
      </group>
    </group>
  )
}

class GLBoundary extends Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

/* ------------------------------------------------------------------ */
/* Public component                                                    */
/* ------------------------------------------------------------------ */
export default function TerritoryMap({ points, home, density, height = 420 }: {
  points: MapPoint[]
  home: MapHome | null
  density: Record<string, number>
  height?: number
}) {
  const [states, setStates] = useState<StateFeature[]>([])
  const [hover, setHover] = useState<MapHover | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let dead = false
    fetch('/geo/us-states.json')
      .then((r) => r.json())
      .then((geo) => { if (!dead) setStates(buildStates(geo)) })
      .catch(() => {})
    return () => { dead = true }
  }, [])

  return (
    <GLBoundary
      fallback={
        <div style={{ height }} className="flex items-center justify-center text-sm">
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>Map unavailable on this device.</span>
        </div>
      }
    >
      <div ref={wrapRef} style={{ height, cursor: hover ? 'pointer' : 'grab' }} className="w-full relative">
        <Canvas
          dpr={[1, 2]}
          camera={{ fov: 34, near: 1, far: 1200 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          style={{ background: 'transparent' }}
        >
          <Scene states={states} points={points} home={home} density={density} onHover={setHover} />
          <OrbitControls
            enablePan={false}
            enableDamping
            dampingFactor={0.08}
            rotateSpeed={0.35}
            zoomSpeed={0.45}
            minDistance={46}
            maxDistance={150}
            minPolarAngle={Math.PI * 0.1}
            maxPolarAngle={Math.PI * 0.42}
            minAzimuthAngle={-Math.PI * 0.22}
            maxAzimuthAngle={Math.PI * 0.22}
          />
        </Canvas>

        {hover && wrapRef.current && (() => {
          const rect = wrapRef.current!.getBoundingClientRect()
          const left = Math.max(8, Math.min(rect.width - 216, hover.x - rect.left + 16))
          const top = Math.max(8, hover.y - rect.top - 16)
          return (
            <div
              className="absolute z-10 pointer-events-none rounded-xl px-3.5 py-2.5"
              style={{
                left, top, width: 208,
                background: '#FFFFFF',
                boxShadow: '0 12px 32px -8px rgba(15, 40, 100, 0.35)',
              }}
            >
              <div className="text-[13px] font-semibold truncate" style={{ color: '#1B2430' }}>{hover.title}</div>
              <div className="text-[11px] mt-0.5" style={{ color: '#75808F' }}>{hover.sub}</div>
            </div>
          )
        })()}
      </div>
    </GLBoundary>
  )
}
