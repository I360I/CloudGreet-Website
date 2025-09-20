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
      {/* LIGHTNING-LIKE TANGLED WIRES - like your reference drawing */}
      
      <svg
        width="100%"
        height="100%"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {/* Tangled Wire 1 - Lightning-like, continuous, no ends */}
        <path
          d="M -200,300 Q 100,250 300,300 Q 500,350 700,300 Q 900,250 1100,300 Q 1300,350 1500,300"
          stroke="#3b82f6"
          strokeWidth="6"
          fill="none"
          filter="drop-shadow(0 0 20px #3b82f6)"
          style={{
            animation: 'tangle1 8s ease-in-out infinite',
          }}
        />
        
        {/* Tangled Wire 2 - Winding and tangling */}
        <path
          d="M -300,400 Q -100,350 100,400 Q 300,450 500,400 Q 700,350 900,400 Q 1100,450 1300,400 Q 1500,350 1700,400"
          stroke="#6ea6ff"
          strokeWidth="5"
          fill="none"
          filter="drop-shadow(0 0 18px #6ea6ff)"
          style={{
            animation: 'tangle2 10s ease-in-out infinite',
          }}
        />
        
        {/* Tangled Wire 3 - Curved and bent like lightning */}
        <path
          d="M -250,500 Q 50,450 250,500 Q 450,550 650,500 Q 850,450 1050,500 Q 1250,550 1450,500 Q 1650,450 1850,500"
          stroke="#9333ea"
          strokeWidth="6"
          fill="none"
          filter="drop-shadow(0 0 20px #9333ea)"
          style={{
            animation: 'tangle3 9s ease-in-out infinite',
          }}
        />
        
        {/* Tangled Wire 4 - Intertwining with others */}
        <path
          d="M -350,350 Q -150,300 50,350 Q 250,400 450,350 Q 650,300 850,350 Q 1050,400 1250,350 Q 1450,300 1650,350"
          stroke="#3b82f6"
          strokeWidth="4"
          fill="none"
          filter="drop-shadow(0 0 16px #3b82f6)"
          style={{
            animation: 'tangle4 7s ease-in-out infinite',
          }}
        />
        
        {/* Tangled Wire 5 - More complex tangling */}
        <path
          d="M -400,450 Q -200,400 0,450 Q 200,500 400,450 Q 600,400 800,450 Q 1000,500 1200,450 Q 1400,400 1600,450 Q 1800,500 2000,450"
          stroke="#6ea6ff"
          strokeWidth="5"
          fill="none"
          filter="drop-shadow(0 0 18px #6ea6ff)"
          style={{
            animation: 'tangle5 11s ease-in-out infinite',
          }}
        />
        
        {/* Tangled Wire 6 - Wraps around button area */}
        <path
          d="M -150,380 Q 150,330 350,380 Q 550,430 750,380 Q 950,330 1150,380 Q 1350,430 1550,380 Q 1750,330 1950,380"
          stroke="#9333ea"
          strokeWidth="4"
          fill="none"
          filter="drop-shadow(0 0 16px #9333ea)"
          style={{
            animation: 'tangle6 6s ease-in-out infinite',
          }}
        />
        
        {/* Tangled Wire 7 - Complex winding pattern */}
        <path
          d="M -100,420 Q 200,370 400,420 Q 600,470 800,420 Q 1000,370 1200,420 Q 1400,470 1600,420 Q 1800,370 2000,420"
          stroke="#3b82f6"
          strokeWidth="5"
          fill="none"
          filter="drop-shadow(0 0 18px #3b82f6)"
          style={{
            animation: 'tangle7 12s ease-in-out infinite',
          }}
        />
        
        {/* Tangled Wire 8 - Final intertwining wire */}
        <path
          d="M -500,480 Q -300,430 -100,480 Q 100,530 300,480 Q 500,430 700,480 Q 900,530 1100,480 Q 1300,430 1500,480 Q 1700,530 1900,480"
          stroke="#6ea6ff"
          strokeWidth="4"
          fill="none"
          filter="drop-shadow(0 0 16px #6ea6ff)"
          style={{
            animation: 'tangle8 8.5s ease-in-out infinite',
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

      {/* CSS Animations - LIGHTNING-LIKE TANGLED WIRE MOVEMENT */}
      <style jsx>{`
        @keyframes tangle1 {
          0% { 
            d: path("M -200,300 Q 100,250 300,300 Q 500,350 700,300 Q 900,250 1100,300 Q 1300,350 1500,300");
            opacity: 0.8;
          }
          25% { 
            d: path("M -200,280 Q 100,230 300,280 Q 500,330 700,280 Q 900,230 1100,280 Q 1300,330 1500,280");
            opacity: 1;
          }
          50% { 
            d: path("M -200,320 Q 100,270 300,320 Q 500,370 700,320 Q 900,270 1100,320 Q 1300,370 1500,320");
            opacity: 0.9;
          }
          75% { 
            d: path("M -200,290 Q 100,240 300,290 Q 500,340 700,290 Q 900,240 1100,290 Q 1300,340 1500,290");
            opacity: 1;
          }
          100% { 
            d: path("M -200,300 Q 100,250 300,300 Q 500,350 700,300 Q 900,250 1100,300 Q 1300,350 1500,300");
            opacity: 0.8;
          }
        }
        
        @keyframes tangle2 {
          0% { 
            d: path("M -300,400 Q -100,350 100,400 Q 300,450 500,400 Q 700,350 900,400 Q 1100,450 1300,400 Q 1500,350 1700,400");
            opacity: 0.7;
          }
          20% { 
            d: path("M -300,380 Q -100,330 100,380 Q 300,430 500,380 Q 700,330 900,380 Q 1100,430 1300,380 Q 1500,330 1700,380");
            opacity: 1;
          }
          40% { 
            d: path("M -300,420 Q -100,370 100,420 Q 300,470 500,420 Q 700,370 900,420 Q 1100,470 1300,420 Q 1500,370 1700,420");
            opacity: 0.9;
          }
          60% { 
            d: path("M -300,390 Q -100,340 100,390 Q 300,440 500,390 Q 700,340 900,390 Q 1100,440 1300,390 Q 1500,340 1700,390");
            opacity: 1;
          }
          80% { 
            d: path("M -300,410 Q -100,360 100,410 Q 300,460 500,410 Q 700,360 900,410 Q 1100,460 1300,410 Q 1500,360 1700,410");
            opacity: 0.8;
          }
          100% { 
            d: path("M -300,400 Q -100,350 100,400 Q 300,450 500,400 Q 700,350 900,400 Q 1100,450 1300,400 Q 1500,350 1700,400");
            opacity: 0.7;
          }
        }
        
        @keyframes tangle3 {
          0% { 
            d: path("M -250,500 Q 50,450 250,500 Q 450,550 650,500 Q 850,450 1050,500 Q 1250,550 1450,500 Q 1650,450 1850,500");
            opacity: 0.8;
          }
          30% { 
            d: path("M -250,480 Q 50,430 250,480 Q 450,530 650,480 Q 850,430 1050,480 Q 1250,530 1450,480 Q 1650,430 1850,480");
            opacity: 1;
          }
          60% { 
            d: path("M -250,520 Q 50,470 250,520 Q 450,570 650,520 Q 850,470 1050,520 Q 1250,570 1450,520 Q 1650,470 1850,520");
            opacity: 0.9;
          }
          100% { 
            d: path("M -250,500 Q 50,450 250,500 Q 450,550 650,500 Q 850,450 1050,500 Q 1250,550 1450,500 Q 1650,450 1850,500");
            opacity: 0.8;
          }
        }
        
        @keyframes tangle4 {
          0% { 
            d: path("M -350,350 Q -150,300 50,350 Q 250,400 450,350 Q 650,300 850,350 Q 1050,400 1250,350 Q 1450,300 1650,350");
            opacity: 0.8;
          }
          25% { 
            d: path("M -350,330 Q -150,280 50,330 Q 250,380 450,330 Q 650,280 850,330 Q 1050,380 1250,330 Q 1450,280 1650,330");
            opacity: 1;
          }
          50% { 
            d: path("M -350,370 Q -150,320 50,370 Q 250,420 450,370 Q 650,320 850,370 Q 1050,420 1250,370 Q 1450,320 1650,370");
            opacity: 0.9;
          }
          75% { 
            d: path("M -350,340 Q -150,290 50,340 Q 250,390 450,340 Q 650,290 850,340 Q 1050,390 1250,340 Q 1450,290 1650,340");
            opacity: 1;
          }
          100% { 
            d: path("M -350,350 Q -150,300 50,350 Q 250,400 450,350 Q 650,300 850,350 Q 1050,400 1250,350 Q 1450,300 1650,350");
            opacity: 0.8;
          }
        }
        
        @keyframes tangle5 {
          0% { 
            d: path("M -400,450 Q -200,400 0,450 Q 200,500 400,450 Q 600,400 800,450 Q 1000,500 1200,450 Q 1400,400 1600,450 Q 1800,500 2000,450");
            opacity: 0.7;
          }
          33% { 
            d: path("M -400,430 Q -200,380 0,430 Q 200,480 400,430 Q 600,380 800,430 Q 1000,480 1200,430 Q 1400,380 1600,430 Q 1800,480 2000,430");
            opacity: 1;
          }
          66% { 
            d: path("M -400,470 Q -200,420 0,470 Q 200,520 400,470 Q 600,420 800,470 Q 1000,520 1200,470 Q 1400,420 1600,470 Q 1800,520 2000,470");
            opacity: 0.9;
          }
          100% { 
            d: path("M -400,450 Q -200,400 0,450 Q 200,500 400,450 Q 600,400 800,450 Q 1000,500 1200,450 Q 1400,400 1600,450 Q 1800,500 2000,450");
            opacity: 0.7;
          }
        }
        
        @keyframes tangle6 {
          0% { 
            d: path("M -150,380 Q 150,330 350,380 Q 550,430 750,380 Q 950,330 1150,380 Q 1350,430 1550,380 Q 1750,330 1950,380");
            opacity: 0.8;
          }
          40% { 
            d: path("M -150,360 Q 150,310 350,360 Q 550,410 750,360 Q 950,310 1150,360 Q 1350,410 1550,360 Q 1750,310 1950,360");
            opacity: 1;
          }
          80% { 
            d: path("M -150,400 Q 150,350 350,400 Q 550,450 750,400 Q 950,350 1150,400 Q 1350,450 1550,400 Q 1750,350 1950,400");
            opacity: 0.9;
          }
          100% { 
            d: path("M -150,380 Q 150,330 350,380 Q 550,430 750,380 Q 950,330 1150,380 Q 1350,430 1550,380 Q 1750,330 1950,380");
            opacity: 0.8;
          }
        }
        
        @keyframes tangle7 {
          0% { 
            d: path("M -100,420 Q 200,370 400,420 Q 600,470 800,420 Q 1000,370 1200,420 Q 1400,470 1600,420 Q 1800,370 2000,420");
            opacity: 0.8;
          }
          25% { 
            d: path("M -100,400 Q 200,350 400,400 Q 600,450 800,400 Q 1000,350 1200,400 Q 1400,450 1600,400 Q 1800,350 2000,400");
            opacity: 1;
          }
          50% { 
            d: path("M -100,440 Q 200,390 400,440 Q 600,490 800,440 Q 1000,390 1200,440 Q 1400,490 1600,440 Q 1800,390 2000,440");
            opacity: 0.9;
          }
          75% { 
            d: path("M -100,410 Q 200,360 400,410 Q 600,460 800,410 Q 1000,360 1200,410 Q 1400,460 1600,410 Q 1800,360 2000,410");
            opacity: 1;
          }
          100% { 
            d: path("M -100,420 Q 200,370 400,420 Q 600,470 800,420 Q 1000,370 1200,420 Q 1400,470 1600,420 Q 1800,370 2000,420");
            opacity: 0.8;
          }
        }
        
        @keyframes tangle8 {
          0% { 
            d: path("M -500,480 Q -300,430 -100,480 Q 100,530 300,480 Q 500,430 700,480 Q 900,530 1100,480 Q 1300,430 1500,480 Q 1700,530 1900,480");
            opacity: 0.7;
          }
          30% { 
            d: path("M -500,460 Q -300,410 -100,460 Q 100,510 300,460 Q 500,410 700,460 Q 900,510 1100,460 Q 1300,410 1500,460 Q 1700,510 1900,460");
            opacity: 1;
          }
          60% { 
            d: path("M -500,500 Q -300,450 -100,500 Q 100,550 300,500 Q 500,450 700,500 Q 900,550 1100,500 Q 1300,450 1500,500 Q 1700,550 1900,500");
            opacity: 0.9;
          }
          100% { 
            d: path("M -500,480 Q -300,430 -100,480 Q 100,530 300,480 Q 500,430 700,480 Q 900,530 1100,480 Q 1300,430 1500,480 Q 1700,530 1900,480");
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
