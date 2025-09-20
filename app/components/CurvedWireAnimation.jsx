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
        viewBox="0 0 1200 800"
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

        {/* Wire 1 - Top curve that wraps around button */}
        <path
          d="M 0 250 Q 400 180 600 250 Q 800 320 1200 250"
          fill="none"
          stroke="url(#wire1)"
          strokeWidth="3"
          filter="url(#wireGlow)"
          className="wire-1"
        />
        
        {/* Wire 2 - Upper middle curve */}
        <path
          d="M 0 320 Q 350 260 550 320 Q 750 380 1200 320"
          fill="none"
          stroke="url(#wire2)"
          strokeWidth="3"
          filter="url(#wireGlow)"
          className="wire-2"
        />
        
        {/* Wire 3 - Center curve (main helix around button) */}
        <path
          d="M 0 390 Q 300 320 500 390 Q 700 460 900 390 Q 1100 320 1200 390"
          fill="none"
          stroke="url(#wire3)"
          strokeWidth="4"
          filter="url(#wireGlow)"
          className="wire-3"
        />
        
        {/* Wire 4 - Lower middle curve */}
        <path
          d="M 0 460 Q 350 400 550 460 Q 750 520 1200 460"
          fill="none"
          stroke="url(#wire4)"
          strokeWidth="3"
          filter="url(#wireGlow)"
          className="wire-4"
        />
        
        {/* Wire 5 - Bottom curve */}
        <path
          d="M 0 530 Q 400 480 600 530 Q 800 580 1200 530"
          fill="none"
          stroke="url(#wire5)"
          strokeWidth="3"
          filter="url(#wireGlow)"
          className="wire-5"
        />
        
        {/* Additional tangled wires for complexity */}
        <path
          d="M 0 240 Q 400 180 600 240 Q 800 300 1200 240"
          fill="none"
          stroke="url(#wire2)"
          strokeWidth="2"
          filter="url(#wireGlow)"
          className="wire-tangle-1"
        />
        
        <path
          d="M 0 400 Q 350 340 550 400 Q 750 460 1200 400"
          fill="none"
          stroke="url(#wire4)"
          strokeWidth="2"
          filter="url(#wireGlow)"
          className="wire-tangle-2"
        />
        
        {/* Bottom wave anchor */}
        <path
          d="M 0 650 Q 300 620 600 650 Q 900 680 1200 650"
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

        .wire-1 {
          stroke-dasharray: 2000;
          stroke-dashoffset: 2000;
          animation: wireFlow1 12s linear infinite;
        }

        .wire-2 {
          stroke-dasharray: 2000;
          stroke-dashoffset: 2000;
          animation: wireFlow2 14s linear infinite;
          animation-delay: -2s;
        }

        .wire-3 {
          stroke-dasharray: 2000;
          stroke-dashoffset: 2000;
          animation: wireFlow3 10s linear infinite;
          animation-delay: -1s;
        }

        .wire-4 {
          stroke-dasharray: 2000;
          stroke-dashoffset: 2000;
          animation: wireFlow4 13s linear infinite;
          animation-delay: -3s;
        }

        .wire-5 {
          stroke-dasharray: 2000;
          stroke-dashoffset: 2000;
          animation: wireFlow5 11s linear infinite;
          animation-delay: -4s;
        }

        .wire-tangle-1 {
          stroke-dasharray: 1500;
          stroke-dashoffset: 1500;
          animation: wireFlow1 8s linear infinite;
          animation-delay: -1.5s;
        }

        .wire-tangle-2 {
          stroke-dasharray: 1500;
          stroke-dashoffset: 1500;
          animation: wireFlow2 9s linear infinite;
          animation-delay: -2.5s;
        }

        .bottom-wave {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: bottomWaveFlow 15s linear infinite;
        }

        @keyframes wireFlow1 {
          0% {
            stroke-dashoffset: 2000;
            transform: translateX(0);
          }
          100% {
            stroke-dashoffset: 0;
            transform: translateX(200px);
          }
        }

        @keyframes wireFlow2 {
          0% {
            stroke-dashoffset: 2000;
            transform: translateX(0);
          }
          100% {
            stroke-dashoffset: 0;
            transform: translateX(200px);
          }
        }

        @keyframes wireFlow3 {
          0% {
            stroke-dashoffset: 2000;
            transform: translateX(0);
          }
          100% {
            stroke-dashoffset: 0;
            transform: translateX(200px);
          }
        }

        @keyframes wireFlow4 {
          0% {
            stroke-dashoffset: 2000;
            transform: translateX(0);
          }
          100% {
            stroke-dashoffset: 0;
            transform: translateX(200px);
          }
        }

        @keyframes wireFlow5 {
          0% {
            stroke-dashoffset: 2000;
            transform: translateX(0);
          }
          100% {
            stroke-dashoffset: 0;
            transform: translateX(200px);
          }
        }

        @keyframes bottomWaveFlow {
          0% {
            stroke-dashoffset: 1000;
            transform: translateX(0);
          }
          100% {
            stroke-dashoffset: 0;
            transform: translateX(300px);
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
