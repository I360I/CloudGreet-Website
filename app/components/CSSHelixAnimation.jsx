'use client';

import React from 'react';

export default function CSSHelixAnimation() {
  console.log('CSSHelixAnimation rendering');

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
      }}
    >
      {/* Animated helix strands using pure CSS */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '400px',
          height: '400px',
          border: '2px solid rgba(110, 166, 255, 0.6)',
          borderRadius: '50%',
          animation: 'rotate 10s linear infinite',
        }}
      />
      
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '300px',
          height: '300px',
          border: '2px solid rgba(140, 152, 255, 0.6)',
          borderRadius: '50%',
          animation: 'rotate 8s linear infinite reverse',
        }}
      />
      
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '200px',
          height: '200px',
          border: '2px solid rgba(59, 130, 246, 0.4)',
          borderRadius: '50%',
          animation: 'rotate 6s linear infinite',
        }}
      />

      {/* Bottom wave */}
      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          left: '0%',
          width: '100%',
          height: '4px',
          background: 'linear-gradient(90deg, transparent, rgba(110, 166, 255, 0.6), transparent)',
          animation: 'wave 4s ease-in-out infinite',
        }}
      />

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes rotate {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        
        @keyframes wave {
          0%, 100% { 
            transform: translateX(-100%); 
            opacity: 0;
          }
          50% { 
            transform: translateX(0%); 
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
