'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Creates a wavy helix path with varying amplitude.
 * The amplitude bulges near the center (x ~ 0) to form an oval around the CTA.
 */
function createHelixPath({ length = 14, segments = 300, turns = 3, bulge = 2 }) {
  const points = [];
  for (let i = 0; i <= segments; i++) {
    // Normalize t from -1 to 1 across the length
    const tNorm = (i / segments) * 2 - 1;
    const x = tNorm * length / 2;
    // Sinusoidal wave: more turns => more twisting
    const theta = turns * Math.PI * tNorm;
    // Gaussian-like bulge factor: peaks at center, smaller at edges
    const envelope = 1 + bulge * Math.exp(-Math.pow(tNorm * 3, 2));
    const y = Math.sin(theta) * envelope;
    const z = Math.cos(theta) * envelope * 0.3; // add slight z variation for depth
    points.push(new THREE.Vector3(x, y, z));
  }
  return new THREE.CatmullRomCurve3(points);
}

/**
 * Reusable component to render one twisting strand.
 * @param {Object} props - parameters: color, speed, offsetX
 */
function TwistingStrand({ color = '#6ea6ff', speed = 0.2, offsetX = 0 }) {
  const meshRef = useRef();
  const [geometry, setGeometry] = useState(null);

  useEffect(() => {
    try {
      // Create a helix path with error handling
      const path = createHelixPath({ length: 14, turns: 4, bulge: 2.5 });
      const tubeGeometry = new THREE.TubeGeometry(path, 600, 0.05, 8, false);
      setGeometry(tubeGeometry);
    } catch (error) {
      console.warn('Failed to create helix geometry:', error);
      // Fallback to basic sphere geometry
      const fallbackGeometry = new THREE.SphereGeometry(1, 8, 6);
      setGeometry(fallbackGeometry);
    }
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current || !clock) return;
    
    try {
      // Animate horizontal movement: wrap around using modulo on position.x
      const t = clock.getElapsedTime();
      const xWidth = 14;
      meshRef.current.position.x = ((t * speed + offsetX) % xWidth) - xWidth / 2;
      meshRef.current.rotation.y = t * 0.1; // slow rotation for extra twist
    } catch (error) {
      console.warn('Animation error in TwistingStrand:', error);
    }
  });

  if (!geometry) {
    return null; // Don't render until geometry is ready
  }

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.6}
        roughness={0.3}
        metalness={0.2}
      />
    </mesh>
  );
}

/**
 * Large background wave at the bottom of the hero section.
 */
function BottomWave({ color = '#2e50a0', speed = 0.05 }) {
  const meshRef = useRef();
  const [geometry, setGeometry] = useState(null);

  useEffect(() => {
    try {
      // Create a big sine wave along x
      const points = [];
      const segments = 200;
      const length = 16;
      for (let i = 0; i <= segments; i++) {
        const tNorm = (i / segments) * 2 - 1;
        const x = tNorm * length / 2;
        const y = Math.sin(tNorm * Math.PI * 2) * 2; // large amplitude
        points.push(new THREE.Vector3(x, -3 + y * 0.1, 0));
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeometry = new THREE.TubeGeometry(curve, 400, 0.1, 8, false);
      setGeometry(tubeGeometry);
    } catch (error) {
      console.warn('Failed to create bottom wave geometry:', error);
      // Fallback to basic geometry
      const fallbackGeometry = new THREE.BoxGeometry(2, 0.5, 0.5);
      setGeometry(fallbackGeometry);
    }
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current || !clock) return;
    
    try {
      // Slow horizontal drift to give life to the bottom wave
      const t = clock.getElapsedTime();
      const xWidth = 16;
      meshRef.current.position.x = ((t * speed) % xWidth) - xWidth / 2;
    } catch (error) {
      console.warn('Animation error in BottomWave:', error);
    }
  });

  if (!geometry) {
    return null; // Don't render until geometry is ready
  }

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.5}
        roughness={0.3}
        metalness={0.1}
      />
    </mesh>
  );
}

/**
 * Main wrapper to render the helix strands and bottom wave as background.
 * Position this absolutely behind your hero content.
 */
export default function HelixBackground() {
  const [hasError, setHasError] = useState(false);

  // Add debugging
  console.log('HelixBackground rendering, hasError:', hasError);

  // Fallback component if Three.js fails
  if (hasError) {
    console.log('HelixBackground: Using CSS fallback');
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '60vh',
          zIndex: -1,
          overflow: 'hidden',
          background: 'linear-gradient(45deg, rgba(110, 166, 255, 0.1) 0%, rgba(140, 152, 255, 0.1) 100%)',
        }}
      />
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '60vh',
        zIndex: -1, // ensure it stays behind text and CTA
        overflow: 'hidden',
      }}
    >
      <Canvas
        onError={(error) => {
          // Canvas error occurred, falling back to gradient
          setHasError(true);
        }}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: "high-performance",
        }}
        dpr={[1, 2]}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 8]} />
        {/* Lights for 3D appearance */}
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />
        {/* Two twisting strands with slight offsets and different colors */}
        <TwistingStrand color="#6ea6ff" speed={0.15} offsetX={0} />
        <TwistingStrand color="#8c98ff" speed={0.18} offsetX={7} />
        {/* Bottom wave */}
        <BottomWave color="#3c6cf7" speed={0.03} />
      </Canvas>
    </div>
  );
}
