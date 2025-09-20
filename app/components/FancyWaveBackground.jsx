import React, { useState, useEffect } from 'react';

/**
 * Lightning-like tangled wires using CSS with proper curves
 * Creates genuinely bent, tangled lines that wrap around the CTA button
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
      {/* Tangled wire container */}
      <div className="tangled-wires">
        {/* Wire 1 - Curved and bent */}
        <div className="wire wire-1" />
        
        {/* Wire 2 - Different curve pattern */}
        <div className="wire wire-2" />
        
        {/* Wire 3 - Center wire that wraps around button */}
        <div className="wire wire-3" />
        
        {/* Wire 4 - Lower curved wire */}
        <div className="wire wire-4" />
        
        {/* Wire 5 - Bottom wire */}
        <div className="wire wire-5" />
      </div>

      <style jsx>{`
        .tangled-wires {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .wire {
          position: absolute;
          height: 4px;
          border-radius: 50px;
          filter: drop-shadow(0 0 8px currentColor);
          opacity: 0.8;
          animation: wireFlow 12s linear infinite;
        }

        /* Wire 1 - Top curved wire */
        .wire-1 {
          background: linear-gradient(45deg, 
            transparent 0%, 
            #6A5BFF 20%, 
            #6A5BFF 80%, 
            transparent 100%
          );
          top: 25%;
          left: -20%;
          width: 140%;
          transform: rotate(-15deg);
          animation: wire1Flow 10s linear infinite;
          color: #6A5BFF;
        }

        /* Wire 2 - Upper middle wire */
        .wire-2 {
          background: linear-gradient(-30deg, 
            transparent 0%, 
            #7E66FF 15%, 
            #7E66FF 85%, 
            transparent 100%
          );
          top: 35%;
          left: -15%;
          width: 130%;
          transform: rotate(10deg);
          animation: wire2Flow 11s linear infinite;
          color: #7E66FF;
        }

        /* Wire 3 - Center wire that wraps around button */
        .wire-3 {
          background: linear-gradient(0deg, 
            transparent 0%, 
            #5C8BFF 25%, 
            #5C8BFF 75%, 
            transparent 100%
          );
          top: 50%;
          left: -10%;
          width: 120%;
          height: 5px;
          transform: rotate(5deg);
          animation: wire3Flow 13s linear infinite;
          color: #5C8BFF;
          opacity: 0.9;
        }

        /* Wire 4 - Lower wire */
        .wire-4 {
          background: linear-gradient(25deg, 
            transparent 0%, 
            #8A7BFF 20%, 
            #8A7BFF 80%, 
            transparent 100%
          );
          top: 65%;
          left: -18%;
          width: 136%;
          transform: rotate(-8deg);
          animation: wire4Flow 9s linear infinite;
          color: #8A7BFF;
        }

        /* Wire 5 - Bottom wire */
        .wire-5 {
          background: linear-gradient(-20deg, 
            transparent 0%, 
            #4C7BFF 15%, 
            #4C7BFF 85%, 
            transparent 100%
          );
          top: 75%;
          left: -12%;
          width: 124%;
          transform: rotate(12deg);
          animation: wire5Flow 14s linear infinite;
          color: #4C7BFF;
        }

        /* Wire 1 animation - flows across screen with curves */
        @keyframes wire1Flow {
          0% {
            transform: translateX(-100%) rotate(-15deg) scaleY(1) skewX(5deg);
            opacity: 0.3;
          }
          25% {
            transform: translateX(-50%) rotate(-10deg) scaleY(1.3) skewX(8deg);
            opacity: 0.7;
          }
          50% {
            transform: translateX(0%) rotate(-5deg) scaleY(1.5) skewX(10deg);
            opacity: 0.9;
          }
          75% {
            transform: translateX(50%) rotate(-10deg) scaleY(1.3) skewX(8deg);
            opacity: 0.7;
          }
          100% {
            transform: translateX(100%) rotate(-15deg) scaleY(1) skewX(5deg);
            opacity: 0.3;
          }
        }

        /* Wire 2 animation - different curve pattern */
        @keyframes wire2Flow {
          0% {
            transform: translateX(-100%) rotate(10deg) scaleY(1) skewX(-3deg);
            opacity: 0.3;
          }
          25% {
            transform: translateX(-50%) rotate(5deg) scaleY(1.2) skewX(-6deg);
            opacity: 0.6;
          }
          50% {
            transform: translateX(0%) rotate(0deg) scaleY(1.4) skewX(-8deg);
            opacity: 0.8;
          }
          75% {
            transform: translateX(50%) rotate(5deg) scaleY(1.2) skewX(-6deg);
            opacity: 0.6;
          }
          100% {
            transform: translateX(100%) rotate(10deg) scaleY(1) skewX(-3deg);
            opacity: 0.3;
          }
        }

        /* Wire 3 animation - center wire with dramatic curves around button */
        @keyframes wire3Flow {
          0% {
            transform: translateX(-100%) rotate(5deg) scaleY(1) skewX(2deg);
            opacity: 0.4;
          }
          25% {
            transform: translateX(-50%) rotate(0deg) scaleY(1.4) skewX(4deg);
            opacity: 0.8;
          }
          50% {
            transform: translateX(0%) rotate(-5deg) scaleY(1.6) skewX(6deg);
            opacity: 1.0;
          }
          75% {
            transform: translateX(50%) rotate(0deg) scaleY(1.4) skewX(4deg);
            opacity: 0.8;
          }
          100% {
            transform: translateX(100%) rotate(5deg) scaleY(1) skewX(2deg);
            opacity: 0.4;
          }
        }

        /* Wire 4 animation - lower wire */
        @keyframes wire4Flow {
          0% {
            transform: translateX(-100%) rotate(-8deg) scaleY(1) skewX(-4deg);
            opacity: 0.3;
          }
          25% {
            transform: translateX(-50%) rotate(-5deg) scaleY(1.3) skewX(-7deg);
            opacity: 0.7;
          }
          50% {
            transform: translateX(0%) rotate(-2deg) scaleY(1.5) skewX(-9deg);
            opacity: 0.9;
          }
          75% {
            transform: translateX(50%) rotate(-5deg) scaleY(1.3) skewX(-7deg);
            opacity: 0.7;
          }
          100% {
            transform: translateX(100%) rotate(-8deg) scaleY(1) skewX(-4deg);
            opacity: 0.3;
          }
        }

        /* Wire 5 animation - bottom wire */
        @keyframes wire5Flow {
          0% {
            transform: translateX(-100%) rotate(12deg) scaleY(1) skewX(3deg);
            opacity: 0.3;
          }
          25% {
            transform: translateX(-50%) rotate(8deg) scaleY(1.2) skewX(5deg);
            opacity: 0.6;
          }
          50% {
            transform: translateX(0%) rotate(4deg) scaleY(1.4) skewX(7deg);
            opacity: 0.8;
          }
          75% {
            transform: translateX(50%) rotate(8deg) scaleY(1.2) skewX(5deg);
            opacity: 0.6;
          }
          100% {
            transform: translateX(100%) rotate(12deg) scaleY(1) skewX(3deg);
            opacity: 0.3;
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .wire {
            height: 3px;
            opacity: 0.6;
          }
          
          .wire-3 {
            height: 4px;
          }
        }
      `}</style>
    </div>
  );
}