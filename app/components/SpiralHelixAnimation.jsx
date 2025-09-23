import React from 'react';

/**
 * SpiralHelixAnimation.jsx
 * 
 * Creates a proper helix/spiral animation that wraps around the CTA button
 * with continuous flowing motion - no bouncing, just smooth spiraling energy
 */
export default function SpiralHelixAnimation() {
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
      }}
    >
      <svg
        viewBox="0 0 1200 600"
        preserveAspectRatio="xMidYMid slice"
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          {/* Glow filter for the helix strands */}
          <filter id="helixGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feFlood floodColor="#8B5CF6" floodOpacity="0.8" result="floodColor"/>
            <feComposite in="floodColor" in2="coloredBlur" operator="in" result="glowColor"/>
            <feMerge>
              <feMergeNode in="glowColor"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Purple gradient for helix strands */}
          <linearGradient id="helixGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3"/>
            <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.9"/>
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.3"/>
          </linearGradient>
        </defs>

        {/* Helix Strand 1 - Top spiral */}
        <path
          d="M 0 280 Q 200 260 400 280 Q 600 300 800 280 Q 1000 260 1200 280"
          fill="none"
          stroke="url(#helixGradient)"
          strokeWidth="2"
          filter="url(#helixGlow)"
          className="helix-strand strand-1"
        />
        
        {/* Helix Strand 2 - Upper spiral */}
        <path
          d="M 0 300 Q 300 280 600 300 Q 900 320 1200 300"
          fill="none"
          stroke="url(#helixGradient)"
          strokeWidth="1.5"
          filter="url(#helixGlow)"
          className="helix-strand strand-2"
        />
        
        {/* Helix Strand 3 - Center spiral */}
        <path
          d="M 0 320 Q 150 300 300 320 Q 450 340 600 320 Q 750 300 900 320 Q 1050 340 1200 320"
          fill="none"
          stroke="url(#helixGradient)"
          strokeWidth="2.5"
          filter="url(#helixGlow)"
          className="helix-strand strand-3"
        />
        
        {/* Helix Strand 4 - Lower spiral */}
        <path
          d="M 0 340 Q 300 360 600 340 Q 900 320 1200 340"
          fill="none"
          stroke="url(#helixGradient)"
          strokeWidth="1.8"
          filter="url(#helixGlow)"
          className="helix-strand strand-4"
        />

        {/* Helix Strand 5 - Bottom spiral */}
        <path
          d="M 0 360 Q 200 380 400 360 Q 600 340 800 360 Q 1000 380 1200 360"
          fill="none"
          stroke="url(#helixGradient)"
          strokeWidth="1.2"
          filter="url(#helixGlow)"
          className="helix-strand strand-5"
        />
      </svg>

      <style jsx>{`
        .helix-strand {
          animation: helixFlow 10s linear infinite;
          will-change: transform;
        }

        .strand-1 { 
          animation-delay: 0s; 
          animation-duration: 12s; 
        }
        .strand-2 { 
          animation-delay: 2s; 
          animation-duration: 14s; 
        }
        .strand-3 { 
          animation-delay: 4s; 
          animation-duration: 10s; 
        }
        .strand-4 { 
          animation-delay: 1s; 
          animation-duration: 16s; 
        }
        .strand-5 { 
          animation-delay: 3s; 
          animation-duration: 8s; 
        }

        @keyframes helixFlow {
          0% {
            transform: translateX(-1200px) rotate(0deg);
          }
          25% {
            transform: translateX(-600px) rotate(90deg);
          }
          50% {
            transform: translateX(0px) rotate(180deg);
          }
          75% {
            transform: translateX(600px) rotate(270deg);
          }
          100% {
            transform: translateX(1200px) rotate(360deg);
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .helix-strand {
            stroke-width: 1px;
          }
          /* Hide some strands for mobile */
          .strand-1, .strand-5 {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

