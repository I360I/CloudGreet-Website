"use client";

import React, { useRef, useEffect, useMemo } from 'react';

/**
 * HolographicGrid.jsx
 * 
 * Premium 3D holographic grid with:
 * - Multiple grid layers with depth
 * - Perspective transformation
 * - Morphing and wave effects
 * - Glowing grid lines with energy flow
 * - Realistic 3D lighting and shadows
 */

export default function HolographicGrid({ 
  gridSize = 50,
  intensity = 1.0,
  colors = ['#3B82F6', '#8B5CF6', '#06B6D4'],
  className = ""
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const timeRef = useRef(0);

  // Grid point class
  const GridPoint = useMemo(() => class {
    constructor(x, y, z, layer) {
      this.baseX = x;
      this.baseY = y;
      this.baseZ = z;
      this.x = x;
      this.y = y;
      this.z = z;
      this.layer = layer;
      this.phase = Math.random() * Math.PI * 2;
      this.speed = Math.random() * 0.02 + 0.01;
      this.amplitude = Math.random() * 20 + 10;
      this.color = colors[layer % colors.length];
      this.opacity = 0.3 + layer * 0.1;
      this.energy = 0;
      this.targetEnergy = 0;
    }

    update(time) {
      this.phase += this.speed;
      
      // Wave motion
      const wave1 = Math.sin(this.phase) * this.amplitude;
      const wave2 = Math.sin(this.phase * 1.3 + this.baseX * 0.01) * this.amplitude * 0.5;
      const wave3 = Math.cos(this.phase * 0.7 + this.baseY * 0.01) * this.amplitude * 0.3;
      
      this.x = this.baseX + wave1 + wave2;
      this.y = this.baseY + wave3;
      this.z = this.baseZ + Math.sin(this.phase * 0.5) * 10;

      // Energy pulsing
      this.energy += (this.targetEnergy - this.energy) * 0.1;
      
      // Random energy spikes
      if (Math.random() < 0.01) {
        this.targetEnergy = Math.random() * 0.8 + 0.2;
      } else {
        this.targetEnergy *= 0.98;
      }
    }

    project(cameraZ, focalLength) {
      const scale = focalLength / (focalLength + this.z - cameraZ);
      return {
        x: this.x * scale,
        y: this.y * scale,
        z: this.z,
        scale: scale
      };
    }
  }, [colors]);

  // Grid class
  const Grid = useMemo(() => class {
    constructor(width, height, gridSize, layer, color) {
      this.width = width;
      this.height = height;
      this.gridSize = gridSize;
      this.layer = layer;
      this.color = color;
      this.points = [];
      this.connections = [];
      this.initialize();
    }

    initialize() {
      const cols = Math.ceil(this.width / this.gridSize) + 2;
      const rows = Math.ceil(this.height / this.gridSize) + 2;
      const zOffset = this.layer * 100;

      // Create grid points
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = (col - cols / 2) * this.gridSize;
          const y = (row - rows / 2) * this.gridSize;
          const z = zOffset + Math.sin(x * 0.01) * 20 + Math.cos(y * 0.01) * 20;
          
          this.points.push(new GridPoint(x, y, z, this.layer));
        }
      }

      // Create connections
      for (let row = 0; row < rows - 1; row++) {
        for (let col = 0; col < cols - 1; col++) {
          const index = row * cols + col;
          const right = index + 1;
          const down = index + cols;
          const diagonal = index + cols + 1;

          // Horizontal connections
          this.connections.push([index, right]);
          // Vertical connections
          this.connections.push([index, down]);
          // Diagonal connections (less frequent)
          if (Math.random() < 0.3) {
            this.connections.push([index, diagonal]);
          }
        }
      }
    }

    update(time) {
      this.points.forEach(point => point.update(time));
    }

    draw(ctx, cameraZ, focalLength, centerX, centerY, time = 0) {
      // Project points to 2D
      const projectedPoints = this.points.map(point => {
        const projected = point.project(cameraZ, focalLength);
        return {
          ...projected,
          x: projected.x + centerX,
          y: projected.y + centerY,
          originalPoint: point
        };
      });

      // Draw connections
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      
      this.connections.forEach(([index1, index2]) => {
        const p1 = projectedPoints[index1];
        const p2 = projectedPoints[index2];
        
        if (!p1 || !p2) return;

        const distance = Math.sqrt(
          Math.pow(p2.x - p1.x, 2) + 
          Math.pow(p2.y - p1.y, 2)
        );

        if (distance > 200) return; // Don't draw very long lines

        const opacity = (p1.originalPoint.energy + p2.originalPoint.energy) * 0.5 * 0.6;
        const lineWidth = 1 + opacity * 2;

        // Gradient along the line
        const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
        gradient.addColorStop(0, `${this.color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(0.5, `${this.color}${Math.floor(opacity * 150).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(1, `${this.color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Energy particles along the line
        if (opacity > 0.3) {
          const particleCount = Math.floor(opacity * 3);
          for (let i = 0; i < particleCount; i++) {
            const progress = (time * 0.001 + i * 0.3) % 1;
            const x = p1.x + (p2.x - p1.x) * progress;
            const y = p1.y + (p2.y - p1.y) * progress;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
            ctx.beginPath();
            ctx.arc(x, y, 1 + opacity, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });

      // Draw grid points
      projectedPoints.forEach(point => {
        if (point.scale < 0.1) return; // Don't draw points that are too far back

        const size = 2 + point.originalPoint.energy * 3;
        const opacity = point.originalPoint.energy * 0.8;

        // Point glow
        const gradient = ctx.createRadialGradient(
          point.x, point.y, 0,
          point.x, point.y, size * 2
        );
        gradient.addColorStop(0, `${this.color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(0.5, `${this.color}${Math.floor(opacity * 100).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(1, `${this.color}00`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(point.x, point.y, size * 2, 0, Math.PI * 2);
        ctx.fill();

        // Point core
        ctx.fillStyle = `${this.color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
        ctx.beginPath();
        ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    }
  }, [GridPoint]);

  // Initialize grids
  const initializeGrids = (canvas) => {
    const grids = [];
    const layers = 3;
    
    for (let i = 0; i < layers; i++) {
      const color = colors[i % colors.length];
      const grid = new Grid(canvas.width, canvas.height, gridSize, i, color);
      grids.push(grid);
    }
    
    return grids;
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

    // Camera parameters
    const cameraZ = 300 + Math.sin(timeRef.current * 0.001) * 50;
    const focalLength = 400;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Get grids from canvas data attribute
    const grids = canvas._grids || [];
    
    // Update and draw grids (back to front)
    grids.forEach(grid => {
      grid.update(timeRef.current);
      grid.draw(ctx, cameraZ, focalLength, centerX, centerY, timeRef.current);
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
      
      // Initialize grids and store on canvas
      canvas._grids = initializeGrids({ width: rect.width, height: rect.height });
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
  }, [gridSize, intensity, colors]);

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
