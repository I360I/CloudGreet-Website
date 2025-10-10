'use client';

import React, { useState, useEffect } from 'react';

export default function WrappingHelixAnimation() {
  const [isClient, setIsClient] = useState(false);
  const [windowWidth, setWindowWidth] = useState(1200);

  useEffect(() => {
    setIsClient(true);
    setWindowWidth(window.innerWidth);
    
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Responsive parameters based on spec
  const getConfig = () => {
    if (windowWidth >= 1280) {
      return {
        numStrands: 5,
        ellipseRx: 240,
        ellipseRy: 100,
        baseSpeed: 95, // px/s
        thickness: 2.25,
        glowRadius: 10,
        opacity: 0.65
      };
    } else if (windowWidth >= 768) {
      return {
        numStrands: 4,
        ellipseRx: 200,
        ellipseRy: 85,
        baseSpeed: 85,
        thickness: 2.25,
        glowRadius: 10,
        opacity: 0.65
      };
    } else {
      return {
        numStrands: 3,
        ellipseRx: 160,
        ellipseRy: 70,
        baseSpeed: 75,
        thickness: 1.7, // -25%
        glowRadius: 7, // -30%
        opacity: 0.55 // -15%
      };
    }
  };

  const config = getConfig();

  // Strand colors from spec
  const colors = ['#6A5BFF', '#7E66FF', '#5C8BFF', '#8A7BFF', '#4C7BFF'];
  
  // CTA focus point (center of button area)
  const focusX = windowWidth / 2;
  const focusY = 380; // Approximate CTA center

  // Generate strand paths
  const generateStrandPath = (strandIndex, time) => {
    const speed = config.baseSpeed + (strandIndex * 15); // ±15% speed variation
    const phase = (strandIndex * 2 * Math.PI) / config.numStrands;
    const xOffset = (time * speed) % (windowWidth + 400) - 200;
    
    // Vertical starting lane offset
    const laneOffset = (strandIndex - config.numStrands / 2) * 40;
    
    let path = '';
    const segments = 60;
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = xOffset + t * (windowWidth + 400);
      
      // Base vertical amplitude
      const baseAmplitude = 30;
      
      // Gaussian envelope that peaks at focus (CTA center)
      const distanceFromFocus = Math.abs(x - focusX);
      const envelopeWidth = windowWidth * 0.3; // 30% of hero width
      const envelope = Math.exp(-Math.pow(distanceFromFocus / envelopeWidth, 2));
      const amplitude = baseAmplitude * (1 + envelope * 1.0); // ×2.0 peak factor
      
      // Wave function with phase offset
      const wave = Math.sin((x / 100) + phase + (time * 0.1));
      
      // Vertical position with lane offset and wave
      const y = focusY + laneOffset + wave * amplitude;
      
      if (i === 0) {
        path += `M ${x},${y}`;
      } else {
        path += ` L ${x},${y}`;
      }
    }
    
    return path;
  };

  const generateBottomWavePath = (time) => {
    const speed = 70; // 60-80 px/s
    const xOffset = (time * speed) % (windowWidth + 400) - 200;
    const amplitude = 37.5; // 30-45px
    const y = focusY + 200; // +180-220px below CTA
    
    let path = '';
    const segments = 40;
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = xOffset + t * (windowWidth + 400);
      const waveY = y + Math.sin((x / 150) + (time * 0.05)) * amplitude;
      
      if (i === 0) {
        path += `M ${x},${waveY}`;
      } else {
        path += ` L ${x},${waveY}`;
      }
    }
    
    return path;
  };

  if (!isClient) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        overflow: 'hidden',
        pointerEvents: 'none',
        mixBlendMode: 'screen', // Additive blending
      }}
    >
      <svg
        width="100%"
        height="100%"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {/* Main Helix Strands */}
        {Array.from({ length: config.numStrands }).map((_, i) => {
          const color = colors[i % colors.length];
          const speed = config.baseSpeed + (i * 15);
          const thickness = config.thickness + (Math.sin(i) * 0.75); // ±0.75px variation
          
          return (
            <g key={i}>
              {/* Main strand */}
              <path
                d={generateStrandPath(i, 0)}
                stroke={color}
                strokeWidth={thickness}
                fill="none"
                opacity={config.opacity}
                filter={`blur(${Math.abs(i - 2) * 0.3}px) drop-shadow(0 0 ${config.glowRadius}px ${color})`}
                style={{
                  animation: `strand${i} 12s linear infinite`,
                  transform: `scale(${1 - Math.abs(i - 2) * 0.04})`, // 3D depth effect
                }}
              />
              
              {/* Lighting sweep highlight */}
              <path
                d={generateStrandPath(i, 0)}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth={thickness * 0.3}
                fill="none"
                style={{
                  animation: `lightingSweep${i} 8s ease-in-out infinite`,
                }}
              />
            </g>
          );
        })}
        
        {/* Bottom Wave Layer */}
        <path
          d={generateBottomWavePath(0)}
          stroke="#3457F5"
          strokeWidth="3"
          fill="none"
          opacity={0.3}
          filter="blur(1px) drop-shadow(0 0 8px #3457F5)"
          style={{
            animation: 'bottomWave 10s linear infinite',
          }}
        />
      </svg>

      {/* CSS Animations - Helix Waves */}
      <style jsx>{`
        /* Main strand animations - continuous left to right flow */
        @keyframes strand0 {
          0% { transform: translateX(-200px) scale(0.96); }
          100% { transform: translateX(${windowWidth + 200}px) scale(0.96); }
        }
        
        @keyframes strand1 {
          0% { transform: translateX(-200px) scale(0.98); }
          100% { transform: translateX(${windowWidth + 200}px) scale(0.98); }
        }
        
        @keyframes strand2 {
          0% { transform: translateX(-200px) scale(1.0); }
          100% { transform: translateX(${windowWidth + 200}px) scale(1.0); }
        }
        
        @keyframes strand3 {
          0% { transform: translateX(-200px) scale(0.98); }
          100% { transform: translateX(${windowWidth + 200}px) scale(0.98); }
        }
        
        @keyframes strand4 {
          0% { transform: translateX(-200px) scale(0.96); }
          100% { transform: translateX(${windowWidth + 200}px) scale(0.96); }
        }
        
        /* Lighting sweep animations */
        @keyframes lightingSweep0 {
          0%, 100% { 
            stroke-dasharray: 0 1000;
            stroke-dashoffset: 0;
            opacity: 0;
          }
          20%, 80% { 
            opacity: 0.3;
          }
          50% { 
            stroke-dasharray: 200 800;
            stroke-dashoffset: -200;
            opacity: 0.6;
          }
        }
        
        @keyframes lightingSweep1 {
          0%, 100% { 
            stroke-dasharray: 0 1000;
            stroke-dashoffset: 0;
            opacity: 0;
          }
          25%, 75% { 
            opacity: 0.3;
          }
          50% { 
            stroke-dasharray: 200 800;
            stroke-dashoffset: -200;
            opacity: 0.6;
          }
        }
        
        @keyframes lightingSweep2 {
          0%, 100% { 
            stroke-dasharray: 0 1000;
            stroke-dashoffset: 0;
            opacity: 0;
          }
          30%, 70% { 
            opacity: 0.3;
          }
          50% { 
            stroke-dasharray: 200 800;
            stroke-dashoffset: -200;
            opacity: 0.6;
          }
        }
        
        @keyframes lightingSweep3 {
          0%, 100% { 
            stroke-dasharray: 0 1000;
            stroke-dashoffset: 0;
            opacity: 0;
          }
          35%, 65% { 
            opacity: 0.3;
          }
          50% { 
            stroke-dasharray: 200 800;
            stroke-dashoffset: -200;
            opacity: 0.6;
          }
        }
        
        @keyframes lightingSweep4 {
          0%, 100% { 
            stroke-dasharray: 0 1000;
            stroke-dashoffset: 0;
            opacity: 0;
          }
          40%, 60% { 
            opacity: 0.3;
          }
          50% { 
            stroke-dasharray: 200 800;
            stroke-dashoffset: -200;
            opacity: 0.6;
          }
        }
        
        /* Bottom wave animation */
        @keyframes bottomWave {
          0% { transform: translateX(-200px); }
          100% { transform: translateX(${windowWidth + 200}px); }
        }
        
        /* Cross-over shimmer effect */
        @keyframes crossOverShimmer {
          0%, 100% { opacity: 0.65; }
          50% { opacity: 0.75; }
        }
      `}</style>
    </div>
  );
}
