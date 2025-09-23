"use client";

import React from 'react';

/**
 * Reliable CSS-based helix animation that definitely works
 * Features 5 curved strands that wrap around the CTA button area
 * with smooth animations and professional glow effects
 */
export default function ReliableHelixAnimation() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '60vh',
        zIndex: 1,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <svg
        className="helix-svg"
        viewBox="-200 0 1800 600"
        preserveAspectRatio="xMidYMid slice"
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          {/* Glow filter */}
          <filter id="helixGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feFlood floodColor="#3B82F6" floodOpacity="0.8" result="floodColor"/>
            <feComposite in="floodColor" in2="coloredBlur" operator="in" result="glowColor"/>
            <feMerge>
              <feMergeNode in="glowColor"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* Gradients for each strand */}
          <linearGradient id="strand1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0"/>
            <stop offset="20%" stopColor="#3B82F6" stopOpacity="0.8"/>
            <stop offset="50%" stopColor="#3B82F6" stopOpacity="1"/>
            <stop offset="80%" stopColor="#3B82F6" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
          </linearGradient>
          
          <linearGradient id="strand2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0"/>
            <stop offset="20%" stopColor="#6366F1" stopOpacity="0.7"/>
            <stop offset="50%" stopColor="#6366F1" stopOpacity="0.9"/>
            <stop offset="80%" stopColor="#6366F1" stopOpacity="0.7"/>
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0"/>
          </linearGradient>
          
          <linearGradient id="strand3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0"/>
            <stop offset="20%" stopColor="#8B5CF6" stopOpacity="0.6"/>
            <stop offset="50%" stopColor="#8B5CF6" stopOpacity="1"/>
            <stop offset="80%" stopColor="#8B5CF6" stopOpacity="0.6"/>
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0"/>
          </linearGradient>
          
          <linearGradient id="strand4" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EC4899" stopOpacity="0"/>
            <stop offset="20%" stopColor="#EC4899" stopOpacity="0.5"/>
            <stop offset="50%" stopColor="#EC4899" stopOpacity="0.8"/>
            <stop offset="80%" stopColor="#EC4899" stopOpacity="0.5"/>
            <stop offset="100%" stopColor="#EC4899" stopOpacity="0"/>
          </linearGradient>
          
          <linearGradient id="strand5" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0"/>
            <stop offset="20%" stopColor="#F59E0B" stopOpacity="0.4"/>
            <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.7"/>
            <stop offset="80%" stopColor="#F59E0B" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0"/>
          </linearGradient>

          {/* Bottom wave gradient */}
          <linearGradient id="bottomWave" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3457F5" stopOpacity="0"/>
            <stop offset="30%" stopColor="#3457F5" stopOpacity="0.3"/>
            <stop offset="70%" stopColor="#3457F5" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#3457F5" stopOpacity="0"/>
          </linearGradient>
        </defs>

        {/* Helix Strands - Oval paths that wrap around the CTA button */}
        <path
          d="M -100 200 Q 200 150 600 200 Q 1000 250 1400 200 Q 1000 150 600 200 Q 200 250 -100 200"
          fill="none"
          stroke="url(#strand1)"
          strokeWidth="3"
          filter="url(#helixGlow)"
          className="helix-strand strand-1"
        />
        
        <path
          d="M -100 230 Q 200 180 600 230 Q 1000 280 1400 230 Q 1000 180 600 230 Q 200 280 -100 230"
          fill="none"
          stroke="url(#strand2)"
          strokeWidth="2.5"
          filter="url(#helixGlow)"
          className="helix-strand strand-2"
        />
        
        <path
          d="M -100 260 Q 200 210 600 260 Q 1000 310 1400 260 Q 1000 210 600 260 Q 200 310 -100 260"
          fill="none"
          stroke="url(#strand3)"
          strokeWidth="3.5"
          filter="url(#helixGlow)"
          className="helix-strand strand-3"
        />
        
        <path
          d="M -100 290 Q 200 240 600 290 Q 1000 340 1400 290 Q 1000 240 600 290 Q 200 340 -100 290"
          fill="none"
          stroke="url(#strand4)"
          strokeWidth="2.8"
          filter="url(#helixGlow)"
          className="helix-strand strand-4"
        />
        
        <path
          d="M -100 320 Q 200 270 600 320 Q 1000 370 1400 320 Q 1000 270 600 320 Q 200 370 -100 320"
          fill="none"
          stroke="url(#strand5)"
          strokeWidth="2.2"
          filter="url(#helixGlow)"
          className="helix-strand strand-5"
        />

        {/* Bottom wave */}
        <path
          d="M -200 500 Q 300 480 800 500 Q 1300 520 1800 500"
          fill="none"
          stroke="url(#bottomWave)"
          strokeWidth="6"
          filter="url(#helixGlow)"
          className="bottom-wave"
        />
      </svg>

      <style jsx>{`
        .helix-strand {
          stroke-dasharray: 2000;
          stroke-dashoffset: 2000;
          animation: helixFlow 12s linear infinite;
          will-change: stroke-dashoffset, transform;
        }

        .strand-1 {
          animation-delay: 0s;
          animation-duration: 12s;
        }

        .strand-2 {
          animation-delay: 1s;
          animation-duration: 14s;
        }

        .strand-3 {
          animation-delay: 2s;
          animation-duration: 16s;
        }

        .strand-4 {
          animation-delay: 3s;
          animation-duration: 13s;
        }

        .strand-5 {
          animation-delay: 4s;
          animation-duration: 15s;
        }

        .bottom-wave {
          stroke-dasharray: 1500;
          stroke-dashoffset: 1500;
          animation: bottomWaveFlow 18s linear infinite;
          will-change: stroke-dashoffset, transform;
        }

        @keyframes helixFlow {
          0% {
            stroke-dashoffset: 2000;
            transform: translateX(0) rotate(0deg);
          }
          50% {
            stroke-dashoffset: 1000;
            transform: translateX(-200px) rotate(180deg);
          }
          100% {
            stroke-dashoffset: 0;
            transform: translateX(-400px) rotate(360deg);
          }
        }

        @keyframes bottomWaveFlow {
          0% {
            stroke-dashoffset: 1500;
            transform: translateX(0);
          }
          100% {
            stroke-dashoffset: 0;
            transform: translateX(-1800px);
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .helix-strand {
            stroke-width: 2px;
          }
          .strand-4, .strand-5 {
            display: none; /* Hide some strands on mobile for performance */
          }
          .bottom-wave {
            stroke-width: 4px;
          }
        }
      `}</style>
    </div>
  );
}
