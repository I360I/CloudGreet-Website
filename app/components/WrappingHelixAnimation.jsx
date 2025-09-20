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
      {/* Lightning-like lines that wind and tangle around the CTA button */}
      
      {/* Line 1 - Lightning bolt */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '0%',
          width: '100%',
          height: '4px',
          background: 'linear-gradient(90deg, transparent, #3b82f6, #6ea6ff, #3b82f6, transparent)',
          animation: 'lightning1 6s ease-in-out infinite',
          boxShadow: '0 0 10px #3b82f6, 0 0 20px #6ea6ff',
          transform: 'skewY(-5deg)',
        }}
      />
      
      {/* Line 2 - Lightning bolt */}
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '0%',
          width: '100%',
          height: '3px',
          background: 'linear-gradient(90deg, transparent, #6ea6ff, #9333ea, #6ea6ff, transparent)',
          animation: 'lightning2 8s ease-in-out infinite reverse',
          boxShadow: '0 0 8px #6ea6ff, 0 0 16px #9333ea',
          transform: 'skewY(3deg)',
        }}
      />
      
      {/* Line 3 - Lightning bolt */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '0%',
          width: '100%',
          height: '3px',
          background: 'linear-gradient(90deg, transparent, #9333ea, #3b82f6, #9333ea, transparent)',
          animation: 'lightning3 7s ease-in-out infinite',
          boxShadow: '0 0 8px #9333ea, 0 0 16px #3b82f6',
          transform: 'skewY(-2deg)',
        }}
      />
      
      {/* Line 4 - Lightning bolt */}
      <div
        style={{
          position: 'absolute',
          top: '60%',
          left: '0%',
          width: '100%',
          height: '4px',
          background: 'linear-gradient(90deg, transparent, #3b82f6, #6ea6ff, #3b82f6, transparent)',
          animation: 'lightning4 5s ease-in-out infinite reverse',
          boxShadow: '0 0 10px #3b82f6, 0 0 20px #6ea6ff',
          transform: 'skewY(4deg)',
        }}
      />
      
      {/* Line 5 - Lightning bolt */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '0%',
          width: '100%',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #6ea6ff, #3b82f6, #6ea6ff, transparent)',
          animation: 'lightning5 9s ease-in-out infinite',
          boxShadow: '0 0 6px #6ea6ff, 0 0 12px #3b82f6',
          transform: 'skewY(-3deg)',
        }}
      />
      
      {/* Line 6 - Lightning bolt */}
      <div
        style={{
          position: 'absolute',
          top: '45%',
          left: '0%',
          width: '100%',
          height: '3px',
          background: 'linear-gradient(90deg, transparent, #9333ea, #6ea6ff, #9333ea, transparent)',
          animation: 'lightning6 6.5s ease-in-out infinite reverse',
          boxShadow: '0 0 8px #9333ea, 0 0 16px #6ea6ff',
          transform: 'skewY(2deg)',
        }}
      />
      
      {/* Line 7 - Lightning bolt */}
      <div
        style={{
          position: 'absolute',
          top: '55%',
          left: '0%',
          width: '100%',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #3b82f6, #9333ea, #3b82f6, transparent)',
          animation: 'lightning7 7.5s ease-in-out infinite',
          boxShadow: '0 0 6px #3b82f6, 0 0 12px #9333ea',
          transform: 'skewY(-4deg)',
        }}
      />
      
      {/* Line 8 - Lightning bolt */}
      <div
        style={{
          position: 'absolute',
          top: '65%',
          left: '0%',
          width: '100%',
          height: '3px',
          background: 'linear-gradient(90deg, transparent, #6ea6ff, #3b82f6, #6ea6ff, transparent)',
          animation: 'lightning8 5.5s ease-in-out infinite reverse',
          boxShadow: '0 0 8px #6ea6ff, 0 0 16px #3b82f6',
          transform: 'skewY(1deg)',
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

      {/* CSS Animations - LIGHTNING FLOW AND TANGLE */}
      <style jsx>{`
        @keyframes lightning1 {
          0% { 
            transform: skewY(-5deg) translateX(-100%) scaleY(1);
            opacity: 0.7;
          }
          25% { 
            transform: skewY(-8deg) translateX(-50%) scaleY(1.2);
            opacity: 1;
          }
          50% { 
            transform: skewY(-3deg) translateX(0%) scaleY(1);
            opacity: 0.9;
          }
          75% { 
            transform: skewY(-7deg) translateX(50%) scaleY(1.1);
            opacity: 1;
          }
          100% { 
            transform: skewY(-5deg) translateX(100%) scaleY(1);
            opacity: 0.7;
          }
        }
        
        @keyframes lightning2 {
          0% { 
            transform: skewY(3deg) translateX(100%) scaleY(1);
            opacity: 0.6;
          }
          25% { 
            transform: skewY(6deg) translateX(50%) scaleY(1.3);
            opacity: 1;
          }
          50% { 
            transform: skewY(2deg) translateX(0%) scaleY(1);
            opacity: 0.8;
          }
          75% { 
            transform: skewY(5deg) translateX(-50%) scaleY(1.2);
            opacity: 1;
          }
          100% { 
            transform: skewY(3deg) translateX(-100%) scaleY(1);
            opacity: 0.6;
          }
        }
        
        @keyframes lightning3 {
          0% { 
            transform: skewY(-2deg) translateX(-100%) scaleY(1);
            opacity: 0.8;
          }
          30% { 
            transform: skewY(-6deg) translateX(-30%) scaleY(1.4);
            opacity: 1;
          }
          60% { 
            transform: skewY(-1deg) translateX(20%) scaleY(1);
            opacity: 0.9;
          }
          100% { 
            transform: skewY(-2deg) translateX(100%) scaleY(1);
            opacity: 0.8;
          }
        }
        
        @keyframes lightning4 {
          0% { 
            transform: skewY(4deg) translateX(100%) scaleY(1);
            opacity: 0.7;
          }
          40% { 
            transform: skewY(7deg) translateX(40%) scaleY(1.2);
            opacity: 1;
          }
          70% { 
            transform: skewY(3deg) translateX(-20%) scaleY(1);
            opacity: 0.8;
          }
          100% { 
            transform: skewY(4deg) translateX(-100%) scaleY(1);
            opacity: 0.7;
          }
        }
        
        @keyframes lightning5 {
          0% { 
            transform: skewY(-3deg) translateX(-100%) scaleY(1);
            opacity: 0.6;
          }
          35% { 
            transform: skewY(-5deg) translateX(-35%) scaleY(1.3);
            opacity: 1;
          }
          65% { 
            transform: skewY(-2deg) translateX(25%) scaleY(1);
            opacity: 0.9;
          }
          100% { 
            transform: skewY(-3deg) translateX(100%) scaleY(1);
            opacity: 0.6;
          }
        }
        
        @keyframes lightning6 {
          0% { 
            transform: skewY(2deg) translateX(100%) scaleY(1);
            opacity: 0.7;
          }
          45% { 
            transform: skewY(5deg) translateX(45%) scaleY(1.2);
            opacity: 1;
          }
          75% { 
            transform: skewY(1deg) translateX(-25%) scaleY(1);
            opacity: 0.8;
          }
          100% { 
            transform: skewY(2deg) translateX(-100%) scaleY(1);
            opacity: 0.7;
          }
        }
        
        @keyframes lightning7 {
          0% { 
            transform: skewY(-4deg) translateX(-100%) scaleY(1);
            opacity: 0.8;
          }
          30% { 
            transform: skewY(-6deg) translateX(-30%) scaleY(1.4);
            opacity: 1;
          }
          60% { 
            transform: skewY(-3deg) translateX(20%) scaleY(1);
            opacity: 0.9;
          }
          100% { 
            transform: skewY(-4deg) translateX(100%) scaleY(1);
            opacity: 0.8;
          }
        }
        
        @keyframes lightning8 {
          0% { 
            transform: skewY(1deg) translateX(100%) scaleY(1);
            opacity: 0.6;
          }
          40% { 
            transform: skewY(3deg) translateX(40%) scaleY(1.3);
            opacity: 1;
          }
          70% { 
            transform: skewY(0deg) translateX(-20%) scaleY(1);
            opacity: 0.8;
          }
          100% { 
            transform: skewY(1deg) translateX(-100%) scaleY(1);
            opacity: 0.6;
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
      `}</style>
    </div>
  );
}
