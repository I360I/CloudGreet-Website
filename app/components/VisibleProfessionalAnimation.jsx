import React from 'react';

/**
 * VISIBLE PROFESSIONAL ANIMATION
 * More prominent but still elegant and professional
 * Designed to be clearly visible while maintaining sophistication
 */
export default function VisibleProfessionalAnimation() {
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
      {/* Animated background gradient */}
      <div className="animated-bg" />
      
      {/* Prominent flowing lines */}
      <div className="flowing-lines">
        <div className="line line-1" />
        <div className="line line-2" />
        <div className="line line-3" />
      </div>
      
      {/* Rotating elements */}
      <div className="rotating-elements">
        <div className="rotator rotator-1" />
        <div className="rotator rotator-2" />
      </div>
      
      {/* Central pulse */}
      <div className="center-pulse" />

      <style jsx>{`
        .animated-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(45deg, 
            rgba(59, 130, 246, 0.15) 0%,
            rgba(147, 51, 234, 0.2) 25%,
            rgba(59, 130, 246, 0.15) 50%,
            rgba(147, 51, 234, 0.2) 75%,
            rgba(59, 130, 246, 0.15) 100%
          );
          background-size: 400% 400%;
          animation: gradientShift 6s ease-in-out infinite;
        }

        .flowing-lines {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .line {
          position: absolute;
          height: 4px;
          background: linear-gradient(90deg, 
            transparent 0%, 
            rgba(59, 130, 246, 0.8) 20%, 
            rgba(147, 51, 234, 0.9) 50%, 
            rgba(59, 130, 246, 0.8) 80%, 
            transparent 100%
          );
          border-radius: 4px;
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
          animation: lineFlow 12s linear infinite;
        }

        .line-1 {
          top: 20%;
          animation-delay: 0s;
          animation-duration: 12s;
        }

        .line-2 {
          top: 50%;
          animation-delay: -4s;
          animation-duration: 15s;
        }

        .line-3 {
          top: 80%;
          animation-delay: -8s;
          animation-duration: 18s;
        }

        .rotating-elements {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .rotator {
          position: absolute;
          border: 3px solid rgba(59, 130, 246, 0.6);
          border-radius: 50%;
          animation: rotate 20s linear infinite;
          box-shadow: 0 0 30px rgba(59, 130, 246, 0.4);
        }

        .rotator-1 {
          top: 15%;
          left: 10%;
          width: 150px;
          height: 150px;
          animation-duration: 20s;
        }

        .rotator-2 {
          bottom: 20%;
          right: 15%;
          width: 100px;
          height: 100px;
          animation-duration: 25s;
          animation-direction: reverse;
        }

        .center-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, 
            rgba(59, 130, 246, 0.2) 0%,
            rgba(147, 51, 234, 0.15) 30%,
            transparent 70%
          );
          border-radius: 50%;
          transform: translate(-50%, -50%);
          animation: pulse 8s ease-in-out infinite;
        }

        @keyframes gradientShift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes lineFlow {
          0% {
            transform: translateX(-100%);
            opacity: 0.6;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateX(100%);
            opacity: 0.6;
          }
        }

        @keyframes rotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.6;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.3);
            opacity: 0.9;
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .line {
            height: 3px;
          }
          
          .rotator {
            width: 80px !important;
            height: 80px !important;
          }
          
          .center-pulse {
            width: 250px;
            height: 250px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animated-bg,
          .line,
          .rotator,
          .center-pulse {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
    </div>
  );
}
