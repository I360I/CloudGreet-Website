import React from 'react';

/**
 * Simple Working Helix Background - Basic but functional
 */
export default function WorkingHelixBackground() {
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
      {/* Simple helix lines */}
      <div className="helix-container">
        {/* Line 1 */}
        <div className="helix-line line-1" />
        {/* Line 2 */}
        <div className="helix-line line-2" />
        {/* Line 3 */}
        <div className="helix-line line-3" />
        {/* Line 4 */}
        <div className="helix-line line-4" />
        {/* Line 5 */}
        <div className="helix-line line-5" />
        
        {/* Bottom wave */}
        <div className="bottom-wave" />
      </div>

      <style jsx>{`
        .helix-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .helix-line {
          position: absolute;
          height: 2px;
          width: 120%;
          background: linear-gradient(90deg, transparent, #3B82F6, transparent);
          border-radius: 50px;
          left: -10%;
          animation: moveRight 8s linear infinite;
        }

        .line-1 {
          top: 30%;
          animation-delay: 0s;
          background: linear-gradient(90deg, transparent, #3B82F6, transparent);
        }

        .line-2 {
          top: 40%;
          animation-delay: -1.6s;
          background: linear-gradient(90deg, transparent, #6366F1, transparent);
        }

        .line-3 {
          top: 50%;
          animation-delay: -3.2s;
          background: linear-gradient(90deg, transparent, #8B5CF6, transparent);
        }

        .line-4 {
          top: 60%;
          animation-delay: -4.8s;
          background: linear-gradient(90deg, transparent, #EC4899, transparent);
        }

        .line-5 {
          top: 70%;
          animation-delay: -6.4s;
          background: linear-gradient(90deg, transparent, #F59E0B, transparent);
        }

        .bottom-wave {
          position: absolute;
          bottom: 20%;
          left: -10%;
          width: 120%;
          height: 3px;
          background: linear-gradient(90deg, transparent, #3B82F6, #6366F1, transparent);
          border-radius: 50px;
          animation: moveRight 12s linear infinite;
        }

        @keyframes moveRight {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(100%);
          }
        }

        /* Make lines more visible */
        .helix-line {
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        }

        .line-2 {
          box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
        }

        .line-3 {
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
        }

        .line-4 {
          box-shadow: 0 0 10px rgba(236, 72, 153, 0.5);
        }

        .line-5 {
          box-shadow: 0 0 10px rgba(245, 158, 11, 0.5);
        }

        .bottom-wave {
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.6);
        }
      `}</style>
    </div>
  );
}
