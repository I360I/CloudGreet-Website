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
      {/* REAL CURVED LINES using SVG paths that actually bend and curve */}
      
      <svg
        width="100%"
        height="100%"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {/* Professional tight pattern - starts close together, wraps around button */}
        
        {/* Line 1 - Top tight curve around button */}
        <path
          d="M 200,400 Q 400,350 600,400 Q 800,450 1000,400"
          stroke="#3b82f6"
          strokeWidth="4"
          fill="none"
          filter="drop-shadow(0 0 15px #3b82f6)"
          style={{
            animation: 'tight1 6s ease-in-out infinite',
          }}
        />
        
        {/* Line 2 - Slightly below, tighter curve */}
        <path
          d="M 250,420 Q 450,370 650,420 Q 850,470 1050,420"
          stroke="#6ea6ff"
          strokeWidth="3"
          fill="none"
          filter="drop-shadow(0 0 12px #6ea6ff)"
          style={{
            animation: 'tight2 7s ease-in-out infinite',
          }}
        />
        
        {/* Line 3 - Bottom tight curve around button */}
        <path
          d="M 300,440 Q 500,390 700,440 Q 900,490 1100,440"
          stroke="#9333ea"
          strokeWidth="4"
          fill="none"
          filter="drop-shadow(0 0 15px #9333ea)"
          style={{
            animation: 'tight3 8s ease-in-out infinite',
          }}
        />
        
        {/* Line 4 - Inner tight curve */}
        <path
          d="M 350,410 Q 550,360 750,410 Q 950,460 1150,410"
          stroke="#3b82f6"
          strokeWidth="3"
          fill="none"
          filter="drop-shadow(0 0 12px #3b82f6)"
          style={{
            animation: 'tight4 5s ease-in-out infinite',
          }}
        />
        
        {/* Line 5 - Outer tight curve */}
        <path
          d="M 150,430 Q 350,380 550,430 Q 750,480 950,430"
          stroke="#6ea6ff"
          strokeWidth="3"
          fill="none"
          filter="drop-shadow(0 0 12px #6ea6ff)"
          style={{
            animation: 'tight5 9s ease-in-out infinite',
          }}
        />
        
        {/* Line 6 - Center tight curve */}
        <path
          d="M 275,415 Q 475,365 675,415 Q 875,465 1075,415"
          stroke="#9333ea"
          strokeWidth="2"
          fill="none"
          filter="drop-shadow(0 0 10px #9333ea)"
          style={{
            animation: 'tight6 6.5s ease-in-out infinite',
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

      {/* CSS Animations - CLEAN PROFESSIONAL TIGHT PATTERN */}
      <style jsx>{`
        @keyframes tight1 {
          0% { 
            d: path("M 200,400 Q 400,350 600,400 Q 800,450 1000,400");
            opacity: 0.9;
          }
          25% { 
            d: path("M 200,395 Q 400,345 600,395 Q 800,445 1000,395");
            opacity: 1;
          }
          50% { 
            d: path("M 200,405 Q 400,355 600,405 Q 800,455 1000,405");
            opacity: 0.9;
          }
          75% { 
            d: path("M 200,398 Q 400,348 600,398 Q 800,448 1000,398");
            opacity: 1;
          }
          100% { 
            d: path("M 200,400 Q 400,350 600,400 Q 800,450 1000,400");
            opacity: 0.9;
          }
        }
        
        @keyframes tight2 {
          0% { 
            d: path("M 250,420 Q 450,370 650,420 Q 850,470 1050,420");
            opacity: 0.8;
          }
          30% { 
            d: path("M 250,415 Q 450,365 650,415 Q 850,465 1050,415");
            opacity: 1;
          }
          60% { 
            d: path("M 250,425 Q 450,375 650,425 Q 850,475 1050,425");
            opacity: 0.9;
          }
          100% { 
            d: path("M 250,420 Q 450,370 650,420 Q 850,470 1050,420");
            opacity: 0.8;
          }
        }
        
        @keyframes tight3 {
          0% { 
            d: path("M 300,440 Q 500,390 700,440 Q 900,490 1100,440");
            opacity: 0.9;
          }
          20% { 
            d: path("M 300,435 Q 500,385 700,435 Q 900,485 1100,435");
            opacity: 1;
          }
          40% { 
            d: path("M 300,445 Q 500,395 700,445 Q 900,495 1100,445");
            opacity: 0.9;
          }
          60% { 
            d: path("M 300,438 Q 500,388 700,438 Q 900,488 1100,438");
            opacity: 1;
          }
          80% { 
            d: path("M 300,442 Q 500,392 700,442 Q 900,492 1100,442");
            opacity: 0.9;
          }
          100% { 
            d: path("M 300,440 Q 500,390 700,440 Q 900,490 1100,440");
            opacity: 0.9;
          }
        }
        
        @keyframes tight4 {
          0% { 
            d: path("M 350,410 Q 550,360 750,410 Q 950,460 1150,410");
            opacity: 0.8;
          }
          25% { 
            d: path("M 350,405 Q 550,355 750,405 Q 950,455 1150,405");
            opacity: 1;
          }
          50% { 
            d: path("M 350,415 Q 550,365 750,415 Q 950,465 1150,415");
            opacity: 0.9;
          }
          75% { 
            d: path("M 350,408 Q 550,358 750,408 Q 950,458 1150,408");
            opacity: 1;
          }
          100% { 
            d: path("M 350,410 Q 550,360 750,410 Q 950,460 1150,410");
            opacity: 0.8;
          }
        }
        
        @keyframes tight5 {
          0% { 
            d: path("M 150,430 Q 350,380 550,430 Q 750,480 950,430");
            opacity: 0.7;
          }
          33% { 
            d: path("M 150,425 Q 350,375 550,425 Q 750,475 950,425");
            opacity: 1;
          }
          66% { 
            d: path("M 150,435 Q 350,385 550,435 Q 750,485 950,435");
            opacity: 0.9;
          }
          100% { 
            d: path("M 150,430 Q 350,380 550,430 Q 750,480 950,430");
            opacity: 0.7;
          }
        }
        
        @keyframes tight6 {
          0% { 
            d: path("M 275,415 Q 475,365 675,415 Q 875,465 1075,415");
            opacity: 0.8;
          }
          40% { 
            d: path("M 275,410 Q 475,360 675,410 Q 875,460 1075,410");
            opacity: 1;
          }
          80% { 
            d: path("M 275,420 Q 475,370 675,420 Q 875,470 1075,420");
            opacity: 0.9;
          }
          100% { 
            d: path("M 275,415 Q 475,365 675,415 Q 875,465 1075,415");
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
