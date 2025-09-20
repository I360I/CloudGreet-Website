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
      {/* Curved tangled wire lines that bend and curve around the CTA button */}
      
      {/* Wire 1 - Curved S-shape */}
      <div
        style={{
          position: 'absolute',
          top: '25%',
          left: '-10%',
          width: '120%',
          height: '6px',
          background: '#3b82f6',
          borderRadius: '50px',
          animation: 'wire1 8s ease-in-out infinite',
          boxShadow: '0 0 15px #3b82f6, 0 0 30px #6ea6ff',
          transform: 'rotate(15deg)',
        }}
      />
      
      {/* Wire 2 - Curved C-shape */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '-5%',
          width: '110%',
          height: '4px',
          background: '#6ea6ff',
          borderRadius: '50px',
          animation: 'wire2 7s ease-in-out infinite reverse',
          boxShadow: '0 0 12px #6ea6ff, 0 0 24px #9333ea',
          transform: 'rotate(-20deg)',
        }}
      />
      
      {/* Wire 3 - Zigzag pattern */}
      <div
        style={{
          position: 'absolute',
          top: '45%',
          left: '-8%',
          width: '116%',
          height: '5px',
          background: '#9333ea',
          borderRadius: '50px',
          animation: 'wire3 9s ease-in-out infinite',
          boxShadow: '0 0 14px #9333ea, 0 0 28px #3b82f6',
          transform: 'rotate(25deg)',
        }}
      />
      
      {/* Wire 4 - Wavy line */}
      <div
        style={{
          position: 'absolute',
          top: '55%',
          left: '-12%',
          width: '124%',
          height: '4px',
          background: '#3b82f6',
          borderRadius: '50px',
          animation: 'wire4 6s ease-in-out infinite reverse',
          boxShadow: '0 0 12px #3b82f6, 0 0 24px #6ea6ff',
          transform: 'rotate(-15deg)',
        }}
      />
      
      {/* Wire 5 - Curved U-shape */}
      <div
        style={{
          position: 'absolute',
          top: '65%',
          left: '-6%',
          width: '112%',
          height: '5px',
          background: '#6ea6ff',
          borderRadius: '50px',
          animation: 'wire5 8.5s ease-in-out infinite',
          boxShadow: '0 0 14px #6ea6ff, 0 0 28px #9333ea',
          transform: 'rotate(30deg)',
        }}
      />
      
      {/* Wire 6 - Spiral-like */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '-15%',
          width: '130%',
          height: '3px',
          background: '#9333ea',
          borderRadius: '50px',
          animation: 'wire6 7.5s ease-in-out infinite reverse',
          boxShadow: '0 0 10px #9333ea, 0 0 20px #3b82f6',
          transform: 'rotate(-25deg)',
        }}
      />
      
      {/* Wire 7 - Bent line */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '-10%',
          width: '120%',
          height: '4px',
          background: '#3b82f6',
          borderRadius: '50px',
          animation: 'wire7 6.5s ease-in-out infinite',
          boxShadow: '0 0 12px #3b82f6, 0 0 24px #6ea6ff',
          transform: 'rotate(20deg)',
        }}
      />
      
      {/* Wire 8 - Curved M-shape */}
      <div
        style={{
          position: 'absolute',
          top: '70%',
          left: '-8%',
          width: '116%',
          height: '5px',
          background: '#6ea6ff',
          borderRadius: '50px',
          animation: 'wire8 9.5s ease-in-out infinite reverse',
          boxShadow: '0 0 14px #6ea6ff, 0 0 28px #9333ea',
          transform: 'rotate(-30deg)',
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

      {/* CSS Animations - CURVED WIRE BENDING AND TANGLING */}
      <style jsx>{`
        @keyframes wire1 {
          0% { 
            transform: rotate(15deg) translateX(-20%) scale(1);
            opacity: 0.7;
          }
          25% { 
            transform: rotate(35deg) translateX(-10%) scale(1.2);
            opacity: 1;
          }
          50% { 
            transform: rotate(5deg) translateX(0%) scale(1);
            opacity: 0.9;
          }
          75% { 
            transform: rotate(25deg) translateX(10%) scale(1.1);
            opacity: 1;
          }
          100% { 
            transform: rotate(15deg) translateX(20%) scale(1);
            opacity: 0.7;
          }
        }
        
        @keyframes wire2 {
          0% { 
            transform: rotate(-20deg) translateX(20%) scale(1);
            opacity: 0.8;
          }
          30% { 
            transform: rotate(-40deg) translateX(10%) scale(1.3);
            opacity: 1;
          }
          60% { 
            transform: rotate(-10deg) translateX(-10%) scale(1);
            opacity: 0.9;
          }
          100% { 
            transform: rotate(-20deg) translateX(-20%) scale(1);
            opacity: 0.8;
          }
        }
        
        @keyframes wire3 {
          0% { 
            transform: rotate(25deg) translateX(-15%) scale(1);
            opacity: 0.6;
          }
          40% { 
            transform: rotate(45deg) translateX(-5%) scale(1.4);
            opacity: 1;
          }
          70% { 
            transform: rotate(15deg) translateX(5%) scale(1);
            opacity: 0.8;
          }
          100% { 
            transform: rotate(25deg) translateX(15%) scale(1);
            opacity: 0.6;
          }
        }
        
        @keyframes wire4 {
          0% { 
            transform: rotate(-15deg) translateX(25%) scale(1);
            opacity: 0.7;
          }
          35% { 
            transform: rotate(-35deg) translateX(15%) scale(1.2);
            opacity: 1;
          }
          65% { 
            transform: rotate(-5deg) translateX(-15%) scale(1);
            opacity: 0.9;
          }
          100% { 
            transform: rotate(-15deg) translateX(-25%) scale(1);
            opacity: 0.7;
          }
        }
        
        @keyframes wire5 {
          0% { 
            transform: rotate(30deg) translateX(-18%) scale(1);
            opacity: 0.8;
          }
          25% { 
            transform: rotate(50deg) translateX(-8%) scale(1.3);
            opacity: 1;
          }
          50% { 
            transform: rotate(20deg) translateX(0%) scale(1);
            opacity: 0.9;
          }
          75% { 
            transform: rotate(40deg) translateX(8%) scale(1.1);
            opacity: 1;
          }
          100% { 
            transform: rotate(30deg) translateX(18%) scale(1);
            opacity: 0.8;
          }
        }
        
        @keyframes wire6 {
          0% { 
            transform: rotate(-25deg) translateX(22%) scale(1);
            opacity: 0.6;
          }
          45% { 
            transform: rotate(-45deg) translateX(12%) scale(1.4);
            opacity: 1;
          }
          75% { 
            transform: rotate(-15deg) translateX(-12%) scale(1);
            opacity: 0.8;
          }
          100% { 
            transform: rotate(-25deg) translateX(-22%) scale(1);
            opacity: 0.6;
          }
        }
        
        @keyframes wire7 {
          0% { 
            transform: rotate(20deg) translateX(-12%) scale(1);
            opacity: 0.7;
          }
          30% { 
            transform: rotate(40deg) translateX(-2%) scale(1.3);
            opacity: 1;
          }
          60% { 
            transform: rotate(10deg) translateX(8%) scale(1);
            opacity: 0.9;
          }
          100% { 
            transform: rotate(20deg) translateX(12%) scale(1);
            opacity: 0.7;
          }
        }
        
        @keyframes wire8 {
          0% { 
            transform: rotate(-30deg) translateX(28%) scale(1);
            opacity: 0.8;
          }
          40% { 
            transform: rotate(-50deg) translateX(18%) scale(1.2);
            opacity: 1;
          }
          70% { 
            transform: rotate(-20deg) translateX(-18%) scale(1);
            opacity: 0.9;
          }
          100% { 
            transform: rotate(-30deg) translateX(-28%) scale(1);
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
