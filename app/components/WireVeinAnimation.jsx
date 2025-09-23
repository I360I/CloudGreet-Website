import React from 'react';

/**
 * WIRE/VEIN ANIMATION - Bending around the CTA button
 * Creates organic, wire-like lines that curve and wrap around the "Get Started Free" button
 * Looks like veins or electrical wires flowing and bending
 */
export default function WireVeinAnimation() {
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
        viewBox="0 0 1200 800"
        style={{ width: '100%', height: '100%' }}
        className="wire-vein-svg"
      >
        <defs>
          {/* Glow filter for wire effect */}
          <filter id="wireGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feFlood floodColor="#3B82F6" floodOpacity="0.8" result="floodColor"/>
            <feComposite in="floodColor" in2="coloredBlur" operator="in" result="glowColor"/>
            <feMerge>
              <feMergeNode in="glowColor"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* Blue gradient for wires */}
          <linearGradient id="wireGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0"/>
            <stop offset="20%" stopColor="#3B82F6" stopOpacity="0.8"/>
            <stop offset="50%" stopColor="#3B82F6" stopOpacity="1"/>
            <stop offset="80%" stopColor="#3B82F6" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
          </linearGradient>
        </defs>

        {/* Wire 1 - Curves around top-left of button */}
        <path
          d="M 0 300 Q 200 250 400 280 Q 500 320 600 300 Q 650 280 700 320 Q 750 360 800 340 Q 850 320 1000 340 Q 1100 360 1200 350"
          fill="none"
          stroke="url(#wireGradient)"
          strokeWidth="3"
          filter="url(#wireGlow)"
          className="wire wire-1"
        />

        {/* Wire 2 - Curves around bottom-right of button */}
        <path
          d="M 0 450 Q 150 480 300 460 Q 400 440 500 460 Q 550 480 600 460 Q 650 440 700 460 Q 750 480 800 460 Q 900 440 1000 460 Q 1100 480 1200 470"
          fill="none"
          stroke="url(#wireGradient)"
          strokeWidth="3"
          filter="url(#wireGlow)"
          className="wire wire-2"
        />

        {/* Wire 3 - Main wire that wraps around the button */}
        <path
          d="M 0 380 Q 250 350 400 380 Q 500 400 550 380 Q 600 360 650 380 Q 700 400 750 380 Q 800 360 850 380 Q 900 400 1000 380 Q 1100 360 1200 370"
          fill="none"
          stroke="url(#wireGradient)"
          strokeWidth="4"
          filter="url(#wireGlow)"
          className="wire wire-3"
        />

        {/* Wire 4 - Secondary wire with different curve */}
        <path
          d="M 0 420 Q 200 400 350 420 Q 450 440 500 420 Q 550 400 600 420 Q 650 440 700 420 Q 750 400 800 420 Q 850 440 950 420 Q 1050 400 1200 410"
          fill="none"
          stroke="url(#wireGradient)"
          strokeWidth="2"
          filter="url(#wireGlow)"
          className="wire wire-4"
        />

        {/* Wire 5 - Thin accent wire */}
        <path
          d="M 0 350 Q 180 320 380 350 Q 480 370 530 350 Q 580 330 630 350 Q 680 370 730 350 Q 780 330 830 350 Q 880 370 980 350 Q 1080 330 1200 340"
          fill="none"
          stroke="url(#wireGradient)"
          strokeWidth="2"
          filter="url(#wireGlow)"
          className="wire wire-5"
        />

        {/* Additional vein-like connections */}
        <path
          d="M 300 300 Q 400 320 500 300 Q 600 280 700 300 Q 800 320 900 300"
          fill="none"
          stroke="url(#wireGradient)"
          strokeWidth="1.5"
          filter="url(#wireGlow)"
          className="wire wire-6"
        />

        <path
          d="M 300 480 Q 400 500 500 480 Q 600 460 700 480 Q 800 500 900 480"
          fill="none"
          stroke="url(#wireGradient)"
          strokeWidth="1.5"
          filter="url(#wireGlow)"
          className="wire wire-7"
        />

      </svg>

      <style jsx>{`
        .wire {
          stroke-dasharray: 2000;
          stroke-dashoffset: 2000;
          animation: wireFlow 15s linear infinite;
        }

        .wire-1 {
          animation-delay: 0s;
          animation-duration: 15s;
        }

        .wire-2 {
          animation-delay: -3s;
          animation-duration: 18s;
        }

        .wire-3 {
          animation-delay: -6s;
          animation-duration: 12s;
        }

        .wire-4 {
          animation-delay: -9s;
          animation-duration: 20s;
        }

        .wire-5 {
          animation-delay: -12s;
          animation-duration: 16s;
        }

        .wire-6 {
          animation-delay: -1s;
          animation-duration: 14s;
        }

        .wire-7 {
          animation-delay: -7s;
          animation-duration: 17s;
        }

        @keyframes wireFlow {
          0% {
            stroke-dashoffset: 2000;
            opacity: 0.3;
          }
          10% {
            opacity: 0.8;
          }
          90% {
            opacity: 0.8;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 0.3;
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .wire {
            stroke-width: 2px !important;
          }
          .wire-3 {
            stroke-width: 3px !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .wire {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
    </div>
  );
}
