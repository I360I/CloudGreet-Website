"use client";

import React, { useRef, useEffect, useCallback } from 'react';

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
  const buttonRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

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
      const vibrantPurples = [
        '#8B5CF6', // Purple-500 - bright and vibrant
        '#A855F7', // Purple-600 - rich and electric
        '#9333EA', // Purple-700 - deep and glowing
        '#C084FC', // Purple-400 - bright and luminous
        '#A78BFA', // Purple-500 - more saturated purple
        '#8B5CF6', // Purple-500 - consistent vibrant purple
      ];
      return vibrantPurples[Math.floor(Math.random() * vibrantPurples.length)];
    }

    update(time, button) {
      // No horizontal movement - waves stay in position
      this.phase += 0.008;
      this.pulsePhase += this.pulseSpeed;
      
        // Enhanced button interaction - waves create magnetic field around button
        if (button && button.width > 0) {
          const buttonCenterX = button.x + button.width / 2;
          const buttonCenterY = button.y + button.height / 2;
          const buttonRadius = Math.max(button.width, button.height) / 2 + 40;
          
          // First, align waves to button level with more attraction
          if (!this.alignedToButton) {
            const targetY = buttonCenterY + (this.index - 4) * 12; // Spread around button
            this.y += (targetY - this.y) * 0.15; // Stronger alignment
            this.originalY = targetY;
            
            // Mark as aligned when close enough
            if (Math.abs(this.y - targetY) < 8) {
              this.alignedToButton = true;
            }
          }
          
          // MAGNETIC FIELD EFFECT - Waves are attracted then repelled
          const horizontalDistance = Math.abs(this.x - buttonCenterX);
          const verticalDistance = Math.abs(this.y - buttonCenterY);
          const totalDistance = Math.sqrt(horizontalDistance * horizontalDistance + verticalDistance * verticalDistance);
          
          // Create a magnetic field around the button
          const magneticRadius = buttonRadius * 1.5;
          
          if (totalDistance < magneticRadius * 2) {
            // Check if wave is in the button's vertical space
            const buttonTop = buttonCenterY - buttonRadius;
            const buttonBottom = buttonCenterY + buttonRadius;
            
            // MAGNETIC REPULSION - Waves flow around button like magnetic field
            if (this.y >= buttonTop && this.y <= buttonBottom) {
              // Wave is in button's vertical space - create magnetic deflection
              const deflectionStrength = 1 - (totalDistance / (magneticRadius * 2));
              
              if (this.y < buttonCenterY) {
                // Wave is in upper half - push it up with magnetic force
                this.y = buttonTop - (30 + deflectionStrength * 40);
              } else {
                // Wave is in lower half - push it down with magnetic force
                this.y = buttonBottom + (30 + deflectionStrength * 40);
              }
            }
            
            // Additional magnetic field effect - waves curve around button
            if (horizontalDistance < magneticRadius) {
              const magneticForce = (1 - horizontalDistance / magneticRadius) * 0.3;
              if (this.x < buttonCenterX) {
                this.y += Math.sin(time * 0.01) * magneticForce * 5; // Slight wave distortion
              } else {
                this.y += Math.sin(time * 0.01 + Math.PI) * magneticForce * 5; // Opposite distortion
              }
            }
          }
        }
      
      // Dynamic pulsing - balanced
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

  // Button tracking
  const updateButtonPosition = useCallback(() => {
    const button = document.querySelector('[data-cta-button]');
    if (button && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      
      buttonRef.current = {
        x: buttonRect.left - canvasRect.left,
        y: buttonRect.top - canvasRect.top,
        width: buttonRect.width,
        height: buttonRect.height
      };
      
      // Debug: log button position
      // Console log removed for production
    } else {
      // Console log removed for production
    }
  }, []);

  // Initialize waves
  const initializeWaves = (canvas) => {
    const waves = [];
    const waveCount = 8; // Fewer waves for cleaner effect
    
    // Create waves that will align with button when it's detected
    for (let i = 0; i < waveCount; i++) {
      const wave = new ReferenceWave(canvas, i);
      
      // Start with default positioning - will be adjusted when button is detected
      const spread = (i - waveCount / 2) * 8; // Small vertical spread
      wave.y = canvas.height * 0.5 + spread;
      wave.originalY = wave.y; // Store original position
      
      waves.push(wave);
    }
    
    return waves;
  };

  // Animation loop
  const animate = (currentTime) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    timeRef.current += 16;

    // Clear with subtle fade for trail effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.015)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Get waves from canvas data attribute
    const waves = canvas._waves || [];
    
    // Update and draw waves
    waves.forEach(wave => {
      wave.update(timeRef.current, buttonRef.current);
      wave.draw(ctx);
    });

    animationRef.current = requestAnimationFrame(animate);
  };

  // Setup - FIXED: Only run once on mount, prevent re-initialization on scroll
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Only initialize once - prevent re-initialization
    if (canvas._initialized) return;
    canvas._initialized = true;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      
      const ctx = canvas.getContext('2d');
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      
      // Only initialize waves if they don't exist
      if (!canvas._waves) {
        canvas._waves = initializeWaves({ width: rect.width, height: rect.height });
      }
    };

    resizeCanvas();
    animationRef.current = requestAnimationFrame(animate);

    // Update button position periodically
    const buttonUpdateInterval = setInterval(updateButtonPosition, 100);

    window.addEventListener('resize', resizeCanvas);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      clearInterval(buttonUpdateInterval);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []); // Empty deps - only run once on mount

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
