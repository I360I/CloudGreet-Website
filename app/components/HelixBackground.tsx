"use client"

import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Mesh, BufferGeometry, Float32Array, Vector3, Color } from 'three'
import * as THREE from 'three'

interface HelixStrandProps {
  radius: number
  height: number
  turns: number
  color: string
  opacity: number
  speed: number
  offset: number
}

function HelixStrand({ radius, height, turns, color, opacity, speed, offset }: HelixStrandProps) {
  const meshRef = useRef<Mesh>(null)
  const geometryRef = useRef<BufferGeometry>(null)
  
  const { positions, colors } = useMemo(() => {
    const segments = 200
    const positions = new Float32Array((segments + 1) * 3)
    const colors = new Float32Array((segments + 1) * 3)
    
    const color = new Color(color)
    
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2 * turns
      const x = Math.cos(t) * radius
      const y = (i / segments) * height - height / 2
      const z = Math.sin(t) * radius
      
      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z
      
      // Add color variation for depth
      const colorIntensity = 0.7 + 0.3 * Math.sin(t * 2)
      colors[i * 3] = color.r * colorIntensity
      colors[i * 3 + 1] = color.g * colorIntensity
      colors[i * 3 + 2] = color.b * colorIntensity
    }
    
    return { positions, colors }
  }, [radius, height, turns, color])
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * speed + offset
      meshRef.current.position.x = Math.sin(state.clock.elapsedTime * 0.5 + offset) * 2
      meshRef.current.position.z = Math.cos(state.clock.elapsedTime * 0.3 + offset) * 1
    }
  })
  
  return (
    <mesh ref={meshRef}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={opacity}
        linewidth={3}
      />
    </mesh>
  )
}

interface ParticleProps {
  position: [number, number, number]
  color: string
  speed: number
  offset: number
}

function Particle({ position, color, speed, offset }: ParticleProps) {
  const meshRef = useRef<Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * speed + offset
      meshRef.current.rotation.y = state.clock.elapsedTime * speed * 0.7 + offset
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3 + offset) * 0.3)
    }
  })
  
  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.1, 8, 8]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.6}
      />
    </mesh>
  )
}

interface HelixBackgroundProps {
  className?: string
  width?: number
  height?: number
  speed?: number
  colorA?: string
  colorB?: string
  opacity?: number
}

export default function HelixBackground({
  className = "",
  width = 100,
  height = 60,
  speed = 1,
  colorA = "#6AA7FF",
  colorB = "#A06BFF",
  opacity = 0.7
}: HelixBackgroundProps) {
  
  const particles = useMemo(() => {
    const particleCount = 12
    return Array.from({ length: particleCount }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * width,
        (Math.random() - 0.5) * height,
        (Math.random() - 0.5) * 20
      ] as [number, number, number],
      color: i % 2 === 0 ? colorA : colorB,
      speed: 0.5 + Math.random() * 1,
      offset: i * 0.5
    }))
  }, [width, height, colorA, colorB])
  
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`} style={{ zIndex: 1 }}>
      <Canvas
        camera={{ position: [0, 0, 30], fov: 60 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Ambient lighting for subtle illumination */}
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.5} color={colorA} />
        <pointLight position={[-10, -10, -10]} intensity={0.3} color={colorB} />
        
        {/* Main helix strands */}
        <HelixStrand
          radius={8}
          height={height}
          turns={3}
          color={colorA}
          opacity={opacity}
          speed={speed * 0.5}
          offset={0}
        />
        <HelixStrand
          radius={8}
          height={height}
          turns={3}
          color={colorB}
          opacity={opacity * 0.8}
          speed={speed * 0.5}
          offset={Math.PI}
        />
        
        {/* Secondary intertwined helix */}
        <HelixStrand
          radius={6}
          height={height * 0.8}
          turns={2.5}
          color={colorA}
          opacity={opacity * 0.6}
          speed={speed * 0.3}
          offset={Math.PI / 2}
        />
        <HelixStrand
          radius={6}
          height={height * 0.8}
          turns={2.5}
          color={colorB}
          opacity={opacity * 0.4}
          speed={speed * 0.3}
          offset={Math.PI * 1.5}
        />
        
        {/* Outer helix for depth */}
        <HelixStrand
          radius={12}
          height={height * 1.2}
          turns={2}
          color={colorA}
          opacity={opacity * 0.3}
          speed={speed * 0.2}
          offset={Math.PI / 4}
        />
        
        {/* Floating particles */}
        {particles.map((particle, i) => (
          <Particle
            key={i}
            position={particle.position}
            color={particle.color}
            speed={particle.speed}
            offset={particle.offset}
          />
        ))}
        
        {/* Background gradient effect */}
        <mesh position={[0, 0, -25]}>
          <planeGeometry args={[width * 2, height * 2]} />
          <meshBasicMaterial
            color="#000000"
            transparent
            opacity={0.1}
          />
        </mesh>
      </Canvas>
    </div>
  )
}
