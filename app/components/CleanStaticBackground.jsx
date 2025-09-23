import React from 'react';

/**
 * CleanStaticBackground.jsx
 * 
 * Simple, elegant static background with subtle tech elements
 * No complex animations - just clean, professional design
 */
export default function CleanStaticBackground() {
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
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/10 to-blue-500/5"></div>
      
      {/* Simple geometric elements */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-xl"></div>
      <div className="absolute bottom-32 right-32 w-48 h-48 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-full blur-xl"></div>
      <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-gradient-to-br from-blue-400/15 to-purple-400/15 rounded-full blur-lg"></div>
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="h-full w-full" style={{
          backgroundImage: `
            linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}></div>
      </div>
      
      {/* Floating particles */}
      <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400/30 rounded-full blur-sm"></div>
      <div className="absolute top-3/4 left-1/2 w-1 h-1 bg-purple-400/40 rounded-full blur-sm"></div>
      <div className="absolute top-1/2 left-3/4 w-1.5 h-1.5 bg-blue-300/35 rounded-full blur-sm"></div>
      <div className="absolute top-1/3 left-2/3 w-1 h-1 bg-purple-300/45 rounded-full blur-sm"></div>
      <div className="absolute top-2/3 left-1/5 w-2 h-2 bg-blue-500/25 rounded-full blur-sm"></div>
    </div>
  );
}

