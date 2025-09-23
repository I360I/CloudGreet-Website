import React from 'react';

/**
 * AnimatedGrid.jsx
 * 
 * Dynamic animated grid with flowing energy lines
 */
export default function AnimatedGrid() {
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
      {/* Animated grid lines */}
      <svg
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          {/* Gradient for the grid lines */}
          <linearGradient id="gridGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.1"/>
            <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.1"/>
          </linearGradient>
          
          {/* Glow filter */}
          <filter id="gridGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feFlood floodColor="#8B5CF6" floodOpacity="0.4" result="floodColor"/>
            <feComposite in="floodColor" in2="coloredBlur" operator="in" result="glowColor"/>
            <feMerge>
              <feMergeNode in="glowColor"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Vertical grid lines */}
        {Array.from({ length: 20 }, (_, i) => (
          <line
            key={`v-${i}`}
            x1={i * 60}
            y1="0"
            x2={i * 60}
            y2="800"
            stroke="url(#gridGradient)"
            strokeWidth="1"
            filter="url(#gridGlow)"
            className="grid-line vertical"
            style={{
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}

        {/* Horizontal grid lines */}
        {Array.from({ length: 15 }, (_, i) => (
          <line
            key={`h-${i}`}
            x1="0"
            y1={i * 53.33}
            x2="1200"
            y2={i * 53.33}
            stroke="url(#gridGradient)"
            strokeWidth="1"
            filter="url(#gridGlow)"
            className="grid-line horizontal"
            style={{
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}

        {/* Flowing energy lines */}
        <path
          d="M 0 400 Q 300 350 600 400 Q 900 450 1200 400"
          fill="none"
          stroke="#8B5CF6"
          strokeWidth="3"
          filter="url(#gridGlow)"
          className="energy-line line-1"
        />
        <path
          d="M 0 300 Q 400 250 800 300 Q 1000 350 1200 300"
          fill="none"
          stroke="#3B82F6"
          strokeWidth="2.5"
          filter="url(#gridGlow)"
          className="energy-line line-2"
        />
        <path
          d="M 0 500 Q 350 550 700 500 Q 950 450 1200 500"
          fill="none"
          stroke="#8B5CF6"
          strokeWidth="2"
          filter="url(#gridGlow)"
          className="energy-line line-3"
        />
      </svg>

      <style jsx>{`
        .grid-line {
          animation: gridPulse 4s ease-in-out infinite;
          opacity: 0.3;
        }

        .vertical {
          animation: gridFlowVertical 8s linear infinite;
        }

        .horizontal {
          animation: gridFlowHorizontal 6s linear infinite;
        }

        .energy-line {
          animation: energyFlow 10s ease-in-out infinite;
          stroke-dasharray: 20, 10;
        }

        .line-1 {
          animation-delay: 0s;
          animation-duration: 8s;
        }

        .line-2 {
          animation-delay: -2s;
          animation-duration: 12s;
        }

        .line-3 {
          animation-delay: -4s;
          animation-duration: 10s;
        }

        @keyframes gridPulse {
          0%, 100% {
            opacity: 0.1;
          }
          50% {
            opacity: 0.4;
          }
        }

        @keyframes gridFlowVertical {
          0% {
            transform: translateY(-20px);
          }
          100% {
            transform: translateY(20px);
          }
        }

        @keyframes gridFlowHorizontal {
          0% {
            transform: translateX(-20px);
          }
          100% {
            transform: translateX(20px);
          }
        }

        @keyframes energyFlow {
          0% {
            stroke-dashoffset: 0;
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
          100% {
            stroke-dashoffset: -60;
            opacity: 0.6;
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .grid-line {
            stroke-width: 0.5px;
          }
          .energy-line {
            stroke-width: 1.5px;
          }
        }
      `}</style>
    </div>
  );
}

