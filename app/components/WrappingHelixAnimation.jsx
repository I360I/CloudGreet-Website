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
        {/* Curved Line 1 - Bends around top text area */}
        <path
          d="M -100,200 Q 200,150 500,200 T 1200,200"
          stroke="#3b82f6"
          strokeWidth="8"
          fill="none"
          filter="drop-shadow(0 0 25px #3b82f6) drop-shadow(0 0 50px #6ea6ff)"
          style={{
            animation: 'curve1 8s ease-in-out infinite',
          }}
        />
        
        {/* Curved Line 2 - Bends around middle area */}
        <path
          d="M -150,350 Q 300,300 600,350 T 1250,350"
          stroke="#6ea6ff"
          strokeWidth="6"
          fill="none"
          filter="drop-shadow(0 0 20px #6ea6ff) drop-shadow(0 0 40px #9333ea)"
          style={{
            animation: 'curve2 10s ease-in-out infinite',
          }}
        />
        
        {/* Curved Line 3 - Bends around button area */}
        <path
          d="M -200,500 Q 400,450 700,500 T 1300,500"
          stroke="#9333ea"
          strokeWidth="7"
          fill="none"
          filter="drop-shadow(0 0 22px #9333ea) drop-shadow(0 0 44px #3b82f6)"
          style={{
            animation: 'curve3 9s ease-in-out infinite',
          }}
        />
        
        {/* Curved Line 4 - Bends around bottom area */}
        <path
          d="M -250,650 Q 500,600 800,650 T 1350,650"
          stroke="#3b82f6"
          strokeWidth="8"
          fill="none"
          filter="drop-shadow(0 0 25px #3b82f6) drop-shadow(0 0 50px #6ea6ff)"
          style={{
            animation: 'curve4 11s ease-in-out infinite',
          }}
        />
        
        {/* Curved Line 5 - Intertwining curve */}
        <path
          d="M -300,300 Q 100,250 400,300 T 1000,300 Q 1100,350 1200,300"
          stroke="#6ea6ff"
          strokeWidth="5"
          fill="none"
          filter="drop-shadow(0 0 18px #6ea6ff) drop-shadow(0 0 36px #9333ea)"
          style={{
            animation: 'curve5 7s ease-in-out infinite',
          }}
        />
        
        {/* Curved Line 6 - Complex intertwining curve */}
        <path
          d="M -350,550 Q 200,500 500,550 T 900,550 Q 1000,600 1100,550 T 1300,550"
          stroke="#9333ea"
          strokeWidth="6"
          fill="none"
          filter="drop-shadow(0 0 20px #9333ea) drop-shadow(0 0 40px #3b82f6)"
          style={{
            animation: 'curve6 12s ease-in-out infinite',
          }}
        />
        
        {/* Curved Line 7 - Wraps around button */}
        <path
          d="M -400,450 Q 0,400 300,450 Q 500,500 700,450 Q 900,400 1200,450"
          stroke="#3b82f6"
          strokeWidth="6"
          fill="none"
          filter="drop-shadow(0 0 30px #3b82f6) drop-shadow(0 0 60px #6ea6ff)"
          style={{
            animation: 'curve7 6s ease-in-out infinite',
          }}
        />
        
        {/* Curved Line 8 - Another intertwining curve */}
        <path
          d="M -450,400 Q -200,350 100,400 Q 300,450 500,400 Q 700,350 1000,400 Q 1200,450 1400,400"
          stroke="#6ea6ff"
          strokeWidth="5"
          fill="none"
          filter="drop-shadow(0 0 18px #6ea6ff) drop-shadow(0 0 36px #9333ea)"
          style={{
            animation: 'curve8 13s ease-in-out infinite',
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

      {/* CSS Animations - REAL CURVED SVG PATH ANIMATIONS */}
      <style jsx>{`
        @keyframes curve1 {
          0% { 
            d: path("M -100,200 Q 200,150 500,200 T 1200,200");
            opacity: 0.8;
          }
          25% { 
            d: path("M -100,180 Q 200,130 500,180 T 1200,180");
            opacity: 1;
          }
          50% { 
            d: path("M -100,220 Q 200,170 500,220 T 1200,220");
            opacity: 0.9;
          }
          75% { 
            d: path("M -100,190 Q 200,140 500,190 T 1200,190");
            opacity: 1;
          }
          100% { 
            d: path("M -100,200 Q 200,150 500,200 T 1200,200");
            opacity: 0.8;
          }
        }
        
        @keyframes curve2 {
          0% { 
            d: path("M -150,350 Q 300,300 600,350 T 1250,350");
            opacity: 0.7;
          }
          20% { 
            d: path("M -150,320 Q 300,270 600,320 T 1250,320");
            opacity: 1;
          }
          40% { 
            d: path("M -150,380 Q 300,330 600,380 T 1250,380");
            opacity: 0.9;
          }
          60% { 
            d: path("M -150,340 Q 300,290 600,340 T 1250,340");
            opacity: 1;
          }
          80% { 
            d: path("M -150,360 Q 300,310 600,360 T 1250,360");
            opacity: 0.8;
          }
          100% { 
            d: path("M -150,350 Q 300,300 600,350 T 1250,350");
            opacity: 0.7;
          }
        }
        
        @keyframes curve3 {
          0% { 
            d: path("M -200,500 Q 400,450 700,500 T 1300,500");
            opacity: 0.8;
          }
          30% { 
            d: path("M -200,470 Q 400,420 700,470 T 1300,470");
            opacity: 1;
          }
          60% { 
            d: path("M -200,530 Q 400,480 700,530 T 1300,530");
            opacity: 0.9;
          }
          100% { 
            d: path("M -200,500 Q 400,450 700,500 T 1300,500");
            opacity: 0.8;
          }
        }
        
        @keyframes curve4 {
          0% { 
            d: path("M -250,650 Q 500,600 800,650 T 1350,650");
            opacity: 0.9;
          }
          25% { 
            d: path("M -250,620 Q 500,570 800,620 T 1350,620");
            opacity: 1;
          }
          50% { 
            d: path("M -250,680 Q 500,630 800,680 T 1350,680");
            opacity: 0.8;
          }
          75% { 
            d: path("M -250,640 Q 500,590 800,640 T 1350,640");
            opacity: 1;
          }
          100% { 
            d: path("M -250,650 Q 500,600 800,650 T 1350,650");
            opacity: 0.9;
          }
        }
        
        @keyframes curve5 {
          0% { 
            d: path("M -300,300 Q 100,250 400,300 T 1000,300 Q 1100,350 1200,300");
            opacity: 0.6;
          }
          33% { 
            d: path("M -300,280 Q 100,230 400,280 T 1000,280 Q 1100,330 1200,280");
            opacity: 1;
          }
          66% { 
            d: path("M -300,320 Q 100,270 400,320 T 1000,320 Q 1100,370 1200,320");
            opacity: 0.8;
          }
          100% { 
            d: path("M -300,300 Q 100,250 400,300 T 1000,300 Q 1100,350 1200,300");
            opacity: 0.6;
          }
        }
        
        @keyframes curve6 {
          0% { 
            d: path("M -350,550 Q 200,500 500,550 T 900,550 Q 1000,600 1100,550 T 1300,550");
            opacity: 0.7;
          }
          25% { 
            d: path("M -350,520 Q 200,470 500,520 T 900,520 Q 1000,570 1100,520 T 1300,520");
            opacity: 1;
          }
          50% { 
            d: path("M -350,580 Q 200,530 500,580 T 900,580 Q 1000,630 1100,580 T 1300,580");
            opacity: 0.9;
          }
          75% { 
            d: path("M -350,540 Q 200,490 500,540 T 900,540 Q 1000,590 1100,540 T 1300,540");
            opacity: 1;
          }
          100% { 
            d: path("M -350,550 Q 200,500 500,550 T 900,550 Q 1000,600 1100,550 T 1300,550");
            opacity: 0.7;
          }
        }
        
        @keyframes curve7 {
          0% { 
            d: path("M -400,450 Q 0,400 300,450 Q 500,500 700,450 Q 900,400 1200,450");
            opacity: 0.8;
          }
          20% { 
            d: path("M -400,420 Q 0,370 300,420 Q 500,470 700,420 Q 900,370 1200,420");
            opacity: 1;
          }
          40% { 
            d: path("M -400,480 Q 0,430 300,480 Q 500,530 700,480 Q 900,430 1200,480");
            opacity: 0.9;
          }
          60% { 
            d: path("M -400,440 Q 0,390 300,440 Q 500,490 700,440 Q 900,390 1200,440");
            opacity: 1;
          }
          80% { 
            d: path("M -400,460 Q 0,410 300,460 Q 500,510 700,460 Q 900,410 1200,460");
            opacity: 0.8;
          }
          100% { 
            d: path("M -400,450 Q 0,400 300,450 Q 500,500 700,450 Q 900,400 1200,450");
            opacity: 0.8;
          }
        }
        
        @keyframes curve8 {
          0% { 
            d: path("M -450,400 Q -200,350 100,400 Q 300,450 500,400 Q 700,350 1000,400 Q 1200,450 1400,400");
            opacity: 0.7;
          }
          16% { 
            d: path("M -450,370 Q -200,320 100,370 Q 300,420 500,370 Q 700,320 1000,370 Q 1200,420 1400,370");
            opacity: 1;
          }
          32% { 
            d: path("M -450,430 Q -200,380 100,430 Q 300,480 500,430 Q 700,380 1000,430 Q 1200,480 1400,430");
            opacity: 0.9;
          }
          48% { 
            d: path("M -450,390 Q -200,340 100,390 Q 300,440 500,390 Q 700,340 1000,390 Q 1200,440 1400,390");
            opacity: 1;
          }
          64% { 
            d: path("M -450,410 Q -200,360 100,410 Q 300,460 500,410 Q 700,360 1000,410 Q 1200,460 1400,410");
            opacity: 0.8;
          }
          80% { 
            d: path("M -450,380 Q -200,330 100,380 Q 300,430 500,380 Q 700,330 1000,380 Q 1200,430 1400,380");
            opacity: 1;
          }
          100% { 
            d: path("M -450,400 Q -200,350 100,400 Q 300,450 500,400 Q 700,350 1000,400 Q 1200,450 1400,400");
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
