import React from 'react';

/**
 * ExactReferenceAnimation.jsx
 * 
 * Matches the reference image exactly:
 * - Clean, thin horizontal purple wavy lines
 * - Flows smoothly from left to right like sound waves/data streams
 * - Passes behind the CTA button
 * - Professional, not chaotic
 */
export default function ExactReferenceAnimation() {
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
          {/* Glow filter for the lines */}
          <filter id="lineGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feFlood floodColor="#8B5CF6" floodOpacity="0.8" result="floodColor"/>
            <feComposite in="floodColor" in2="coloredBlur" operator="in" result="glowColor"/>
            <feMerge>
              <feMergeNode in="glowColor"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Purple gradient for the lines */}
          <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0"/>
            <stop offset="20%" stopColor="#8B5CF6" stopOpacity="0.9"/>
            <stop offset="80%" stopColor="#8B5CF6" stopOpacity="0.9"/>
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0"/>
          </linearGradient>
        </defs>

        {/* Lines that start from the SAME point and create a perfect oval around the button */}
        {/* All lines start at Y=320 (same horizontal level) */}
        
        {/* Line 1: Bends ABOVE the button - creates top of oval */}
        <path
          d="M 0 320 Q 200 280 400 320 Q 600 360 800 320 Q 1000 280 1200 320"
          fill="none"
          stroke="url(#purpleGradient)"
          strokeWidth="2"
          filter="url(#lineGlow)"
          className="wave-line line-1"
        />
        
        {/* Line 2: Bends ABOVE the button - creates top of oval */}
        <path
          d="M 0 320 Q 300 290 600 320 Q 900 350 1200 320"
          fill="none"
          stroke="url(#purpleGradient)"
          strokeWidth="1.5"
          filter="url(#lineGlow)"
          className="wave-line line-2"
        />
        
        {/* Line 3: Bends ABOVE the button - creates top of oval */}
        <path
          d="M 0 320 Q 150 300 300 320 Q 450 340 600 320 Q 750 300 900 320 Q 1050 340 1200 320"
          fill="none"
          stroke="url(#purpleGradient)"
          strokeWidth="2.5"
          filter="url(#lineGlow)"
          className="wave-line line-3"
        />
        
        {/* Line 4: Bends BELOW the button - creates bottom of oval */}
        <path
          d="M 0 320 Q 200 360 400 320 Q 600 280 800 320 Q 1000 360 1200 320"
          fill="none"
          stroke="url(#purpleGradient)"
          strokeWidth="1.8"
          filter="url(#lineGlow)"
          className="wave-line line-4"
        />

        {/* Line 5: Bends BELOW the button - creates bottom of oval */}
        <path
          d="M 0 320 Q 300 350 600 320 Q 900 290 1200 320"
          fill="none"
          stroke="url(#purpleGradient)"
          strokeWidth="1.2"
          filter="url(#lineGlow)"
          className="wave-line line-5"
        />
        
        {/* Line 6: Bends BELOW the button - creates bottom of oval */}
        <path
          d="M 0 320 Q 150 340 300 320 Q 450 300 600 320 Q 750 340 900 320 Q 1050 300 1200 320"
          fill="none"
          stroke="url(#purpleGradient)"
          strokeWidth="1.4"
          filter="url(#lineGlow)"
          className="wave-line line-6"
        />
      </svg>

      <style jsx>{`
        .wave-line {
          animation: flowingSpiral 8s ease-in-out infinite;
          will-change: transform;
        }

        .line-1 { 
          animation-delay: 0s; 
          animation-duration: 8s; 
        }
        .line-2 { 
          animation-delay: 1.3s; 
          animation-duration: 10s; 
        }
        .line-3 { 
          animation-delay: 2.6s; 
          animation-duration: 9s; 
        }
        .line-4 { 
          animation-delay: 0.7s; 
          animation-duration: 11s; 
        }
        .line-5 { 
          animation-delay: 2s; 
          animation-duration: 7s; 
        }
        .line-6 { 
          animation-delay: 3.3s; 
          animation-duration: 12s; 
        }

        @keyframes flowingSpiral {
          0% {
            transform: translateX(-1200px);
          }
          100% {
            transform: translateX(1200px);
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .wave-line {
            stroke-width: 1px;
          }
          /* Hide some lines on mobile for cleaner look */
          .line-5, .line-6 {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
