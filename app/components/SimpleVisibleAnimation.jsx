'use client';

import React from 'react';

/**
 * SIMPLE, GUARANTEED VISIBLE ANIMATION
 * This animation is designed to be impossible to miss
 * Uses basic CSS with high contrast colors and obvious movements
 */
export default function SimpleVisibleAnimation() {
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
      {/* Bright red background that pulses */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(45deg, #ff0000, #00ff00, #0000ff, #ffff00)',
          opacity: 0.3,
          animation: 'colorPulse 2s ease-in-out infinite'
        }}
      />
      
      {/* Large moving rectangles */}
      <div 
        style={{
          position: 'absolute',
          top: '20%',
          left: '-100px',
          width: '200px',
          height: '50px',
          background: '#ff0000',
          animation: 'slideRight 3s linear infinite'
        }}
      />
      
      <div 
        style={{
          position: 'absolute',
          top: '40%',
          right: '-100px',
          width: '200px',
          height: '50px',
          background: '#00ff00',
          animation: 'slideLeft 3s linear infinite 1s'
        }}
      />
      
      <div 
        style={{
          position: 'absolute',
          top: '60%',
          left: '-100px',
          width: '200px',
          height: '50px',
          background: '#0000ff',
          animation: 'slideRight 3s linear infinite 2s'
        }}
      />
      
      {/* Large rotating circle */}
      <div 
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '300px',
          height: '300px',
          border: '10px solid #ffff00',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          animation: 'rotate 4s linear infinite'
        }}
      />
      
      {/* Flashing text */}
      <div 
        style={{
          position: 'absolute',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#ffffff',
          fontSize: '48px',
          fontWeight: 'bold',
          textShadow: '0 0 20px #ff0000',
          animation: 'flash 1s ease-in-out infinite'
        }}
      >
        ANIMATION ACTIVE
      </div>

      <style jsx>{`
        @keyframes colorPulse {
          0% { opacity: 0.1; }
          50% { opacity: 0.5; }
          100% { opacity: 0.1; }
        }
        
        @keyframes slideRight {
          0% { transform: translateX(-100px); }
          100% { transform: translateX(calc(100vw + 100px)); }
        }
        
        @keyframes slideLeft {
          0% { transform: translateX(100px); }
          100% { transform: translateX(calc(-100vw - 100px)); }
        }
        
        @keyframes rotate {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        
        @keyframes flash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
