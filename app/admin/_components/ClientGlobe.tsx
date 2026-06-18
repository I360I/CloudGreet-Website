'use client'

/**
 * Interactive 3D client map (three-globe inside react-three-fiber).
 * Photorealistic NASA imagery served from /public/geo: Black Marble
 * night lights in dark mode, Blue Marble day in light mode, terrain
 * bump + ocean specular. Camera parked over North America, draggable.
 * Green dots = paying accounts (radar rings), amber = not paying yet,
 * blue = HQ with animated arcs out to every account.
 */

import React, { Component, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import ThreeGlobe from 'three-globe'
import * as THREE from 'three'

export type GlobePoint = {
 id: string
 name: string
 lat: number
 lng: number
 kind: 'paying' | 'nonpaying'
}

export type GlobeHq = { name: string; lat: number; lng: number; city?: string }

type HoverInfo = { x: number; y: number; name: string; kind: 'paying' | 'nonpaying' | 'hq'; city?: string }

const PAYING_COLOR = '#34d399'
const NONPAYING_COLOR = '#fbbf24'
const HQ_COLOR = '#38bdf8'

function GlobeObject({ points, hq, light, onHover, onSelect }: {
 points: GlobePoint[]
 hq?: GlobeHq | null
 light: boolean
 onHover: (h: HoverInfo | null) => void
 onSelect: (id: string) => void
}) {
 const { camera } = useThree()

 const globe = useMemo(() => {
  const g = new ThreeGlobe({ animateIn: true })
  g.showAtmosphere(true)
  return g
 }, [])

 // NASA surface — night lights in dark mode, day imagery in light mode
 useEffect(() => {
  globe
   .globeImageUrl(light ? '/geo/earth-day.jpg' : '/geo/earth-night.jpg')
   .bumpImageUrl('/geo/earth-topology.png')
  const mat = globe.globeMaterial() as THREE.MeshPhongMaterial
  mat.bumpScale = 6
  if (light) {
   globe.atmosphereColor('#7ab8ff').atmosphereAltitude(0.15)
   new THREE.TextureLoader().load('/geo/earth-water.png', (tex) => {
    mat.specularMap = tex
    mat.specular = new THREE.Color('#5a6673')
    mat.shininess = 13
    mat.needsUpdate = true
   })
  } else {
   globe.atmosphereColor('#3da9ff').atmosphereAltitude(0.2)
   mat.specularMap = null
   mat.specular = new THREE.Color('#000000')
   mat.shininess = 4
   mat.needsUpdate = true
  }
 }, [globe, light])

 // markers + radar rings + HQ arcs
 useEffect(() => {
  const markerColor = (d: any) =>
   d.kind === 'hq' ? HQ_COLOR : d.kind === 'paying' ? PAYING_COLOR : NONPAYING_COLOR
  const markers: any[] = hq ? [...points, { ...hq, kind: 'hq' }] : [...points]

  globe
   .pointsData(markers)
   .pointLat((d: any) => d.lat)
   .pointLng((d: any) => d.lng)
   .pointColor(markerColor)
   // Dots sit ABOVE the radar rings so the ring disc doesn't intercept hover/
   // click for the dots underneath it (that's why only the paying client - the
   // one with a ring - was hoverable in a cluster).
   .pointAltitude(0.02)
   .pointResolution(18)
   // Slim, crisp dots - the old 0.7-1.0 radii were fat cylinders that merged
   // into a blob when several clients sat close together (the Ohio cluster).
   .pointRadius((d: any) => (d.kind === 'hq' ? 0.5 : d.kind === 'paying' ? 0.42 : 0.36))

  const ringPts: any[] = [
   ...points.filter((p) => p.kind === 'paying'),
   ...(hq ? [{ ...hq, kind: 'hq' }] : []),
  ]
  globe
   .ringsData(ringPts)
   .ringLat((d: any) => d.lat)
   .ringLng((d: any) => d.lng)
   .ringColor((d: any) => (t: number) =>
    d.kind === 'hq'
     ? `rgba(56, 189, 248, ${Math.max(0, 0.45 * (1 - t))})`
     : `rgba(52, 211, 153, ${Math.max(0, 0.4 * (1 - t))})`)
   // Rings sit BELOW the dots (lower altitude) and stay tight, so the radar
   // halo is purely decorative and never steals hover/clicks from dots near it.
   .ringAltitude(0.005)
   .ringMaxRadius(1.8)
   .ringPropagationSpeed(1.0)
   .ringRepeatPeriod(2200)

  // Animated light-beam arcs: HQ → every account. Each route renders twice,
  // a wide soft halo plus a hot thin core, with additive blending so the
  // beams glow over the night earth instead of reading as flat lines.
  const beams = hq
   ? points.flatMap((p) => {
      const route = { startLat: hq.lat, startLng: hq.lng, endLat: p.lat, endLng: p.lng }
      return [{ ...route, halo: true }, { ...route, halo: false }]
     })
   : []
  const core = light ? '59, 130, 246' : '125, 211, 252'
  const haloC = light ? '37, 99, 235' : '56, 189, 248'
  globe
   .arcsData(beams)
   .arcColor((d: any) => d.halo
    ? [`rgba(${haloC}, 0.35)`, `rgba(${haloC}, 0.05)`]
    : [`rgba(${core}, 1)`, `rgba(${core}, 0.4)`])
   .arcAltitudeAutoScale(0.5)
   .arcCurveResolution(64)
   .arcStroke((d: any) => (d.halo ? 1.5 : 0.42))
   .arcDashLength(0.35)
   .arcDashGap(0.18)
   .arcDashAnimateTime((d: any) => (d.halo ? 3200 : 2200))
   .arcsTransitionDuration(0)

  // additive blending on the arc meshes = light, not paint
  requestAnimationFrame(() => {
   globe.traverse((o: any) => {
    if (o.__data && typeof o.__data === 'object' && 'startLat' in o.__data && o.material) {
     o.material.blending = THREE.AdditiveBlending
     o.material.depthWrite = false
     o.material.needsUpdate = true
    }
   })
  })
 }, [globe, points, hq, light])

 // park the camera over the continental US
 useEffect(() => {
  const { x, y, z } = globe.getCoords(34.5, -92, 1.0)
  camera.position.set(x, y, z)
  camera.lookAt(0, 0, 0)
 }, [globe, camera])

 return (
  <primitive
   object={globe}
   onPointerMove={(e: any) => {
    e.stopPropagation()
    let obj = e.object
    let data: any = null
    while (obj) {
     if (obj.__data && typeof obj.__data === 'object' && 'kind' in obj.__data && 'name' in obj.__data) {
      data = obj.__data
      break
     }
     obj = obj.parent
    }
    if (data) {
     onHover({ x: e.clientX, y: e.clientY, name: data.name, kind: data.kind, city: data.city })
    } else {
     onHover(null)
    }
   }}
   onPointerOut={() => onHover(null)}
   onClick={(e: any) => {
    e.stopPropagation()
    let obj = e.object
    while (obj) {
     const d = obj.__data
     if (d && typeof d === 'object' && 'kind' in d) {
      // Click a client dot -> open their profile. HQ has no profile.
      if (d.kind !== 'hq' && d.id) onSelect(d.id)
      return
     }
     obj = obj.parent
    }
   }}
  />
 )
}

class GLBoundary extends Component<
 { fallback: React.ReactNode; children: React.ReactNode },
 { failed: boolean }
> {
 state = { failed: false }
 static getDerivedStateFromError() { return { failed: true } }
 render() {
  return this.state.failed ? this.props.fallback : this.props.children
 }
}

const HOVER_LABELS: Record<HoverInfo['kind'], { text: string; color: string }> = {
 paying: { text: 'Paying client', color: PAYING_COLOR },
 nonpaying: { text: 'Not paying yet', color: NONPAYING_COLOR },
 hq: { text: 'Headquarters', color: HQ_COLOR },
}

export default function ClientGlobe({
 points, hq = null, theme = 'dark', height = 460,
}: {
 points: GlobePoint[]
 hq?: GlobeHq | null
 theme?: 'dark' | 'light'
 height?: number
}) {
 const light = theme === 'light'
 const router = useRouter()
 const wrapRef = useRef<HTMLDivElement>(null)
 const [hover, setHover] = useState<HoverInfo | null>(null)
 const reduce = useRef(
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false),
 ).current

 return (
  <GLBoundary
   fallback={
    <div style={{ height }} className="flex items-center justify-center text-sm text-gray-500">
     Map unavailable on this device.
    </div>
   }
  >
   <div ref={wrapRef} style={{ height, cursor: hover ? 'pointer' : 'grab' }} className="w-full relative">
    <Canvas
     dpr={[1, 2]}
     camera={{ fov: 38, near: 1, far: 2000, position: [0, 0, 320] }}
     gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
     style={{ background: 'transparent' }}
    >
     <ambientLight intensity={light ? 1.7 : 2.9} color="#ffffff" />
     <directionalLight position={[260, 160, 280]} intensity={light ? 1.5 : 0.25} color="#ffffff" />
     {!light && <Stars radius={280} depth={50} count={1600} factor={4} saturation={0} fade speed={0.5} />}
     <GlobeObject points={points} hq={hq} light={light} onHover={setHover} onSelect={(id) => router.push(`/admin/clients/${id}`)} />
     <OrbitControls
      enablePan={false}
      enableDamping
      dampingFactor={0.06}
      rotateSpeed={0.45}
      zoomSpeed={0.5}
      minDistance={140}
      maxDistance={420}
     />
    </Canvas>

    {hover && wrapRef.current && (() => {
     const rect = wrapRef.current!.getBoundingClientRect()
     const left = Math.max(8, Math.min(rect.width - 208, hover.x - rect.left + 14))
     const top = Math.max(8, hover.y - rect.top - 14)
     const label = HOVER_LABELS[hover.kind]
     return (
      <div
       data-globe-tooltip
       className="absolute z-10 pointer-events-none rounded-xl border backdrop-blur px-3 py-2 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.45)]"
       style={{ left, top, width: 200, background: 'var(--cg-tooltip-bg)', borderColor: 'var(--cg-tooltip-border)' }}
      >
       <div className="text-sm font-medium truncate" style={{ color: 'var(--cg-text-1)' }}>
        {hover.name}
       </div>
       <div className="flex items-center gap-1.5 mt-1">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: label.color, boxShadow: `0 0 6px ${label.color}` }} />
        <span className="text-[11px] font-mono" style={{ color: 'var(--cg-muted)' }}>
         {hover.kind === 'hq' && hover.city ? hover.city : label.text}
        </span>
       </div>
      </div>
     )
    })()}
   </div>
  </GLBoundary>
 )
}
