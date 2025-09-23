"use client";

import React, { useRef, useEffect, useMemo } from 'react';

/**
 * EnergyOrbs.jsx
 * 
 * Premium floating energy orbs with:
 * - Realistic 3D lighting and shadows
 * - Physics-based movement and collision
 * - Dynamic color shifting and pulsing
 * - Energy trails and particle effects
 * - Interactive mouse attraction/repulsion
 */

export default function EnergyOrbs({ 
  orbCount = 8,
  intensity = 1.0,
  colors = ['#3B82F6', '#8B5CF6', '#06B6D4', '#10B981'],
  className = ""
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const orbsRef = useRef([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const timeRef = useRef(0);

  // Energy orb class
  const EnergyOrb = useMemo(() => class {
    constructor(x, y, canvas) {
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = (Math.random() - 0.5) * 0.5;
      this.radius = Math.random() * 30 + 20;
      this.baseRadius = this.radius;
      this.mass = this.radius * 0.1;
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.baseColor = this.color;
      this.opacity = Math.random() * 0.6 + 0.4;
      this.baseOpacity = this.opacity;
      this.energy = 0;
      this.targetEnergy = 0;
      this.pulsePhase = Math.random() * Math.PI * 2;
      this.pulseSpeed = Math.random() * 0.02 + 0.01;
      this.rotation = 0;
      this.rotationSpeed = (Math.random() - 0.5) * 0.02;
      this.trail = [];
      this.maxTrailLength = 20;
      this.canvas = canvas;
      this.lightAngle = Math.random() * Math.PI * 2;
      this.lightIntensity = Math.random() * 0.5 + 0.5;
    }

    update(mouse, time) {
      this.pulsePhase += this.pulseSpeed;
      this.rotation += this.rotationSpeed;

      // Add current position to trail
      this.trail.push({ x: this.x, y: this.y, time: time });
      if (this.trail.length > this.maxTrailLength) {
        this.trail.shift();
      }

      // Mouse interaction
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 200) {
        const force = (200 - distance) / 200;
        const attraction = Math.sin(time * 0.001) * 0.5 + 0.5; // Oscillating attraction/repulsion
        
        if (attraction > 0.5) {
          // Attraction
          this.vx += (dx / distance) * force * 0.001;
          this.vy += (dy / distance) * force * 0.001;
        } else {
          // Repulsion
          this.vx -= (dx / distance) * force * 0.001;
          this.vy -= (dy / distance) * force * 0.001;
        }
      }

      // Collision with other orbs
      orbsRef.current.forEach(orb => {
        if (orb !== this) {
          const dx = orb.x - this.x;
          const dy = orb.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = this.radius + orb.radius;
          
          if (distance < minDistance && distance > 0) {
            // Collision response
            const overlap = minDistance - distance;
            const separationX = (dx / distance) * overlap * 0.5;
            const separationY = (dy / distance) * overlap * 0.5;
            
            this.x -= separationX;
            this.y -= separationY;
            orb.x += separationX;
            orb.y += separationY;
            
            // Energy transfer
            this.targetEnergy = Math.min(1, this.targetEnergy + 0.1);
            orb.targetEnergy = Math.min(1, orb.targetEnergy + 0.1);
          }
        }
      });

      // Boundary bouncing
      if (this.x - this.radius < 0) {
        this.x = this.radius;
        this.vx = Math.abs(this.vx) * 0.8;
      }
      if (this.x + this.radius > this.canvas.width) {
        this.x = this.canvas.width - this.radius;
        this.vx = -Math.abs(this.vx) * 0.8;
      }
      if (this.y - this.radius < 0) {
        this.y = this.radius;
        this.vy = Math.abs(this.vy) * 0.8;
      }
      if (this.y + this.radius > this.canvas.height) {
        this.y = this.canvas.height - this.radius;
        this.vy = -Math.abs(this.vy) * 0.8;
      }

      // Apply velocity with damping
      this.vx *= 0.995;
      this.vy *= 0.995;
      this.x += this.vx;
      this.y += this.vy;

      // Energy pulsing
      this.energy += (this.targetEnergy - this.energy) * 0.1;
      
      // Random energy spikes
      if (Math.random() < 0.01) {
        this.targetEnergy = Math.random() * 0.8 + 0.2;
      } else {
        this.targetEnergy *= 0.98;
      }

      // Update visual properties
      const pulse = Math.sin(this.pulsePhase) * 0.3 + 0.7;
      this.radius = this.baseRadius * (0.8 + 0.4 * pulse * this.energy);
      this.opacity = this.baseOpacity * (0.6 + 0.4 * this.energy) * intensity;
      
      // Color shifting
      const hueShift = Math.sin(time * 0.001 + this.pulsePhase) * 30;
      this.color = this.shiftHue(this.baseColor, hueShift);
    }

    shiftHue(hex, degrees) {
      // Convert hex to HSL, shift hue, convert back
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h, s, l = (max + min) / 2;
      
      if (max === min) {
        h = s = 0;
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      
      h = (h + degrees / 360) % 1;
      if (h < 0) h += 1;
      
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      let newR, newG, newB;
      if (s === 0) {
        newR = newG = newB = l;
      } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        newR = hue2rgb(p, q, h + 1/3);
        newG = hue2rgb(p, q, h);
        newB = hue2rgb(p, q, h - 1/3);
      }
      
      const toHex = (c) => {
        const hex = Math.round(c * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      };
      
      return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
    }

    draw(ctx) {
      // Draw trail
      if (this.trail.length > 1) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        
        for (let i = 1; i < this.trail.length; i++) {
          const point = this.trail[i];
          const prevPoint = this.trail[i - 1];
          const age = (this.trail.length - i) / this.trail.length;
          
          ctx.strokeStyle = `${this.color}${Math.floor(age * this.opacity * 100).toString(16).padStart(2, '0')}`;
          ctx.lineWidth = age * 3;
          ctx.lineCap = 'round';
          
          ctx.beginPath();
          ctx.moveTo(prevPoint.x, prevPoint.y);
          ctx.lineTo(point.x, point.y);
          ctx.stroke();
        }
        
        ctx.restore();
      }

      // Draw orb
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      
      // Outer glow
      const outerGradient = ctx.createRadialGradient(
        this.x, this.y, 0,
        this.x, this.y, this.radius * 3
      );
      outerGradient.addColorStop(0, `${this.color}${Math.floor(this.opacity * 100).toString(16).padStart(2, '0')}`);
      outerGradient.addColorStop(0.5, `${this.color}${Math.floor(this.opacity * 50).toString(16).padStart(2, '0')}`);
      outerGradient.addColorStop(1, `${this.color}00`);

      ctx.fillStyle = outerGradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
      ctx.fill();

      // Main orb with 3D lighting
      const mainGradient = ctx.createRadialGradient(
        this.x - this.radius * 0.3, this.y - this.radius * 0.3, 0,
        this.x, this.y, this.radius
      );
      
      // Light source
      const lightX = this.x + Math.cos(this.lightAngle) * this.radius * 0.5;
      const lightY = this.y + Math.sin(this.lightAngle) * this.radius * 0.5;
      
      mainGradient.addColorStop(0, `rgba(255, 255, 255, ${this.opacity * 0.8})`);
      mainGradient.addColorStop(0.3, `${this.color}${Math.floor(this.opacity * 255).toString(16).padStart(2, '0')}`);
      mainGradient.addColorStop(0.7, `${this.color}${Math.floor(this.opacity * 200).toString(16).padStart(2, '0')}`);
      mainGradient.addColorStop(1, `${this.color}${Math.floor(this.opacity * 100).toString(16).padStart(2, '0')}`);

      ctx.fillStyle = mainGradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();

      // Highlight
      if (this.energy > 0.3) {
        const highlightGradient = ctx.createRadialGradient(
          lightX, lightY, 0,
          lightX, lightY, this.radius * 0.4
        );
        highlightGradient.addColorStop(0, `rgba(255, 255, 255, ${this.energy * 0.9})`);
        highlightGradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

        ctx.fillStyle = highlightGradient;
        ctx.beginPath();
        ctx.arc(lightX, lightY, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Energy particles around the orb
      if (this.energy > 0.4) {
        const particleCount = Math.floor(this.energy * 8);
        for (let i = 0; i < particleCount; i++) {
          const angle = (i / particleCount) * Math.PI * 2 + this.rotation;
          const distance = this.radius + Math.sin(timeRef.current * 0.01 + i) * 10;
          const px = this.x + Math.cos(angle) * distance;
          const py = this.y + Math.sin(angle) * distance;
          
          ctx.fillStyle = `rgba(255, 255, 255, ${this.energy * 0.8})`;
          ctx.beginPath();
          ctx.arc(px, py, 1 + this.energy * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }
  }, [colors, intensity]);

  // Initialize orbs
  const initializeOrbs = (canvas) => {
    orbsRef.current = [];
    
    for (let i = 0; i < orbCount; i++) {
      const x = Math.random() * (canvas.width - 100) + 50;
      const y = Math.random() * (canvas.height - 100) + 50;
      orbsRef.current.push(new EnergyOrb(x, y, canvas));
    }
  };

  // Animation loop
  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    timeRef.current += 16;

    // Clear with subtle fade
    ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update and draw orbs
    orbsRef.current.forEach(orb => {
      orb.update(mouseRef.current, timeRef.current);
      orb.draw(ctx);
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
      
      initializeOrbs({ width: rect.width, height: rect.height });
    };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    resizeCanvas();
    animate();

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [orbCount, intensity, colors]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{
        pointerEvents: 'none',
        zIndex: 3
      }}
    />
  );
}
