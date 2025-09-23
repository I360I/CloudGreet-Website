"use client"

import React, { useRef, Suspense, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function Helix({ speed = 1, color = "#6e97ff" }) {
  const mesh = useRef<THREE.Mesh>(null)
  
  useFrame(({ clock }) => {
    if (!mesh.current || !clock) return
    
    try {
      const t = clock.getElapsedTime()
      // Horizontal movement across the screen
      mesh.current.position.x = Math.sin(t * speed * 0.5) * 5
      mesh.current.position.z = Math.cos(t * speed * 0.3) * 2
      mesh.current.rotation.y = t * speed * 0.1
    } catch (error) {
      // Console warn removed for production
    }
  })

  // Create helix geometry with useMemo to prevent recreation
  const geometry = useMemo(() => {
    try {
      const points = []
      const turns = 3
      const segments = 60
      
      for (let i = 0; i < segments; i++) {
        const theta = (i / segments) * Math.PI * 2 * turns
        const radius = 1.2
        const x = radius * Math.cos(theta)
        const y = (i / segments - 0.5) * 10
        const z = radius * Math.sin(theta)
        points.push(new THREE.Vector3(x, y, z))
      }
      
      const curve = new THREE.CatmullRomCurve3(points)
      return new THREE.TubeGeometry(curve, 100, 0.12, 8, false)
    } catch (error) {
      // Console warn removed for production
      // Fallback to basic geometry
      return new THREE.SphereGeometry(1, 8, 6)
    }
  }, [])

  return (
    <mesh ref={mesh} geometry={geometry}>
      <meshStandardMaterial
        color={color}
        emissive="#001f3f"
        metalness={0.5}
        roughness={0.3}
        transparent
        opacity={0.8}
      />
    </mesh>
  )
}

interface HelixBackgroundProps {
  className?: string
  speed?: number
  color?: string
  onError?: () => void
}

export default function HelixBackground({ 
  className = "", 
  speed = 1, 
  color = "#6e97ff",
  onError
}: HelixBackgroundProps) {
  const [hasError, setHasError] = React.useState(false)

  const handleError = () => {
    setHasError(true)
    if (onError) {
      onError()
    }
  }

  if (hasError) {
    // Fallback to simple gradient if Three.js fails
    return (
      <div 
        className={`absolute inset-0 pointer-events-none ${className}`}
        style={{ zIndex: 1 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 animate-pulse" />
      </div>
    )
  }

  return (
    <div 
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ zIndex: 1 }}
    >
      <Suspense fallback={
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20" />
      }>
        <Canvas 
          style={{ width: '100%', height: '100%' }}
          camera={{ position: [0, 0, 10], fov: 60 }}
          gl={{ antialias: false, alpha: true }}
          dpr={[1, 2]}
          onError={(error) => {
            // Console warn removed for production
            handleError()
          }}
        >
          <ambientLight intensity={0.4} />
          <pointLight position={[10, 10, 10]} intensity={0.6} />
          <pointLight position={[-10, -10, -10]} intensity={0.3} />
          
          <Helix speed={speed} color={color} />
        </Canvas>
      </Suspense>
    </div>
  )
}