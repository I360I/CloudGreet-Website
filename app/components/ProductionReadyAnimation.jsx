'use client';

import React from 'react';

/**
 * Production Ready Animation - Clean, subtle, professional
 * Suitable for actual deployment and client presentation
 */
export default function ProductionReadyAnimation() {
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
      {/* Subtle gradient overlay */}
      <div className="gradient-overlay" />
      
      {/* Clean geometric elements */}
      <div className="geometric-container">
        <div className="line line-1" />
        <div className="line line-2" />
        <div className="line line-3" />
        
        {/* Central accent */}
        <div className="center-accent" />
      </div>

      <style jsx>{`
        .gradient-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(ellipse at center, rgba(59, 130, 246, 0.08) 0%, transparent 70%);
          animation: subtlePulse 6s ease-in-out infinite;
        }

        .geometric-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .line {
          position: absolute;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.4), rgba(59, 130, 246, 0.6), rgba(59, 130, 246, 0.4), transparent);
          left: 0;
          right: 0;
          animation: lineFlow 15s linear infinite;
        }

        .line-1 {
          top: 30%;
          animation-delay: 0s;
        }

        .line-2 {
          top: 50%;
          animation-delay: -7s;
        }

        .line-3 {
          top: 70%;
          animation-delay: -14s;
        }

        .center-accent {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 300px;
          height: 300px;
          border: 2px solid rgba(59, 130, 246, 0.3);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          animation: centerRotate 20s linear infinite;
        }

        @keyframes subtlePulse {
          0%, 100% {
            opacity: 0.5;
          }
          50% {
            opacity: 0.8;
          }
        }

        @keyframes lineFlow {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          10% {
            opacity: 0.6;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        @keyframes centerRotate {
          0% {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          100% {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .center-accent {
            width: 200px;
            height: 200px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .gradient-overlay,
          .line,
          .center-accent {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
