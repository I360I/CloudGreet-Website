import React, { useState, useEffect } from 'react';

/**
 * CSS-based helix animation that wraps around the CTA button
 * Creates curved strands that lead the eye to the "Get Started Free" button
 */
export default function FancyWaveBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
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
          background: 'linear-gradient(45deg, rgba(106, 91, 255, 0.1), rgba(126, 102, 255, 0.1))',
        }}
      />
    );
  }

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
      {/* Helix strands that wrap around the CTA button area */}
      <div className="helix-container">
        {/* Strand 1 - Approaches from top-left, curves around button */}
        <div className="helix-strand strand-1" style={{
          '--color': '#6A5BFF',
          '--delay': '0s',
          '--duration': '8s'
        }} />
        
        {/* Strand 2 - Approaches from top-right, curves around button */}
        <div className="helix-strand strand-2" style={{
          '--color': '#7E66FF',
          '--delay': '1.5s',
          '--duration': '9s'
        }} />
        
        {/* Strand 3 - Center helix that wraps tightly around button */}
        <div className="helix-strand strand-3" style={{
          '--color': '#5C8BFF',
          '--delay': '3s',
          '--duration': '10s'
        }} />
        
        {/* Strand 4 - Approaches from bottom-left, curves around button */}
        <div className="helix-strand strand-4" style={{
          '--color': '#8A7BFF',
          '--delay': '4.5s',
          '--duration': '8.5s'
        }} />
        
        {/* Strand 5 - Approaches from bottom-right, curves around button */}
        <div className="helix-strand strand-5" style={{
          '--color': '#4C7BFF',
          '--delay': '6s',
          '--duration': '9.5s'
        }} />
      </div>

      {/* Bottom wave layer */}
      <div className="bottom-wave" />

      <style jsx>{`
        .helix-container {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 100%;
          transform: translate(-50%, -50%);
        }

        .helix-strand {
          position: absolute;
          width: 300px;
          height: 3px;
          border-radius: 50px;
          filter: drop-shadow(0 0 8px var(--color));
          opacity: 0.7;
          animation: helixWrap var(--duration) var(--delay) linear infinite;
        }

        /* Strand 1: Top-left approach, curves around button from above */
        .strand-1 {
          background: linear-gradient(45deg, transparent, var(--color), var(--color), transparent);
          top: 15%;
          left: 10%;
          transform-origin: center;
          animation-name: strand1Wrap;
        }

        /* Strand 2: Top-right approach, curves around button from above */
        .strand-2 {
          background: linear-gradient(-45deg, transparent, var(--color), var(--color), transparent);
          top: 20%;
          right: 10%;
          transform-origin: center;
          animation-name: strand2Wrap;
        }

        /* Strand 3: Center helix that wraps tightly around the button */
        .strand-3 {
          background: linear-gradient(0deg, transparent, var(--color), var(--color), transparent);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 250px;
          height: 4px;
          animation-name: strand3Wrap;
          opacity: 0.8;
        }

        /* Strand 4: Bottom-left approach, curves around button from below */
        .strand-4 {
          background: linear-gradient(45deg, transparent, var(--color), var(--color), transparent);
          bottom: 20%;
          left: 15%;
          transform-origin: center;
          animation-name: strand4Wrap;
        }

        /* Strand 5: Bottom-right approach, curves around button from below */
        .strand-5 {
          background: linear-gradient(-45deg, transparent, var(--color), var(--color), transparent);
          bottom: 15%;
          right: 15%;
          transform-origin: center;
          animation-name: strand5Wrap;
        }

        /* Strand 1: Approaches from top-left, curves around button */
        @keyframes strand1Wrap {
          0% {
            transform: translateX(-200px) translateY(0px) rotate(-30deg) scaleX(0.5);
            opacity: 0.3;
          }
          25% {
            transform: translateX(-50px) translateY(-20px) rotate(-15deg) scaleX(0.8);
            opacity: 0.6;
          }
          50% {
            transform: translateX(0px) translateY(-40px) rotate(0deg) scaleX(1.2);
            opacity: 0.9;
          }
          75% {
            transform: translateX(50px) translateY(-20px) rotate(15deg) scaleX(0.8);
            opacity: 0.6;
          }
          100% {
            transform: translateX(200px) translateY(0px) rotate(30deg) scaleX(0.5);
            opacity: 0.3;
          }
        }

        /* Strand 2: Approaches from top-right, curves around button */
        @keyframes strand2Wrap {
          0% {
            transform: translateX(200px) translateY(0px) rotate(30deg) scaleX(0.5);
            opacity: 0.3;
          }
          25% {
            transform: translateX(50px) translateY(-20px) rotate(15deg) scaleX(0.8);
            opacity: 0.6;
          }
          50% {
            transform: translateX(0px) translateY(-40px) rotate(0deg) scaleX(1.2);
            opacity: 0.9;
          }
          75% {
            transform: translateX(-50px) translateY(-20px) rotate(-15deg) scaleX(0.8);
            opacity: 0.6;
          }
          100% {
            transform: translateX(-200px) translateY(0px) rotate(-30deg) scaleX(0.5);
            opacity: 0.3;
          }
        }

        /* Strand 3: Center helix that wraps tightly around the button */
        @keyframes strand3Wrap {
          0% {
            transform: translate(-50%, -50%) rotate(0deg) scaleX(0.3);
            opacity: 0.4;
          }
          25% {
            transform: translate(-50%, -50%) rotate(90deg) scaleX(0.8);
            opacity: 0.7;
          }
          50% {
            transform: translate(-50%, -50%) rotate(180deg) scaleX(1.2);
            opacity: 0.9;
          }
          75% {
            transform: translate(-50%, -50%) rotate(270deg) scaleX(0.8);
            opacity: 0.7;
          }
          100% {
            transform: translate(-50%, -50%) rotate(360deg) scaleX(0.3);
            opacity: 0.4;
          }
        }

        /* Strand 4: Approaches from bottom-left, curves around button */
        @keyframes strand4Wrap {
          0% {
            transform: translateX(-200px) translateY(0px) rotate(30deg) scaleX(0.5);
            opacity: 0.3;
          }
          25% {
            transform: translateX(-50px) translateY(20px) rotate(15deg) scaleX(0.8);
            opacity: 0.6;
          }
          50% {
            transform: translateX(0px) translateY(40px) rotate(0deg) scaleX(1.2);
            opacity: 0.9;
          }
          75% {
            transform: translateX(50px) translateY(20px) rotate(-15deg) scaleX(0.8);
            opacity: 0.6;
          }
          100% {
            transform: translateX(200px) translateY(0px) rotate(-30deg) scaleX(0.5);
            opacity: 0.3;
          }
        }

        /* Strand 5: Approaches from bottom-right, curves around button */
        @keyframes strand5Wrap {
          0% {
            transform: translateX(200px) translateY(0px) rotate(-30deg) scaleX(0.5);
            opacity: 0.3;
          }
          25% {
            transform: translateX(50px) translateY(20px) rotate(-15deg) scaleX(0.8);
            opacity: 0.6;
          }
          50% {
            transform: translateX(0px) translateY(40px) rotate(0deg) scaleX(1.2);
            opacity: 0.9;
          }
          75% {
            transform: translateX(-50px) translateY(20px) rotate(15deg) scaleX(0.8);
            opacity: 0.6;
          }
          100% {
            transform: translateX(-200px) translateY(0px) rotate(30deg) scaleX(0.5);
            opacity: 0.3;
          }
        }

        .bottom-wave {
          position: absolute;
          bottom: 15%;
          left: 50%;
          transform: translateX(-50%);
          width: 400px;
          height: 3px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            #3457F5 20%,
            #3457F5 80%,
            transparent 100%
          );
          border-radius: 50px;
          animation: bottomWaveFlow 12s linear infinite;
          filter: drop-shadow(0 0 6px #3457F5);
          opacity: 0.4;
        }

        @keyframes bottomWaveFlow {
          0% {
            transform: translateX(-50%) translateY(0px) rotate(0deg) scaleX(0.8);
            opacity: 0.3;
          }
          25% {
            transform: translateX(-50%) translateY(-10px) rotate(1deg) scaleX(1.0);
            opacity: 0.5;
          }
          50% {
            transform: translateX(-50%) translateY(-15px) rotate(0deg) scaleX(1.2);
            opacity: 0.4;
          }
          75% {
            transform: translateX(-50%) translateY(-10px) rotate(-1deg) scaleX(1.0);
            opacity: 0.5;
          }
          100% {
            transform: translateX(-50%) translateY(0px) rotate(0deg) scaleX(0.8);
            opacity: 0.3;
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .helix-strand {
            height: 2px;
            opacity: 0.5;
            width: 200px;
          }
          
          .strand-3 {
            width: 180px;
          }
          
          .bottom-wave {
            width: 300px;
            height: 2px;
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  );
}