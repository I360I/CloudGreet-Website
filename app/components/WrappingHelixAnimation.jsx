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
      {/* Wavy squiggly lines that flow naturally across the screen */}
      
      {/* Wave 1 - Large wavy line */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '-5%',
          width: '110%',
          height: '4px',
          background: '#3b82f6',
          borderRadius: '20px',
          animation: 'wave1 8s ease-in-out infinite',
          boxShadow: '0 0 15px #3b82f6, 0 0 30px #6ea6ff',
        }}
      />
      
      {/* Wave 2 - Medium wavy line */}
      <div
        style={{
          position: 'absolute',
          top: '45%',
          left: '-8%',
          width: '116%',
          height: '3px',
          background: '#6ea6ff',
          borderRadius: '15px',
          animation: 'wave2 7s ease-in-out infinite reverse',
          boxShadow: '0 0 12px #6ea6ff, 0 0 24px #9333ea',
        }}
      />
      
      {/* Wave 3 - Small wavy line */}
      <div
        style={{
          position: 'absolute',
          top: '60%',
          left: '-10%',
          width: '120%',
          height: '3px',
          background: '#9333ea',
          borderRadius: '18px',
          animation: 'wave3 9s ease-in-out infinite',
          boxShadow: '0 0 14px #9333ea, 0 0 28px #3b82f6',
        }}
      />
      
      {/* Wave 4 - Another wavy line */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '-12%',
          width: '124%',
          height: '4px',
          background: '#3b82f6',
          borderRadius: '25px',
          animation: 'wave4 6s ease-in-out infinite reverse',
          boxShadow: '0 0 12px #3b82f6, 0 0 24px #6ea6ff',
        }}
      />
      
      {/* Wave 5 - Curved wavy line */}
      <div
        style={{
          position: 'absolute',
          top: '55%',
          left: '-6%',
          width: '112%',
          height: '3px',
          background: '#6ea6ff',
          borderRadius: '22px',
          animation: 'wave5 8.5s ease-in-out infinite',
          boxShadow: '0 0 14px #6ea6ff, 0 0 28px #9333ea',
        }}
      />
      
      {/* Wave 6 - Spiral wavy line */}
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '-15%',
          width: '130%',
          height: '2px',
          background: '#9333ea',
          borderRadius: '16px',
          animation: 'wave6 7.5s ease-in-out infinite reverse',
          boxShadow: '0 0 10px #9333ea, 0 0 20px #3b82f6',
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

      {/* CSS Animations - WAVY SQUIGGLY LINES */}
      <style jsx>{`
        @keyframes wave1 {
          0% { 
            transform: translateX(-100%) skewY(0deg);
            opacity: 0.7;
          }
          25% { 
            transform: translateX(-50%) skewY(2deg);
            opacity: 1;
          }
          50% { 
            transform: translateX(0%) skewY(-1deg);
            opacity: 0.9;
          }
          75% { 
            transform: translateX(50%) skewY(1.5deg);
            opacity: 1;
          }
          100% { 
            transform: translateX(100%) skewY(0deg);
            opacity: 0.7;
          }
        }
        
        @keyframes wave2 {
          0% { 
            transform: translateX(100%) skewY(0deg);
            opacity: 0.8;
          }
          30% { 
            transform: translateX(50%) skewY(-2deg);
            opacity: 1;
          }
          60% { 
            transform: translateX(-50%) skewY(1deg);
            opacity: 0.9;
          }
          100% { 
            transform: translateX(-100%) skewY(0deg);
            opacity: 0.8;
          }
        }
        
        @keyframes wave3 {
          0% { 
            transform: translateX(-100%) skewY(0deg);
            opacity: 0.6;
          }
          40% { 
            transform: translateX(-40%) skewY(3deg);
            opacity: 1;
          }
          70% { 
            transform: translateX(40%) skewY(-2deg);
            opacity: 0.8;
          }
          100% { 
            transform: translateX(100%) skewY(0deg);
            opacity: 0.6;
          }
        }
        
        @keyframes wave4 {
          0% { 
            transform: translateX(100%) skewY(0deg);
            opacity: 0.7;
          }
          35% { 
            transform: translateX(35%) skewY(-3deg);
            opacity: 1;
          }
          65% { 
            transform: translateX(-35%) skewY(2deg);
            opacity: 0.9;
          }
          100% { 
            transform: translateX(-100%) skewY(0deg);
            opacity: 0.7;
          }
        }
        
        @keyframes wave5 {
          0% { 
            transform: translateX(-100%) skewY(0deg);
            opacity: 0.8;
          }
          25% { 
            transform: translateX(-25%) skewY(2.5deg);
            opacity: 1;
          }
          50% { 
            transform: translateX(0%) skewY(-1.5deg);
            opacity: 0.9;
          }
          75% { 
            transform: translateX(25%) skewY(2deg);
            opacity: 1;
          }
          100% { 
            transform: translateX(100%) skewY(0deg);
            opacity: 0.8;
          }
        }
        
        @keyframes wave6 {
          0% { 
            transform: translateX(100%) skewY(0deg);
            opacity: 0.6;
          }
          45% { 
            transform: translateX(45%) skewY(-2.5deg);
            opacity: 1;
          }
          75% { 
            transform: translateX(-45%) skewY(1.5deg);
            opacity: 0.8;
          }
          100% { 
            transform: translateX(-100%) skewY(0deg);
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
