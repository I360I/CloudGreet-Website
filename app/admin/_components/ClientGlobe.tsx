'use client'

/**
 * Interactive 3D client map (three-globe inside react-three-fiber).
 * Dot-matrix continents, atmosphere glow, camera parked over North
 * America, draggable. Green dots = clients, amber dots = demo leads,
 * with radar rings pulsing from client locations.
 * Land topology is served from /public/geo (no third-party fetch).
 */

import React, { Component, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import ThreeGlobe from 'three-globe'
import { feature } from 'topojson-client'
import * as THREE from 'three'

export type GlobePoint = {
 id: string
 name: string
 lat: number
 lng: number
 kind: 'client' | 'demo'
}

const CLIENT_COLOR = '#34d399'
const DEMO_COLOR = '#fbbf24'

let landCache: any[] | null = null
async function loadLand(): Promise<any[]> {
 if (landCache) return landCache
 // Per-country features: h3's polygonToCells chokes on the single merged
 // land MultiPolygon, so we hex-bin country by country (like globe.gl does).
 const res = await fetch('/geo/countries-110m.json')
 const topo = await res.json()
 landCache = (feature(topo, topo.objects.countries) as any).features
 return landCache!
}

function GlobeObject({ points, light }: { points: GlobePoint[]; light: boolean }) {
 const { camera } = useThree()
 const [land, setLand] = useState<any[] | null>(null)

 useEffect(() => {
  let alive = true
  loadLand().then((f) => { if (alive) setLand(f) }).catch(() => {})
  return () => { alive = false }
 }, [])

 const globe = useMemo(() => {
  const g = new ThreeGlobe({ animateIn: true })
  g.showAtmosphere(true)
  return g
 }, [])

 // theme-dependent surface
 useEffect(() => {
  const mat = globe.globeMaterial() as THREE.MeshPhongMaterial
  if (light) {
   mat.color = new THREE.Color('#dbe7f7')
   mat.emissive = new THREE.Color('#c7d8ef')
   mat.emissiveIntensity = 0.25
   mat.shininess = 4
   globe.atmosphereColor('#60a5fa').atmosphereAltitude(0.14)
  } else {
   mat.color = new THREE.Color('#0c1a30')
   mat.emissive = new THREE.Color('#081224')
   mat.emissiveIntensity = 0.6
   mat.shininess = 6
   globe.atmosphereColor('#38bdf8').atmosphereAltitude(0.16)
  }
 }, [globe, light])

 // continents as hex dot-matrix
 useEffect(() => {
  if (!land) return
  globe
   .hexPolygonsData(land)
   .hexPolygonResolution(3)
   .hexPolygonMargin(0.66)
   .hexPolygonAltitude(0.004)
   .hexPolygonColor(() => (light ? 'rgba(37, 99, 235, 0.50)' : 'rgba(96, 165, 250, 0.55)'))
 }, [globe, land, light])

 // markers + radar rings
 useEffect(() => {
  globe
   .pointsData(points)
   .pointLat((d: any) => d.lat)
   .pointLng((d: any) => d.lng)
   .pointColor((d: any) => (d.kind === 'client' ? CLIENT_COLOR : DEMO_COLOR))
   .pointAltitude(0.018)
   .pointRadius((d: any) => (d.kind === 'client' ? 0.55 : 0.4))

  const clientPts = points.filter((p) => p.kind === 'client')
  globe
   .ringsData(clientPts)
   .ringLat((d: any) => d.lat)
   .ringLng((d: any) => d.lng)
   .ringColor(() => (t: number) => `rgba(52, 211, 153, ${Math.max(0, 0.55 * (1 - t))})`)
   .ringAltitude(0.019)
   .ringMaxRadius(3.4)
   .ringPropagationSpeed(1.1)
   .ringRepeatPeriod(1700)
 }, [globe, points])

 // park the camera over the continental US
 useEffect(() => {
  const { x, y, z } = globe.getCoords(37, -96, 1.45)
  camera.position.set(x, y, z)
  camera.lookAt(0, 0, 0)
 }, [globe, camera])

 return <primitive object={globe} />
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

export default function ClientGlobe({
 points, theme = 'dark', height = 460,
}: {
 points: GlobePoint[]
 theme?: 'dark' | 'light'
 height?: number
}) {
 const light = theme === 'light'
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
   <div style={{ height }} className="w-full relative">
    <Canvas
     dpr={[1, 2]}
     camera={{ fov: 38, near: 1, far: 2000, position: [0, 0, 320] }}
     gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
     style={{ background: 'transparent' }}
    >
     <ambientLight intensity={light ? 2.2 : 1.4} color="#ffffff" />
     <directionalLight position={[200, 180, 220]} intensity={light ? 1.4 : 1.1} color="#ffffff" />
     <directionalLight position={[-220, -60, -180]} intensity={light ? 0.4 : 0.5} color={light ? '#bfdbfe' : '#1d4ed8'} />
     <GlobeObject points={points} light={light} />
     <OrbitControls
      enablePan={false}
      enableDamping
      dampingFactor={0.06}
      rotateSpeed={0.45}
      zoomSpeed={0.5}
      minDistance={170}
      maxDistance={420}
     />
    </Canvas>
   </div>
  </GLBoundary>
 )
}
