import React from 'react';

/**
 * WorkingPurpleLines.jsx
 * 
 * Simple, clean purple lines that flow smoothly across the screen
 * Matches the reference image style - no complex animations
 */
export default function WorkingPurpleLines() {
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
          {/* Purple glow filter */}
          <filter id="purpleGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feFlood floodColor="#8B5CF6" floodOpacity="0.7" result="floodColor"/>
            <feComposite in="floodColor" in2="coloredBlur" operator="in" result="glowColor"/>
            <feMerge>
              <feMergeNode in="glowColor"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Flowing purple lines */}
        <path
          d="M 0 280 Q 200 260 400 280 Q 600 300 800 280 Q 1000 260 1200 280"
          fill="none"
          stroke="#8B5CF6"
          strokeWidth="2"
          filter="url(#purpleGlow)"
          className="purple-line line-1"
        />
        
        <path
          d="M 0 300 Q 300 280 600 300 Q 900 320 1200 300"
          fill="none"
          stroke="#8B5CF6"
          strokeWidth="1.5"
          filter="url(#purpleGlow)"
          className="purple-line line-2"
        />
        
        <path
          d="M 0 320 Q 150 300 300 320 Q 450 340 600 320 Q 750 300 900 320 Q 1050 340 1200 320"
          fill="none"
          stroke="#8B5CF6"
          strokeWidth="2.5"
          filter="url(#purpleGlow)"
          className="purple-line line-3"
        />
        
        <path
          d="M 0 340 Q 200 360 400 340 Q 600 320 800 340 Q 1000 360 1200 340"
          fill="none"
          stroke="#8B5CF6"
          strokeWidth="1.8"
          filter="url(#purpleGlow)"
          className="purple-line line-4"
        />

        <path
          d="M 0 360 Q 300 340 600 360 Q 900 380 1200 360"
          fill="none"
          stroke="#8B5CF6"
          strokeWidth="1.2"
          filter="url(#purpleGlow)"
          className="purple-line line-5"
        />
      </svg>

      <style jsx>{`
        .purple-line {
          animation: slideFlow 12s linear infinite;
          will-change: transform;
        }

        .line-1 { 
          animation-delay: 0s; 
          animation-duration: 15s; 
        }
        .line-2 { 
          animation-delay: 3s; 
          animation-duration: 18s; 
        }
        .line-3 { 
          animation-delay: 6s; 
          animation-duration: 12s; 
        }
        .line-4 { 
          animation-delay: 1.5s; 
          animation-duration: 16s; 
        }
        .line-5 { 
          animation-delay: 4.5s; 
          animation-duration: 14s; 
        }

        @keyframes slideFlow {
          0% {
            transform: translateX(-1200px);
          }
          100% {
            transform: translateX(1200px);
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .purple-line {
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

