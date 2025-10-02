"use client";

import React from 'react';

/**
 * Simple, clean background that definitely works
 * Using Tailwind classes and inline styles to avoid CSP issues
 */
export default function SimpleBackground() {
  return (
    <>
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-emerald-500/10 pointer-events-none z-0" />
      
      {/* Animated floating elements using custom CSS animations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-1">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className={`absolute w-2 h-2 rounded-full bg-blue-400/30 animate-float-gentle`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}
        
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={`purple-${i}`}
            className={`absolute w-1 h-1 rounded-full bg-purple-400/40 animate-drift-slow`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 1.5}s`,
            }}
          />
        ))}
        
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={`green-${i}`}
            className={`absolute w-3 h-3 rounded-full bg-emerald-400/20 animate-pulse-soft`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.8}s`,
            }}
          />
        ))}
        
        {/* Large floating orbs */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={`orb-${i}`}
            className={`absolute w-16 h-16 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 animate-float-gentle`}
            style={{
              left: `${20 + i * 30}%`,
              top: `${30 + i * 20}%`,
              animationDelay: `${i * 2}s`,
              animationDuration: '12s',
            }}
          />
        ))}
      </div>
    </>
  );
}
