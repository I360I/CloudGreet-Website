import React from 'react';

/**
 * Professional Animation - Clean, sophisticated, organized
 * Blue theme, smooth movements, professional look
 */
export default function ProfessionalAnimation() {
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
      <svg
        viewBox="0 0 1200 600"
        style={{ width: '100%', height: '100%' }}
        className="professional-svg"
      >
        <defs>
          {/* Clean blue gradient */}
          <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0"/>
            <stop offset="20%" stopColor="#3B82F6" stopOpacity="0.6"/>
            <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.8"/>
            <stop offset="80%" stopColor="#3B82F6" stopOpacity="0.6"/>
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
          </linearGradient>

          {/* Subtle glow filter */}
          <filter id="subtleGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Main flowing line */}
        <path
          d="M 0 300 Q 300 250 600 300 Q 900 350 1200 300"
          fill="none"
          stroke="url(#blueGradient)"
          strokeWidth="3"
          filter="url(#subtleGlow)"
          className="main-flow"
        />
        
        {/* Secondary line */}
        <path
          d="M 0 320 Q 400 270 700 320 Q 1000 370 1200 320"
          fill="none"
          stroke="url(#blueGradient)"
          strokeWidth="2"
          filter="url(#subtleGlow)"
          className="secondary-flow"
        />
        
        {/* Accent line */}
        <path
          d="M 0 280 Q 200 230 500 280 Q 800 330 1200 280"
          fill="none"
          stroke="url(#blueGradient)"
          strokeWidth="2"
          filter="url(#subtleGlow)"
          className="accent-flow"
        />

        {/* Central focus element */}
        <circle cx="600" cy="300" r="80" fill="none" stroke="url(#blueGradient)" strokeWidth="1" filter="url(#subtleGlow)" className="focus-circle" />
        
        {/* Bottom anchor */}
        <path
          d="M 0 500 Q 300 480 600 500 Q 900 520 1200 500"
          fill="none"
          stroke="url(#blueGradient)"
          strokeWidth="4"
          filter="url(#subtleGlow)"
          className="bottom-anchor"
        />
      </svg>

      {/* Floating elements */}
      <div className="floating-elements">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`floating-element element-${i + 1}`}
            style={{
              '--delay': `${i * 0.8}s`,
              '--duration': `${8 + i * 0.5}s`,
              '--x': `${20 + i * 15}%`,
              '--y': `${30 + i * 8}%`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        .professional-svg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .main-flow, .secondary-flow, .accent-flow, .bottom-anchor {
          stroke-dasharray: 1200;
          stroke-dashoffset: 1200;
          animation: professionalFlow 12s linear infinite;
        }

        .secondary-flow {
          animation-delay: -4s;
        }

        .accent-flow {
          animation-delay: -8s;
        }

        .bottom-anchor {
          animation-delay: -6s;
        }

        .focus-circle {
          stroke-dasharray: 500;
          stroke-dashoffset: 500;
          animation: focusPulse 6s ease-in-out infinite;
        }

        .floating-elements {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .floating-element {
          position: absolute;
          width: 8px;
          height: 8px;
          background: radial-gradient(circle, #3B82F6 0%, transparent 70%);
          border-radius: 50%;
          left: var(--x);
          top: var(--y);
          animation: float var(--duration) var(--delay) ease-in-out infinite;
        }

        @keyframes professionalFlow {
          0% {
            stroke-dashoffset: 1200;
            transform: translateX(0);
          }
          100% {
            stroke-dashoffset: 0;
            transform: translateX(50px);
          }
        }

        @keyframes focusPulse {
          0%, 100% {
            stroke-dashoffset: 500;
            opacity: 0.3;
          }
          50% {
            stroke-dashoffset: 0;
            opacity: 0.8;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(0.8);
            opacity: 0.4;
          }
          50% {
            transform: translate(20px, -20px) scale(1.2);
            opacity: 0.8;
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .main-flow, .secondary-flow, .accent-flow { stroke-width: 2px; }
          .bottom-anchor { stroke-width: 3px; }
          .floating-element { width: 6px; height: 6px; }
        }
      `}</style>
    </div>
  );
}
