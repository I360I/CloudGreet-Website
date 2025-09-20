import React from 'react';

/**
 * WOW FACTOR ANIMATION - Complex, impressive initial load animation
 * Multiple layers, particles, and sophisticated effects
 */
export default function WowFactorAnimation() {
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
      {/* Particle System */}
      <div className="particle-container">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className={`particle particle-${i + 1}`}
            style={{
              '--delay': `${i * 0.1}s`,
              '--duration': `${3 + (i % 5) * 0.5}s`,
              '--x': `${Math.random() * 100}%`,
              '--y': `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      {/* Main Helix System */}
      <svg
        viewBox="0 0 1200 800"
        style={{ width: '100%', height: '100%' }}
        className="helix-svg"
      >
        <defs>
          {/* Advanced Glow Filters */}
          <filter id="superGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feColorMatrix
              in="coloredBlur"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 15 0"
              result="glow"
            />
            <feMerge> 
              <feMergeNode in="glow"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* Multi-color Gradients */}
          <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0"/>
            <stop offset="25%" stopColor="#3B82F6" stopOpacity="0.8"/>
            <stop offset="50%" stopColor="#8B5CF6" stopOpacity="1"/>
            <stop offset="75%" stopColor="#EC4899" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0"/>
          </linearGradient>

          <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0"/>
            <stop offset="25%" stopColor="#10B981" stopOpacity="0.8"/>
            <stop offset="50%" stopColor="#3B82F6" stopOpacity="1"/>
            <stop offset="75%" stopColor="#8B5CF6" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#EC4899" stopOpacity="0"/>
          </linearGradient>

          <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0"/>
            <stop offset="25%" stopColor="#F59E0B" stopOpacity="0.8"/>
            <stop offset="50%" stopColor="#EC4899" stopOpacity="1"/>
            <stop offset="75%" stopColor="#8B5CF6" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
          </linearGradient>
        </defs>

        {/* Complex Helix Paths */}
        <path
          d="M 0 200 Q 200 150 400 200 Q 600 250 800 200 Q 1000 150 1200 200"
          fill="none"
          stroke="url(#gradient1)"
          strokeWidth="5"
          filter="url(#superGlow)"
          className="helix-1"
        />
        
        <path
          d="M 0 300 Q 300 250 600 300 Q 900 350 1200 300"
          fill="none"
          stroke="url(#gradient2)"
          strokeWidth="6"
          filter="url(#superGlow)"
          className="helix-2"
        />
        
        <path
          d="M 0 400 Q 400 350 800 400 Q 1200 450 1200 400"
          fill="none"
          stroke="url(#gradient3)"
          strokeWidth="4"
          filter="url(#superGlow)"
          className="helix-3"
        />

        {/* Intersecting Lines */}
        <path
          d="M 100 100 Q 600 300 1100 100"
          fill="none"
          stroke="url(#gradient1)"
          strokeWidth="3"
          filter="url(#superGlow)"
          className="intersect-1"
        />
        
        <path
          d="M 100 700 Q 600 500 1100 700"
          fill="none"
          stroke="url(#gradient2)"
          strokeWidth="3"
          filter="url(#superGlow)"
          className="intersect-2"
        />

        {/* Orbital Rings */}
        <circle cx="600" cy="400" r="150" fill="none" stroke="url(#gradient3)" strokeWidth="2" filter="url(#superGlow)" className="orbit-1" />
        <circle cx="600" cy="400" r="200" fill="none" stroke="url(#gradient1)" strokeWidth="1" filter="url(#superGlow)" className="orbit-2" />
        <circle cx="600" cy="400" r="250" fill="none" stroke="url(#gradient2)" strokeWidth="1" filter="url(#superGlow)" className="orbit-3" />
      </svg>

      {/* Energy Bursts */}
      <div className="energy-container">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className={`energy-burst burst-${i + 1}`}
            style={{
              '--delay': `${i * 0.5}s`,
              '--duration': `${2 + (i % 3) * 0.3}s`,
            }}
          />
        ))}
      </div>

      {/* Central Energy Core */}
      <div className="energy-core" />

      <style jsx>{`
        .particle-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: radial-gradient(circle, #3B82F6 0%, transparent 70%);
          border-radius: 50%;
          left: var(--x);
          top: var(--y);
          animation: particleFloat var(--duration) var(--delay) ease-in-out infinite alternate;
        }

        .helix-svg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .helix-1, .helix-2, .helix-3 {
          stroke-dasharray: 1500;
          stroke-dashoffset: 1500;
          animation: helixFlow 8s linear infinite;
        }

        .helix-2 {
          animation-delay: -2s;
        }

        .helix-3 {
          animation-delay: -4s;
        }

        .intersect-1, .intersect-2 {
          stroke-dasharray: 1200;
          stroke-dashoffset: 1200;
          animation: intersectFlow 6s linear infinite;
        }

        .intersect-2 {
          animation-delay: -3s;
        }

        .orbit-1, .orbit-2, .orbit-3 {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: orbitFlow 10s linear infinite;
        }

        .orbit-2 {
          animation-delay: -3s;
        }

        .orbit-3 {
          animation-delay: -6s;
        }

        .energy-container {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 100%;
          transform: translate(-50%, -50%);
        }

        .energy-burst {
          position: absolute;
          width: 20px;
          height: 20px;
          background: radial-gradient(circle, #3B82F6 0%, #8B5CF6 50%, transparent 100%);
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: energyBurst var(--duration) var(--delay) ease-in-out infinite;
        }

        .energy-core {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100px;
          height: 100px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.8) 0%, rgba(139, 92, 246, 0.4) 50%, transparent 100%);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          animation: corePulse 2s ease-in-out infinite alternate;
        }

        @keyframes particleFloat {
          0% {
            transform: translate(0, 0) scale(0.5);
            opacity: 0.3;
          }
          50% {
            transform: translate(50px, -30px) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-30px, 50px) scale(0.8);
            opacity: 0.6;
          }
        }

        @keyframes helixFlow {
          0% {
            stroke-dashoffset: 1500;
            transform: translateX(0) rotate(0deg);
          }
          100% {
            stroke-dashoffset: 0;
            transform: translateX(100px) rotate(360deg);
          }
        }

        @keyframes intersectFlow {
          0% {
            stroke-dashoffset: 1200;
            transform: translateX(0) scale(1);
          }
          100% {
            stroke-dashoffset: 0;
            transform: translateX(-100px) scale(1.2);
          }
        }

        @keyframes orbitFlow {
          0% {
            stroke-dashoffset: 1000;
            transform: rotate(0deg);
          }
          100% {
            stroke-dashoffset: 0;
            transform: rotate(360deg);
          }
        }

        @keyframes energyBurst {
          0% {
            transform: translate(-50%, -50%) scale(0) rotate(0deg);
            opacity: 0;
          }
          50% {
            transform: translate(-50%, -50%) scale(1) rotate(180deg);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(0) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes corePulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.8;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.3);
            opacity: 0.4;
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .particle {
            width: 3px;
            height: 3px;
          }
          .energy-burst {
            width: 15px;
            height: 15px;
          }
          .energy-core {
            width: 80px;
            height: 80px;
          }
        }
      `}</style>
    </div>
  );
}
