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
      {/* ELECTRICITY BUZZING THROUGH - POWERING THE CENTER */}
      
      <svg
        width="100%"
        height="100%"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {/* LEFT SIDE ELECTRICITY - Flowing RIGHT to power center */}
        
        {/* Electric Line 1 - Left to Right */}
        <path
          d="M 50,350 Q 200,320 400,350 Q 500,380 600,350"
          stroke="#00ffff"
          strokeWidth="3"
          fill="none"
          filter="drop-shadow(0 0 15px #00ffff)"
          style={{
            animation: 'electricLeft1 2s linear infinite',
          }}
        />
        
        {/* Electric Line 2 - Left to Right */}
        <path
          d="M 80,380 Q 250,350 450,380 Q 550,410 650,380"
          stroke="#3b82f6"
          strokeWidth="3"
          fill="none"
          filter="drop-shadow(0 0 15px #3b82f6)"
          style={{
            animation: 'electricLeft2 2.3s linear infinite',
          }}
        />
        
        {/* Electric Line 3 - Left to Right */}
        <path
          d="M 30,410 Q 180,380 380,410 Q 480,440 580,410"
          stroke="#6ea6ff"
          strokeWidth="3"
          fill="none"
          filter="drop-shadow(0 0 15px #6ea6ff)"
          style={{
            animation: 'electricLeft3 1.8s linear infinite',
          }}
        />
        
        {/* Electric Line 4 - Left to Right */}
        <path
          d="M 100,440 Q 280,410 480,440 Q 580,470 680,440"
          stroke="#00ffff"
          strokeWidth="3"
          fill="none"
          filter="drop-shadow(0 0 15px #00ffff)"
          style={{
            animation: 'electricLeft4 2.1s linear infinite',
          }}
        />
        
        {/* RIGHT SIDE ELECTRICITY - Flowing LEFT to power center */}
        
        {/* Electric Line 5 - Right to Left */}
        <path
          d="M 1150,350 Q 1000,320 800,350 Q 700,380 600,350"
          stroke="#ff00ff"
          strokeWidth="3"
          fill="none"
          filter="drop-shadow(0 0 15px #ff00ff)"
          style={{
            animation: 'electricRight1 2.2s linear infinite',
          }}
        />
        
        {/* Electric Line 6 - Right to Left */}
        <path
          d="M 1120,380 Q 950,350 750,380 Q 650,410 550,380"
          stroke="#9333ea"
          strokeWidth="3"
          fill="none"
          filter="drop-shadow(0 0 15px #9333ea)"
          style={{
            animation: 'electricRight2 1.9s linear infinite',
          }}
        />
        
        {/* Electric Line 7 - Right to Left */}
        <path
          d="M 1170,410 Q 1020,380 820,410 Q 720,440 620,410"
          stroke="#ff00ff"
          strokeWidth="3"
          fill="none"
          filter="drop-shadow(0 0 15px #ff00ff)"
          style={{
            animation: 'electricRight3 2.4s linear infinite',
          }}
        />
        
        {/* Electric Line 8 - Right to Left */}
        <path
          d="M 1100,440 Q 920,410 720,440 Q 620,470 520,440"
          stroke="#9333ea"
          strokeWidth="3"
          fill="none"
          filter="drop-shadow(0 0 15px #9333ea)"
          style={{
            animation: 'electricRight4 2.0s linear infinite',
          }}
        />
        
        {/* CENTER POWER ZONE - Where electricity converges */}
        <circle
          cx="600"
          cy="380"
          r="8"
          fill="#ffffff"
          filter="drop-shadow(0 0 25px #ffffff)"
          style={{
            animation: 'powerPulse 1s ease-in-out infinite',
          }}
        />
        
        {/* Additional electric sparks around center */}
        <path
          d="M 580,360 L 620,400 M 620,360 L 580,400"
          stroke="#ffffff"
          strokeWidth="2"
          filter="drop-shadow(0 0 10px #ffffff)"
          style={{
            animation: 'spark 0.5s ease-in-out infinite',
          }}
        />
      </svg>
      
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

      {/* CSS Animations - ELECTRICITY BUZZING THROUGH */}
      <style jsx>{`
        /* LEFT SIDE ELECTRICITY - Flowing RIGHT */
        @keyframes electricLeft1 {
          0% { 
            stroke-dasharray: 0 1000;
            stroke-dashoffset: 0;
            opacity: 0;
          }
          10% { 
            opacity: 1;
          }
          90% { 
            opacity: 1;
          }
          100% { 
            stroke-dasharray: 1000 0;
            stroke-dashoffset: -1000;
            opacity: 0;
          }
        }
        
        @keyframes electricLeft2 {
          0% { 
            stroke-dasharray: 0 1000;
            stroke-dashoffset: 0;
            opacity: 0;
          }
          10% { 
            opacity: 1;
          }
          90% { 
            opacity: 1;
          }
          100% { 
            stroke-dasharray: 1000 0;
            stroke-dashoffset: -1000;
            opacity: 0;
          }
        }
        
        @keyframes electricLeft3 {
          0% { 
            stroke-dasharray: 0 1000;
            stroke-dashoffset: 0;
            opacity: 0;
          }
          10% { 
            opacity: 1;
          }
          90% { 
            opacity: 1;
          }
          100% { 
            stroke-dasharray: 1000 0;
            stroke-dashoffset: -1000;
            opacity: 0;
          }
        }
        
        @keyframes electricLeft4 {
          0% { 
            stroke-dasharray: 0 1000;
            stroke-dashoffset: 0;
            opacity: 0;
          }
          10% { 
            opacity: 1;
          }
          90% { 
            opacity: 1;
          }
          100% { 
            stroke-dasharray: 1000 0;
            stroke-dashoffset: -1000;
            opacity: 0;
          }
        }
        
        /* RIGHT SIDE ELECTRICITY - Flowing LEFT */
        @keyframes electricRight1 {
          0% { 
            stroke-dasharray: 0 1000;
            stroke-dashoffset: 0;
            opacity: 0;
          }
          10% { 
            opacity: 1;
          }
          90% { 
            opacity: 1;
          }
          100% { 
            stroke-dasharray: 1000 0;
            stroke-dashoffset: 1000;
            opacity: 0;
          }
        }
        
        @keyframes electricRight2 {
          0% { 
            stroke-dasharray: 0 1000;
            stroke-dashoffset: 0;
            opacity: 0;
          }
          10% { 
            opacity: 1;
          }
          90% { 
            opacity: 1;
          }
          100% { 
            stroke-dasharray: 1000 0;
            stroke-dashoffset: 1000;
            opacity: 0;
          }
        }
        
        @keyframes electricRight3 {
          0% { 
            stroke-dasharray: 0 1000;
            stroke-dashoffset: 0;
            opacity: 0;
          }
          10% { 
            opacity: 1;
          }
          90% { 
            opacity: 1;
          }
          100% { 
            stroke-dasharray: 1000 0;
            stroke-dashoffset: 1000;
            opacity: 0;
          }
        }
        
        @keyframes electricRight4 {
          0% { 
            stroke-dasharray: 0 1000;
            stroke-dashoffset: 0;
            opacity: 0;
          }
          10% { 
            opacity: 1;
          }
          90% { 
            opacity: 1;
          }
          100% { 
            stroke-dasharray: 1000 0;
            stroke-dashoffset: 1000;
            opacity: 0;
          }
        }
        
        /* CENTER POWER ZONE */
        @keyframes powerPulse {
          0%, 100% { 
            r: 8;
            opacity: 1;
          }
          50% { 
            r: 15;
            opacity: 0.8;
          }
        }
        
        @keyframes spark {
          0%, 100% { 
            opacity: 0;
            transform: scale(0.5);
          }
          50% { 
            opacity: 1;
            transform: scale(1.2);
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
