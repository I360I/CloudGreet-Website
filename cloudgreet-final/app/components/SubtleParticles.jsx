import React from 'react';

/**
 * SubtleParticles.jsx
 * 
 * Simple, elegant floating particles that add life without being distracting
 */
export default function SubtleParticles() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* Floating particles */}
      <div className="particle particle-1"></div>
      <div className="particle particle-2"></div>
      <div className="particle particle-3"></div>
      <div className="particle particle-4"></div>
      <div className="particle particle-5"></div>
      <div className="particle particle-6"></div>
      <div className="particle particle-7"></div>
      <div className="particle particle-8"></div>

      <style jsx>{`
        .particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: linear-gradient(45deg, #8B5CF6, #3B82F6);
          border-radius: 50%;
          opacity: 0.6;
          animation: float 20s infinite linear;
        }

        .particle-1 {
          left: 10%;
          animation-delay: 0s;
          animation-duration: 25s;
        }

        .particle-2 {
          left: 20%;
          animation-delay: -3s;
          animation-duration: 30s;
        }

        .particle-3 {
          left: 30%;
          animation-delay: -6s;
          animation-duration: 22s;
        }

        .particle-4 {
          left: 40%;
          animation-delay: -9s;
          animation-duration: 28s;
        }

        .particle-5 {
          left: 50%;
          animation-delay: -12s;
          animation-duration: 26s;
        }

        .particle-6 {
          left: 60%;
          animation-delay: -15s;
          animation-duration: 24s;
        }

        .particle-7 {
          left: 70%;
          animation-delay: -18s;
          animation-duration: 32s;
        }

        .particle-8 {
          left: 80%;
          animation-delay: -21s;
          animation-duration: 20s;
        }

        @keyframes float {
          0% {
            transform: translateY(100vh) translateX(0px);
            opacity: 0;
          }
          10% {
            opacity: 0.6;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-100px) translateX(50px);
            opacity: 0;
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .particle {
            width: 3px;
            height: 3px;
          }
          
          /* Hide some particles on mobile */
          .particle-4, .particle-6, .particle-8 {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

