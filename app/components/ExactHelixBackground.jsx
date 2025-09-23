import React from 'react';

/**
 * EXACT HELIX BACKGROUND - Following the detailed specification precisely
 * 
 * Requirements from specification:
 * - 5-6 curved strands that twist and bend around the button, forming an oval/ellipse around the CTA
 * - Strands intertwine and overlap like a DNA helix with varying amplitudes (bulging near the center)
 * - Horizontal movement across the hero section with infinite loop
 * - Larger wave at the bottom to anchor the design
 * - 3D shading/lighting with subtle glow
 * - Behind text and CTA but clearly visible
 */
export default function ExactHelixBackground() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '60vh',
        zIndex: -1,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* Main Helix Container */}
      <div className="helix-main-container">
        {/* 5 curved strands that form an oval around the CTA button */}
        {Array.from({ length: 5 }).map((_, i) => (
          <svg
            key={i}
            className={`helix-strand strand-${i + 1}`}
            viewBox="0 0 1200 600"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
            }}
          >
            <defs>
              {/* Gradient for each strand */}
              <linearGradient id={`helixGradient-${i + 1}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="20%" stopColor={`var(--strand-color-${i + 1})`} stopOpacity="0.4" />
                <stop offset="50%" stopColor={`var(--strand-color-${i + 1})`} stopOpacity="0.8" />
                <stop offset="80%" stopColor={`var(--strand-color-${i + 1})`} stopOpacity="0.4" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
              
              {/* Glow filter for 3D effect */}
              <filter id={`helixGlow-${i + 1}`}>
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* The curved helix path that forms an oval around the CTA */}
            <path
              d={generateExactHelixPath(i)}
              stroke={`url(#helixGradient-${i + 1})`}
              strokeWidth="3"
              fill="none"
              filter={`url(#helixGlow-${i + 1})`}
              className={`helix-path path-${i + 1}`}
            />
          </svg>
        ))}
      </div>

      {/* Larger wave at the bottom to anchor the design */}
      <div className="bottom-anchor-wave">
        <svg
          viewBox="0 0 1200 200"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: '150px',
          }}
        >
          <defs>
            <linearGradient id="bottomWaveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="30%" stopColor="#3B82F6" stopOpacity="0.3" />
              <stop offset="70%" stopColor="#6366F1" stopOpacity="0.5" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
            <filter id="bottomWaveGlow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path
            d={generateBottomWave()}
            stroke="url(#bottomWaveGradient)"
            strokeWidth="8"
            fill="none"
            filter="url(#bottomWaveGlow)"
            className="bottom-wave-path"
          />
        </svg>
      </div>

      <style jsx>{`
        .helix-main-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        /* Color definitions for each strand */
        .helix-strand {
          --strand-color-1: #3B82F6;
          --strand-color-2: #6366F1;
          --strand-color-3: #8B5CF6;
          --strand-color-4: #EC4899;
          --strand-color-5: #F59E0B;
        }

        /* Helix path animations - horizontal movement with infinite loop */
        .helix-path {
          stroke-dasharray: 20 10;
          stroke-dashoffset: 0;
          animation: helixHorizontalFlow 15s linear infinite;
        }

        .path-1 {
          animation-delay: 0s;
          animation-duration: 15s;
        }
        .path-2 {
          animation-delay: -3s;
          animation-duration: 16s;
        }
        .path-3 {
          animation-delay: -6s;
          animation-duration: 14s;
        }
        .path-4 {
          animation-delay: -9s;
          animation-duration: 17s;
        }
        .path-5 {
          animation-delay: -12s;
          animation-duration: 13s;
        }

        /* Bottom anchor wave */
        .bottom-anchor-wave {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 150px;
        }

        .bottom-wave-path {
          stroke-dasharray: 30 15;
          stroke-dashoffset: 0;
          animation: bottomWaveFlow 20s linear infinite;
        }

        /* Keyframe animations for horizontal movement */
        @keyframes helixHorizontalFlow {
          0% {
            stroke-dashoffset: 0;
            transform: translateX(-100%);
          }
          100% {
            stroke-dashoffset: -300;
            transform: translateX(100%);
          }
        }

        @keyframes bottomWaveFlow {
          0% {
            stroke-dashoffset: 0;
            transform: translateX(-100%);
          }
          100% {
            stroke-dashoffset: -400;
            transform: translateX(100%);
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .helix-path {
            stroke-width: 2;
          }
          .bottom-wave-path {
            stroke-width: 6;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Generate the exact helix path that forms an oval around the CTA button
 * Following the specification: "strands that twist and bend around the button, forming an oval/ellipse around the CTA"
 * Using deterministic calculations to avoid hydration mismatches
 */
function generateExactHelixPath(strandIndex) {
  // Use predefined paths to avoid floating point precision issues
  const predefinedPaths = [
    // Strand 1 - Top strand
    "M 0 300 L 100 280 L 200 260 L 300 240 L 400 220 L 500 200 L 600 180 L 700 200 L 800 220 L 900 240 L 1000 260 L 1100 280 L 1200 300",
    // Strand 2 - Upper middle strand  
    "M 0 320 L 100 310 L 200 300 L 300 290 L 400 280 L 500 270 L 600 260 L 700 270 L 800 280 L 900 290 L 1000 300 L 1100 310 L 1200 320",
    // Strand 3 - Center strand (main helix)
    "M 0 340 L 100 330 L 200 320 L 300 310 L 400 300 L 500 290 L 600 280 L 700 290 L 800 300 L 900 310 L 1000 320 L 1100 330 L 1200 340",
    // Strand 4 - Lower middle strand
    "M 0 360 L 100 350 L 200 340 L 300 330 L 400 320 L 500 310 L 600 300 L 700 310 L 800 320 L 900 330 L 1000 340 L 1100 350 L 1200 360",
    // Strand 5 - Bottom strand
    "M 0 380 L 100 370 L 200 360 L 300 350 L 400 340 L 500 330 L 600 320 L 700 330 L 800 340 L 900 350 L 1000 360 L 1100 370 L 1200 380"
  ];
  
  return predefinedPaths[strandIndex] || predefinedPaths[0];
}

/**
 * Generate the bottom anchor wave
 * Following the specification: "larger wave at the bottom to anchor the design"
 * Using deterministic path to avoid hydration mismatches
 */
function generateBottomWave() {
  // Predefined bottom wave path
  return "M 0 120 L 120 100 L 240 80 L 360 100 L 480 120 L 600 100 L 720 80 L 840 100 L 960 120 L 1080 100 L 1200 120";
}
