'use client';

import React from 'react';

/**
 * PROFESSIONAL ANIMATION FOR CLOUDGREET
 * Subtle, elegant, and matches the blue/purple theme
 * Creates movement without being distracting
 */
export default function ProfessionalAnimation() {
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
      {/* Subtle gradient overlay */}
      <div className="gradient-overlay" />
      
      {/* Elegant flowing lines */}
      <div className="flowing-lines">
        <div className="line line-1" />
        <div className="line line-2" />
        <div className="line line-3" />
      </div>
      
      {/* Subtle geometric accents */}
      <div className="geometric-accents">
        <div className="accent accent-1" />
        <div className="accent accent-2" />
        <div className="accent accent-3" />
      </div>
      
      {/* Central glow effect */}
      <div className="center-glow" />

      <style jsx>{`
        .gradient-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(ellipse at center, rgba(59, 130, 246, 0.08) 0%, transparent 70%);
          animation: subtlePulse 8s ease-in-out infinite;
        }

        .flowing-lines {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .line {
          position: absolute;
          height: 2px;
          background: linear-gradient(90deg, 
            transparent 0%, 
            rgba(59, 130, 246, 0.4) 20%, 
            rgba(147, 51, 234, 0.5) 50%, 
            rgba(59, 130, 246, 0.4) 80%, 
            transparent 100%
          );
          border-radius: 2px;
          animation: lineFlow 20s linear infinite;
        }

        .line-1 {
          top: 25%;
          animation-delay: 0s;
          animation-duration: 20s;
        }

        .line-2 {
          top: 50%;
          animation-delay: -7s;
          animation-duration: 25s;
        }

        .line-3 {
          top: 75%;
          animation-delay: -14s;
          animation-duration: 30s;
        }

        .geometric-accents {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .accent {
          position: absolute;
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 50%;
          animation: accentFloat 15s ease-in-out infinite;
        }

        .accent-1 {
          top: 20%;
          left: 15%;
          width: 120px;
          height: 120px;
          animation-delay: 0s;
        }

        .accent-2 {
          top: 60%;
          right: 20%;
          width: 80px;
          height: 80px;
          animation-delay: -5s;
        }

        .accent-3 {
          top: 35%;
          right: 10%;
          width: 60px;
          height: 60px;
          animation-delay: -10s;
        }

        .center-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, 
            rgba(59, 130, 246, 0.1) 0%,
            rgba(147, 51, 234, 0.08) 30%,
            transparent 70%
          );
          border-radius: 50%;
          transform: translate(-50%, -50%);
          animation: centerPulse 12s ease-in-out infinite;
        }

        @keyframes subtlePulse {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
        }

        @keyframes lineFlow {
          0% {
            transform: translateX(-100%);
            opacity: 0.2;
          }
          10% {
            opacity: 0.5;
          }
          90% {
            opacity: 0.5;
          }
          100% {
            transform: translateX(100%);
            opacity: 0.2;
          }
        }

        @keyframes accentFloat {
          0%, 100% {
            transform: translateY(0px) scale(1);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-20px) scale(1.1);
            opacity: 0.6;
          }
        }

        @keyframes centerPulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.4;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0.7;
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .line {
            height: 1px;
          }
          
          .accent {
            width: 60px !important;
            height: 60px !important;
          }
          
          .center-glow {
            width: 200px;
            height: 200px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .gradient-overlay,
          .line,
          .accent,
          .center-glow {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
    </div>
  );
}