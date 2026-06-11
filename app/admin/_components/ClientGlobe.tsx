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

const PAYING_COLOR = '#34d399'
const NONPAYING_COLOR = '#fbbf24'
const HQ_COLOR = '#38bdf8'

function GlobeObject({ points, hq, light }: { points: GlobePoint[]; hq?: GlobeHq | null; light: boolean }) {
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
   .pointAltitude(0.025)
   .pointRadius((d: any) => (d.kind === 'hq' ? 1.0 : d.kind === 'paying' ? 0.9 : 0.7))

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
     ? `rgba(56, 189, 248, ${Math.max(0, 0.6 * (1 - t))})`
     : `rgba(52, 211, 153, ${Math.max(0, 0.55 * (1 - t))})`)
   .ringAltitude(0.026)
   .ringMaxRadius(4.2)
   .ringPropagationSpeed(1.1)
   .ringRepeatPeriod(1700)

  // animated blue arcs: HQ → every account
  const arcColor = light ? '37, 99, 235' : '56, 189, 248'
  globe
   .arcsData(hq ? points.map((p) => ({
    startLat: hq.lat, startLng: hq.lng, endLat: p.lat, endLng: p.lng,
   })) : [])
   .arcColor(() => [`rgba(${arcColor}, 0.85)`, `rgba(${arcColor}, 0.18)`])
   .arcAltitudeAutoScale(0.32)
   .arcStroke(0.34)
   .arcDashLength(0.45)
   .arcDashGap(0.22)
   .arcDashAnimateTime(2400)
   .arcsTransitionDuration(0)
 }, [globe, points, hq, light])

 // park the camera over the continental US
 useEffect(() => {
  const { x, y, z } = globe.getCoords(34.5, -92, 1.0)
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
 points, hq = null, theme = 'dark', height = 460,
}: {
 points: GlobePoint[]
 hq?: GlobeHq | null
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
     <ambientLight intensity={light ? 1.7 : 2.9} color="#ffffff" />
     <directionalLight position={[260, 160, 280]} intensity={light ? 1.5 : 0.25} color="#ffffff" />
     {!light && <Stars radius={280} depth={50} count={1600} factor={4} saturation={0} fade speed={0.5} />}
     <GlobeObject points={points} hq={hq} light={light} />
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
   </div>
  </GLBoundary>
 )
}
