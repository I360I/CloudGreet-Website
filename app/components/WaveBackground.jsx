"use client";

import React, { useRef, useEffect } from 'react';

/**
 * WaveBackground - Exact Match to Reference Image
 * 
 * Creates the exact purple wavy lines effect from the reference:
 * - Glowing electric purple waves
 * - Horizontal flowing motion across lower-middle section
 * - Organic, undulating patterns like sound waves
 * - Multiple overlapping layers with depth
 * - Positioned behind text elements
 */

export default function WaveBackground({ 
  intensity = 1.0,
  className = ""
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const timeRef = useRef(0);

  // Wave class matching the reference image exactly
  class ReferenceWave {
    constructor(canvas, index) {
      this.canvas = canvas;
      this.index = index;
      
      // Position in lower-middle section like the reference
      this.y = Math.random() * canvas.height * 0.3 + canvas.height * 0.4;
      this.amplitude = Math.random() * 25 + 15;
      this.frequency = Math.random() * 0.008 + 0.004;
      this.speed = Math.random() * 0.4 + 0.2;
      this.phase = Math.random() * Math.PI * 2;
      this.x = 0; // Start from left edge of screen
      
      // Visual properties - balanced brightness
      this.opacity = Math.random() * 0.5 + 0.3;
      this.width = Math.random() * 1.5 + 1;
      this.color = this.getElectricPurple();
      
      // Animation
      this.pulsePhase = Math.random() * Math.PI * 2;
      this.pulseSpeed = Math.random() * 0.015 + 0.005;
      
      // Wave characteristics
      this.waveLength = Math.random() * 100 + 50;
      this.complexity = Math.random() * 0.5 + 0.5;
    }

    getElectricPurple() {
      const skyBlues = [
        '#38BDF8', // sky-400
        '#0EA5E9', // sky-500
        '#0284C7', // sky-600
        '#22D3EE', // cyan-400
        '#06B6D4', // cyan-500
        '#7DD3FC', // sky-300
      ];
      return skyBlues[Math.floor(Math.random() * skyBlues.length)];
    }

    update(time) {
      this.phase += 0.008;
      this.pulsePhase += this.pulseSpeed;

      const pulse = Math.sin(this.pulsePhase) * 0.2 + 0.8;
      this.currentOpacity = this.opacity * pulse * intensity;
      this.currentAmplitude = this.amplitude * (0.9 + pulse * 0.2);
    }

    reset() {
      this.x = 0;
      // Reset to default position
      this.y = this.canvas.height * 0.5 + (this.index - 4) * 8;
      this.originalY = this.y;
      this.alignedToButton = false;
      this.phase = Math.random() * Math.PI * 2;
      this.color = this.getElectricPurple();
      this.waveLength = Math.random() * 100 + 50;
    }

    draw(ctx) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      
      // Create the electric purple glow effect spanning full width
      const gradient = ctx.createLinearGradient(
        0, this.y - this.currentAmplitude,
        this.canvas.width, this.y + this.currentAmplitude
      );
      
      // Helper function to create proper hex colors with alpha
      const createColorWithAlpha = (color, alpha) => {
        // Ensure alpha is between 0 and 1
        const clampedAlpha = Math.max(0, Math.min(1, alpha));
        const alphaHex = Math.floor(clampedAlpha * 255).toString(16).padStart(2, '0');
        return `${color}${alphaHex}`;
      };
      
      gradient.addColorStop(0, createColorWithAlpha(this.color, 0));
      gradient.addColorStop(0.2, createColorWithAlpha(this.color, this.currentOpacity * 0.1));
      gradient.addColorStop(0.4, createColorWithAlpha(this.color, this.currentOpacity * 0.4));
      gradient.addColorStop(0.6, createColorWithAlpha(this.color, this.currentOpacity * 0.8));
      gradient.addColorStop(0.8, createColorWithAlpha(this.color, this.currentOpacity));
      gradient.addColorStop(1, createColorWithAlpha(this.color, 0));
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = this.width;
      ctx.lineCap = 'round';
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 12;
      
      ctx.beginPath();
      
      // Draw the clean wave spanning the entire screen width
      for (let x = 0; x < this.canvas.width; x += 2) {
        // Create a cleaner, simpler wave pattern
        const baseWave = Math.sin((x * this.frequency) + this.phase) * this.currentAmplitude;
        const secondaryWave = Math.sin((x * this.frequency * 1.5) + this.phase * 1.2) * this.currentAmplitude * 0.2;
        
        const waveY = this.y + baseWave + secondaryWave;
        
        if (x === 0) {
          ctx.moveTo(x, waveY);
        } else {
          ctx.lineTo(x, waveY);
        }
      }
      
      ctx.stroke();
      
      // Add subtle glow layer
      ctx.strokeStyle = createColorWithAlpha(this.color, this.currentOpacity * 0.2);
      ctx.lineWidth = this.width * 1.8;
      ctx.shadowBlur = 12;
      ctx.stroke();
      
      ctx.restore();
    }
  }

  // Initialize waves
  const initializeWaves = (canvas) => {
    const waves = [];
    const waveCount = 8;

    for (let i = 0; i < waveCount; i++) {
      const wave = new ReferenceWave(canvas, i);
      // Anchor waves to the bottom third so they don't bisect hero text
      const spread = (i - waveCount / 2) * 8;
      wave.y = canvas.height * 0.78 + spread;
      wave.originalY = wave.y;
      waves.push(wave);
    }

    return waves;
  };

  // Animation loop
  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    timeRef.current += 16;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const waves = canvas._waves || [];
    waves.forEach(wave => {
      wave.update(timeRef.current);
      wave.draw(ctx);
    });

    animationRef.current = requestAnimationFrame(animate);
  };

  // Setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';

      const ctx = canvas.getContext('2d');
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      canvas._waves = initializeWaves({ width: rect.width, height: rect.height });
    };

    resizeCanvas();
    animationRef.current = requestAnimationFrame(animate);

    window.addEventListener('resize', resizeCanvas);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intensity]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{
        pointerEvents: 'none',
        zIndex: 1,
        opacity: intensity
      }}
    />
  );
}
