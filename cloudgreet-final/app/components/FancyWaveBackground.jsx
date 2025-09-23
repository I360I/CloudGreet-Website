import React, { useState, useEffect } from 'react';

/**
 * Sophisticated DNA-like helix animation with elliptical envelope around CTA button
 * Uses CSS animations for reliable performance
 */
export default function FancyWaveBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  // Generate wave path with elliptical envelope around CTA
  const generateWavePath = (index, total, length = 20, segments = 800, frequency = 3, baseAmp = 0.3, peakAmp = 2.0, lineSpacing = 0.4) => {
    const points = [];
    const yBase = (index - (total - 1) / 2) * lineSpacing;
    const phaseOffset = (index / total) * Math.PI;
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = t * length - length / 2;
      
      // Elliptical envelope around CTA button (240px horizontal, 100px vertical)
      const envelope = Math.exp(-Math.pow((t - 0.5) * 4, 2));
      const amp = baseAmp + peakAmp * envelope;
      
      // Sine wave with frequency and phase
      const yWave = amp * Math.sin(2 * Math.PI * frequency * t + phaseOffset);
      const zWave = amp * 0.2 * Math.cos(2 * Math.PI * frequency * t + phaseOffset);
      
      points.push({ x, y: yBase + yWave, z: zWave });
    }
    
    return points;
  };

  // CSS fallback with proper elliptical envelope
  if (!useThreeJS) {
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
        {/* Sophisticated CSS helix with elliptical envelope */}
        <div className="helix-container">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`helix-strand strand-${i + 1}`}
              style={{
                '--color': ['#6A5BFF', '#7E66FF', '#5C8BFF', '#8A7BFF', '#4C7BFF'][i],
                '--delay': `${i * 0.3}s`,
                '--duration': `${12 + i * 0.5}s`,
                '--z-offset': `${(i - 2) * 0.15}`,
              }}
            />
          ))}
          <div className="bottom-wave" />
        </div>

        <style jsx>{`
          .helix-container {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 100%;
            height: 100%;
            transform: translate(-50%, -50%);
            perspective: 1000px;
          }

          .helix-strand {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 800px;
            height: 5px;
            background: linear-gradient(90deg, 
              transparent 0%, 
              var(--color) 20%, 
              var(--color) 80%, 
              transparent 100%
            );
            border-radius: 50px;
            transform: translate(-50%, -50%) translateZ(var(--z-offset) * 200px) scale(calc(1 + var(--z-offset) * 0.2));
            filter: drop-shadow(0 0 12px var(--color)) blur(calc(0.8 + var(--z-offset) * 0.8px));
            opacity: calc(0.4 + var(--z-offset) * 0.3);
            animation: helixFlow var(--duration) var(--delay) linear infinite;
          }

          /* Strand 1 - Top strand with elliptical bulge */
          .strand-1 {
            animation-name: strand1Elliptical;
          }

          /* Strand 2 - Upper middle strand */
          .strand-2 {
            animation-name: strand2Elliptical;
          }

          /* Strand 3 - Center strand with maximum bulge */
          .strand-3 {
            animation-name: strand3Elliptical;
            height: 6px;
            opacity: calc(0.6 + var(--z-offset) * 0.3);
          }

          /* Strand 4 - Lower middle strand */
          .strand-4 {
            animation-name: strand4Elliptical;
          }

          /* Strand 5 - Bottom strand */
          .strand-5 {
            animation-name: strand5Elliptical;
          }

          /* Elliptical envelope animations - strands bulge around CTA button */
          @keyframes strand1Elliptical {
            0% {
              transform: translate(-50%, -50%) translateX(-400px) translateY(0px) rotate(0deg) scale(1) translateZ(var(--z-offset) * 200px);
              opacity: calc(0.2 + var(--z-offset) * 0.2);
            }
            25% {
              transform: translate(-50%, -50%) translateX(-200px) translateY(-40px) rotate(8deg) scale(1.3) translateZ(var(--z-offset) * 200px);
              opacity: calc(0.6 + var(--z-offset) * 0.2);
            }
            50% {
              transform: translate(-50%, -50%) translateX(0px) translateY(-60px) rotate(15deg) scale(1.6) translateZ(var(--z-offset) * 200px);
              opacity: calc(0.8 + var(--z-offset) * 0.2);
            }
            75% {
              transform: translate(-50%, -50%) translateX(200px) translateY(-40px) rotate(8deg) scale(1.3) translateZ(var(--z-offset) * 200px);
              opacity: calc(0.6 + var(--z-offset) * 0.2);
            }
            100% {
              transform: translate(-50%, -50%) translateX(400px) translateY(0px) rotate(0deg) scale(1) translateZ(var(--z-offset) * 200px);
              opacity: calc(0.2 + var(--z-offset) * 0.2);
            }
          }

          @keyframes strand2Elliptical {
            0% {
              transform: translate(-50%, -50%) translateX(-400px) translateY(0px) rotate(0deg) scale(1) translateZ(var(--z-offset) * 200px);
              opacity: calc(0.2 + var(--z-offset) * 0.2);
            }
            25% {
              transform: translate(-50%, -50%) translateX(-200px) translateY(-25px) rotate(-6deg) scale(1.2) translateZ(var(--z-offset) * 200px);
              opacity: calc(0.5 + var(--z-offset) * 0.2);
            }
            50% {
              transform: translate(-50%, -50%) translateX(0px) translateY(-40px) rotate(-12deg) scale(1.4) translateZ(var(--z-offset) * 200px);
              opacity: calc(0.7 + var(--z-offset) * 0.2);
            }
            75% {
              transform: translate(-50%, -50%) translateX(200px) translateY(-25px) rotate(-6deg) scale(1.2) translateZ(var(--z-offset) * 200px);
              opacity: calc(0.5 + var(--z-offset) * 0.2);
            }
            100% {
              transform: translate(-50%, -50%) translateX(400px) translateY(0px) rotate(0deg) scale(1) translateZ(var(--z-offset) * 200px);
              opacity: calc(0.2 + var(--z-offset) * 0.2);
            }
          }

          @keyframes strand3Elliptical {
            0% {
              transform: translate(-50%, -50%) translateX(-400px) translateY(0px) rotate(0deg) scale(1) translateZ(var(--z-offset) * 200px);
              opacity: calc(0.3 + var(--z-offset) * 0.2);
            }
            25% {
              transform: translate(-50%, -50%) translateX(-200px) translateY(-50px) rotate(10deg) scale(1.4) translateZ(var(--z-offset) * 200px);
              opacity: calc(0.7 + var(--z-offset) * 0.2);
            }
            50% {
              transform: translate(-50%, -50%) translateX(0px) translateY(-70px) rotate(20deg) scale(1.8) translateZ(var(--z-offset) * 200px);
              opacity: calc(0.9 + var(--z-offset) * 0.2);
            }
            75% {
              transform: translate(-50%, -50%) translateX(200px) translateY(-50px) rotate(10deg) scale(1.4) translateZ(var(--z-offset) * 200px);
              opacity: calc(0.7 + var(--z-offset) * 0.2);
            }
            100% {
              transform: translate(-50%, -50%) translateX(400px) translateY(0px) rotate(0deg) scale(1) translateZ(var(--z-offset) * 200px);
              opacity: calc(0.3 + var(--z-offset) * 0.2);
            }
          }

          @keyframes strand4Elliptical {
            0% {
              transform: translate(-50%, -50%) translateX(-400px) translateY(0px) rotate(0deg) scale(1) translateZ(var(--z-offset) * 200px);
              opacity: calc(0.2 + var(--z-offset) * 0.2);
            }
            25% {
              transform: translate(-50%, -50%) translateX(-200px) translateY(25px) rotate(-8deg) scale(1.2) translateZ(var(--z-offset) * 200px);
              opacity: calc(0.5 + var(--z-offset) * 0.2);
            }
            50% {
              transform: translate(-50%, -50%) translateX(0px) translateY(40px) rotate(-15deg) scale(1.4) translateZ(var(--z-offset) * 200px);
              opacity: calc(0.7 + var(--z-offset) * 0.2);
            }
            75% {
              transform: translate(-50%, -50%) translateX(200px) translateY(25px) rotate(-8deg) scale(1.2) translateZ(var(--z-offset) * 200px);
              opacity: calc(0.5 + var(--z-offset) * 0.2);
            }
            100% {
              transform: translate(-50%, -50%) translateX(400px) translateY(0px) rotate(0deg) scale(1) translateZ(var(--z-offset) * 200px);
              opacity: calc(0.2 + var(--z-offset) * 0.2);
            }
          }

          @keyframes strand5Elliptical {
            0% {
              transform: translate(-50%, -50%) translateX(-400px) translateY(0px) rotate(0deg) scale(1) translateZ(var(--z-offset) * 200px);
              opacity: calc(0.2 + var(--z-offset) * 0.2);
            }
            25% {
              transform: translate(-50%, -50%) translateX(-200px) translateY(40px) rotate(6deg) scale(1.3) translateZ(var(--z-offset) * 200px);
              opacity: calc(0.6 + var(--z-offset) * 0.2);
            }
            50% {
              transform: translate(-50%, -50%) translateX(0px) translateY(60px) rotate(12deg) scale(1.6) translateZ(var(--z-offset) * 200px);
              opacity: calc(0.8 + var(--z-offset) * 0.2);
            }
            75% {
              transform: translate(-50%, -50%) translateX(200px) translateY(40px) rotate(6deg) scale(1.3) translateZ(var(--z-offset) * 200px);
              opacity: calc(0.6 + var(--z-offset) * 0.2);
            }
            100% {
              transform: translate(-50%, -50%) translateX(400px) translateY(0px) rotate(0deg) scale(1) translateZ(var(--z-offset) * 200px);
              opacity: calc(0.2 + var(--z-offset) * 0.2);
            }
          }

          .bottom-wave {
            position: absolute;
            bottom: 15%;
            left: 50%;
            width: 1000px;
            height: 8px;
            background: linear-gradient(90deg, 
              transparent 0%, 
              #3457F5 25%, 
              #3457F5 75%, 
              transparent 100%
            );
            border-radius: 50px;
            transform: translateX(-50%);
            filter: drop-shadow(0 0 10px #3457F5);
            opacity: 0.25;
            animation: bottomWaveFlow 18s linear infinite;
          }

          @keyframes bottomWaveFlow {
            0% {
              transform: translateX(-50%) translateX(-500px) translateY(0px) rotate(0deg) scale(1);
              opacity: 0.15;
            }
            25% {
              transform: translateX(-50%) translateX(-250px) translateY(-20px) rotate(2deg) scale(1.1);
              opacity: 0.3;
            }
            50% {
              transform: translateX(-50%) translateX(0px) translateY(-30px) rotate(0deg) scale(1.2);
              opacity: 0.25;
            }
            75% {
              transform: translateX(-50%) translateX(250px) translateY(-20px) rotate(-2deg) scale(1.1);
              opacity: 0.3;
            }
            100% {
              transform: translateX(-50%) translateX(500px) translateY(0px) rotate(0deg) scale(1);
              opacity: 0.15;
            }
          }

          /* Responsive adjustments */
          @media (max-width: 768px) {
            .helix-strand {
              width: 600px;
              height: 4px;
              opacity: calc(0.3 + var(--z-offset) * 0.2);
            }
            
            .strand-3 {
              height: 5px;
            }
            
            .bottom-wave {
              width: 800px;
              height: 6px;
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
      <div className="loading-message">
        Loading sophisticated 3D animation...
      </div>

      <style jsx>{`
        .loading-message {
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