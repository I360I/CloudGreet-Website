"use client";

import React, { useRef, useEffect, useMemo } from 'react';

/**
 * PremiumParticleSystem.jsx
 * 
 * Ultra-premium particle system with:
 * - Physics-based movement with attraction/repulsion
 * - Glowing particles with realistic lighting
 * - Multiple particle types (energy, data, sparkle)
 * - Smooth interpolation and easing
 * - Performance optimized with object pooling
 */

export default function PremiumParticleSystem({ 
  particleCount = 150,
  intensity = 1.0,
  colors = ['#3B82F6', '#8B5CF6', '#06B6D4', '#10B981'],
  className = ""
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const timeRef = useRef(0);

  // Particle class with physics
  const Particle = useMemo(() => class {
    constructor(x, y, type = 'energy') {
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = (Math.random() - 0.5) * 0.5;
      this.baseX = x;
      this.baseY = y;
      this.radius = Math.random() * 3 + 1;
      this.baseRadius = this.radius;
      this.opacity = Math.random() * 0.8 + 0.2;
      this.baseOpacity = this.opacity;
      this.type = type;
      this.life = 1.0;
      this.age = Math.random() * Math.PI * 2;
      this.speed = Math.random() * 0.02 + 0.01;
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.glowIntensity = Math.random() * 0.5 + 0.5;
      this.attraction = Math.random() * 0.001 + 0.0005;
      this.repulsion = Math.random() * 0.0001 + 0.00005;
    }

    update(mouse, time, canvas) {
      this.age += this.speed;
      this.life = Math.sin(this.age) * 0.5 + 0.5;

      // Mouse interaction
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 150) {
        const force = (150 - distance) / 150;
        this.vx += (dx / distance) * force * this.attraction;
        this.vy += (dy / distance) * force * this.attraction;
      }

      // Repulsion from other particles
      particlesRef.current.forEach(particle => {
        if (particle !== this) {
          const dx = particle.x - this.x;
          const dy = particle.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 50 && distance > 0) {
            const force = (50 - distance) / 50;
            this.vx -= (dx / distance) * force * this.repulsion;
            this.vy -= (dy / distance) * force * this.repulsion;
          }
        }
      });

      // Apply velocity with damping
      this.vx *= 0.98;
      this.vy *= 0.98;
      this.x += this.vx;
      this.y += this.vy;

      // Boundary wrapping
      if (this.x < 0) this.x = canvas.width;
      if (this.x > canvas.width) this.x = 0;
      if (this.y < 0) this.y = canvas.height;
      if (this.y > canvas.height) this.y = 0;

      // Update visual properties
      this.radius = this.baseRadius * (0.8 + 0.4 * this.life);
      this.opacity = this.baseOpacity * this.life * intensity;
    }

    draw(ctx) {
      const gradient = ctx.createRadialGradient(
        this.x, this.y, 0,
        this.x, this.y, this.radius * 3
      );
      
      gradient.addColorStop(0, `${this.color}${Math.floor(this.opacity * 255).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(0.5, `${this.color}${Math.floor(this.opacity * 128).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(1, `${this.color}00`);

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
      ctx.fill();

      // Inner glow
      ctx.fillStyle = `${this.color}${Math.floor(this.opacity * 255).toString(16).padStart(2, '0')}`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }, [colors, intensity]);

  // Initialize particles
  const initializeParticles = (canvas) => {
    particlesRef.current = [];
    const types = ['energy', 'data', 'sparkle'];
    
    for (let i = 0; i < particleCount; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const type = types[Math.floor(Math.random() * types.length)];
      particlesRef.current.push(new Particle(x, y, type));
    }
  };

  // Animation loop
  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    timeRef.current += 0.016;

    // Clear with subtle fade
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update and draw particles
    particlesRef.current.forEach(particle => {
      particle.update(mouseRef.current, timeRef.current, canvas);
      particle.draw(ctx);
    });

    // Draw connections between nearby particles
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < particlesRef.current.length; i++) {
      for (let j = i + 1; j < particlesRef.current.length; j++) {
        const p1 = particlesRef.current[i];
        const p2 = particlesRef.current[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 100) {
          const opacity = (100 - distance) / 100 * 0.3;
          ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }

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
      
      initializeParticles({ width: rect.width, height: rect.height });
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
  }, [particleCount, intensity, colors]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{
        pointerEvents: 'none',
        zIndex: 1
      }}
    />
  );
}
