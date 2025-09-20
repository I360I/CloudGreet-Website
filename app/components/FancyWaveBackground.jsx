import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Generate a curvy wave path that bulges near the center.
 * Each line gets a different phase offset and vertical position.
 * @param {number} index Index of the line (0 = top, n-1 = bottom)
 * @param {number} total Total number of lines
 * @param {number} length Total length of the path along x
 * @param {number} segments Number of segments for the curve
 * @param {number} frequency Number of sine oscillations across the length
 * @param {number} baseAmp Base amplitude of the sine wave
 * @param {number} peakAmp Additional amplitude added at the center (envelope)
 * @param {number} lineSpacing Vertical spacing between lines
 * @returns {THREE.CatmullRomCurve3} A curve representing the path
 */
function generateWavePath({
  index,
  total,
  length = 20,
  segments = 600,
  frequency = 3,
  baseAmp = 0.3,
  peakAmp = 2.0,
  lineSpacing = 0.4,
}) {
  const points = [];
  // Vertical base offset so lines don't overlap
  const yBase = (index - (total - 1) / 2) * lineSpacing;
  // Phase offset for variety among lines
  const phaseOffset = (index / total) * Math.PI;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments; // 0..1
    // Map t to x coordinate across the length (centered at 0)
    const x = t * length - length / 2;
    // Envelope: bigger amplitude near center (t=0.5)
    const envelope = Math.exp(-Math.pow((t - 0.5) * 4, 2));
    const amp = baseAmp + peakAmp * envelope;
    // Sine wave with frequency and phase
    const yWave = amp * Math.sin(2 * Math.PI * frequency * t + phaseOffset);
    // Slight z variation for depth; use cosine of sine's argument
    const zWave = amp * 0.2 * Math.cos(2 * Math.PI * frequency * t + phaseOffset);
    points.push(new THREE.Vector3(x, yBase + yWave, zWave));
  }
  return new THREE.CatmullRomCurve3(points);
}

/**
 * Render one animated wave line as a tube geometry.
 */
function AnimatedWaveLine({ curve, color = '#6ea6ff', speed = 0.1, initialOffset = 0 }) {
  const meshRef = useRef();
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 1000, 0.05, 8, false), [curve]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const width = 20; // should match length parameter above
    // Move horizontally; wrap around with modulo
    meshRef.current.position.x = ((t * speed + initialOffset) % width) - width / 2;
    // Optional slow rotation for extra twist
    meshRef.current.rotation.z = t * 0.05;
  });

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
 * Large bottom wave across the hero section.
 */
function BottomWave({ color = '#3c6cf7', speed = 0.02 }) {
  const meshRef = useRef();
  const points = [];
  const segments = 300;
  const length = 20;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = t * length - length / 2;
    // Big sine wave with lower frequency
    const y = -2 + Math.sin(t * Math.PI * 2) * 2;
    points.push(new THREE.Vector3(x, y, 0));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 600, 0.1, 8, false), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const width = 20;
    meshRef.current.position.x = ((t * speed) % width) - width / 2;
  });

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
 * Main background component with multiple lines.
 */
export default function FancyWaveBackground() {
  const totalLines = 5;
  // Precompute curves for each line
  const curves = useMemo(() => {
    const arr = [];
    for (let i = 0; i < totalLines; i++) {
      arr.push(
        generateWavePath({
          index: i,
          total: totalLines,
          length: 20,
          segments: 800,
          frequency: 2 + i * 0.2,
          baseAmp: 0.2,
          peakAmp: 2.5,
          lineSpacing: 0.4,
        })
      );
    }
    return arr;
  }, []);
  // Colors for each line - using the exact colors from spec
  const colors = ['#6A5BFF', '#7E66FF', '#5C8BFF', '#8A7BFF', '#4C7BFF'];
  // Speed variations
  const speeds = [0.08, 0.10, 0.09, 0.11, 0.12];
  // Initial offsets for staggering
  const offsets = [0, 5, 10, 15, 2];

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '60vh',
        zIndex: 1,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 10]} />
        <ambientLight intensity={0.4} />
        <pointLight position={[15, 10, 10]} intensity={0.5} />
        {/* Render each line */}
        {curves.map((curve, idx) => (
          <AnimatedWaveLine
            key={idx}
            curve={curve}
            color={colors[idx % colors.length]}
            speed={speeds[idx % speeds.length]}
            initialOffset={offsets[idx % offsets.length]}
          />
        ))}
        {/* Bottom wave */}
        <BottomWave />
      </Canvas>
    </div>
  );
}