import React from 'react';

/**
 * Professional helix animation with curved, intertwining lines that wrap around the CTA button
 * Creates a sophisticated DNA-like effect with proper curves and smooth animations
 */
export default function ProfessionalHelixBackground() {
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
      {/* Main helix container */}
      <div className="helix-container">
        {/* Create 5 curved strands that intertwine around the CTA button */}
        {Array.from({ length: 5 }).map((_, i) => (
          <svg
            key={i}
            className={`helix-strand strand-${i + 1}`}
            viewBox="0 0 1200 800"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 1,
            }}
          >
            <defs>
              <linearGradient id={`gradient-${i + 1}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="20%" stopColor={`var(--color-${i + 1})`} stopOpacity="0.8" />
                <stop offset="50%" stopColor={`var(--color-${i + 1})`} stopOpacity="1" />
                <stop offset="80%" stopColor={`var(--color-${i + 1})`} stopOpacity="0.8" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
              <filter id={`glow-${i + 1}`}>
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Curved path that wraps around the CTA button area */}
            <path
              d={getHelixPath(i)}
              stroke={`url(#gradient-${i + 1})`}
              strokeWidth="3"
              fill="none"
              filter={`url(#glow-${i + 1})`}
              className={`helix-path path-${i + 1}`}
            />
          </svg>
        ))}

        {/* Bottom accent wave */}
        <div className="bottom-accent-wave" />
      </div>

      <style jsx>{`
        .helix-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          perspective: 1000px;
        }

        .helix-strand {
          --color-1: #3B82F6;
          --color-2: #6366F1;
          --color-3: #8B5CF6;
          --color-4: #EC4899;
          --color-5: #F59E0B;
        }

        .helix-path {
          stroke-dasharray: 20 10;
          stroke-dashoffset: 0;
          animation: helixFlow 12s linear infinite;
        }

        .path-1 {
          animation-delay: 0s;
          animation-duration: 12s;
        }
        .path-2 {
          animation-delay: -2.4s;
          animation-duration: 14s;
        }
        .path-3 {
          animation-delay: -4.8s;
          animation-duration: 16s;
        }
        .path-4 {
          animation-delay: -7.2s;
          animation-duration: 13s;
        }
        .path-5 {
          animation-delay: -9.6s;
          animation-duration: 15s;
        }

        .bottom-accent-wave {
          position: absolute;
          bottom: 15%;
          left: 0;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, 
            transparent 0%, 
            #3B82F6 20%, 
            #6366F1 40%, 
            #8B5CF6 60%, 
            #EC4899 80%, 
            transparent 100%
          );
          border-radius: 50px;
          filter: drop-shadow(0 0 8px #3B82F6);
          opacity: 0.6;
          animation: bottomWave 8s linear infinite;
        }

        @keyframes helixFlow {
          0% {
            stroke-dashoffset: 0;
            transform: translateX(-100%);
          }
          100% {
            stroke-dashoffset: -200;
            transform: translateX(100%);
          }
        }

        @keyframes bottomWave {
          0% {
            transform: translateX(-100%) scaleY(1);
            opacity: 0.3;
          }
          50% {
            transform: translateX(0%) scaleY(1.5);
            opacity: 0.6;
          }
          100% {
            transform: translateX(100%) scaleY(1);
            opacity: 0.3;
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .helix-path {
            stroke-width: 2;
          }
          .bottom-accent-wave {
            height: 1px;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Generate curved paths that wrap around the CTA button area
 * Creates DNA-like helix curves that bulge around the center
 */
function getHelixPath(strandIndex) {
  const centerX = 600; // Center of the viewBox
  const centerY = 400; // Center of the viewBox
  const amplitude = 60 + (strandIndex * 15); // Varying amplitudes
  const frequency = 2 + (strandIndex * 0.3); // Varying frequencies
  const phase = (strandIndex * Math.PI) / 2.5; // Phase offset for intertwining
  
  // Create a smooth curved path that bulges around the CTA button area
  const points = [];
  const segments = 100;
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = t * 1200; // Full width
    const y = centerY + amplitude * Math.sin(frequency * Math.PI * t + phase);
    
    // Add bulge around the center (CTA button area)
    const centerDistance = Math.abs(x - centerX) / centerX;
    const bulge = Math.exp(-Math.pow(centerDistance * 2, 2)) * 40;
    const finalY = y + bulge * Math.sin(frequency * Math.PI * t + phase + Math.PI / 2);
    
    points.push(`${i === 0 ? 'M' : 'L'} ${x} ${finalY}`);
  }
  
  return points.join(' ');
}

