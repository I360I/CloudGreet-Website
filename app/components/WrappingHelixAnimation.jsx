import React from 'react';

export default function WrappingHelixAnimation() {
  console.log('WrappingHelixAnimation rendering - DEBUG: Component is loading');

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
      {/* Helix strands that wrap around the CTA button in an oval */}
      
      {/* Helix Strand 1 - Outer oval */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '15%',
          width: '70%',
          height: '400px',
          border: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'helixRotate1 8s linear infinite',
          boxShadow: '0 0 20px #3b82f6, 0 0 40px #3b82f6',
          transform: 'rotateX(60deg) rotateY(0deg)',
        }}
      />
      
      {/* Helix Strand 2 - Inner oval */}
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '25%',
          width: '50%',
          height: '300px',
          border: '3px solid #6ea6ff',
          borderRadius: '50%',
          animation: 'helixRotate2 6s linear infinite reverse',
          boxShadow: '0 0 15px #6ea6ff, 0 0 30px #6ea6ff',
          transform: 'rotateX(60deg) rotateY(180deg)',
        }}
      />
      
      {/* Helix Strand 3 - Center oval */}
      <div
        style={{
          position: 'absolute',
          top: '45%',
          left: '35%',
          width: '30%',
          height: '200px',
          border: '2px solid #9333ea',
          borderRadius: '50%',
          animation: 'helixRotate3 4s linear infinite',
          boxShadow: '0 0 10px #9333ea, 0 0 20px #9333ea',
          transform: 'rotateX(60deg) rotateY(90deg)',
        }}
      />
      
      {/* Line 4 - Bottom wave - MUCH MORE VISIBLE */}
      <div
        style={{
          position: 'absolute',
          bottom: '25%',
          left: '0%',
          width: '100%',
          height: '6px',
          background: 'linear-gradient(90deg, transparent, #3b82f6, #6ea6ff, #3b82f6, transparent)',
          animation: 'wave 4s ease-in-out infinite',
          boxShadow: '0 0 10px #3b82f6, 0 0 20px #6ea6ff',
        }}
      />
      
      {/* Additional decorative lines */}
      <div
        style={{
          position: 'absolute',
          top: '40%',
          right: '20%',
          width: '60px',
          height: '60px',
          border: '2px solid rgba(110, 166, 255, 0.5)',
          borderRadius: '50%',
          animation: 'rotate 8s linear infinite',
        }}
      />
      
      <div
        style={{
          position: 'absolute',
          top: '60%',
          left: '15%',
          width: '40px',
          height: '40px',
          border: '2px solid rgba(147, 51, 234, 0.5)',
          borderRadius: '50%',
          animation: 'rotate 6s linear infinite reverse',
        }}
      />

      {/* CSS Animations - HELIX ROTATION */}
      <style jsx>{`
        @keyframes helixRotate1 {
          0% { 
            transform: rotateX(60deg) rotateY(0deg) rotateZ(0deg);
          }
          100% { 
            transform: rotateX(60deg) rotateY(360deg) rotateZ(0deg);
          }
        }
        
        @keyframes helixRotate2 {
          0% { 
            transform: rotateX(60deg) rotateY(180deg) rotateZ(0deg);
          }
          100% { 
            transform: rotateX(60deg) rotateY(540deg) rotateZ(0deg);
          }
        }
        
        @keyframes helixRotate3 {
          0% { 
            transform: rotateX(60deg) rotateY(90deg) rotateZ(0deg);
          }
          100% { 
            transform: rotateX(60deg) rotateY(450deg) rotateZ(0deg);
          }
        }
        
        @keyframes wave {
          0%, 100% { 
            transform: translateX(-100%); 
            opacity: 0.6;
          }
          50% { 
            transform: translateX(0%); 
            opacity: 1;
          }
        }
        
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
