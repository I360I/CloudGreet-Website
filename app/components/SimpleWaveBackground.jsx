import React from 'react';

/**
 * Simple but effective wave animation that wraps around the CTA button
 */
export default function SimpleWaveBackground() {

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
      {/* Create 6 visible wave lines that wrap around the CTA button */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={`wave-line wave-${i + 1}`}
          style={{
            '--delay': `${i * 0.5}s`,
            '--duration': `${8 + i * 1}s`,
            '--color': ['#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'][i],
          }}
        />
      ))}

      {/* Bottom wave */}
      <div className="bottom-wave" />

      <style jsx>{`
        .wave-line {
          position: absolute;
          top: 50%;
          left: 0;
          width: 120%;
          height: 4px;
          background: linear-gradient(90deg, 
            transparent 0%, 
            var(--color) 20%, 
            var(--color) 80%, 
            transparent 100%
          );
          border-radius: 50px;
          transform: translateY(-50%);
          filter: drop-shadow(0 0 8px var(--color));
          opacity: 0.7;
          animation: waveFlow var(--duration) var(--delay) linear infinite;
        }

        .wave-1 {
          animation-name: wave1;
          top: 35%;
        }
        .wave-2 {
          animation-name: wave2;
          top: 42%;
        }
        .wave-3 {
          animation-name: wave3;
          top: 49%;
        }
        .wave-4 {
          animation-name: wave4;
          top: 56%;
        }
        .wave-5 {
          animation-name: wave5;
          top: 63%;
        }
        .wave-6 {
          animation-name: wave6;
          top: 70%;
        }

        .bottom-wave {
          position: absolute;
          bottom: 20%;
          left: 0;
          width: 100%;
          height: 8px;
          background: linear-gradient(90deg, 
            transparent 0%, 
            #3B82F6 30%, 
            #6366F1 50%, 
            #8B5CF6 70%, 
            transparent 100%
          );
          border-radius: 50px;
          filter: drop-shadow(0 0 12px #3B82F6);
          opacity: 0.4;
          animation: bottomWave 12s linear infinite;
        }

        /* Wave animations that create elliptical envelope around CTA button */
        @keyframes wave1 {
          0% {
            transform: translateX(-120%) translateY(-50%) scaleY(1) rotate(0deg);
            opacity: 0.3;
          }
          25% {
            transform: translateX(-50%) translateY(-50%) scaleY(1.5) rotate(5deg);
            opacity: 0.8;
          }
          50% {
            transform: translateX(0%) translateY(-50%) scaleY(2) rotate(0deg);
            opacity: 1;
          }
          75% {
            transform: translateX(50%) translateY(-50%) scaleY(1.5) rotate(-5deg);
            opacity: 0.8;
          }
          100% {
            transform: translateX(120%) translateY(-50%) scaleY(1) rotate(0deg);
            opacity: 0.3;
          }
        }

        @keyframes wave2 {
          0% {
            transform: translateX(-120%) translateY(-50%) scaleY(1) rotate(0deg);
            opacity: 0.3;
          }
          25% {
            transform: translateX(-50%) translateY(-50%) scaleY(1.3) rotate(-3deg);
            opacity: 0.7;
          }
          50% {
            transform: translateX(0%) translateY(-50%) scaleY(1.8) rotate(0deg);
            opacity: 0.9;
          }
          75% {
            transform: translateX(50%) translateY(-50%) scaleY(1.3) rotate(3deg);
            opacity: 0.7;
          }
          100% {
            transform: translateX(120%) translateY(-50%) scaleY(1) rotate(0deg);
            opacity: 0.3;
          }
        }

        @keyframes wave3 {
          0% {
            transform: translateX(-120%) translateY(-50%) scaleY(1) rotate(0deg);
            opacity: 0.4;
          }
          25% {
            transform: translateX(-50%) translateY(-50%) scaleY(1.6) rotate(2deg);
            opacity: 0.9;
          }
          50% {
            transform: translateX(0%) translateY(-50%) scaleY(2.2) rotate(0deg);
            opacity: 1;
          }
          75% {
            transform: translateX(50%) translateY(-50%) scaleY(1.6) rotate(-2deg);
            opacity: 0.9;
          }
          100% {
            transform: translateX(120%) translateY(-50%) scaleY(1) rotate(0deg);
            opacity: 0.4;
          }
        }

        @keyframes wave4 {
          0% {
            transform: translateX(-120%) translateY(-50%) scaleY(1) rotate(0deg);
            opacity: 0.3;
          }
          25% {
            transform: translateX(-50%) translateY(-50%) scaleY(1.4) rotate(-4deg);
            opacity: 0.8;
          }
          50% {
            transform: translateX(0%) translateY(-50%) scaleY(1.9) rotate(0deg);
            opacity: 1;
          }
          75% {
            transform: translateX(50%) translateY(-50%) scaleY(1.4) rotate(4deg);
            opacity: 0.8;
          }
          100% {
            transform: translateX(120%) translateY(-50%) scaleY(1) rotate(0deg);
            opacity: 0.3;
          }
        }

        @keyframes wave5 {
          0% {
            transform: translateX(-120%) translateY(-50%) scaleY(1) rotate(0deg);
            opacity: 0.3;
          }
          25% {
            transform: translateX(-50%) translateY(-50%) scaleY(1.2) rotate(3deg);
            opacity: 0.6;
          }
          50% {
            transform: translateX(0%) translateY(-50%) scaleY(1.7) rotate(0deg);
            opacity: 0.8;
          }
          75% {
            transform: translateX(50%) translateY(-50%) scaleY(1.2) rotate(-3deg);
            opacity: 0.6;
          }
          100% {
            transform: translateX(120%) translateY(-50%) scaleY(1) rotate(0deg);
            opacity: 0.3;
          }
        }

        @keyframes wave6 {
          0% {
            transform: translateX(-120%) translateY(-50%) scaleY(1) rotate(0deg);
            opacity: 0.2;
          }
          25% {
            transform: translateX(-50%) translateY(-50%) scaleY(1.1) rotate(-2deg);
            opacity: 0.5;
          }
          50% {
            transform: translateX(0%) translateY(-50%) scaleY(1.5) rotate(0deg);
            opacity: 0.7;
          }
          75% {
            transform: translateX(50%) translateY(-50%) scaleY(1.1) rotate(2deg);
            opacity: 0.5;
          }
          100% {
            transform: translateX(120%) translateY(-50%) scaleY(1) rotate(0deg);
            opacity: 0.2;
          }
        }

        @keyframes bottomWave {
          0% {
            transform: translateX(-100%) scaleY(1);
            opacity: 0.2;
          }
          50% {
            transform: translateX(0%) scaleY(1.5);
            opacity: 0.4;
          }
          100% {
            transform: translateX(100%) scaleY(1);
            opacity: 0.2;
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .wave-line {
            height: 3px;
            width: 140%;
          }
          .bottom-wave {
            height: 6px;
          }
        }
      `}</style>
    </div>
  );
}
