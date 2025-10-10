'use client';

import React from 'react';

/**
 * Clean, Working Helix Background Animation
 * Simple, reliable, and visually appealing
 */
export default function CleanHelixBackground() {
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
      {/* Main helix container */}
      <div className="helix-container">
        {/* 5 clean helix strands */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`helix-strand strand-${i + 1}`}
            style={{
              '--strand-color': ['#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B'][i],
              '--strand-delay': `${i * 0.8}s`,
              '--strand-duration': `${12 + i * 2}s`,
            }}
          />
        ))}

        {/* Bottom accent wave */}
        <div className="bottom-wave" />
      </div>

      <style jsx>{`
        .helix-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .helix-strand {
          position: absolute;
          top: 50%;
          left: 0;
          width: 120%;
          height: 3px;
          background: linear-gradient(90deg, 
            transparent 0%, 
            var(--strand-color) 20%, 
            var(--strand-color) 80%, 
            transparent 100%
          );
          border-radius: 50px;
          transform: translateY(-50%);
          filter: drop-shadow(0 0 8px var(--strand-color));
          opacity: 0.8;
          animation: helixMove var(--strand-duration) var(--strand-delay) linear infinite;
        }

        .strand-1 {
          top: 35%;
          animation-name: strand1;
        }
        .strand-2 {
          top: 42%;
          animation-name: strand2;
        }
        .strand-3 {
          top: 49%;
          animation-name: strand3;
        }
        .strand-4 {
          top: 56%;
          animation-name: strand4;
        }
        .strand-5 {
          top: 63%;
          animation-name: strand5;
        }

        .bottom-wave {
          position: absolute;
          bottom: 20%;
          left: 0;
          width: 100%;
          height: 4px;
          background: linear-gradient(90deg, 
            transparent 0%, 
            #3B82F6 30%, 
            #6366F1 50%, 
            #8B5CF6 70%, 
            transparent 100%
          );
          border-radius: 50px;
          filter: drop-shadow(0 0 12px #3B82F6);
          opacity: 0.6;
          animation: bottomWaveMove 10s linear infinite;
        }

        /* Strand animations that create the helix effect */
        @keyframes strand1 {
          0% {
            transform: translateX(-120%) translateY(-50%) scaleY(1) rotate(0deg);
            opacity: 0.3;
          }
          25% {
            transform: translateX(-50%) translateY(-50%) scaleY(1.8) rotate(8deg);
            opacity: 0.9;
          }
          50% {
            transform: translateX(0%) translateY(-50%) scaleY(2.2) rotate(0deg);
            opacity: 1;
          }
          75% {
            transform: translateX(50%) translateY(-50%) scaleY(1.8) rotate(-8deg);
            opacity: 0.9;
          }
          100% {
            transform: translateX(120%) translateY(-50%) scaleY(1) rotate(0deg);
            opacity: 0.3;
          }
        }

        @keyframes strand2 {
          0% {
            transform: translateX(-120%) translateY(-50%) scaleY(1) rotate(0deg);
            opacity: 0.3;
          }
          25% {
            transform: translateX(-50%) translateY(-50%) scaleY(1.6) rotate(-6deg);
            opacity: 0.8;
          }
          50% {
            transform: translateX(0%) translateY(-50%) scaleY(2) rotate(0deg);
            opacity: 1;
          }
          75% {
            transform: translateX(50%) translateY(-50%) scaleY(1.6) rotate(6deg);
            opacity: 0.8;
          }
          100% {
            transform: translateX(120%) translateY(-50%) scaleY(1) rotate(0deg);
            opacity: 0.3;
          }
        }

        @keyframes strand3 {
          0% {
            transform: translateX(-120%) translateY(-50%) scaleY(1) rotate(0deg);
            opacity: 0.4;
          }
          25% {
            transform: translateX(-50%) translateY(-50%) scaleY(1.9) rotate(4deg);
            opacity: 0.9;
          }
          50% {
            transform: translateX(0%) translateY(-50%) scaleY(2.4) rotate(0deg);
            opacity: 1;
          }
          75% {
            transform: translateX(50%) translateY(-50%) scaleY(1.9) rotate(-4deg);
            opacity: 0.9;
          }
          100% {
            transform: translateX(120%) translateY(-50%) scaleY(1) rotate(0deg);
            opacity: 0.4;
          }
        }

        @keyframes strand4 {
          0% {
            transform: translateX(-120%) translateY(-50%) scaleY(1) rotate(0deg);
            opacity: 0.3;
          }
          25% {
            transform: translateX(-50%) translateY(-50%) scaleY(1.7) rotate(-5deg);
            opacity: 0.8;
          }
          50% {
            transform: translateX(0%) translateY(-50%) scaleY(2.1) rotate(0deg);
            opacity: 1;
          }
          75% {
            transform: translateX(50%) translateY(-50%) scaleY(1.7) rotate(5deg);
            opacity: 0.8;
          }
          100% {
            transform: translateX(120%) translateY(-50%) scaleY(1) rotate(0deg);
            opacity: 0.3;
          }
        }

        @keyframes strand5 {
          0% {
            transform: translateX(-120%) translateY(-50%) scaleY(1) rotate(0deg);
            opacity: 0.3;
          }
          25% {
            transform: translateX(-50%) translateY(-50%) scaleY(1.5) rotate(3deg);
            opacity: 0.7;
          }
          50% {
            transform: translateX(0%) translateY(-50%) scaleY(1.8) rotate(0deg);
            opacity: 0.9;
          }
          75% {
            transform: translateX(50%) translateY(-50%) scaleY(1.5) rotate(-3deg);
            opacity: 0.7;
          }
          100% {
            transform: translateX(120%) translateY(-50%) scaleY(1) rotate(0deg);
            opacity: 0.3;
          }
        }

        @keyframes bottomWaveMove {
          0% {
            transform: translateX(-100%) scaleY(1);
            opacity: 0.3;
          }
          50% {
            transform: translateX(0%) scaleY(1.5);
            opacity: 0.6;
          }
          100% {
            transform: translateX(100%) scaleY(1);
            opacity: 0.3;
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .helix-strand {
            height: 2px;
            width: 140%;
          }
          .bottom-wave {
            height: 3px;
          }
        }
      `}</style>
    </div>
  );
}
