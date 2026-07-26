'use client'

/**
 * Territory map: a tilted 3D continental-US scene (react-three-fiber).
 * Albers-projected state shapes float in a dark void, the rep's lead
 * density renders as hot/cold glow zones on the surface, and animated
 * light arcs travel from the rep's home metro (their dialer DID) out to
 * every demo (blue) and every client they're serving (green), each with
 * a pulsing radar ring and a traveling spark.
 *
 * Deliberately more cinematic than the admin globe: additive-blended
 * beams with a halo + hot-core pass, per-arc phase-offset sparks, state
 * hover lift, and a slow idle camera drift. Honors reduced motion.
 */

import React, { Component, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

export type MapPoint = { id: string; name: string; lat: number; lng: number; kind: 'demo' | 'client' }
export type MapHome = { lat: number; lng: number }
export type HeatCell = { lat: number; lng: number; w: number }
export type MapHover = { x: number; y: number; title: string; sub: string; color: string }

const DEMO_COLOR = '#4DA3FF'
const CLIENT_COLOR = '#C9F26F'
const HOME_COLOR = '#F4FFE0'

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
/* Textures (built once per session)                                   */
/* ------------------------------------------------------------------ */
let glowTex: THREE.Texture | null = null
function getGlowTexture(): THREE.Texture {
  if (glowTex) return glowTex
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.45)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  glowTex = new THREE.CanvasTexture(c)
  return glowTex
}

/* ------------------------------------------------------------------ */
/* States layer                                                        */
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

