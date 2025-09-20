import React, { useState, useEffect } from 'react';

/**
 * CSS-based helix wave animation that matches the Three.js specification
 * This provides a reliable fallback that works in all environments
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
      {/* Main helix strands - 5 curved lines that form an oval around the CTA */}
      <div className="helix-container">
        {/* Strand 1 - Top */}
        <div className="helix-strand strand-1" style={{
          '--color': '#6A5BFF',
          '--delay': '0s',
          '--duration': '12s',
          '--amplitude': '60px',
          '--offset': '0px'
        }} />
        
        {/* Strand 2 */}
        <div className="helix-strand strand-2" style={{
          '--color': '#7E66FF',
          '--delay': '2s',
          '--duration': '14s',
          '--amplitude': '70px',
          '--offset': '20px'
        }} />
        
        {/* Strand 3 - Center */}
        <div className="helix-strand strand-3" style={{
          '--color': '#5C8BFF',
          '--delay': '4s',
          '--duration': '13s',
          '--amplitude': '80px',
          '--offset': '0px'
        }} />
        
        {/* Strand 4 */}
        <div className="helix-strand strand-4" style={{
          '--color': '#8A7BFF',
          '--delay': '6s',
          '--duration': '15s',
          '--amplitude': '65px',
          '--offset': '-20px'
        }} />
        
        {/* Strand 5 - Bottom */}
        <div className="helix-strand strand-5" style={{
          '--color': '#4C7BFF',
          '--delay': '8s',
          '--duration': '11s',
          '--amplitude': '55px',
          '--offset': '10px'
        }} />
      </div>

      {/* Bottom wave layer */}
      <div className="bottom-wave" />

      <style jsx>{`
        .helix-container {
          position: absolute;
          top: 50%;
          left: 0;
          width: 100%;
          height: 400px;
          transform: translateY(-50%);
        }

        .helix-strand {
          position: absolute;
          top: 50%;
          left: -10%;
          width: 120%;
          height: 3px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            var(--color) 20%,
            var(--color) 80%,
            transparent 100%
          );
          border-radius: 50px;
          transform: translateY(calc(-50% + var(--offset)));
          animation: helixFlow var(--duration) var(--delay) linear infinite;
          filter: drop-shadow(0 0 8px var(--color)) blur(0.5px);
          opacity: 0.65;
        }

        .strand-1 {
          animation-name: helixFlow1;
        }

        .strand-2 {
          animation-name: helixFlow2;
        }

        .strand-3 {
          animation-name: helixFlow3;
        }

        .strand-4 {
          animation-name: helixFlow4;
        }

        .strand-5 {
          animation-name: helixFlow5;
        }

        @keyframes helixFlow1 {
          0% {
            transform: translateX(-100%) translateY(calc(-50% + var(--offset))) 
                       rotate(0deg) scaleY(1);
            opacity: 0.3;
          }
          25% {
            transform: translateX(-50%) translateY(calc(-50% + var(--offset) - 40px)) 
                       rotate(2deg) scaleY(1.2);
            opacity: 0.7;
          }
          50% {
            transform: translateX(0%) translateY(calc(-50% + var(--offset) - 60px)) 
                       rotate(4deg) scaleY(1.4);
            opacity: 0.8;
          }
          75% {
            transform: translateX(50%) translateY(calc(-50% + var(--offset) - 40px)) 
                       rotate(2deg) scaleY(1.2);
            opacity: 0.7;
          }
          100% {
            transform: translateX(100%) translateY(calc(-50% + var(--offset))) 
                       rotate(0deg) scaleY(1);
            opacity: 0.3;
          }
        }

        @keyframes helixFlow2 {
          0% {
            transform: translateX(-100%) translateY(calc(-50% + var(--offset))) 
                       rotate(0deg) scaleY(1);
            opacity: 0.3;
          }
          25% {
            transform: translateX(-50%) translateY(calc(-50% + var(--offset) - 30px)) 
                       rotate(-1deg) scaleY(1.1);
            opacity: 0.6;
          }
          50% {
            transform: translateX(0%) translateY(calc(-50% + var(--offset) - 50px)) 
                       rotate(-3deg) scaleY(1.3);
            opacity: 0.8;
          }
          75% {
            transform: translateX(50%) translateY(calc(-50% + var(--offset) - 30px)) 
                       rotate(-1deg) scaleY(1.1);
            opacity: 0.6;
          }
          100% {
            transform: translateX(100%) translateY(calc(-50% + var(--offset))) 
                       rotate(0deg) scaleY(1);
            opacity: 0.3;
          }
        }

        @keyframes helixFlow3 {
          0% {
            transform: translateX(-100%) translateY(calc(-50% + var(--offset))) 
                       rotate(0deg) scaleY(1);
            opacity: 0.3;
          }
          25% {
            transform: translateX(-50%) translateY(calc(-50% + var(--offset) - 50px)) 
                       rotate(3deg) scaleY(1.3);
            opacity: 0.8;
          }
          50% {
            transform: translateX(0%) translateY(calc(-50% + var(--offset) - 70px)) 
                       rotate(5deg) scaleY(1.5);
            opacity: 0.9;
          }
          75% {
            transform: translateX(50%) translateY(calc(-50% + var(--offset) - 50px)) 
                       rotate(3deg) scaleY(1.3);
            opacity: 0.8;
          }
          100% {
            transform: translateX(100%) translateY(calc(-50% + var(--offset))) 
                       rotate(0deg) scaleY(1);
            opacity: 0.3;
          }
        }

        @keyframes helixFlow4 {
          0% {
            transform: translateX(-100%) translateY(calc(-50% + var(--offset))) 
                       rotate(0deg) scaleY(1);
            opacity: 0.3;
          }
          25% {
            transform: translateX(-50%) translateY(calc(-50% + var(--offset) + 30px)) 
                       rotate(-2deg) scaleY(1.1);
            opacity: 0.6;
          }
          50% {
            transform: translateX(0%) translateY(calc(-50% + var(--offset) + 50px)) 
                       rotate(-4deg) scaleY(1.3);
            opacity: 0.8;
          }
          75% {
            transform: translateX(50%) translateY(calc(-50% + var(--offset) + 30px)) 
                       rotate(-2deg) scaleY(1.1);
            opacity: 0.6;
          }
          100% {
            transform: translateX(100%) translateY(calc(-50% + var(--offset))) 
                       rotate(0deg) scaleY(1);
            opacity: 0.3;
          }
        }

        @keyframes helixFlow5 {
          0% {
            transform: translateX(-100%) translateY(calc(-50% + var(--offset))) 
                       rotate(0deg) scaleY(1);
            opacity: 0.3;
          }
          25% {
            transform: translateX(-50%) translateY(calc(-50% + var(--offset) + 40px)) 
                       rotate(1deg) scaleY(1.2);
            opacity: 0.7;
          }
          50% {
            transform: translateX(0%) translateY(calc(-50% + var(--offset) + 60px)) 
                       rotate(2deg) scaleY(1.4);
            opacity: 0.8;
          }
          75% {
            transform: translateX(50%) translateY(calc(-50% + var(--offset) + 40px)) 
                       rotate(1deg) scaleY(1.2);
            opacity: 0.7;
          }
          100% {
            transform: translateX(100%) translateY(calc(-50% + var(--offset))) 
                       rotate(0deg) scaleY(1);
            opacity: 0.3;
          }
        }

        .bottom-wave {
          position: absolute;
          bottom: 20%;
          left: -10%;
          width: 120%;
          height: 4px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            #3457F5 20%,
            #3457F5 80%,
            transparent 100%
          );
          border-radius: 50px;
          animation: bottomWaveFlow 18s linear infinite;
          filter: drop-shadow(0 0 6px #3457F5);
          opacity: 0.3;
        }

        @keyframes bottomWaveFlow {
          0% {
            transform: translateX(-100%) translateY(0px) rotate(0deg);
            opacity: 0.2;
          }
          25% {
            transform: translateX(-50%) translateY(-15px) rotate(1deg);
            opacity: 0.4;
          }
          50% {
            transform: translateX(0%) translateY(-25px) rotate(2deg);
            opacity: 0.35;
          }
          75% {
            transform: translateX(50%) translateY(-15px) rotate(1deg);
            opacity: 0.4;
          }
          100% {
            transform: translateX(100%) translateY(0px) rotate(0deg);
            opacity: 0.2;
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .helix-strand {
            height: 2px;
            opacity: 0.5;
          }
          
          .bottom-wave {
            height: 3px;
            opacity: 0.25;
          }
        }
      `}</style>
    </div>
  );
}