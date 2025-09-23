import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function SimpleHelix({ color = '#6ea6ff' }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    if (!meshRef.current || !clock) return;
    
    try {
      const t = clock.getElapsedTime();
      // Simple rotation and movement
      meshRef.current.rotation.x = t * 0.2;
      meshRef.current.rotation.y = t * 0.3;
      meshRef.current.position.x = Math.sin(t * 0.5) * 2;
      meshRef.current.position.y = Math.cos(t * 0.3) * 1;
    } catch (error) {
      // Console warn removed for production
    }
  });

  // Create a simple helix using basic geometry
  const points = [];
  const segments = 50;
  const turns = 2;
  
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2 * turns;
    const radius = 1.5;
    const x = radius * Math.cos(theta);
    const y = (i / segments - 0.5) * 6;
    const z = radius * Math.sin(theta);
    points.push(new THREE.Vector3(x, y, z));
  }

  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, 100, 0.1, 8, false);

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

export default function SimpleHelixBackground() {
  // Console log removed for production

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
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        gl={{ antialias: false, alpha: true }}
      >
        <ambientLight intensity={0.6} />
        <SimpleHelix color="#6ea6ff" />
        <SimpleHelix color="#8c98ff" />
      </Canvas>
    </div>
  );
}
