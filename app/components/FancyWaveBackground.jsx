import React, { useState, useEffect } from 'react';

/**
 * Lightning-like tangled wires that wrap around the CTA button
 * Creates genuinely curved, intertwined lines with no visible ends
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
      {/* SVG container for proper curved paths */}
      <svg 
        className="helix-svg"
        viewBox="0 0 1000 600" 
        preserveAspectRatio="xMidYMid slice"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      >
        {/* Wire 1 - Top approach, curves around button */}
        <path
          className="helix-wire wire-1"
          d="M -100,150 Q 200,100 350,200 Q 500,300 650,200 Q 800,100 1100,150"
          stroke="#6A5BFF"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          filter="url(#glow)"
          style={{
            '--delay': '0s',
            '--duration': '8s'
          }}
        />

        {/* Wire 2 - Upper approach, intersects with wire 1 */}
        <path
          className="helix-wire wire-2"
          d="M -100,200 Q 250,150 400,250 Q 550,350 700,250 Q 850,150 1100,200"
          stroke="#7E66FF"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          filter="url(#glow)"
          style={{
            '--delay': '1s',
            '--duration': '9s'
          }}
        />

        {/* Wire 3 - Center helix that wraps tightly around button */}
        <path
          className="helix-wire wire-3"
          d="M 200,300 Q 300,250 500,300 Q 700,350 500,300 Q 300,350 200,300 Q 300,250 500,300 Q 700,350 800,300"
          stroke="#5C8BFF"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          filter="url(#glow)"
          style={{
            '--delay': '2s',
            '--duration': '10s'
          }}
        />

        {/* Wire 4 - Lower approach, curves around button */}
        <path
          className="helix-wire wire-4"
          d="M -100,400 Q 200,450 350,350 Q 500,250 650,350 Q 800,450 1100,400"
          stroke="#8A7BFF"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          filter="url(#glow)"
          style={{
            '--delay': '3s',
            '--duration': '8.5s'
          }}
        />

        {/* Wire 5 - Bottom approach */}
        <path
          className="helix-wire wire-5"
          d="M -100,450 Q 250,500 400,400 Q 550,300 700,400 Q 850,500 1100,450"
          stroke="#4C7BFF"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          filter="url(#glow)"
          style={{
            '--delay': '4s',
            '--duration': '9.5s'
          }}
        />

        {/* Bottom wave */}
        <path
          className="bottom-wave"
          d="M -100,500 Q 500,450 1100,500"
          stroke="#3457F5"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          filter="url(#glow)"
          opacity="0.4"
        />

        {/* Glow filter definition */}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
      </svg>

      <style jsx>{`
        .helix-svg {
          animation: svgFlow 12s linear infinite;
        }

        .helix-wire {
          stroke-dasharray: 20 5;
          stroke-dashoffset: 0;
          animation: wireFlow var(--duration) var(--delay) linear infinite;
          opacity: 0.8;
        }

        .wire-1 {
          animation-name: wire1Flow;
        }

        .wire-2 {
          animation-name: wire2Flow;
        }

        .wire-3 {
          animation-name: wire3Flow;
        }

        .wire-4 {
          animation-name: wire4Flow;
        }

        .wire-5 {
          animation-name: wire5Flow;
        }

        .bottom-wave {
          stroke-dasharray: 30 10;
          stroke-dashoffset: 0;
          animation: bottomWaveFlow 15s linear infinite;
        }

        /* Wire 1: Flows along the curved path */
        @keyframes wire1Flow {
          0% {
            stroke-dashoffset: 0;
            opacity: 0.3;
          }
          25% {
            stroke-dashoffset: -50;
            opacity: 0.6;
          }
          50% {
            stroke-dashoffset: -100;
            opacity: 0.8;
          }
          75% {
            stroke-dashoffset: -150;
            opacity: 0.6;
          }
          100% {
            stroke-dashoffset: -200;
            opacity: 0.3;
          }
        }

        /* Wire 2: Flows with different timing */
        @keyframes wire2Flow {
          0% {
            stroke-dashoffset: 0;
            opacity: 0.3;
          }
          25% {
            stroke-dashoffset: -60;
            opacity: 0.5;
          }
          50% {
            stroke-dashoffset: -120;
            opacity: 0.7;
          }
          75% {
            stroke-dashoffset: -180;
            opacity: 0.5;
          }
          100% {
            stroke-dashoffset: -240;
            opacity: 0.3;
          }
        }

        /* Wire 3: Center helix with tighter curves */
        @keyframes wire3Flow {
          0% {
            stroke-dashoffset: 0;
            opacity: 0.4;
          }
          25% {
            stroke-dashoffset: -40;
            opacity: 0.7;
          }
          50% {
            stroke-dashoffset: -80;
            opacity: 0.9;
          }
          75% {
            stroke-dashoffset: -120;
            opacity: 0.7;
          }
          100% {
            stroke-dashoffset: -160;
            opacity: 0.4;
          }
        }

        /* Wire 4: Lower approach */
        @keyframes wire4Flow {
          0% {
            stroke-dashoffset: 0;
            opacity: 0.3;
          }
          25% {
            stroke-dashoffset: -45;
            opacity: 0.5;
          }
          50% {
            stroke-dashoffset: -90;
            opacity: 0.7;
          }
          75% {
            stroke-dashoffset: -135;
            opacity: 0.5;
          }
          100% {
            stroke-dashoffset: -180;
            opacity: 0.3;
          }
        }

        /* Wire 5: Bottom approach */
        @keyframes wire5Flow {
          0% {
            stroke-dashoffset: 0;
            opacity: 0.3;
          }
          25% {
            stroke-dashoffset: -55;
            opacity: 0.6;
          }
          50% {
            stroke-dashoffset: -110;
            opacity: 0.8;
          }
          75% {
            stroke-dashoffset: -165;
            opacity: 0.6;
          }
          100% {
            stroke-dashoffset: -220;
            opacity: 0.3;
          }
        }

        /* Bottom wave animation */
        @keyframes bottomWaveFlow {
          0% {
            stroke-dashoffset: 0;
            opacity: 0.2;
          }
          25% {
            stroke-dashoffset: -75;
            opacity: 0.4;
          }
          50% {
            stroke-dashoffset: -150;
            opacity: 0.35;
          }
          75% {
            stroke-dashoffset: -225;
            opacity: 0.4;
          }
          100% {
            stroke-dashoffset: -300;
            opacity: 0.2;
          }
        }

        /* Overall SVG movement */
        @keyframes svgFlow {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-10%);
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .helix-wire {
            stroke-width: 2;
            opacity: 0.6;
          }
          
          .wire-3 {
            stroke-width: 3;
          }
          
          .bottom-wave {
            stroke-width: 2;
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  );
}