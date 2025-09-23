import React from 'react';

/**
 * SimpleFlowAnimation.jsx
 * 
 * Clean, simple flowing lines that look professional and smooth
 * No complex animations - just clean energy streams
 */
export default function SimpleFlowAnimation() {
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
          {/* Simple glow filter */}
          <filter id="simpleGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feFlood floodColor="#8B5CF6" floodOpacity="0.6" result="floodColor"/>
            <feComposite in="floodColor" in2="coloredBlur" operator="in" result="glowColor"/>
            <feMerge>
              <feMergeNode in="glowColor"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Simple gradient */}
          <linearGradient id="simpleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4"/>
            <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.4"/>
          </linearGradient>
        </defs>

        {/* Simple flowing lines */}
        <path
          d="M 0 300 Q 300 280 600 300 Q 900 320 1200 300"
          fill="none"
          stroke="url(#simpleGradient)"
          strokeWidth="2"
          filter="url(#simpleGlow)"
          className="flow-line line-1"
        />
        
        <path
          d="M 0 320 Q 400 300 800 320 Q 1200 340 1200 320"
          fill="none"
          stroke="url(#simpleGradient)"
          strokeWidth="1.5"
          filter="url(#simpleGlow)"
          className="flow-line line-2"
        />
        
        <path
          d="M 0 340 Q 200 320 400 340 Q 600 360 800 340 Q 1000 320 1200 340"
          fill="none"
          stroke="url(#simpleGradient)"
          strokeWidth="2.5"
          filter="url(#simpleGlow)"
          className="flow-line line-3"
        />
        
        <path
          d="M 0 280 Q 500 260 1000 280 Q 1200 300 1200 280"
          fill="none"
          stroke="url(#simpleGradient)"
          strokeWidth="1.8"
          filter="url(#simpleGlow)"
          className="flow-line line-4"
        />

        <path
          d="M 0 360 Q 350 380 700 360 Q 1050 340 1200 360"
          fill="none"
          stroke="url(#simpleGradient)"
          strokeWidth="1.2"
          filter="url(#simpleGlow)"
          className="flow-line line-5"
        />
      </svg>

      <style jsx>{`
        .flow-line {
          animation: simpleFlow 8s linear infinite;
          will-change: transform;
        }

        .line-1 { 
          animation-delay: 0s; 
          animation-duration: 10s; 
        }
        .line-2 { 
          animation-delay: 2s; 
          animation-duration: 12s; 
        }
        .line-3 { 
          animation-delay: 4s; 
          animation-duration: 9s; 
        }
        .line-4 { 
          animation-delay: 1s; 
          animation-duration: 11s; 
        }
        .line-5 { 
          animation-delay: 3s; 
          animation-duration: 13s; 
        }

        @keyframes simpleFlow {
          0% {
            transform: translateX(-1200px);
          }
          100% {
            transform: translateX(1200px);
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .flow-line {
            stroke-width: 1px;
          }
          /* Hide some lines for mobile */
          .line-4, .line-5 {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

