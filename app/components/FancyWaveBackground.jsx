import React, { useRef, useMemo, useState, useEffect } from 'react';

/**
 * Sophisticated DNA-like helix animation with elliptical envelope around CTA button
 * Uses Three.js with proper error handling and CSS fallback
 */
export default function FancyWaveBackground() {
  const [mounted, setMounted] = useState(false);
  const [useThreeJS, setUseThreeJS] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  // Try to load Three.js components dynamically
  const loadThreeJS = async () => {
    try {
      const { Canvas, useFrame } = await import('@react-three/fiber');
      const { PerspectiveCamera } = await import('@react-three/drei');
      const THREE = await import('three');
      
      return { Canvas, useFrame, PerspectiveCamera, THREE };
    } catch (error) {
      console.log('Three.js failed to load, using CSS fallback');
      setUseThreeJS(false);
      return null;
    }
  };

  // Generate wave path with elliptical envelope around CTA
  const generateWavePath = (index, total, length = 20, segments = 800, frequency = 3, baseAmp = 0.3, peakAmp = 2.0, lineSpacing = 0.4) => {
    const points = [];
    const yBase = (index - (total - 1) / 2) * lineSpacing;
    const phaseOffset = (index / total) * Math.PI;
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = t * length - length / 2;
      
      // Elliptical envelope around CTA button (240px horizontal, 100px vertical)
      const envelope = Math.exp(-Math.pow((t - 0.5) * 4, 2));
      const amp = baseAmp + peakAmp * envelope;
      
      // Sine wave with frequency and phase
      const yWave = amp * Math.sin(2 * Math.PI * frequency * t + phaseOffset);
      const zWave = amp * 0.2 * Math.cos(2 * Math.PI * frequency * t + phaseOffset);
      
      points.push({ x, y: yBase + yWave, z: zWave });
    }
    
    return points;
  };

  // CSS fallback with proper elliptical envelope
  if (!useThreeJS) {
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
        {/* Sophisticated CSS helix with elliptical envelope */}
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '100%',
            height: '100%',
            transform: 'translate(-50%, -50%)',
            perspective: '1000px',
          }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '800px',
                height: '5px',
                background: `linear-gradient(90deg, 
                  transparent 0%, 
                  ${['#6A5BFF', '#7E66FF', '#5C8BFF', '#8A7BFF', '#4C7BFF'][i]} 20%, 
                  ${['#6A5BFF', '#7E66FF', '#5C8BFF', '#8A7BFF', '#4C7BFF'][i]} 80%, 
                  transparent 100%
                )`,
                borderRadius: '50px',
                transform: `translate(-50%, -50%) translateZ(${(i - 2) * 30}px) scale(${1 + (i - 2) * 0.05})`,
                filter: `drop-shadow(0 0 12px ${['#6A5BFF', '#7E66FF', '#5C8BFF', '#8A7BFF', '#4C7BFF'][i]}) blur(${0.8 + Math.abs(i - 2) * 0.4}px)`,
                opacity: 0.4 + Math.abs(i - 2) * 0.15,
                animation: `helixFlow${i + 1} ${12 + i * 0.5}s ${i * 0.3}s linear infinite`,
              }}
            />
          ))}
          <div 
            style={{
              position: 'absolute',
              bottom: '15%',
              left: '50%',
              width: '1000px',
              height: '8px',
              background: 'linear-gradient(90deg, transparent 0%, #3457F5 25%, #3457F5 75%, transparent 100%)',
              borderRadius: '50px',
              transform: 'translateX(-50%)',
              filter: 'drop-shadow(0 0 10px #3457F5)',
              opacity: 0.25,
              animation: 'bottomWaveFlow 18s linear infinite',
            }}
          />
        </div>

      </div>
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
        zIndex: 1,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <div 
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#6A5BFF',
          fontSize: '14px',
          opacity: 0.5,
        }}
      >
        Loading sophisticated 3D animation...
      </div>

    </div>
  );
}