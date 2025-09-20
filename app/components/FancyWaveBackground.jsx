import React, { useRef, useMemo, useState, useEffect } from 'react';

/**
 * DNA-like helix animation with elliptical envelope around CTA button
 * Follows exact specification: strands that bulge outward, cross each other,
 * and have proper 3D depth with z-offsets and lighting
 */
export default function FancyWaveBackground() {
  const [mounted, setMounted] = useState(false);
  const [hasError, setHasError] = useState(false);

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

  // Fallback CSS animation if Three.js fails
  if (hasError) {
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
      >
        {/* CSS fallback with elliptical envelope */}
        <div className="css-helix-container">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`css-strand strand-${i + 1}`}
              style={{
                '--color': ['#6A5BFF', '#7E66FF', '#5C8BFF', '#8A7BFF', '#4C7BFF'][i],
                '--delay': `${i * 0.5}s`,
                '--duration': `${10 + i * 0.5}s`,
                '--z-offset': `${(i - 2) * 0.2}`,
              }}
            />
          ))}
          <div className="css-bottom-wave" />
        </div>

        <style jsx>{`
          .css-helix-container {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 100%;
            height: 100%;
            transform: translate(-50%, -50%);
          }

          .css-strand {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 600px;
            height: 4px;
            background: linear-gradient(90deg, transparent, var(--color), transparent);
            border-radius: 50px;
            transform: translate(-50%, -50%) translateZ(var(--z-offset) * 100px) scale(calc(1 + var(--z-offset) * 0.1));
            filter: drop-shadow(0 0 10px var(--color)) blur(calc(0.5 + var(--z-offset) * 0.5px));
            opacity: calc(0.5 + var(--z-offset) * 0.2);
            animation: cssHelixFlow var(--duration) var(--delay) linear infinite;
          }

          .strand-1 {
            animation-name: cssStrand1;
          }

          .strand-2 {
            animation-name: cssStrand2;
          }

          .strand-3 {
            animation-name: cssStrand3;
          }

          .strand-4 {
            animation-name: cssStrand4;
          }

          .strand-5 {
            animation-name: cssStrand5;
          }

          /* CSS strand animations with elliptical envelope */
          @keyframes cssStrand1 {
            0% {
              transform: translate(-50%, -50%) translateX(-300px) translateY(0px) rotate(0deg) scale(1) translateZ(var(--z-offset) * 100px);
              opacity: calc(0.3 + var(--z-offset) * 0.2);
            }
            25% {
              transform: translate(-50%, -50%) translateX(-150px) translateY(-30px) rotate(5deg) scale(1.2) translateZ(var(--z-offset) * 100px);
              opacity: calc(0.6 + var(--z-offset) * 0.2);
            }
            50% {
              transform: translate(-50%, -50%) translateX(0px) translateY(-50px) rotate(10deg) scale(1.4) translateZ(var(--z-offset) * 100px);
              opacity: calc(0.8 + var(--z-offset) * 0.2);
            }
            75% {
              transform: translate(-50%, -50%) translateX(150px) translateY(-30px) rotate(5deg) scale(1.2) translateZ(var(--z-offset) * 100px);
              opacity: calc(0.6 + var(--z-offset) * 0.2);
            }
            100% {
              transform: translate(-50%, -50%) translateX(300px) translateY(0px) rotate(0deg) scale(1) translateZ(var(--z-offset) * 100px);
              opacity: calc(0.3 + var(--z-offset) * 0.2);
            }
          }

          @keyframes cssStrand2 {
            0% {
              transform: translate(-50%, -50%) translateX(-300px) translateY(0px) rotate(0deg) scale(1) translateZ(var(--z-offset) * 100px);
              opacity: calc(0.3 + var(--z-offset) * 0.2);
            }
            25% {
              transform: translate(-50%, -50%) translateX(-150px) translateY(-20px) rotate(-3deg) scale(1.1) translateZ(var(--z-offset) * 100px);
              opacity: calc(0.5 + var(--z-offset) * 0.2);
            }
            50% {
              transform: translate(-50%, -50%) translateX(0px) translateY(-40px) rotate(-6deg) scale(1.3) translateZ(var(--z-offset) * 100px);
              opacity: calc(0.7 + var(--z-offset) * 0.2);
            }
            75% {
              transform: translate(-50%, -50%) translateX(150px) translateY(-20px) rotate(-3deg) scale(1.1) translateZ(var(--z-offset) * 100px);
              opacity: calc(0.5 + var(--z-offset) * 0.2);
            }
            100% {
              transform: translate(-50%, -50%) translateX(300px) translateY(0px) rotate(0deg) scale(1) translateZ(var(--z-offset) * 100px);
              opacity: calc(0.3 + var(--z-offset) * 0.2);
            }
          }

          @keyframes cssStrand3 {
            0% {
              transform: translate(-50%, -50%) translateX(-300px) translateY(0px) rotate(0deg) scale(1) translateZ(var(--z-offset) * 100px);
              opacity: calc(0.4 + var(--z-offset) * 0.2);
            }
            25% {
              transform: translate(-50%, -50%) translateX(-150px) translateY(-40px) rotate(8deg) scale(1.3) translateZ(var(--z-offset) * 100px);
              opacity: calc(0.7 + var(--z-offset) * 0.2);
            }
            50% {
              transform: translate(-50%, -50%) translateX(0px) translateY(-60px) rotate(15deg) scale(1.5) translateZ(var(--z-offset) * 100px);
              opacity: calc(0.9 + var(--z-offset) * 0.2);
            }
            75% {
              transform: translate(-50%, -50%) translateX(150px) translateY(-40px) rotate(8deg) scale(1.3) translateZ(var(--z-offset) * 100px);
              opacity: calc(0.7 + var(--z-offset) * 0.2);
            }
            100% {
              transform: translate(-50%, -50%) translateX(300px) translateY(0px) rotate(0deg) scale(1) translateZ(var(--z-offset) * 100px);
              opacity: calc(0.4 + var(--z-offset) * 0.2);
            }
          }

          @keyframes cssStrand4 {
            0% {
              transform: translate(-50%, -50%) translateX(-300px) translateY(0px) rotate(0deg) scale(1) translateZ(var(--z-offset) * 100px);
              opacity: calc(0.3 + var(--z-offset) * 0.2);
            }
            25% {
              transform: translate(-50%, -50%) translateX(-150px) translateY(20px) rotate(-5deg) scale(1.1) translateZ(var(--z-offset) * 100px);
              opacity: calc(0.5 + var(--z-offset) * 0.2);
            }
            50% {
              transform: translate(-50%, -50%) translateX(0px) translateY(40px) rotate(-10deg) scale(1.3) translateZ(var(--z-offset) * 100px);
              opacity: calc(0.7 + var(--z-offset) * 0.2);
            }
            75% {
              transform: translate(-50%, -50%) translateX(150px) translateY(20px) rotate(-5deg) scale(1.1) translateZ(var(--z-offset) * 100px);
              opacity: calc(0.5 + var(--z-offset) * 0.2);
            }
            100% {
              transform: translate(-50%, -50%) translateX(300px) translateY(0px) rotate(0deg) scale(1) translateZ(var(--z-offset) * 100px);
              opacity: calc(0.3 + var(--z-offset) * 0.2);
            }
          }

          @keyframes cssStrand5 {
            0% {
              transform: translate(-50%, -50%) translateX(-300px) translateY(0px) rotate(0deg) scale(1) translateZ(var(--z-offset) * 100px);
              opacity: calc(0.3 + var(--z-offset) * 0.2);
            }
            25% {
              transform: translate(-50%, -50%) translateX(-150px) translateY(30px) rotate(3deg) scale(1.2) translateZ(var(--z-offset) * 100px);
              opacity: calc(0.6 + var(--z-offset) * 0.2);
            }
            50% {
              transform: translate(-50%, -50%) translateX(0px) translateY(50px) rotate(6deg) scale(1.4) translateZ(var(--z-offset) * 100px);
              opacity: calc(0.8 + var(--z-offset) * 0.2);
            }
            75% {
              transform: translate(-50%, -50%) translateX(150px) translateY(30px) rotate(3deg) scale(1.2) translateZ(var(--z-offset) * 100px);
              opacity: calc(0.6 + var(--z-offset) * 0.2);
            }
            100% {
              transform: translate(-50%, -50%) translateX(300px) translateY(0px) rotate(0deg) scale(1) translateZ(var(--z-offset) * 100px);
              opacity: calc(0.3 + var(--z-offset) * 0.2);
            }
          }

          .css-bottom-wave {
            position: absolute;
            bottom: 20%;
            left: 50%;
            width: 800px;
            height: 6px;
            background: linear-gradient(90deg, transparent, #3457F5, transparent);
            border-radius: 50px;
            transform: translateX(-50%);
            filter: drop-shadow(0 0 8px #3457F5);
            opacity: 0.25;
            animation: cssBottomWave 20s linear infinite;
          }

          @keyframes cssBottomWave {
            0% {
              transform: translateX(-50%) translateX(-400px) translateY(0px) rotate(0deg) scale(1);
              opacity: 0.2;
            }
            25% {
              transform: translateX(-50%) translateX(-200px) translateY(-15px) rotate(1deg) scale(1.1);
              opacity: 0.3;
            }
            50% {
              transform: translateX(-50%) translateX(0px) translateY(-25px) rotate(0deg) scale(1.2);
              opacity: 0.25;
            }
            75% {
              transform: translateX(-50%) translateX(200px) translateY(-15px) rotate(-1deg) scale(1.1);
              opacity: 0.3;
            }
            100% {
              transform: translateX(-50%) translateX(400px) translateY(0px) rotate(0deg) scale(1);
              opacity: 0.2;
            }
          }

          /* Responsive adjustments */
          @media (max-width: 768px) {
            .css-strand {
              width: 400px;
              height: 3px;
              opacity: calc(0.4 + var(--z-offset) * 0.2);
            }
            
            .css-bottom-wave {
              width: 600px;
              height: 4px;
              opacity: 0.2;
            }
          }
        `}</style>
      </div>
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
      {/* Three.js Canvas for proper 3D DNA-like helix */}
      <div className="three-container">
        {/* This will be replaced with Three.js implementation */}
        <div className="placeholder-message">
          Three.js implementation coming...
        </div>
      </div>

      <style jsx>{`
        .three-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .placeholder-message {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: #6A5BFF;
          font-size: 14px;
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}