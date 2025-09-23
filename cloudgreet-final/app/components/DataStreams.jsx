"use client";

import React, { useRef, useEffect, useMemo } from 'react';

/**
 * DataStreams.jsx
 * 
 * Premium data stream visualization with:
 * - Flowing data particles with realistic physics
 * - Multiple stream types (binary, hex, symbols)
 * - Dynamic stream paths and morphing
 * - Energy flow visualization
 * - Interactive stream generation
 */

export default function DataStreams({ 
  streamCount = 6,
  intensity = 1.0,
  colors = ['#3B82F6', '#8B5CF6', '#06B6D4'],
  className = ""
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const streamsRef = useRef([]);
  const timeRef = useRef(0);

  // Data particle class
  const DataParticle = useMemo(() => class {
    constructor(x, y, stream) {
      this.x = x;
      this.y = y;
      this.vx = 0;
      this.vy = 0;
      this.stream = stream;
      this.speed = Math.random() * 2 + 1;
      this.life = 1.0;
      this.maxLife = Math.random() * 200 + 100;
      this.age = 0;
      this.size = Math.random() * 3 + 1;
      this.opacity = Math.random() * 0.8 + 0.2;
      this.color = stream.color;
      this.char = this.getRandomChar();
      this.rotation = 0;
      this.rotationSpeed = (Math.random() - 0.5) * 0.1;
      this.glowIntensity = Math.random() * 0.5 + 0.5;
    }

    getRandomChar() {
      const chars = {
        binary: ['0', '1'],
        hex: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'],
        symbols: ['@', '#', '$', '%', '&', '*', '+', '-', '=', '<', '>', '?', '!'],
        letters: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
      };
      
      const charSet = chars[this.stream.type] || chars.binary;
      return charSet[Math.floor(Math.random() * charSet.length)];
    }

    update() {
      this.age++;
      this.life = 1 - (this.age / this.maxLife);
      
      if (this.life <= 0) return false;

      // Follow stream path
      const streamPoint = this.stream.getPointAtProgress(this.age / this.maxLife);
      const targetX = streamPoint.x;
      const targetY = streamPoint.y;
      
      // Smooth movement towards stream path
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0) {
        this.vx += (dx / distance) * 0.1;
        this.vy += (dy / distance) * 0.1;
      }
      
      // Apply velocity with damping
      this.vx *= 0.95;
      this.vy *= 0.95;
      this.x += this.vx;
      this.y += this.vy;
      
      this.rotation += this.rotationSpeed;
      
      // Update visual properties
      this.opacity = this.life * 0.8 * intensity;
      this.size = (1 + this.life) * 2;
      
      return true;
    }

    draw(ctx) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      
      // Glow effect
      const glowGradient = ctx.createRadialGradient(
        this.x, this.y, 0,
        this.x, this.y, this.size * 3
      );
      glowGradient.addColorStop(0, `${this.color}${Math.floor(this.opacity * 100).toString(16).padStart(2, '0')}`);
      glowGradient.addColorStop(0.5, `${this.color}${Math.floor(this.opacity * 50).toString(16).padStart(2, '0')}`);
      glowGradient.addColorStop(1, `${this.color}00`);

      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
      ctx.fill();

      // Character
      ctx.fillStyle = `${this.color}${Math.floor(this.opacity * 255).toString(16).padStart(2, '0')}`;
      ctx.font = `${this.size * 8}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.rotate(this.rotation);
      ctx.fillText(this.char, this.x, this.y);
      
      ctx.restore();
    }
  }, [intensity]);

  // Data stream class
  const DataStream = useMemo(() => class {
    constructor(x, y, canvas, type = 'binary') {
      this.startX = x;
      this.startY = y;
      this.canvas = canvas;
      this.type = type;
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.particles = [];
      this.path = this.generatePath();
      this.energy = 0;
      this.targetEnergy = 0;
      this.pulsePhase = Math.random() * Math.PI * 2;
      this.pulseSpeed = Math.random() * 0.02 + 0.01;
      this.spawnRate = Math.random() * 0.3 + 0.1;
      this.lastSpawn = 0;
    }

    generatePath() {
      const points = [];
      const segments = 20;
      
      for (let i = 0; i <= segments; i++) {
        const progress = i / segments;
        const x = this.startX + (this.canvas.width - this.startX) * progress;
        const y = this.startY + Math.sin(progress * Math.PI * 3) * 100 + 
                  Math.sin(progress * Math.PI * 7) * 30 +
                  (Math.random() - 0.5) * 50;
        
        points.push({ x, y });
      }
      
      return points;
    }

    getPointAtProgress(progress) {
      const index = progress * (this.path.length - 1);
      const i = Math.floor(index);
      const t = index - i;
      
      if (i >= this.path.length - 1) {
        return this.path[this.path.length - 1];
      }
      
      const p1 = this.path[i];
      const p2 = this.path[i + 1];
      
      return {
        x: p1.x + (p2.x - p1.x) * t,
        y: p1.y + (p2.y - p1.y) * t
      };
    }

    update(time) {
      this.pulsePhase += this.pulseSpeed;
      
      // Energy pulsing
      this.energy += (this.targetEnergy - this.energy) * 0.1;
      
      // Random energy spikes
      if (Math.random() < 0.01) {
        this.targetEnergy = Math.random() * 0.8 + 0.2;
      } else {
        this.targetEnergy *= 0.98;
      }

      // Spawn new particles
      if (time - this.lastSpawn > this.spawnRate * 1000) {
        const spawnPoint = this.getPointAtProgress(0);
        this.particles.push(new DataParticle(spawnPoint.x, spawnPoint.y, this));
        this.lastSpawn = time;
      }

      // Update particles
      this.particles = this.particles.filter(particle => particle.update());
    }

    draw(ctx) {
      // Draw stream path
      if (this.energy > 0.2) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        
        ctx.strokeStyle = `${this.color}${Math.floor(this.energy * 100).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 2 + this.energy * 3;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(this.path[0].x, this.path[0].y);
        
        for (let i = 1; i < this.path.length; i++) {
          ctx.lineTo(this.path[i].x, this.path[i].y);
        }
        
        ctx.stroke();
        
        // Energy flow particles along the path
        if (this.energy > 0.4) {
          const flowParticleCount = Math.floor(this.energy * 5);
          for (let i = 0; i < flowParticleCount; i++) {
            const progress = (timeRef.current * 0.001 + i * 0.2) % 1;
            const point = this.getPointAtProgress(progress);
            
            ctx.fillStyle = `rgba(255, 255, 255, ${this.energy * 0.8})`;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 1 + this.energy * 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        
        ctx.restore();
      }

      // Draw particles
      this.particles.forEach(particle => particle.draw(ctx));
    }
  }, [colors, DataParticle]);

  // Initialize streams
  const initializeStreams = (canvas) => {
    streamsRef.current = [];
    const types = ['binary', 'hex', 'symbols', 'letters'];
    
    for (let i = 0; i < streamCount; i++) {
      const x = 0;
      const y = (canvas.height / (streamCount + 1)) * (i + 1) + (Math.random() - 0.5) * 100;
      const type = types[i % types.length];
      
      streamsRef.current.push(new DataStream(x, y, canvas, type));
    }
  };

  // Animation loop
  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    timeRef.current += 16;

    // Clear with subtle fade
    ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update and draw streams
    streamsRef.current.forEach(stream => {
      stream.update(timeRef.current);
      stream.draw(ctx);
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
      
      initializeStreams({ width: rect.width, height: rect.height });
    };

    resizeCanvas();
    animate();

    window.addEventListener('resize', resizeCanvas);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [streamCount, intensity, colors]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{
        pointerEvents: 'none',
        zIndex: 2
      }}
    />
  );
}
