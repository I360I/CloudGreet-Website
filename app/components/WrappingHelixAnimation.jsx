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
      {/* Curved squiggly lines that fill full screen and loop seamlessly */}
      
      {/* Line 1 - Full screen curved line */}
      <div
        style={{
          position: 'absolute',
          top: '25%',
          left: '0%',
          width: '100%',
          height: '6px',
          background: 'linear-gradient(90deg, #3b82f6, #6ea6ff, #3b82f6)',
          borderRadius: '50px',
          animation: 'line1 6s linear infinite',
          boxShadow: '0 0 20px #3b82f6, 0 0 40px #6ea6ff',
          transform: 'rotate(2deg)',
        }}
      />
      
      {/* Line 2 - Full screen curved line */}
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '0%',
          width: '100%',
          height: '5px',
          background: 'linear-gradient(90deg, #6ea6ff, #9333ea, #6ea6ff)',
          borderRadius: '50px',
          animation: 'line2 8s linear infinite',
          boxShadow: '0 0 18px #6ea6ff, 0 0 36px #9333ea',
          transform: 'rotate(-3deg)',
        }}
      />
      
      {/* Line 3 - Full screen curved line */}
      <div
        style={{
          position: 'absolute',
          top: '55%',
          left: '0%',
          width: '100%',
          height: '4px',
          background: 'linear-gradient(90deg, #9333ea, #3b82f6, #9333ea)',
          borderRadius: '50px',
          animation: 'line3 7s linear infinite',
          boxShadow: '0 0 16px #9333ea, 0 0 32px #3b82f6',
          transform: 'rotate(4deg)',
        }}
      />
      
      {/* Line 4 - Full screen curved line */}
      <div
        style={{
          position: 'absolute',
          top: '70%',
          left: '0%',
          width: '100%',
          height: '5px',
          background: 'linear-gradient(90deg, #3b82f6, #6ea6ff, #3b82f6)',
          borderRadius: '50px',
          animation: 'line4 9s linear infinite',
          boxShadow: '0 0 20px #3b82f6, 0 0 40px #6ea6ff',
          transform: 'rotate(-2deg)',
        }}
      />
      
      {/* Line 5 - Full screen curved line */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '0%',
          width: '100%',
          height: '3px',
          background: 'linear-gradient(90deg, #6ea6ff, #9333ea, #6ea6ff)',
          borderRadius: '50px',
          animation: 'line5 5s linear infinite',
          boxShadow: '0 0 14px #6ea6ff, 0 0 28px #9333ea',
          transform: 'rotate(5deg)',
        }}
      />
      
      {/* Line 6 - Full screen curved line */}
      <div
        style={{
          position: 'absolute',
          top: '60%',
          left: '0%',
          width: '100%',
          height: '4px',
          background: 'linear-gradient(90deg, #9333ea, #3b82f6, #9333ea)',
          borderRadius: '50px',
          animation: 'line6 10s linear infinite',
          boxShadow: '0 0 18px #9333ea, 0 0 36px #3b82f6',
          transform: 'rotate(-4deg)',
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

      {/* CSS Animations - SEAMLESS FULL SCREEN LOOPING WITH CURVES */}
      <style jsx>{`
        @keyframes line1 {
          0% { 
            transform: translateX(-100%) rotate(2deg) scaleX(1.2);
            opacity: 0.8;
          }
          25% { 
            transform: translateX(-50%) rotate(4deg) scaleX(1.1);
            opacity: 1;
          }
          50% { 
            transform: translateX(0%) rotate(2deg) scaleX(1.2);
            opacity: 0.9;
          }
          75% { 
            transform: translateX(50%) rotate(0deg) scaleX(1.1);
            opacity: 1;
          }
          100% { 
            transform: translateX(100%) rotate(2deg) scaleX(1.2);
            opacity: 0.8;
          }
        }
        
        @keyframes line2 {
          0% { 
            transform: translateX(-100%) rotate(-3deg) scaleX(1.1);
            opacity: 0.7;
          }
          30% { 
            transform: translateX(-30%) rotate(-5deg) scaleX(1.3);
            opacity: 1;
          }
          60% { 
            transform: translateX(30%) rotate(-1deg) scaleX(1.1);
            opacity: 0.9;
          }
          100% { 
            transform: translateX(100%) rotate(-3deg) scaleX(1.1);
            opacity: 0.7;
          }
        }
        
        @keyframes line3 {
          0% { 
            transform: translateX(-100%) rotate(4deg) scaleX(1.3);
            opacity: 0.8;
          }
          40% { 
            transform: translateX(-20%) rotate(6deg) scaleX(1.2);
            opacity: 1;
          }
          70% { 
            transform: translateX(20%) rotate(2deg) scaleX(1.3);
            opacity: 0.9;
          }
          100% { 
            transform: translateX(100%) rotate(4deg) scaleX(1.3);
            opacity: 0.8;
          }
        }
        
        @keyframes line4 {
          0% { 
            transform: translateX(-100%) rotate(-2deg) scaleX(1.1);
            opacity: 0.9;
          }
          35% { 
            transform: translateX(-35%) rotate(-4deg) scaleX(1.2);
            opacity: 1;
          }
          65% { 
            transform: translateX(35%) rotate(0deg) scaleX(1.1);
            opacity: 0.8;
          }
          100% { 
            transform: translateX(100%) rotate(-2deg) scaleX(1.1);
            opacity: 0.9;
          }
        }
        
        @keyframes line5 {
          0% { 
            transform: translateX(-100%) rotate(5deg) scaleX(1.4);
            opacity: 0.6;
          }
          25% { 
            transform: translateX(-25%) rotate(7deg) scaleX(1.2);
            opacity: 1;
          }
          50% { 
            transform: translateX(0%) rotate(5deg) scaleX(1.4);
            opacity: 0.8;
          }
          75% { 
            transform: translateX(25%) rotate(3deg) scaleX(1.2);
            opacity: 1;
          }
          100% { 
            transform: translateX(100%) rotate(5deg) scaleX(1.4);
            opacity: 0.6;
          }
        }
        
        @keyframes line6 {
          0% { 
            transform: translateX(-100%) rotate(-4deg) scaleX(1.2);
            opacity: 0.7;
          }
          45% { 
            transform: translateX(-45%) rotate(-6deg) scaleX(1.1);
            opacity: 1;
          }
          75% { 
            transform: translateX(-15%) rotate(-2deg) scaleX(1.2);
            opacity: 0.9;
          }
          100% { 
            transform: translateX(100%) rotate(-4deg) scaleX(1.2);
            opacity: 0.7;
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
