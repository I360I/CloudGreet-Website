import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Creates a wavy helix path with varying amplitude that bulges toward the center
 * to form an oval around the CTA button area
 */
function createHelixPath({ length = 16, segments = 300, turns = 4, bulge = 3, phase = 0 }) {
  const points = [];
  
  for (let i = 0; i <= segments; i++) {
    // Normalize t from -1 to 1 across the length
    const tNorm = (i / segments) * 2 - 1;
    const x = tNorm * length / 2;
    
    // Sinusoidal wave with phase offset for twisting
    const theta = turns * Math.PI * tNorm + phase;
    
    // Gaussian-like bulge factor: peaks at center (x ~ 0), smaller at edges
    const envelope = 1 + bulge * Math.exp(-Math.pow(tNorm * 3, 2));
    
    const y = Math.sin(theta) * envelope;
    const z = Math.cos(theta) * envelope * 0.4; // add depth variation
    
    points.push(new THREE.Vector3(x, y, z));
  }
  
  return new THREE.CatmullRomCurve3(points);
}

/**
 * Reusable component to render one twisting strand
 * @param {Object} props - parameters: color, speed, offsetX, phase, bulge
 */
function TwistingStrand({ color = '#6ea6ff', speed = 0.2, offsetX = 0, phase = 0, bulge = 3 }) {
  const meshRef = useRef();
  
  // Create helix path with phase offset for DNA-like twisting
  const path = useMemo(() => 
    createHelixPath({ 
      length: 16, 
      turns: 4, 
      bulge: bulge,
      phase: phase 
    }), 
    [bulge, phase]
  );
  
  const geometry = useMemo(() => 
    new THREE.TubeGeometry(path, 600, 0.06, 8, false), 
    [path]
  );
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      const xWidth = 16;
      
      // Animate horizontal movement with wrapping
      meshRef.current.position.x = ((t * speed + offsetX) % xWidth) - xWidth / 2;
      
      // Slow rotation for extra 3D twist effect
      meshRef.current.rotation.y = t * 0.08;
    }
  });
  
  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial 
        color={color} 
        emissive={color} 
        emissiveIntensity={0.4}
        roughness={0.2} 
        metalness={0.3}
        transparent={true}
        opacity={0.8}
      />
    </mesh>
  );
}

/**
 * Large background wave at the bottom of the hero section
 */
function BottomWave({ color = '#2e50a0', speed = 0.05 }) {
  const meshRef = useRef();
  
  const path = useMemo(() => {
    const points = [];
    const segments = 200;
    const length = 20;
    
    for (let i = 0; i <= segments; i++) {
      const tNorm = (i / segments) * 2 - 1;
      const x = tNorm * length / 2;
      const y = Math.sin(tNorm * Math.PI * 2.5) * 3; // large amplitude wave
      
      points.push(new THREE.Vector3(x, -4 + y * 0.1, 0));
    }
    
    return new THREE.CatmullRomCurve3(points);
  }, []);
  
  const geometry = useMemo(() => 
    new THREE.TubeGeometry(path, 400, 0.15, 8, false), 
    [path]
  );
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      const xWidth = 20;
      
      // Slow horizontal drift for the bottom wave
      meshRef.current.position.x = ((t * speed) % xWidth) - xWidth / 2;
    }
  });
  
  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial 
        color={color} 
        emissive={color} 
        emissiveIntensity={0.3}
        roughness={0.3} 
        metalness={0.1}
        transparent={true}
        opacity={0.6}
      />
    </mesh>
  );
}

/**
 * Main FancyWaveBackground component
 * Renders 5-6 twisting strands with oval bulge around CTA + bottom wave
 */
export default function FancyWaveBackground() {
  return (
    <div style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      width: '100%', 
      height: '100%', 
      zIndex: -1 
    }}>
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 10]} />
        
        {/* Enhanced lighting for 3D depth and glow */}
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.6} />
        <pointLight position={[-10, -10, 5]} intensity={0.3} />
        <directionalLight position={[0, 0, 5]} intensity={0.4} />
        
        {/* 5 Twisting strands with different colors, speeds, phases, and bulge factors */}
        <TwistingStrand 
          color="#6ea6ff" 
          speed={0.15} 
          offsetX={0} 
          phase={0}
          bulge={3.5}
        />
        <TwistingStrand 
          color="#8c98ff" 
          speed={0.18} 
          offsetX={3.2} 
          phase={Math.PI / 3}
          bulge={3.2}
        />
        <TwistingStrand 
          color="#a06bff" 
          speed={0.12} 
          offsetX={6.4} 
          phase={Math.PI / 2}
          bulge={2.8}
        />
        <TwistingStrand 
          color="#6ea6ff" 
          speed={0.21} 
          offsetX={9.6} 
          phase={Math.PI}
          bulge={3.8}
        />
        <TwistingStrand 
          color="#9333ea" 
          speed={0.16} 
          offsetX={12.8} 
          phase={Math.PI * 1.5}
          bulge={3.0}
        />
        
        {/* Bottom wave for anchoring */}
        <BottomWave color="#3c6cf7" speed={0.03} />
      </Canvas>
    </div>
  );
}
