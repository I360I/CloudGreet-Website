import React from 'react';

export default function WrappingHelixAnimation() {
  console.log('WrappingHelixAnimation rendering');

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        overflow: 'hidden',
      }}
    >
      {/* Multiple curved lines that wrap around the CTA button */}
      
      {/* Line 1 - Main curve */}
      <div
        style={{
          position: 'absolute',
          top: '45%',
          left: '10%',
          width: '80%',
          height: '200px',
          border: '2px solid rgba(59, 130, 246, 0.8)',
          borderRadius: '50% 50% 0 0',
          borderBottom: 'none',
          animation: 'pulse 3s ease-in-out infinite',
          transform: 'rotate(-10deg)',
        }}
      />
      
      {/* Line 2 - Secondary curve */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '15%',
          width: '70%',
          height: '150px',
          border: '2px solid rgba(110, 166, 255, 0.6)',
          borderRadius: '50% 50% 0 0',
          borderBottom: 'none',
          animation: 'pulse 4s ease-in-out infinite reverse',
          transform: 'rotate(5deg)',
        }}
      />
      
      {/* Line 3 - Inner curve */}
      <div
        style={{
          position: 'absolute',
          top: '55%',
          left: '25%',
          width: '50%',
          height: '100px',
          border: '2px solid rgba(147, 51, 234, 0.7)',
          borderRadius: '50% 50% 0 0',
          borderBottom: 'none',
          animation: 'pulse 2.5s ease-in-out infinite',
          transform: 'rotate(-5deg)',
        }}
      />
      
      {/* Line 4 - Bottom wave */}
      <div
        style={{
          position: 'absolute',
          bottom: '20%',
          left: '5%',
          width: '90%',
          height: '3px',
          background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.8), transparent)',
          animation: 'wave 4s ease-in-out infinite',
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

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { 
            opacity: 0.4;
            transform: rotate(-10deg) scale(1);
          }
          50% { 
            opacity: 0.8;
            transform: rotate(-10deg) scale(1.05);
          }
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
        
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
