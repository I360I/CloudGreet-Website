"use client";

import React, { Suspense, useState, useEffect } from 'react';
import PremiumParticleSystem from './PremiumParticleSystem';
import NeuralNetworkViz from './NeuralNetworkViz';
import HolographicGrid from './HolographicGrid';
import EnergyOrbs from './EnergyOrbs';
import DataStreams from './DataStreams';

/**
 * PremiumBackground.jsx
 * 
 * The ultimate $10,000 quality background animation system that combines:
 * - PremiumParticleSystem: Physics-based floating particles with glow effects
 * - NeuralNetworkViz: Animated neural network with pulsing energy
 * - HolographicGrid: 3D morphing grid with perspective and depth
 * - EnergyOrbs: Floating spheres with realistic lighting and physics
 * - DataStreams: Flowing data visualization with particles
 * 
 * All layers work together to create an absolutely stunning, professional-grade
 * background that will make your landing page look like a million-dollar product.
 */

export default function PremiumBackground({ 
  intensity = 1.0,
  enableParticles = true,
  enableNeuralNetwork = true,
  enableGrid = true,
  enableOrbs = true,
  enableDataStreams = true,
  className = ""
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [performanceMode, setPerformanceMode] = useState('high');

  // Detect performance capabilities
  useEffect(() => {
    const detectPerformance = () => {
      // Check for high DPI displays and device capabilities
      const isHighDPI = window.devicePixelRatio > 1.5;
      const isMobile = window.innerWidth < 768;
      const isLowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
      
      if (isMobile || isLowEnd) {
        setPerformanceMode('low');
      } else if (isHighDPI) {
        setPerformanceMode('high');
      } else {
        setPerformanceMode('medium');
      }
      
      setIsLoaded(true);
    };

    detectPerformance();
  }, []);

  // Performance-based configuration
  const getConfig = () => {
    switch (performanceMode) {
      case 'low':
        return {
          particleCount: 50,
          nodeCount: 15,
          orbCount: 4,
          streamCount: 3,
          gridSize: 80
        };
      case 'medium':
        return {
          particleCount: 100,
          nodeCount: 20,
          orbCount: 6,
          streamCount: 4,
          gridSize: 60
        };
      case 'high':
      default:
        return {
          particleCount: 150,
          nodeCount: 25,
          orbCount: 8,
          streamCount: 6,
          gridSize: 50
        };
    }
  };

  const config = getConfig();

  // Fallback for SSR or loading states
  if (!isLoaded) {
    return (
      <div
        className={`absolute inset-0 w-full h-full ${className}`}
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 50%, rgba(15, 23, 42, 0.9) 100%)',
          pointerEvents: 'none',
          zIndex: -1
        }}
      />
    );
  }

  return (
    <div
      className={`absolute inset-0 w-full h-full overflow-hidden ${className}`}
      style={{
        pointerEvents: 'none',
        zIndex: -1
      }}
    >
      {/* Base gradient background */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          background: `
            radial-gradient(ellipse at 20% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 40% 60%, rgba(6, 182, 212, 0.1) 0%, transparent 50%),
            linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 50%, rgba(15, 23, 42, 0.95) 100%)
          `,
        }}
      />

      {/* Animated background layers */}
      <Suspense fallback={null}>
        {/* Layer 1: Holographic Grid (furthest back) */}
        {enableGrid && (
          <HolographicGrid
            gridSize={config.gridSize}
            intensity={intensity * 0.6}
            colors={['#3B82F6', '#8B5CF6', '#06B6D4']}
            className="opacity-50"
          />
        )}

        {/* Layer 2: Data Streams */}
        {enableDataStreams && (
          <DataStreams
            streamCount={config.streamCount}
            intensity={intensity * 0.7}
            colors={['#3B82F6', '#8B5CF6', '#06B6D4', '#10B981']}
            className="opacity-60"
          />
        )}

        {/* Layer 3: Neural Network */}
        {enableNeuralNetwork && (
          <NeuralNetworkViz
            nodeCount={config.nodeCount}
            intensity={intensity * 0.8}
            colors={['#3B82F6', '#8B5CF6', '#06B6D4']}
            className="opacity-70"
          />
        )}

        {/* Layer 4: Particle System */}
        {enableParticles && (
          <PremiumParticleSystem
            particleCount={config.particleCount}
            intensity={intensity * 0.9}
            colors={['#3B82F6', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B']}
            className="opacity-80"
          />
        )}

        {/* Layer 5: Energy Orbs (closest to viewer) */}
        {enableOrbs && (
          <EnergyOrbs
            orbCount={config.orbCount}
            intensity={intensity}
            colors={['#3B82F6', '#8B5CF6', '#06B6D4', '#10B981']}
            className="opacity-90"
          />
        )}
      </Suspense>

      {/* Strong overlay for text readability */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.2) 100%)',
          mixBlendMode: 'multiply'
        }}
      />

      {/* Performance indicator (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div
          className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-xs font-mono"
          style={{ zIndex: 1000 }}
        >
          {performanceMode} mode
        </div>
      )}
    </div>
  );
}

// Export individual components for custom usage
export {
  PremiumParticleSystem,
  NeuralNetworkViz,
  HolographicGrid,
  EnergyOrbs,
  DataStreams
};
