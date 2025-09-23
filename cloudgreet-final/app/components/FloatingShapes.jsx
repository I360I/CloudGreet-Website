import React from 'react';

/**
 * FloatingShapes.jsx
 * 
 * Dynamic floating geometric shapes that create movement and visual interest
 */
export default function FloatingShapes() {
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
      {/* Floating geometric shapes */}
      <div className="floating-shape shape-1"></div>
      <div className="floating-shape shape-2"></div>
      <div className="floating-shape shape-3"></div>
      <div className="floating-shape shape-4"></div>
      <div className="floating-shape shape-5"></div>
      <div className="floating-shape shape-6"></div>

      <style jsx>{`
        .floating-shape {
          position: absolute;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1));
          backdrop-filter: blur(10px);
          border: 1px solid rgba(139, 92, 246, 0.2);
          animation: floatShapes 25s infinite ease-in-out;
        }

        .shape-1 {
          width: 80px;
          height: 80px;
          top: 20%;
          left: 10%;
          animation-delay: 0s;
          animation-duration: 20s;
        }

        .shape-2 {
          width: 120px;
          height: 120px;
          top: 60%;
          left: 80%;
          animation-delay: -5s;
          animation-duration: 25s;
        }

        .shape-3 {
          width: 60px;
          height: 60px;
          top: 40%;
          left: 70%;
          animation-delay: -10s;
          animation-duration: 18s;
        }

        .shape-4 {
          width: 100px;
          height: 100px;
          top: 80%;
          left: 20%;
          animation-delay: -15s;
          animation-duration: 22s;
        }

        .shape-5 {
          width: 140px;
          height: 140px;
          top: 10%;
          left: 60%;
          animation-delay: -8s;
          animation-duration: 30s;
        }

        .shape-6 {
          width: 90px;
          height: 90px;
          top: 70%;
          left: 50%;
          animation-delay: -12s;
          animation-duration: 16s;
        }

        @keyframes floatShapes {
          0%, 100% {
            transform: translateY(0px) translateX(0px) rotate(0deg);
          }
          25% {
            transform: translateY(-30px) translateX(20px) rotate(90deg);
          }
          50% {
            transform: translateY(-60px) translateX(-10px) rotate(180deg);
          }
          75% {
            transform: translateY(-30px) translateX(-20px) rotate(270deg);
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .floating-shape {
            width: 60px !important;
            height: 60px !important;
          }
          
          /* Hide some shapes on mobile */
          .shape-3, .shape-6 {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

