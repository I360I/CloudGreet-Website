import React, { useState, useEffect } from 'react';

/**
 * CSS-based helix animation with screen-length curved lines
 * All lines span the full screen width with no visible ends
 * No line is ever perfectly straight - always curved and bending
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
      {/* Screen-length curved lines that wrap around the CTA button */}
      <div className="helix-container">
        {/* Line 1 - Top curved line */}
        <div className="helix-line line-1" style={{
          '--color': '#6A5BFF',
          '--delay': '0s',
          '--duration': '12s'
        }} />
        
        {/* Line 2 - Upper-middle curved line */}
        <div className="helix-line line-2" style={{
          '--color': '#7E66FF',
          '--delay': '2s',
          '--duration': '14s'
        }} />
        
        {/* Line 3 - Center curved line (wraps around button) */}
        <div className="helix-line line-3" style={{
          '--color': '#5C8BFF',
          '--delay': '4s',
          '--duration': '13s'
        }} />
        
        {/* Line 4 - Lower-middle curved line */}
        <div className="helix-line line-4" style={{
          '--color': '#8A7BFF',
          '--delay': '6s',
          '--duration': '15s'
        }} />
        
        {/* Line 5 - Bottom curved line */}
        <div className="helix-line line-5" style={{
          '--color': '#4C7BFF',
          '--delay': '8s',
          '--duration': '11s'
        }} />
      </div>

      {/* Bottom wave layer */}
      <div className="bottom-wave" />

      <style jsx>{`
        .helix-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .helix-line {
          position: absolute;
          left: -10%;
          width: 120%;
          height: 3px;
          border-radius: 50px;
          filter: drop-shadow(0 0 8px var(--color));
          opacity: 0.7;
          animation: screenFlow var(--duration) var(--delay) linear infinite;
        }

        /* Line 1 - Top curved line */
        .line-1 {
          background: linear-gradient(90deg, 
            transparent 0%, 
            var(--color) 10%, 
            var(--color) 90%, 
            transparent 100%
          );
          top: 20%;
          animation-name: line1Flow;
        }

        /* Line 2 - Upper-middle curved line */
        .line-2 {
          background: linear-gradient(90deg, 
            transparent 0%, 
            var(--color) 15%, 
            var(--color) 85%, 
            transparent 100%
          );
          top: 35%;
          animation-name: line2Flow;
        }

        /* Line 3 - Center curved line (wraps around button) */
        .line-3 {
          background: linear-gradient(90deg, 
            transparent 0%, 
            var(--color) 20%, 
            var(--color) 80%, 
            transparent 100%
          );
          top: 50%;
          height: 4px;
          opacity: 0.8;
          animation-name: line3Flow;
        }

        /* Line 4 - Lower-middle curved line */
        .line-4 {
          background: linear-gradient(90deg, 
            transparent 0%, 
            var(--color) 15%, 
            var(--color) 85%, 
            transparent 100%
          );
          top: 65%;
          animation-name: line4Flow;
        }

        /* Line 5 - Bottom curved line */
        .line-5 {
          background: linear-gradient(90deg, 
            transparent 0%, 
            var(--color) 10%, 
            var(--color) 90%, 
            transparent 100%
          );
          top: 80%;
          animation-name: line5Flow;
        }

        /* Line 1: Curved flow across screen with bends around button area */
        @keyframes line1Flow {
          0% {
            transform: translateX(-100%) translateY(0px) rotate(0deg) scaleY(1) skewY(2deg);
            opacity: 0.3;
          }
          25% {
            transform: translateX(-50%) translateY(-15px) rotate(1deg) scaleY(1.2) skewY(3deg);
            opacity: 0.6;
          }
          50% {
            transform: translateX(0%) translateY(-25px) rotate(2deg) scaleY(1.4) skewY(4deg);
            opacity: 0.8;
          }
          75% {
            transform: translateX(50%) translateY(-15px) rotate(1deg) scaleY(1.2) skewY(3deg);
            opacity: 0.6;
          }
          100% {
            transform: translateX(100%) translateY(0px) rotate(0deg) scaleY(1) skewY(2deg);
            opacity: 0.3;
          }
        }

        /* Line 2: Curved flow with more pronounced bends */
        @keyframes line2Flow {
          0% {
            transform: translateX(-100%) translateY(0px) rotate(0deg) scaleY(1) skewY(-1deg);
            opacity: 0.3;
          }
          25% {
            transform: translateX(-50%) translateY(-20px) rotate(-1deg) scaleY(1.1) skewY(-2deg);
            opacity: 0.5;
          }
          50% {
            transform: translateX(0%) translateY(-30px) rotate(-2deg) scaleY(1.3) skewY(-3deg);
            opacity: 0.7;
          }
          75% {
            transform: translateX(50%) translateY(-20px) rotate(-1deg) scaleY(1.1) skewY(-2deg);
            opacity: 0.5;
          }
          100% {
            transform: translateX(100%) translateY(0px) rotate(0deg) scaleY(1) skewY(-1deg);
            opacity: 0.3;
          }
        }

        /* Line 3: Center line with dramatic curves around button */
        @keyframes line3Flow {
          0% {
            transform: translateX(-100%) translateY(0px) rotate(0deg) scaleY(1) skewY(1deg);
            opacity: 0.4;
          }
          25% {
            transform: translateX(-50%) translateY(-30px) rotate(2deg) scaleY(1.3) skewY(2deg);
            opacity: 0.7;
          }
          50% {
            transform: translateX(0%) translateY(-40px) rotate(3deg) scaleY(1.5) skewY(3deg);
            opacity: 0.9;
          }
          75% {
            transform: translateX(50%) translateY(-30px) rotate(2deg) scaleY(1.3) skewY(2deg);
            opacity: 0.7;
          }
          100% {
            transform: translateX(100%) translateY(0px) rotate(0deg) scaleY(1) skewY(1deg);
            opacity: 0.4;
          }
        }

        /* Line 4: Lower line with opposite curve direction */
        @keyframes line4Flow {
          0% {
            transform: translateX(-100%) translateY(0px) rotate(0deg) scaleY(1) skewY(-2deg);
            opacity: 0.3;
          }
          25% {
            transform: translateX(-50%) translateY(20px) rotate(-1deg) scaleY(1.1) skewY(-3deg);
            opacity: 0.5;
          }
          50% {
            transform: translateX(0%) translateY(30px) rotate(-2deg) scaleY(1.3) skewY(-4deg);
            opacity: 0.7;
          }
          75% {
            transform: translateX(50%) translateY(20px) rotate(-1deg) scaleY(1.1) skewY(-3deg);
            opacity: 0.5;
          }
          100% {
            transform: translateX(100%) translateY(0px) rotate(0deg) scaleY(1) skewY(-2deg);
            opacity: 0.3;
          }
        }

        /* Line 5: Bottom line with subtle curves */
        @keyframes line5Flow {
          0% {
            transform: translateX(-100%) translateY(0px) rotate(0deg) scaleY(1) skewY(1deg);
            opacity: 0.3;
          }
          25% {
            transform: translateX(-50%) translateY(15px) rotate(1deg) scaleY(1.2) skewY(2deg);
            opacity: 0.6;
          }
          50% {
            transform: translateX(0%) translateY(25px) rotate(2deg) scaleY(1.4) skewY(3deg);
            opacity: 0.8;
          }
          75% {
            transform: translateX(50%) translateY(15px) rotate(1deg) scaleY(1.2) skewY(2deg);
            opacity: 0.6;
          }
          100% {
            transform: translateX(100%) translateY(0px) rotate(0deg) scaleY(1) skewY(1deg);
            opacity: 0.3;
          }
        }

        .bottom-wave {
          position: absolute;
          bottom: 10%;
          left: -10%;
          width: 120%;
          height: 3px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            #3457F5 20%,
            #3457F5 80%,
            transparent 100%
          );
          border-radius: 50px;
          animation: bottomWaveFlow 16s linear infinite;
          filter: drop-shadow(0 0 6px #3457F5);
          opacity: 0.4;
        }

        @keyframes bottomWaveFlow {
          0% {
            transform: translateX(-100%) translateY(0px) rotate(0deg) scaleY(1) skewY(1deg);
            opacity: 0.2;
          }
          25% {
            transform: translateX(-50%) translateY(-10px) rotate(1deg) scaleY(1.1) skewY(2deg);
            opacity: 0.4;
          }
          50% {
            transform: translateX(0%) translateY(-15px) rotate(0deg) scaleY(1.2) skewY(1deg);
            opacity: 0.35;
          }
          75% {
            transform: translateX(50%) translateY(-10px) rotate(-1deg) scaleY(1.1) skewY(-1deg);
            opacity: 0.4;
          }
          100% {
            transform: translateX(100%) translateY(0px) rotate(0deg) scaleY(1) skewY(1deg);
            opacity: 0.2;
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .helix-line {
            height: 2px;
            opacity: 0.5;
          }
          
          .line-3 {
            height: 3px;
          }
          
          .bottom-wave {
            height: 2px;
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  );
}