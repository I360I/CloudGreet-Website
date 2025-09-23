import React from 'react';

/**
 * MEGA HELIX BACKGROUND - Professional Grade Animation System
 * Features:
 * - 15+ intertwining strands with complex mathematical curves
 * - Multiple animation layers (primary, secondary, accent, particles)
 * - Advanced SVG effects (gradients, filters, masks, patterns)
 * - Dynamic lighting and shadow systems
 * - Particle systems and micro-animations
 * - Responsive breakpoint system
 * - Performance optimizations
 * - Accessibility considerations
 */
export default function MegaHelixBackground() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100vh',
        zIndex: 1,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* Primary Helix System */}
      <div className="primary-helix-system">
        {/* Core DNA Strands - 8 primary strands */}
        {Array.from({ length: 8 }).map((_, i) => (
          <svg
            key={`primary-${i}`}
            className={`primary-strand strand-${i + 1}`}
            viewBox="0 0 1400 900"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 2,
            }}
          >
            <defs>
              {/* Advanced gradient definitions */}
              <linearGradient id={`primaryGradient-${i + 1}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="15%" stopColor={`var(--primary-color-${i + 1})`} stopOpacity="0.3" />
                <stop offset="35%" stopColor={`var(--primary-color-${i + 1})`} stopOpacity="0.8" />
                <stop offset="50%" stopColor={`var(--primary-color-${i + 1})`} stopOpacity="1" />
                <stop offset="65%" stopColor={`var(--primary-color-${i + 1})`} stopOpacity="0.8" />
                <stop offset="85%" stopColor={`var(--primary-color-${i + 1})`} stopOpacity="0.3" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
              
              {/* Radial gradient for depth */}
              <radialGradient id={`radialGradient-${i + 1}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={`var(--primary-color-${i + 1})`} stopOpacity="1" />
                <stop offset="70%" stopColor={`var(--primary-color-${i + 1})`} stopOpacity="0.6" />
                <stop offset="100%" stopColor={`var(--primary-color-${i + 1})`} stopOpacity="0" />
              </radialGradient>

              {/* Advanced glow filter */}
              <filter id={`advancedGlow-${i + 1}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
                <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor={`var(--primary-color-${i + 1})`} floodOpacity="0.5"/>
              </filter>

              {/* Animated pattern for texture */}
              <pattern id={`texturePattern-${i + 1}`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="10" cy="10" r="1" fill={`var(--primary-color-${i + 1})`} opacity="0.3">
                  <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3s" repeatCount="indefinite"/>
                </circle>
              </pattern>
            </defs>
            
            {/* Main helix path */}
            <path
              d={generateComplexHelixPath(i, 'primary')}
              stroke={`url(#primaryGradient-${i + 1})`}
              strokeWidth="4"
              fill="none"
              filter={`url(#advancedGlow-${i + 1})`}
              className={`primary-path path-${i + 1}`}
            />

            {/* Secondary accent path */}
            <path
              d={generateComplexHelixPath(i, 'secondary')}
              stroke={`url(#radialGradient-${i + 1})`}
              strokeWidth="2"
              fill="none"
              opacity="0.6"
              className={`secondary-path path-${i + 1}`}
            />

            {/* Texture overlay */}
            <path
              d={generateComplexHelixPath(i, 'primary')}
              stroke={`url(#texturePattern-${i + 1})`}
              strokeWidth="1"
              fill="none"
              opacity="0.4"
              className={`texture-path path-${i + 1}`}
            />
          </svg>
        ))}

        {/* Secondary Helix System - 6 secondary strands */}
        {Array.from({ length: 6 }).map((_, i) => (
          <svg
            key={`secondary-${i}`}
            className={`secondary-strand strand-${i + 1}`}
            viewBox="0 0 1400 900"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 1,
            }}
          >
            <defs>
              <linearGradient id={`secondaryGradient-${i + 1}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="30%" stopColor={`var(--secondary-color-${i + 1})`} stopOpacity="0.4" />
                <stop offset="70%" stopColor={`var(--secondary-color-${i + 1})`} stopOpacity="0.6" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
              <filter id={`secondaryGlow-${i + 1}`}>
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            <path
              d={generateComplexHelixPath(i + 8, 'secondary')}
              stroke={`url(#secondaryGradient-${i + 1})`}
              strokeWidth="2"
              fill="none"
              filter={`url(#secondaryGlow-${i + 1})`}
              className={`secondary-path path-${i + 1}`}
            />
          </svg>
        ))}
      </div>

      {/* Particle System */}
      <div className="particle-system">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={`particle-${i}`}
            className={`particle particle-${i + 1}`}
            style={{
              '--particle-delay': `${i * 0.1}s`,
              '--particle-duration': `${8 + (i % 5) * 2}s`,
              '--particle-color': getParticleColor(i),
            }}
          />
        ))}
      </div>

      {/* Accent Waves */}
      <div className="accent-waves">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`accent-${i}`}
            className={`accent-wave wave-${i + 1}`}
            style={{
              '--wave-delay': `${i * 1.5}s`,
              '--wave-duration': `${10 + i * 2}s`,
              '--wave-color': getAccentColor(i),
            }}
          />
        ))}
      </div>

      {/* Bottom Foundation Waves */}
      <div className="foundation-waves">
        {Array.from({ length: 3 }).map((_, i) => (
          <svg
            key={`foundation-${i}`}
            className={`foundation-wave foundation-${i + 1}`}
            viewBox="0 0 1400 200"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: '200px',
              zIndex: 0,
            }}
          >
            <defs>
              <linearGradient id={`foundationGradient-${i + 1}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="20%" stopColor={`var(--foundation-color-${i + 1})`} stopOpacity="0.3" />
                <stop offset="50%" stopColor={`var(--foundation-color-${i + 1})`} stopOpacity="0.6" />
                <stop offset="80%" stopColor={`var(--foundation-color-${i + 1})`} stopOpacity="0.3" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <path
              d={generateFoundationWave(i)}
              stroke={`url(#foundationGradient-${i + 1})`}
              strokeWidth="6"
              fill="none"
              className={`foundation-path foundation-${i + 1}`}
            />
          </svg>
        ))}
      </div>

      {/* Lighting System */}
      <div className="lighting-system">
        <div className="ambient-light" />
        <div className="spot-light-1" />
        <div className="spot-light-2" />
        <div className="spot-light-3" />
      </div>

      <style jsx>{`
        /* CSS Variables for Colors */
        .primary-helix-system {
          --primary-color-1: #3B82F6;
          --primary-color-2: #6366F1;
          --primary-color-3: #8B5CF6;
          --primary-color-4: #EC4899;
          --primary-color-5: #F59E0B;
          --primary-color-6: #10B981;
          --primary-color-7: #EF4444;
          --primary-color-8: #06B6D4;
        }

        .secondary-strand {
          --secondary-color-1: #60A5FA;
          --secondary-color-2: #818CF8;
          --secondary-color-3: #A78BFA;
          --secondary-color-4: #F472B6;
          --secondary-color-5: #FBBF24;
          --secondary-color-6: #34D399;
        }

        .foundation-waves {
          --foundation-color-1: #1E40AF;
          --foundation-color-2: #4338CA;
          --foundation-color-3: #7C3AED;
        }

        /* Primary Helix Animations */
        .primary-path {
          stroke-dasharray: 30 15;
          stroke-dashoffset: 0;
          animation: primaryHelixFlow 15s linear infinite;
        }

        .path-1 { animation-delay: 0s; animation-duration: 15s; }
        .path-2 { animation-delay: -1.8s; animation-duration: 16s; }
        .path-3 { animation-delay: -3.6s; animation-duration: 17s; }
        .path-4 { animation-delay: -5.4s; animation-duration: 14s; }
        .path-5 { animation-delay: -7.2s; animation-duration: 18s; }
        .path-6 { animation-delay: -9s; animation-duration: 16s; }
        .path-7 { animation-delay: -10.8s; animation-duration: 15s; }
        .path-8 { animation-delay: -12.6s; animation-duration: 17s; }

        .secondary-path {
          stroke-dasharray: 20 10;
          stroke-dashoffset: 0;
          animation: secondaryHelixFlow 12s linear infinite;
        }

        .secondary-path.path-1 { animation-delay: -0.5s; }
        .secondary-path.path-2 { animation-delay: -1.5s; }
        .secondary-path.path-3 { animation-delay: -2.5s; }
        .secondary-path.path-4 { animation-delay: -3.5s; }
        .secondary-path.path-5 { animation-delay: -4.5s; }
        .secondary-path.path-6 { animation-delay: -5.5s; }

        .texture-path {
          stroke-dasharray: 5 5;
          stroke-dashoffset: 0;
          animation: textureFlow 8s linear infinite;
        }

        /* Particle System */
        .particle-system {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 3;
        }

        .particle {
          position: absolute;
          width: 2px;
          height: 2px;
          background: var(--particle-color);
          border-radius: 50%;
          opacity: 0.7;
          animation: particleFloat var(--particle-duration) var(--particle-delay) linear infinite;
        }

        .particle:nth-child(odd) {
          animation-name: particleFloatOdd;
        }

        /* Accent Waves */
        .accent-waves {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
        }

        .accent-wave {
          position: absolute;
          height: 2px;
          background: linear-gradient(90deg, 
            transparent 0%, 
            var(--wave-color) 20%, 
            var(--wave-color) 80%, 
            transparent 100%
          );
          border-radius: 50px;
          filter: drop-shadow(0 0 6px var(--wave-color));
          animation: accentWaveFlow var(--wave-duration) var(--wave-delay) linear infinite;
        }

        .wave-1 { top: 25%; width: 120%; }
        .wave-2 { top: 75%; width: 110%; }
        .wave-3 { top: 35%; width: 130%; }
        .wave-4 { top: 65%; width: 115%; }

        /* Foundation Waves */
        .foundation-path {
          stroke-dasharray: 40 20;
          stroke-dashoffset: 0;
          animation: foundationFlow 20s linear infinite;
        }

        .foundation-1 { animation-delay: 0s; }
        .foundation-2 { animation-delay: -6.7s; }
        .foundation-3 { animation-delay: -13.3s; }

        /* Lighting System */
        .lighting-system {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          pointer-events: none;
        }

        .ambient-light {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(ellipse at center, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
          animation: ambientPulse 8s ease-in-out infinite;
        }

        .spot-light-1 {
          position: absolute;
          top: 20%;
          left: 20%;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%);
          border-radius: 50%;
          animation: spotLightMove1 12s ease-in-out infinite;
        }

        .spot-light-2 {
          position: absolute;
          top: 60%;
          right: 20%;
          width: 250px;
          height: 250px;
          background: radial-gradient(circle, rgba(236, 72, 153, 0.3) 0%, transparent 70%);
          border-radius: 50%;
          animation: spotLightMove2 10s ease-in-out infinite;
        }

        .spot-light-3 {
          position: absolute;
          bottom: 20%;
          left: 50%;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(245, 158, 11, 0.3) 0%, transparent 70%);
          border-radius: 50%;
          animation: spotLightMove3 14s ease-in-out infinite;
        }

        /* Keyframe Animations */
        @keyframes primaryHelixFlow {
          0% {
            stroke-dashoffset: 0;
            transform: translateX(-100%);
          }
          100% {
            stroke-dashoffset: -400;
            transform: translateX(100%);
          }
        }

        @keyframes secondaryHelixFlow {
          0% {
            stroke-dashoffset: 0;
            transform: translateX(-100%) scaleY(0.8);
          }
          50% {
            transform: translateX(0%) scaleY(1.2);
          }
          100% {
            stroke-dashoffset: -300;
            transform: translateX(100%) scaleY(0.8);
          }
        }

        @keyframes textureFlow {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: -100;
          }
        }

        @keyframes particleFloat {
          0% {
            transform: translateX(-100px) translateY(0px) scale(0.5);
            opacity: 0;
          }
          10% {
            opacity: 0.7;
          }
          90% {
            opacity: 0.7;
          }
          100% {
            transform: translateX(calc(100vw + 100px)) translateY(-200px) scale(1.5);
            opacity: 0;
          }
        }

        @keyframes particleFloatOdd {
          0% {
            transform: translateX(calc(100vw + 100px)) translateY(0px) scale(0.5);
            opacity: 0;
          }
          10% {
            opacity: 0.7;
          }
          90% {
            opacity: 0.7;
          }
          100% {
            transform: translateX(-100px) translateY(-200px) scale(1.5);
            opacity: 0;
          }
        }

        @keyframes accentWaveFlow {
          0% {
            transform: translateX(-120%) scaleY(1) rotate(0deg);
            opacity: 0.3;
          }
          25% {
            transform: translateX(-50%) scaleY(1.5) rotate(2deg);
            opacity: 0.8;
          }
          50% {
            transform: translateX(0%) scaleY(2) rotate(0deg);
            opacity: 1;
          }
          75% {
            transform: translateX(50%) scaleY(1.5) rotate(-2deg);
            opacity: 0.8;
          }
          100% {
            transform: translateX(120%) scaleY(1) rotate(0deg);
            opacity: 0.3;
          }
        }

        @keyframes foundationFlow {
          0% {
            stroke-dashoffset: 0;
            transform: translateX(-100%);
          }
          100% {
            stroke-dashoffset: -500;
            transform: translateX(100%);
          }
        }

        @keyframes ambientPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }

        @keyframes spotLightMove1 {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.3;
          }
          50% {
            transform: translate(-30%, -70%) scale(1.2);
            opacity: 0.6;
          }
        }

        @keyframes spotLightMove2 {
          0%, 100% {
            transform: translate(50%, -50%) scale(1);
            opacity: 0.3;
          }
          50% {
            transform: translate(30%, -30%) scale(1.1);
            opacity: 0.5;
          }
        }

        @keyframes spotLightMove3 {
          0%, 100% {
            transform: translate(-50%, 50%) scale(1);
            opacity: 0.3;
          }
          50% {
            transform: translate(-70%, 30%) scale(1.3);
            opacity: 0.7;
          }
        }

        /* Responsive System */
        @media (max-width: 1200px) {
          .primary-path { stroke-width: 3; }
          .secondary-path { stroke-width: 1.5; }
          .particle { width: 1.5px; height: 1.5px; }
        }

        @media (max-width: 768px) {
          .primary-path { stroke-width: 2; }
          .secondary-path { stroke-width: 1; }
          .particle { width: 1px; height: 1px; }
          .spot-light-1, .spot-light-2, .spot-light-3 {
            width: 150px;
            height: 150px;
          }
        }

        @media (max-width: 480px) {
          .primary-path { stroke-width: 1.5; }
          .accent-wave { height: 1px; }
          .foundation-path { stroke-width: 4; }
        }

        /* Performance Optimizations */
        .primary-helix-system,
        .secondary-strand,
        .particle,
        .accent-wave {
          will-change: transform, opacity;
          transform: translateZ(0);
          backface-visibility: hidden;
        }

        /* Accessibility */
        @media (prefers-reduced-motion: reduce) {
          .primary-path,
          .secondary-path,
          .texture-path,
          .particle,
          .accent-wave,
          .foundation-path,
          .ambient-light,
          .spot-light-1,
          .spot-light-2,
          .spot-light-3 {
            animation-duration: 60s;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Generate complex helix paths with multiple mathematical functions
 */
function generateComplexHelixPath(strandIndex, type) {
  const centerX = 700;
  const centerY = 450;
  const amplitude = type === 'primary' ? 80 + (strandIndex * 12) : 40 + (strandIndex * 8);
  const frequency = 2 + (strandIndex * 0.4);
  const phase = (strandIndex * Math.PI) / 3;
  const complexity = type === 'primary' ? 3 : 2;
  
  const points = [];
  const segments = 200;
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = t * 1400;
    
    // Multiple sine waves for complexity
    let y = centerY;
    for (let j = 0; j < complexity; j++) {
      const freq = frequency * (j + 1);
      const amp = amplitude / (j + 1);
      const ph = phase + (j * Math.PI / 4);
      y += amp * Math.sin(freq * Math.PI * t + ph);
    }
    
    // Bulge effect around CTA button area
    const centerDistance = Math.abs(x - centerX) / centerX;
    const bulge = Math.exp(-Math.pow(centerDistance * 1.5, 2)) * 60;
    const bulgePhase = frequency * Math.PI * t + phase + Math.PI / 2;
    y += bulge * Math.sin(bulgePhase);
    
    // Add secondary wave for texture
    if (type === 'primary') {
      y += 15 * Math.sin(8 * Math.PI * t + phase * 2);
    }
    
    points.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
  }
  
  return points.join(' ');
}

/**
 * Generate foundation wave paths
 */
function generateFoundationWave(waveIndex) {
  const amplitude = 30 + (waveIndex * 10);
  const frequency = 1 + (waveIndex * 0.5);
  const phase = waveIndex * Math.PI / 3;
  
  const points = [];
  const segments = 100;
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = t * 1400;
    const y = 100 + amplitude * Math.sin(frequency * Math.PI * t + phase);
    points.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
  }
  
  return points.join(' ');
}

/**
 * Get particle colors based on index
 */
function getParticleColor(index) {
  const colors = [
    '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B',
    '#10B981', '#EF4444', '#06B6D4', '#84CC16', '#F97316'
  ];
  return colors[index % colors.length];
}

/**
 * Get accent wave colors
 */
function getAccentColor(index) {
  const colors = ['#60A5FA', '#A78BFA', '#F472B6', '#FBBF24'];
  return colors[index % colors.length];
}

