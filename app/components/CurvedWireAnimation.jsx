'use client';

import React from 'react';

/**
 * Curved Wire Animation - Tangled wires that wrap around the CTA button
 */
export default function CurvedWireAnimation() {
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
        viewBox="0 0 1400 800"
        style={{ width: '100%', height: '100%' }}
        className="curved-wire-svg"
      >
        <defs>
          {/* Glow filter */}
          <filter id="wireGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* All blue gradients */}
          <linearGradient id="wire1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0"/>
            <stop offset="20%" stopColor="#3B82F6" stopOpacity="0.9"/>
            <stop offset="80%" stopColor="#3B82F6" stopOpacity="0.9"/>
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
          </linearGradient>
          
          <linearGradient id="wire2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0"/>
            <stop offset="20%" stopColor="#3B82F6" stopOpacity="0.8"/>
            <stop offset="80%" stopColor="#3B82F6" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
          </linearGradient>
          
          <linearGradient id="wire3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0"/>
            <stop offset="20%" stopColor="#3B82F6" stopOpacity="1"/>
            <stop offset="80%" stopColor="#3B82F6" stopOpacity="1"/>
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
          </linearGradient>
          
          <linearGradient id="wire4" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0"/>
            <stop offset="20%" stopColor="#3B82F6" stopOpacity="0.8"/>
            <stop offset="80%" stopColor="#3B82F6" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
          </linearGradient>
          
          <linearGradient id="wire5" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0"/>
            <stop offset="20%" stopColor="#3B82F6" stopOpacity="0.7"/>
            <stop offset="80%" stopColor="#3B82F6" stopOpacity="0.7"/>
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
          </linearGradient>
        </defs>

        {/* Wire 1 - Top wire, avoids headline area */}
        <path
          d="M 0 180 Q 200 150 400 180 Q 600 210 700 200 Q 800 190 1000 200 Q 1200 210 1400 180"
          fill="none"
          stroke="url(#wire1)"
          strokeWidth="3"
          filter="url(#wireGlow)"
          className="wire-1"
        />
        
        {/* Wire 2 - Upper wire, bends around text */}
        <path
          d="M 0 220 Q 300 190 500 220 Q 650 240 750 230 Q 850 220 950 230 Q 1100 240 1400 220"
          fill="none"
          stroke="url(#wire2)"
          strokeWidth="3"
          filter="url(#wireGlow)"
          className="wire-2"
        />
        
        {/* Wire 3 - Main wire around button area */}
        <path
          d="M 0 320 Q 200 280 400 320 Q 550 350 650 340 Q 750 330 850 340 Q 950 350 1100 320 Q 1300 280 1400 320"
          fill="none"
          stroke="url(#wire3)"
          strokeWidth="4"
          filter="url(#wireGlow)"
          className="wire-3"
        />
        
        {/* Wire 4 - Lower wire, avoids button area */}
        <path
          d="M 0 380 Q 300 350 500 380 Q 650 400 750 390 Q 850 380 950 390 Q 1100 400 1400 380"
          fill="none"
          stroke="url(#wire4)"
          strokeWidth="3"
          filter="url(#wireGlow)"
          className="wire-4"
        />
        
        {/* Wire 5 - Bottom wire */}
        <path
          d="M 0 420 Q 200 390 400 420 Q 600 450 700 440 Q 800 430 900 440 Q 1100 450 1400 420"
          fill="none"
          stroke="url(#wire5)"
          strokeWidth="3"
          filter="url(#wireGlow)"
          className="wire-5"
        />
        
        {/* Additional tangled wires for complexity */}
        <path
          d="M 0 200 Q 400 170 600 200 Q 800 230 1000 220 Q 1200 210 1400 200"
          fill="none"
          stroke="url(#wire2)"
          strokeWidth="2"
          filter="url(#wireGlow)"
          className="wire-tangle-1"
        />
        
        <path
          d="M 0 360 Q 350 330 550 360 Q 750 390 850 380 Q 950 370 1150 380 Q 1350 350 1400 360"
          fill="none"
          stroke="url(#wire4)"
          strokeWidth="2"
          filter="url(#wireGlow)"
          className="wire-tangle-2"
        />
        
        {/* Bottom wave anchor */}
        <path
          d="M 0 600 Q 300 570 600 600 Q 900 630 1200 600 Q 1400 570 1400 600"
          fill="none"
          stroke="url(#wire3)"
          strokeWidth="6"
          filter="url(#wireGlow)"
          className="bottom-wave"
        />
      </svg>

      <style jsx>{`
        .curved-wire-svg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .wire-1, .wire-2, .wire-3, .wire-4, .wire-5 {
          stroke-dasharray: 2500;
          stroke-dashoffset: 2500;
          animation: wireFlow 12s linear infinite;
        }

        .wire-2 {
          animation-delay: -2s;
        }

        .wire-3 {
          animation-delay: -1s;
        }

        .wire-4 {
          animation-delay: -3s;
        }

        .wire-5 {
          animation-delay: -4s;
        }

        .wire-tangle-1, .wire-tangle-2 {
          stroke-dasharray: 2000;
          stroke-dashoffset: 2000;
          animation: wireFlow 10s linear infinite;
        }

        .wire-tangle-1 {
          animation-delay: -1.5s;
        }

        .wire-tangle-2 {
          animation-delay: -2.5s;
        }

        .bottom-wave {
          stroke-dasharray: 1500;
          stroke-dashoffset: 1500;
          animation: bottomWaveFlow 15s linear infinite;
        }

        @keyframes wireFlow {
          0% {
            stroke-dashoffset: 2500;
            transform: translateX(0);
          }
          100% {
            stroke-dashoffset: 0;
            transform: translateX(200px);
          }
        }

        @keyframes bottomWaveFlow {
          0% {
            stroke-dashoffset: 1500;
            transform: translateX(0);
          }
          100% {
            stroke-dashoffset: 0;
            transform: translateX(400px);
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .wire-1, .wire-2, .wire-3, .wire-4, .wire-5 {
            stroke-width: 2px;
          }
          .wire-tangle-1, .wire-tangle-2 {
            display: none;
          }
          .bottom-wave {
            stroke-width: 4px;
          }
        }
      `}</style>
    </div>
  );
}