function StateMesh({ feature, onHover }: { feature: StateFeature; onHover: (h: MapHover | null) => void }) {
  const [hovered, setHovered] = useState(false)
  const groupRef = useRef<THREE.Group>(null)

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

  // Hovered states float up a touch - eased every frame, not snapped.
  useFrame(() => {
    if (!groupRef.current) return
    const target = hovered ? 0.9 : 0
    groupRef.current.position.z += (target - groupRef.current.position.z) * 0.14
  })

  return (
    <group ref={groupRef}>
      <mesh
        geometry={fillGeo}
        onPointerMove={(e: any) => {
          e.stopPropagation()
          setHovered(true)
          onHover({ x: e.clientX, y: e.clientY, title: feature.name, sub: 'Territory', color: '#A9C5AE' })
        }}
        onPointerOut={() => { setHovered(false); onHover(null) }}
      >
        <meshStandardMaterial
          color={hovered ? '#2A523B' : '#1D3B2A'}
          emissive={hovered ? '#2F6B44' : '#0E2117'}
          emissiveIntensity={hovered ? 0.9 : 0.55}
          roughness={0.85}
          metalness={0.1}
        />
      </mesh>
      <lineSegments geometry={lineGeo} position={[0, 0, 0.06]}>
        <lineBasicMaterial color={hovered ? '#C9F26F' : '#3E5F48'} transparent opacity={hovered ? 0.95 : 0.55} />
      </lineSegments>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Heat layer - hot/cold glow zones                                    */
/* ------------------------------------------------------------------ */
function HeatLayer({ heat }: { heat: HeatCell[] }) {
  const tex = useMemo(() => getGlowTexture(), [])
  // Cold (sparse) cells glow deep blue, hot (dense) cells burn orange.
  const cold = useMemo(() => new THREE.Color('#2E6FBF'), [])
  const hot = useMemo(() => new THREE.Color('#FFAB3D'), [])
  return (
    <group>
      {heat.map((c, i) => {
        const [x, y] = project(c.lat, c.lng)
        const color = cold.clone().lerp(hot, Math.pow(c.w, 0.6))
        const size = 6 + c.w * 13
        return (
          <sprite key={i} position={[x, y, 0.15]} scale={[size, size, 1]}>
            <spriteMaterial
              map={tex}
              color={color}
              transparent
              opacity={0.16 + c.w * 0.4}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </sprite>
        )
      })}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Radar ring pulse                                                    */
/* ------------------------------------------------------------------ */
function Pulse({ x, y, color, phase, reduce }: { x: number; y: number; color: string; phase: number; reduce: boolean }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    if (reduce) { ref.current.scale.setScalar(1.6); (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.2; return }
    const t = (clock.elapsedTime * 0.55 + phase) % 1
    const s = 0.4 + t * 3.2
    ref.current.scale.setScalar(s)
    ;(ref.current.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - t)
  })
  return (
    <mesh ref={ref} position={[x, y, 0.22]}>
      <ringGeometry args={[0.82, 1, 48]} />
      <meshBasicMaterial color={color} transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

/* ------------------------------------------------------------------ */
/* Marker (glow dot + hit area + pulse)                                */
/* ------------------------------------------------------------------ */
function Marker({ point, phase, onHover, reduce }: {
  point: MapPoint; phase: number; onHover: (h: MapHover | null) => void; reduce: boolean
}) {
  const [x, y] = project(point.lat, point.lng)
  const color = point.kind === 'client' ? CLIENT_COLOR : DEMO_COLOR
  const tex = useMemo(() => getGlowTexture(), [])
  const [hovered, setHovered] = useState(false)
  return (
    <group>
      <Pulse x={x} y={y} color={color} phase={phase} reduce={reduce} />
      {/* soft glow */}
      <sprite position={[x, y, 0.4]} scale={hovered ? [5.2, 5.2, 1] : [3.4, 3.4, 1]}>
        <spriteMaterial map={tex} color={color} transparent opacity={hovered ? 0.85 : 0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      {/* hot core */}
      <mesh position={[x, y, 0.45]}>
        <sphereGeometry args={[hovered ? 0.62 : 0.45, 20, 20]} />
        <meshBasicMaterial color={hovered ? '#FFFFFF' : color} />
      </mesh>
      {/* generous invisible hit area so hover feels effortless */}
      <mesh
        position={[x, y, 0.45]}
        onPointerMove={(e: any) => {
          e.stopPropagation()
          setHovered(true)
          onHover({
            x: e.clientX, y: e.clientY, title: point.name,
            sub: point.kind === 'client' ? 'Live client · you closed this' : 'Demo on the calendar',
            color,
          })
        }}
        onPointerOut={() => { setHovered(false); onHover(null) }}
      >
        <sphereGeometry args={[2.4, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Beam arcs with traveling sparks                                     */
/* ------------------------------------------------------------------ */
function Beam({ from, to, color, phase, reduce }: {
  from: [number, number]; to: [number, number]; color: string; phase: number; reduce: boolean
}) {
  const sparkRef = useRef<THREE.Sprite>(null)
  const tex = useMemo(() => getGlowTexture(), [])

  const { curve, coreGeo, haloGeo } = useMemo(() => {
    const a = new THREE.Vector3(from[0], from[1], 0.4)
    const b = new THREE.Vector3(to[0], to[1], 0.4)
    const dist = a.distanceTo(b)
    const mid = a.clone().lerp(b, 0.5)
    mid.z = 2.5 + dist * 0.34 // arc height scales with distance
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b)
    const coreGeo = new THREE.TubeGeometry(curve, 48, 0.09, 6, false)
    const haloGeo = new THREE.TubeGeometry(curve, 48, 0.34, 6, false)
    return { curve, coreGeo, haloGeo }
  }, [from, to])

  useFrame(({ clock }) => {
    if (!sparkRef.current || reduce) return
    const t = (clock.elapsedTime * 0.42 + phase) % 1
    const p = curve.getPoint(t)
    sparkRef.current.position.set(p.x, p.y, p.z)
    // brightest mid-flight, dim near the endpoints
    const fade = Math.sin(t * Math.PI)
    sparkRef.current.scale.setScalar(1.6 + fade * 1.8)
    ;(sparkRef.current.material as THREE.SpriteMaterial).opacity = 0.25 + fade * 0.75
  })

  return (
    <group>
      <mesh geometry={haloGeo}>
        <meshBasicMaterial color={color} transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh geometry={coreGeo}>
        <meshBasicMaterial color={color} transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {!reduce && (
        <sprite ref={sparkRef} scale={[2, 2, 1]}>
          <spriteMaterial map={tex} color="#FFFFFF" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
      )}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Home beacon                                                         */
/* ------------------------------------------------------------------ */
function HomeBeacon({ home, onHover, reduce }: { home: MapHome; onHover: (h: MapHover | null) => void; reduce: boolean }) {
  const [x, y] = project(home.lat, home.lng)
  const tex = useMemo(() => getGlowTexture(), [])
  return (
    <group>
      <Pulse x={x} y={y} color={HOME_COLOR} phase={0} reduce={reduce} />
      <Pulse x={x} y={y} color={HOME_COLOR} phase={0.5} reduce={reduce} />
      <sprite position={[x, y, 0.5]} scale={[6, 6, 1]}>
        <spriteMaterial map={tex} color={HOME_COLOR} transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      <mesh position={[x, y, 0.5]}>
        <sphereGeometry args={[0.6, 20, 20]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
      <mesh
        position={[x, y, 0.5]}
        onPointerMove={(e: any) => {
          e.stopPropagation()
          onHover({ x: e.clientX, y: e.clientY, title: 'Home base', sub: 'Your dialer number lives here', color: HOME_COLOR })
        }}
        onPointerOut={() => onHover(null)}
      >
        <sphereGeometry args={[2.6, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */
function Scene({ states, points, home, heat, onHover, reduce }: {
  states: StateFeature[]
  points: MapPoint[]
  home: MapHome | null
  heat: HeatCell[]
  onHover: (h: MapHover | null) => void
  reduce: boolean
}) {
  const { camera } = useThree()
  const rootRef = useRef<THREE.Group>(null)

  useEffect(() => {
    camera.position.set(0, -64, 60)
    camera.lookAt(0, 0, 0)
  }, [camera])

  // Slow idle sway so the scene breathes even before anyone touches it.
  useFrame(({ clock }) => {
    if (reduce || !rootRef.current) return
    rootRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.14) * 0.022
    rootRef.current.position.y = -12 + Math.sin(clock.elapsedTime * 0.2) * 0.6
  })

  const origin = useMemo<[number, number] | null>(() => {
    if (home) return project(home.lat, home.lng)
    if (points.length) return project(points[0].lat, points[0].lng)
    return null
  }, [home, points])

  return (
    <group ref={rootRef} rotation={[-Math.PI / 2.55, 0, 0]} position={[0, -12, 0]}>
      <group position={[0, 6, 0]}>
        {states.map((f) => <StateMesh key={f.name} feature={f} onHover={onHover} />)}
        <HeatLayer heat={heat} />
        {origin && points.map((p, i) => (
          <Beam
            key={p.id}
            from={origin}
            to={project(p.lat, p.lng)}
            color={p.kind === 'client' ? CLIENT_COLOR : DEMO_COLOR}
            phase={(i * 0.37) % 1}
            reduce={reduce}
          />
        ))}
        {points.map((p, i) => (
          <Marker key={p.id} point={p} phase={(i * 0.29) % 1} onHover={onHover} reduce={reduce} />
        ))}
        {home && <HomeBeacon home={home} onHover={onHover} reduce={reduce} />}
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
export default function TerritoryMap({ points, home, heat, height = 440 }: {
  points: MapPoint[]
  home: MapHome | null
  heat: HeatCell[]
  height?: number
}) {
  const [states, setStates] = useState<StateFeature[]>([])
  const [hover, setHover] = useState<MapHover | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const reduce = useRef(
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false),
  ).current

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
        <div style={{ height }} className="flex items-center justify-center text-sm" >
          <span style={{ color: '#6E7A6B' }}>Map unavailable on this device.</span>
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
          <ambientLight intensity={1.15} />
          <directionalLight position={[60, -40, 120]} intensity={0.85} color="#D7EFC9" />
          <Scene states={states} points={points} home={home} heat={heat} onHover={setHover} reduce={reduce} />
          <OrbitControls
            enablePan={false}
            enableDamping
            dampingFactor={0.07}
            rotateSpeed={0.4}
            zoomSpeed={0.5}
            minDistance={48}
            maxDistance={165}
            minPolarAngle={Math.PI * 0.12}
            maxPolarAngle={Math.PI * 0.46}
            minAzimuthAngle={-Math.PI * 0.28}
            maxAzimuthAngle={Math.PI * 0.28}
          />
        </Canvas>

        {hover && wrapRef.current && (() => {
          const rect = wrapRef.current!.getBoundingClientRect()
          const left = Math.max(8, Math.min(rect.width - 216, hover.x - rect.left + 16))
          const top = Math.max(8, hover.y - rect.top - 16)
          return (
            <div
              className="absolute z-10 pointer-events-none rounded-xl px-3 py-2"
              style={{
                left, top, width: 208,
                background: 'rgba(14, 30, 21, 0.9)',
                border: '1px solid rgba(201, 242, 111, 0.28)',
                backdropFilter: 'blur(10px)',
                boxShadow: `0 16px 42px -14px rgba(0,0,0,0.6), 0 0 24px -8px ${hover.color}55`,
              }}
            >
              <div className="text-[13px] font-semibold truncate" style={{ color: '#F4F7EC' }}>{hover.title}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: hover.color, boxShadow: `0 0 8px ${hover.color}` }} />
                <span className="text-[11px] font-mono" style={{ color: '#A9C5AE' }}>{hover.sub}</span>
              </div>
            </div>
          )
        })()}
      </div>
    </GLBoundary>
  )
}
