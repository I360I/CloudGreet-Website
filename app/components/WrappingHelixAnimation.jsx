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
      {/* ACTUAL WAVY LINES that bend, intertwine, and wrap around the button */}
      
      {/* Wavy Line 1 - Full screen wavy line that bends */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '-10%',
          width: '120%',
          height: '8px',
          background: '#3b82f6',
          borderRadius: '50px',
          animation: 'wavy1 8s ease-in-out infinite',
          boxShadow: '0 0 25px #3b82f6, 0 0 50px #6ea6ff',
        }}
      />
      
      {/* Wavy Line 2 - Full screen wavy line that bends */}
      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '-10%',
          width: '120%',
          height: '6px',
          background: '#6ea6ff',
          borderRadius: '50px',
          animation: 'wavy2 10s ease-in-out infinite',
          boxShadow: '0 0 20px #6ea6ff, 0 0 40px #9333ea',
        }}
      />
      
      {/* Wavy Line 3 - Full screen wavy line that bends */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '-10%',
          width: '120%',
          height: '7px',
          background: '#9333ea',
          borderRadius: '50px',
          animation: 'wavy3 9s ease-in-out infinite',
          boxShadow: '0 0 22px #9333ea, 0 0 44px #3b82f6',
        }}
      />
      
      {/* Wavy Line 4 - Full screen wavy line that bends */}
      <div
        style={{
          position: 'absolute',
          top: '65%',
          left: '-10%',
          width: '120%',
          height: '8px',
          background: '#3b82f6',
          borderRadius: '50px',
          animation: 'wavy4 11s ease-in-out infinite',
          boxShadow: '0 0 25px #3b82f6, 0 0 50px #6ea6ff',
        }}
      />
      
      {/* Wavy Line 5 - Full screen wavy line that bends */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '-10%',
          width: '120%',
          height: '5px',
          background: '#6ea6ff',
          borderRadius: '50px',
          animation: 'wavy5 7s ease-in-out infinite',
          boxShadow: '0 0 18px #6ea6ff, 0 0 36px #9333ea',
        }}
      />
      
      {/* Wavy Line 6 - Full screen wavy line that bends */}
      <div
        style={{
          position: 'absolute',
          top: '55%',
          left: '-10%',
          width: '120%',
          height: '6px',
          background: '#9333ea',
          borderRadius: '50px',
          animation: 'wavy6 12s ease-in-out infinite',
          boxShadow: '0 0 20px #9333ea, 0 0 40px #3b82f6',
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

      {/* CSS Animations - ACTUAL WAVY LINES THAT BEND AND CURVE */}
      <style jsx>{`
        @keyframes wavy1 {
          0% { 
            transform: translateX(-20%) translateY(0px) rotate(0deg) scaleX(1) skewY(0deg);
            opacity: 0.8;
          }
          12.5% { 
            transform: translateX(-10%) translateY(-15px) rotate(2deg) scaleX(1.1) skewY(3deg);
            opacity: 1;
          }
          25% { 
            transform: translateX(0%) translateY(-25px) rotate(5deg) scaleX(1.2) skewY(5deg);
            opacity: 0.9;
          }
          37.5% { 
            transform: translateX(10%) translateY(-10px) rotate(3deg) scaleX(1.1) skewY(2deg);
            opacity: 1;
          }
          50% { 
            transform: translateX(20%) translateY(0px) rotate(0deg) scaleX(1) skewY(0deg);
            opacity: 0.8;
          }
          62.5% { 
            transform: translateX(30%) translateY(15px) rotate(-2deg) scaleX(1.1) skewY(-3deg);
            opacity: 1;
          }
          75% { 
            transform: translateX(40%) translateY(25px) rotate(-5deg) scaleX(1.2) skewY(-5deg);
            opacity: 0.9;
          }
          87.5% { 
            transform: translateX(50%) translateY(10px) rotate(-3deg) scaleX(1.1) skewY(-2deg);
            opacity: 1;
          }
          100% { 
            transform: translateX(60%) translateY(0px) rotate(0deg) scaleX(1) skewY(0deg);
            opacity: 0.8;
          }
        }
        
        @keyframes wavy2 {
          0% { 
            transform: translateX(-25%) translateY(0px) rotate(0deg) scaleX(1) skewY(0deg);
            opacity: 0.7;
          }
          16.7% { 
            transform: translateX(-15%) translateY(20px) rotate(-3deg) scaleX(1.2) skewY(-4deg);
            opacity: 1;
          }
          33.3% { 
            transform: translateX(-5%) translateY(30px) rotate(-6deg) scaleX(1.3) skewY(-6deg);
            opacity: 0.9;
          }
          50% { 
            transform: translateX(5%) translateY(15px) rotate(-2deg) scaleX(1.1) skewY(-2deg);
            opacity: 1;
          }
          66.7% { 
            transform: translateX(15%) translateY(-20px) rotate(3deg) scaleX(1.2) skewY(4deg);
            opacity: 0.8;
          }
          83.3% { 
            transform: translateX(25%) translateY(-30px) rotate(6deg) scaleX(1.3) skewY(6deg);
            opacity: 1;
          }
          100% { 
            transform: translateX(35%) translateY(-15px) rotate(2deg) scaleX(1.1) skewY(2deg);
            opacity: 0.7;
          }
        }
        
        @keyframes wavy3 {
          0% { 
            transform: translateX(-30%) translateY(0px) rotate(0deg) scaleX(1) skewY(0deg);
            opacity: 0.8;
          }
          20% { 
            transform: translateX(-20%) translateY(-18px) rotate(4deg) scaleX(1.1) skewY(4deg);
            opacity: 1;
          }
          40% { 
            transform: translateX(-10%) translateY(-28px) rotate(7deg) scaleX(1.2) skewY(6deg);
            opacity: 0.9;
          }
          60% { 
            transform: translateX(0%) translateY(-12px) rotate(3deg) scaleX(1.1) skewY(3deg);
            opacity: 1;
          }
          80% { 
            transform: translateX(10%) translateY(18px) rotate(-4deg) scaleX(1.1) skewY(-4deg);
            opacity: 0.8;
          }
          100% { 
            transform: translateX(20%) translateY(28px) rotate(-7deg) scaleX(1.2) skewY(-6deg);
            opacity: 1;
          }
        }
        
        @keyframes wavy4 {
          0% { 
            transform: translateX(-35%) translateY(0px) rotate(0deg) scaleX(1) skewY(0deg);
            opacity: 0.9;
          }
          14.3% { 
            transform: translateX(-25%) translateY(22px) rotate(-5deg) scaleX(1.2) skewY(-5deg);
            opacity: 1;
          }
          28.6% { 
            transform: translateX(-15%) translateY(35px) rotate(-8deg) scaleX(1.3) skewY(-7deg);
            opacity: 0.9;
          }
          42.9% { 
            transform: translateX(-5%) translateY(18px) rotate(-3deg) scaleX(1.1) skewY(-3deg);
            opacity: 1;
          }
          57.1% { 
            transform: translateX(5%) translateY(-22px) rotate(5deg) scaleX(1.2) skewY(5deg);
            opacity: 0.8;
          }
          71.4% { 
            transform: translateX(15%) translateY(-35px) rotate(8deg) scaleX(1.3) skewY(7deg);
            opacity: 1;
          }
          85.7% { 
            transform: translateX(25%) translateY(-18px) rotate(3deg) scaleX(1.1) skewY(3deg);
            opacity: 0.9;
          }
          100% { 
            transform: translateX(35%) translateY(0px) rotate(0deg) scaleX(1) skewY(0deg);
            opacity: 0.9;
          }
        }
        
        @keyframes wavy5 {
          0% { 
            transform: translateX(-40%) translateY(0px) rotate(0deg) scaleX(1) skewY(0deg);
            opacity: 0.6;
          }
          25% { 
            transform: translateX(-30%) translateY(-20px) rotate(6deg) scaleX(1.3) skewY(6deg);
            opacity: 1;
          }
          50% { 
            transform: translateX(-20%) translateY(-35px) rotate(10deg) scaleX(1.4) skewY(8deg);
            opacity: 0.8;
          }
          75% { 
            transform: translateX(-10%) translateY(-15px) rotate(4deg) scaleX(1.2) skewY(4deg);
            opacity: 1;
          }
          100% { 
            transform: translateX(0%) translateY(20px) rotate(-6deg) scaleX(1.3) skewY(-6deg);
            opacity: 0.6;
          }
        }
        
        @keyframes wavy6 {
          0% { 
            transform: translateX(-45%) translateY(0px) rotate(0deg) scaleX(1) skewY(0deg);
            opacity: 0.7;
          }
          12.5% { 
            transform: translateX(-35%) translateY(25px) rotate(-7deg) scaleX(1.2) skewY(-7deg);
            opacity: 1;
          }
          25% { 
            transform: translateX(-25%) translateY(40px) rotate(-12deg) scaleX(1.4) skewY(-10deg);
            opacity: 0.9;
          }
          37.5% { 
            transform: translateX(-15%) translateY(20px) rotate(-5deg) scaleX(1.1) skewY(-5deg);
            opacity: 1;
          }
          50% { 
            transform: translateX(-5%) translateY(-25px) rotate(7deg) scaleX(1.2) skewY(7deg);
            opacity: 0.8;
          }
          62.5% { 
            transform: translateX(5%) translateY(-40px) rotate(12deg) scaleX(1.4) skewY(10deg);
            opacity: 1;
          }
          75% { 
            transform: translateX(15%) translateY(-20px) rotate(5deg) scaleX(1.1) skewY(5deg);
            opacity: 0.9;
          }
          87.5% { 
            transform: translateX(25%) translateY(25px) rotate(-7deg) scaleX(1.2) skewY(-7deg);
            opacity: 1;
          }
          100% { 
            transform: translateX(35%) translateY(0px) rotate(0deg) scaleX(1) skewY(0deg);
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
