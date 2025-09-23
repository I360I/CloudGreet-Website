import React from 'react';

/**
 * Clean, Professional Wire Animation
 * Simple but effective - organized and purposeful
 */
export default function CleanWireAnimation() {
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
      <svg
        viewBox="0 0 1200 600"
        style={{ width: '100%', height: '100%' }}
        className="clean-wire-svg"
      >
        <defs>
          {/* Simple glow filter */}
          <filter id="cleanGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Clean blue gradient */}
          <linearGradient id="cleanBlue" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0"/>
            <stop offset="20%" stopColor="#3B82F6" stopOpacity="0.8"/>
            <stop offset="80%" stopColor="#3B82F6" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
          </linearGradient>
        </defs>

        {/* Main wire - clean horizontal flow */}
        <path
          d="M 0 300 Q 300 250 600 300 Q 900 350 1200 300"
          fill="none"
          stroke="url(#cleanBlue)"
          strokeWidth="4"
          filter="url(#cleanGlow)"
          className="main-wire"
        />
        
        {/* Secondary wire - subtle variation */}
        <path
          d="M 0 320 Q 400 270 700 320 Q 1000 370 1200 320"
          fill="none"
          stroke="url(#cleanBlue)"
          strokeWidth="3"
          filter="url(#cleanGlow)"
          className="secondary-wire"
        />
        
        {/* Accent wire - different timing */}
        <path
          d="M 0 280 Q 200 230 500 280 Q 800 330 1200 280"
          fill="none"
          stroke="url(#cleanBlue)"
          strokeWidth="2"
          filter="url(#cleanGlow)"
          className="accent-wire"
        />
        
        {/* Bottom anchor wave */}
        <path
          d="M 0 500 Q 300 480 600 500 Q 900 520 1200 500"
          fill="none"
          stroke="url(#cleanBlue)"
          strokeWidth="5"
          filter="url(#cleanGlow)"
          className="bottom-wave"
        />
      </svg>

      <style jsx>{`
        .clean-wire-svg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .main-wire, .secondary-wire, .accent-wire, .bottom-wave {
          stroke-dasharray: 1200;
          stroke-dashoffset: 1200;
          animation: cleanFlow 15s linear infinite;
        }

        .secondary-wire {
          animation-delay: -5s;
        }

        .accent-wire {
          animation-delay: -10s;
        }

        .bottom-wave {
          animation-delay: -7s;
        }

        @keyframes cleanFlow {
          0% {
            stroke-dashoffset: 1200;
            transform: translateX(0);
          }
          100% {
            stroke-dashoffset: 0;
            transform: translateX(100px);
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .main-wire { stroke-width: 3px; }
          .secondary-wire { stroke-width: 2px; }
          .accent-wire { stroke-width: 1.5px; }
          .bottom-wave { stroke-width: 4px; }
        }
      `}</style>
    </div>
  );
}

