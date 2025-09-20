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
      {/* Oval-shaped curved lines that wrap around the CTA button like the reference */}
      
      {/* Top curved line - forms top of oval */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '10%',
          width: '80%',
          height: '8px',
          background: '#3b82f6',
          borderRadius: '50px',
          animation: 'ovalTop 8s ease-in-out infinite',
          boxShadow: '0 0 25px #3b82f6, 0 0 50px #6ea6ff',
          transform: 'scaleX(1.2)',
        }}
      />
      
      {/* Left curved line - forms left side of oval */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '5%',
          width: '8px',
          height: '40%',
          background: '#6ea6ff',
          borderRadius: '50px',
          animation: 'ovalLeft 10s ease-in-out infinite',
          boxShadow: '0 0 20px #6ea6ff, 0 0 40px #9333ea',
          transform: 'scaleY(1.3)',
        }}
      />
      
      {/* Right curved line - forms right side of oval */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          right: '5%',
          width: '8px',
          height: '40%',
          background: '#9333ea',
          borderRadius: '50px',
          animation: 'ovalRight 9s ease-in-out infinite',
          boxShadow: '0 0 20px #9333ea, 0 0 40px #3b82f6',
          transform: 'scaleY(1.3)',
        }}
      />
      
      {/* Bottom curved line - forms bottom of oval */}
      <div
        style={{
          position: 'absolute',
          bottom: '25%',
          left: '10%',
          width: '80%',
          height: '8px',
          background: '#3b82f6',
          borderRadius: '50px',
          animation: 'ovalBottom 7s ease-in-out infinite',
          boxShadow: '0 0 25px #3b82f6, 0 0 50px #6ea6ff',
          transform: 'scaleX(1.2)',
        }}
      />
      
      {/* Diagonal curved line 1 - crosses through oval */}
      <div
        style={{
          position: 'absolute',
          top: '25%',
          left: '15%',
          width: '70%',
          height: '6px',
          background: '#6ea6ff',
          borderRadius: '50px',
          animation: 'diagonal1 12s ease-in-out infinite',
          boxShadow: '0 0 18px #6ea6ff, 0 0 36px #9333ea',
          transform: 'rotate(15deg)',
        }}
      />
      
      {/* Diagonal curved line 2 - crosses through oval */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '20%',
          width: '60%',
          height: '6px',
          background: '#9333ea',
          borderRadius: '50px',
          animation: 'diagonal2 11s ease-in-out infinite',
          boxShadow: '0 0 18px #9333ea, 0 0 36px #3b82f6',
          transform: 'rotate(-20deg)',
        }}
      />
      
      {/* Center curved line - wraps around button */}
      <div
        style={{
          position: 'absolute',
          top: '45%',
          left: '25%',
          width: '50%',
          height: '8px',
          background: '#3b82f6',
          borderRadius: '50px',
          animation: 'centerWrap 6s ease-in-out infinite',
          boxShadow: '0 0 30px #3b82f6, 0 0 60px #6ea6ff',
          transform: 'scaleX(1.5)',
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

      {/* CSS Animations - OVAL-SHAPED CURVED LINES LIKE REFERENCE */}
      <style jsx>{`
        @keyframes ovalTop {
          0% { 
            transform: scaleX(1.2) translateY(0px) rotate(0deg);
            opacity: 0.8;
          }
          25% { 
            transform: scaleX(1.4) translateY(-10px) rotate(2deg);
            opacity: 1;
          }
          50% { 
            transform: scaleX(1.2) translateY(0px) rotate(0deg);
            opacity: 0.9;
          }
          75% { 
            transform: scaleX(1.3) translateY(5px) rotate(-1deg);
            opacity: 1;
          }
          100% { 
            transform: scaleX(1.2) translateY(0px) rotate(0deg);
            opacity: 0.8;
          }
        }
        
        @keyframes ovalLeft {
          0% { 
            transform: scaleY(1.3) translateX(0px) rotate(0deg);
            opacity: 0.7;
          }
          30% { 
            transform: scaleY(1.5) translateX(-5px) rotate(2deg);
            opacity: 1;
          }
          60% { 
            transform: scaleY(1.3) translateX(5px) rotate(-1deg);
            opacity: 0.9;
          }
          100% { 
            transform: scaleY(1.3) translateX(0px) rotate(0deg);
            opacity: 0.7;
          }
        }
        
        @keyframes ovalRight {
          0% { 
            transform: scaleY(1.3) translateX(0px) rotate(0deg);
            opacity: 0.8;
          }
          40% { 
            transform: scaleY(1.5) translateX(5px) rotate(-2deg);
            opacity: 1;
          }
          70% { 
            transform: scaleY(1.3) translateX(-5px) rotate(1deg);
            opacity: 0.9;
          }
          100% { 
            transform: scaleY(1.3) translateX(0px) rotate(0deg);
            opacity: 0.8;
          }
        }
        
        @keyframes ovalBottom {
          0% { 
            transform: scaleX(1.2) translateY(0px) rotate(0deg);
            opacity: 0.9;
          }
          35% { 
            transform: scaleX(1.4) translateY(10px) rotate(-2deg);
            opacity: 1;
          }
          65% { 
            transform: scaleX(1.2) translateY(-5px) rotate(1deg);
            opacity: 0.8;
          }
          100% { 
            transform: scaleX(1.2) translateY(0px) rotate(0deg);
            opacity: 0.9;
          }
        }
        
        @keyframes diagonal1 {
          0% { 
            transform: rotate(15deg) scaleX(1) translateX(0px);
            opacity: 0.6;
          }
          25% { 
            transform: rotate(20deg) scaleX(1.2) translateX(10px);
            opacity: 1;
          }
          50% { 
            transform: rotate(15deg) scaleX(1) translateX(0px);
            opacity: 0.8;
          }
          75% { 
            transform: rotate(10deg) scaleX(1.1) translateX(-10px);
            opacity: 1;
          }
          100% { 
            transform: rotate(15deg) scaleX(1) translateX(0px);
            opacity: 0.6;
          }
        }
        
        @keyframes diagonal2 {
          0% { 
            transform: rotate(-20deg) scaleX(1) translateX(0px);
            opacity: 0.7;
          }
          45% { 
            transform: rotate(-25deg) scaleX(1.3) translateX(-15px);
            opacity: 1;
          }
          75% { 
            transform: rotate(-15deg) scaleX(1.1) translateX(15px);
            opacity: 0.9;
          }
          100% { 
            transform: rotate(-20deg) scaleX(1) translateX(0px);
            opacity: 0.7;
          }
        }
        
        @keyframes centerWrap {
          0% { 
            transform: scaleX(1.5) translateY(0px) rotate(0deg);
            opacity: 0.8;
          }
          25% { 
            transform: scaleX(1.8) translateY(-5px) rotate(1deg);
            opacity: 1;
          }
          50% { 
            transform: scaleX(1.5) translateY(0px) rotate(0deg);
            opacity: 0.9;
          }
          75% { 
            transform: scaleX(1.7) translateY(5px) rotate(-1deg);
            opacity: 1;
          }
          100% { 
            transform: scaleX(1.5) translateY(0px) rotate(0deg);
            opacity: 0.8;
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
