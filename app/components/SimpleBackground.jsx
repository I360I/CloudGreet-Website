"use client";

import React from 'react';

/**
 * Simple, clean background that definitely works
 * Just subtle gradients and maybe some simple CSS animations
 */
export default function SimpleBackground() {
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
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 50%, rgba(16, 185, 129, 0.1) 100%)',
      }}
    >
      {/* Simple floating particles */}
      <div className="particle-container">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className={`particle particle-${i + 1}`}
            style={{
              '--delay': `${i * 0.5}s`,
              '--duration': `${10 + i}s`,
              '--size': `${2 + Math.random() * 4}px`,
              '--left': `${Math.random() * 100}%`,
              '--top': `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        .particle-container {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .particle {
          position: absolute;
          width: var(--size);
          height: var(--size);
          background: rgba(59, 130, 246, 0.3);
          border-radius: 50%;
          left: var(--left);
          top: var(--top);
          animation: float var(--duration) var(--delay) ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
            opacity: 0.3;
          }
          25% {
            transform: translateY(-20px) translateX(10px);
            opacity: 0.6;
          }
          50% {
            transform: translateY(-10px) translateX(-10px);
            opacity: 0.8;
          }
          75% {
            transform: translateY(-15px) translateX(5px);
            opacity: 0.4;
          }
        }

        .particle:nth-child(odd) {
          background: rgba(147, 51, 234, 0.3);
        }

        .particle:nth-child(3n) {
          background: rgba(16, 185, 129, 0.3);
        }
      `}</style>
    </div>
  );
}

