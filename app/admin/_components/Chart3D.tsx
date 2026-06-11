'use client'

/**
 * Real-WebGL 3D bar chart (react-three-fiber + drei).
 * Glossy rounded bars on a soft-shadow stage, faint grid floor,
 * gentle damped orbit, hover tooltips, staggered grow-in.
 * Rendered client-only (dynamic import) with an error-boundary
 * fallback to the SVG Bars3D for environments without WebGL.
 */

import React, { Component, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Grid, Html, OrbitControls, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { Bars3D } from './charts'

type Item = { label: string; value: number }

const SKY = new THREE.Color('#38bdf8')
const INDIGO = new THREE.Color('#6366f1')

function prefersReducedMotion(): boolean {
 if (typeof window === 'undefined') return false
 return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
}

/* ---------------------------------- Bar ---------------------------------- */

function Bar({
 item, index, count, maxValue, light, formatValue,
}: {
 item: Item
 index: number
 count: number
 maxValue: number
 light: boolean
 formatValue: (n: number) => string
}) {
 const group = useRef<THREE.Group>(null)
 const [hovered, setHovered] = useState(false)
 const reduce = useMemo(prefersReducedMotion, [])

 const W = 0.86
 const GAP = 0.5
 const x = (index - (count - 1) / 2) * (W + GAP)
 const h = Math.max(0.12, (item.value / maxValue) * 3.1)

 const color = useMemo(() => {
  const c = SKY.clone().lerp(INDIGO, count <= 1 ? 0 : index / (count - 1))
  return c
 }, [index, count])

 const emissive = useMemo(() => color.clone().multiplyScalar(light ? 0.04 : 0.22), [color, light])

 // staggered grow-in + hover ease, all in one rAF-driven spring
 const anim = useRef({ start: -1, scale: reduce ? 1 : 0.001, hoverT: 0 })
 useFrame(({ clock }) => {
  if (!group.current) return
  const a = anim.current
  if (a.start < 0) a.start = clock.elapsedTime
  const t = clock.elapsedTime - a.start - index * 0.07
  const target = reduce ? 1 : t <= 0 ? 0.001 : Math.min(1, 1 - Math.pow(1 - Math.min(1, t / 0.9), 3))
  a.scale += (target - a.scale) * 0.25
  a.hoverT += ((hovered ? 1 : 0) - a.hoverT) * 0.18
  const s = a.scale * (1 + a.hoverT * 0.04)
  group.current.scale.set(1 + a.hoverT * 0.03, s, 1 + a.hoverT * 0.03)
 })

 return (
  <group position={[x, 0, 0]}>
   <group ref={group}>
    <RoundedBox
     args={[W, h, W]}
     radius={0.07}
     smoothness={4}
     position={[0, h / 2, 0]}
     onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'default' }}
     onPointerOut={() => setHovered(false)}
    >
     <meshPhysicalMaterial
      color={color}
      roughness={0.16}
      metalness={0.08}
      clearcoat={1}
      clearcoatRoughness={0.18}
      emissive={emissive}
      envMapIntensity={light ? 0.7 : 0.5}
     />
    </RoundedBox>
   </group>

   {/* hover value chip */}
   {hovered && (
    <Html position={[0, h + 0.55, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
     <div
      className="rounded-lg border px-2.5 py-1.5 whitespace-nowrap backdrop-blur shadow-[0_12px_32px_-10px_rgba(0,0,0,0.5)]"
      style={{ background: 'var(--cg-tooltip-bg)', borderColor: 'var(--cg-tooltip-border)' }}
     >
      <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--cg-muted)' }}>
       {item.label}
      </div>
      <div className="text-sm font-semibold tabular-nums" style={{ color: 'var(--cg-text-1)' }}>
       {formatValue(item.value)}
      </div>
     </div>
    </Html>
   )}

   {/* base label */}
   <Html position={[0, -0.34, 0.5]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
    <div
     className="text-[10px] font-mono whitespace-nowrap transition-colors"
     style={{ color: hovered ? 'var(--cg-text-2)' : 'var(--cg-muted)' }}
    >
     {item.label.length > 11 ? `${item.label.slice(0, 10)}…` : item.label}
    </div>
   </Html>
  </group>
 )
}

/* --------------------------------- Scene --------------------------------- */

function Scene({ items, light, formatValue }: {
 items: Item[]
 light: boolean
 formatValue: (n: number) => string
}) {
 const max = Math.max(1, ...items.map((i) => i.value))
 const sway = useRef<THREE.Group>(null)
 const reduce = useMemo(prefersReducedMotion, [])

 useFrame(({ clock }) => {
  if (!sway.current || reduce) return
  sway.current.rotation.y = Math.sin(clock.elapsedTime * 0.18) * 0.045
 })

 return (
  <>
   <ambientLight intensity={light ? 1.15 : 0.5} />
   <directionalLight position={[5, 9, 6]} intensity={light ? 1.6 : 1.2} color="#ffffff" />
   <pointLight position={[-7, 4, -5]} intensity={light ? 14 : 36} color="#38bdf8" />
   <pointLight position={[7, 3, -6]} intensity={light ? 8 : 22} color="#818cf8" />

   <group ref={sway}>
    {items.map((item, i) => (
     <Bar
      key={item.label + i}
      item={item}
      index={i}
      count={items.length}
      maxValue={max}
      light={light}
      formatValue={formatValue}
     />
    ))}

    <ContactShadows
     position={[0, -0.005, 0]}
     opacity={light ? 0.28 : 0.6}
     scale={items.length * 1.6 + 6}
     blur={2.4}
     far={4}
     resolution={256}
     color={light ? '#1e293b' : '#000000'}
    />
    <Grid
     position={[0, -0.01, 0]}
     args={[40, 40]}
     cellSize={0.7}
     cellThickness={0.5}
     sectionSize={3.5}
     sectionThickness={0.8}
     cellColor={light ? '#cbd5e1' : '#1c2230'}
     sectionColor={light ? '#b6c2d4' : '#283143'}
     fadeDistance={16}
     fadeStrength={2.5}
     infiniteGrid
    />
   </group>

   <OrbitControls
    target={[0, 1.15, 0]}
    enableZoom={false}
    enablePan={false}
    enableDamping
    dampingFactor={0.08}
    minPolarAngle={Math.PI / 2.9}
    maxPolarAngle={Math.PI / 2.3}
    minAzimuthAngle={-0.55}
    maxAzimuthAngle={0.55}
   />
  </>
 )
}

/* ------------------------- Error boundary + export ------------------------ */

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

export default function TopClients3D({
 items, theme = 'dark', height = 300, formatValue = (n: number) => n.toLocaleString(),
}: {
 items: Item[]
 theme?: 'dark' | 'light'
 height?: number
 formatValue?: (n: number) => string
}) {
 const light = theme === 'light'
 const fallback = <Bars3D items={items} height={height} formatValue={formatValue} />
 if (!items.length) return null
 return (
  <GLBoundary fallback={fallback}>
   <div style={{ height }} className="w-full">
    <Canvas
     dpr={[1, 2]}
     camera={{ position: [0, 3.4, 9.4], fov: 34 }}
     gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
     style={{ background: 'transparent' }}
    >
     <Scene items={items} light={light} formatValue={formatValue} />
    </Canvas>
   </div>
  </GLBoundary>
 )
}
