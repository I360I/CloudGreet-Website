import React from 'react';

/**
 * HIGH VISIBILITY WOW FACTOR ANIMATION
 * This animation is designed to be immediately visible and impressive
 * Features bright colors, bold movements, and clear visual impact
 */
export default function WowFactorAnimation() {
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
      {/* Bright gradient background */}
      <div className="bright-background" />
      
      {/* Multiple animated elements for maximum visibility */}
      <div className="animated-container">
        
        {/* Large flowing waves */}
        <div className="wave wave-1" />
        <div className="wave wave-2" />
        <div className="wave wave-3" />
        
        {/* Rotating geometric shapes */}
        <div className="rotating-shape shape-1" />
        <div className="rotating-shape shape-2" />
        <div className="rotating-shape shape-3" />
        
        {/* Flowing particles */}
        <div className="particle particle-1" />
        <div className="particle particle-2" />
        <div className="particle particle-3" />
        <div className="particle particle-4" />
        <div className="particle particle-5" />
        
        {/* Central glow effect */}
        <div className="center-glow" />
        
      </div>

      <style jsx>{`
        .bright-background {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(45deg, 
            rgba(59, 130, 246, 0.2) 0%,
            rgba(147, 51, 234, 0.3) 25%,
            rgba(236, 72, 153, 0.2) 50%,
            rgba(59, 130, 246, 0.3) 75%,
            rgba(147, 51, 234, 0.2) 100%
          );
          animation: backgroundShift 8s ease-in-out infinite;
        }

        .animated-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        /* Large flowing waves */
        .wave {
          position: absolute;
          width: 150%;
          height: 8px;
          background: linear-gradient(90deg, 
            transparent 0%,
            rgba(59, 130, 246, 0.8) 20%,
            rgba(147, 51, 234, 0.9) 50%,
            rgba(236, 72, 153, 0.8) 80%,
            transparent 100%
          );
          border-radius: 50px;
          filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.8));
          animation: waveFlow 6s linear infinite;
        }

        .wave-1 {
          top: 20%;
          animation-delay: 0s;
          animation-duration: 6s;
        }

        .wave-2 {
          top: 50%;
          animation-delay: -2s;
          animation-duration: 8s;
          height: 12px;
        }

        .wave-3 {
          top: 80%;
          animation-delay: -4s;
          animation-duration: 7s;
          height: 6px;
        }

        /* Rotating geometric shapes */
        .rotating-shape {
          position: absolute;
          border: 3px solid;
          animation: rotate 10s linear infinite;
        }

        .shape-1 {
          top: 15%;
          left: 20%;
          width: 100px;
          height: 100px;
          border-color: rgba(59, 130, 246, 0.8);
          border-radius: 50%;
          animation-duration: 12s;
          filter: drop-shadow(0 0 15px rgba(59, 130, 246, 0.6));
        }

        .shape-2 {
          top: 60%;
          right: 15%;
          width: 80px;
          height: 80px;
          border-color: rgba(147, 51, 234, 0.8);
          animation-duration: 8s;
          animation-direction: reverse;
          filter: drop-shadow(0 0 15px rgba(147, 51, 234, 0.6));
        }

        .shape-3 {
          top: 25%;
          right: 25%;
          width: 60px;
          height: 60px;
          border-color: rgba(236, 72, 153, 0.8);
          animation-duration: 15s;
          filter: drop-shadow(0 0 15px rgba(236, 72, 153, 0.6));
        }

        /* Flowing particles */
        .particle {
          position: absolute;
          width: 8px;
          height: 8px;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(59, 130, 246, 0.8) 100%);
          border-radius: 50%;
          filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.8));
          animation: particleFloat 12s ease-in-out infinite;
        }

        .particle-1 {
          top: 10%;
          left: 10%;
          animation-delay: 0s;
        }

        .particle-2 {
          top: 30%;
          left: 80%;
          animation-delay: -2s;
        }

        .particle-3 {
          top: 70%;
          left: 20%;
          animation-delay: -4s;
        }

        .particle-4 {
          top: 85%;
          left: 70%;
          animation-delay: -6s;
        }

        .particle-5 {
          top: 45%;
          left: 50%;
          animation-delay: -8s;
        }

        /* Central glow effect */
        .center-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, 
            rgba(59, 130, 246, 0.3) 0%,
            rgba(147, 51, 234, 0.2) 30%,
            transparent 70%
          );
          border-radius: 50%;
          transform: translate(-50%, -50%);
          animation: centerPulse 4s ease-in-out infinite;
          filter: blur(20px);
        }

        /* Animations */
        @keyframes backgroundShift {
          0%, 100% {
            background: linear-gradient(45deg, 
              rgba(59, 130, 246, 0.2) 0%,
              rgba(147, 51, 234, 0.3) 25%,
              rgba(236, 72, 153, 0.2) 50%,
              rgba(59, 130, 246, 0.3) 75%,
              rgba(147, 51, 234, 0.2) 100%
            );
          }
          50% {
            background: linear-gradient(45deg, 
              rgba(147, 51, 234, 0.3) 0%,
              rgba(236, 72, 153, 0.2) 25%,
              rgba(59, 130, 246, 0.3) 50%,
              rgba(147, 51, 234, 0.2) 75%,
              rgba(236, 72, 153, 0.3) 100%
            );
          }
        }

        @keyframes waveFlow {
          0% {
            transform: translateX(-100%) scaleY(1);
            opacity: 0.6;
          }
          50% {
            transform: translateX(-50%) scaleY(1.5);
            opacity: 1;
          }
          100% {
            transform: translateX(100%) scaleY(1);
            opacity: 0.6;
          }
        }

        @keyframes rotate {
          0% {
            transform: rotate(0deg) scale(1);
          }
          50% {
            transform: rotate(180deg) scale(1.2);
          }
          100% {
            transform: rotate(360deg) scale(1);
          }
        }

        @keyframes particleFloat {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.8;
          }
          25% {
            transform: translate(100px, -50px) scale(1.2);
            opacity: 1;
          }
          50% {
            transform: translate(-50px, -100px) scale(0.8);
            opacity: 0.6;
          }
          75% {
            transform: translate(-100px, 50px) scale(1.1);
            opacity: 0.9;
          }
        }

        @keyframes centerPulse {
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
          .wave {
            height: 6px;
            width: 200%;
          }
          
          .rotating-shape {
            width: 60px !important;
            height: 60px !important;
          }
          
          .center-glow {
            width: 250px;
            height: 250px;
          }
          
          .particle {
            width: 6px;
            height: 6px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .wave,
          .rotating-shape,
          .particle,
          .center-glow,
          .bright-background {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
    </div>
  );
}