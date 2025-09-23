"use client";

import React, { useRef, useEffect, useMemo } from 'react';

/**
 * NeuralNetworkViz.jsx
 * 
 * Premium neural network visualization with:
 * - Animated nodes that pulse and glow
 * - Dynamic connection lines with energy flow
 * - Organic movement and morphing
 * - Multiple network layers with depth
 * - Realistic lighting and shadows
 */

export default function NeuralNetworkViz({ 
  nodeCount = 25,
  intensity = 1.0,
  colors = ['#3B82F6', '#8B5CF6', '#06B6D4'],
  className = ""
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const nodesRef = useRef([]);
  const connectionsRef = useRef([]);
  const timeRef = useRef(0);

  // Node class
  const Node = useMemo(() => class {
    constructor(x, y, layer = 0) {
      this.x = x;
      this.y = y;
      this.baseX = x;
      this.baseY = y;
      this.vx = (Math.random() - 0.5) * 0.2;
      this.vy = (Math.random() - 0.5) * 0.2;
      this.radius = Math.random() * 8 + 4;
      this.baseRadius = this.radius;
      this.opacity = Math.random() * 0.8 + 0.2;
      this.baseOpacity = this.opacity;
      this.layer = layer;
      this.activation = 0;
      this.targetActivation = 0;
      this.color = colors[layer % colors.length];
      this.pulsePhase = Math.random() * Math.PI * 2;
      this.pulseSpeed = Math.random() * 0.02 + 0.01;
      this.energy = 0;
      this.targetEnergy = 0;
    }

    update(time, canvas) {
      this.pulsePhase += this.pulseSpeed;
      
      // Organic movement
      this.x += this.vx;
      this.y += this.vy;
      
      // Boundary bouncing with soft edges
      if (this.x < 50) {
        this.x = 50;
        this.vx = Math.abs(this.vx) * 0.8;
      }
      if (this.x > canvas.width - 50) {
        this.x = canvas.width - 50;
        this.vx = -Math.abs(this.vx) * 0.8;
      }
      if (this.y < 50) {
        this.y = 50;
        this.vy = Math.abs(this.vy) * 0.8;
      }
      if (this.y > canvas.height - 50) {
        this.y = canvas.height - 50;
        this.vy = -Math.abs(this.vy) * 0.8;
      }

      // Gentle drift back to base position
      const driftX = (this.baseX - this.x) * 0.001;
      const driftY = (this.baseY - this.y) * 0.001;
      this.vx += driftX;
      this.vy += driftY;

      // Damping
      this.vx *= 0.995;
      this.vy *= 0.995;

      // Activation pulsing
      this.activation += (this.targetActivation - this.activation) * 0.1;
      this.energy += (this.targetEnergy - this.energy) * 0.1;
      
      // Random activation spikes
      if (Math.random() < 0.01) {
        this.targetActivation = Math.random() * 0.8 + 0.2;
        this.targetEnergy = Math.random() * 0.6 + 0.4;
      } else {
        this.targetActivation *= 0.98;
        this.targetEnergy *= 0.95;
      }

      // Visual properties
      const pulse = Math.sin(this.pulsePhase) * 0.3 + 0.7;
      this.radius = this.baseRadius * (0.8 + 0.4 * pulse * this.activation);
      this.opacity = this.baseOpacity * (0.6 + 0.4 * this.activation) * intensity;
    }

    draw(ctx) {
      // Outer glow
      const glowGradient = ctx.createRadialGradient(
        this.x, this.y, 0,
        this.x, this.y, this.radius * 4
      );
      glowGradient.addColorStop(0, `${this.color}${Math.floor(this.opacity * 100).toString(16).padStart(2, '0')}`);
      glowGradient.addColorStop(0.5, `${this.color}${Math.floor(this.opacity * 50).toString(16).padStart(2, '0')}`);
      glowGradient.addColorStop(1, `${this.color}00`);

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 4, 0, Math.PI * 2);
      ctx.fill();

      // Inner core
      const coreGradient = ctx.createRadialGradient(
        this.x, this.y, 0,
        this.x, this.y, this.radius
      );
      coreGradient.addColorStop(0, `${this.color}${Math.floor(this.opacity * 255).toString(16).padStart(2, '0')}`);
      coreGradient.addColorStop(0.7, `${this.color}${Math.floor(this.opacity * 200).toString(16).padStart(2, '0')}`);
      coreGradient.addColorStop(1, `${this.color}${Math.floor(this.opacity * 100).toString(16).padStart(2, '0')}`);

      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();

      // Energy highlight
      if (this.energy > 0.3) {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.energy * 0.8})`;
        ctx.beginPath();
        ctx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }, [colors, intensity]);

  // Connection class
  const Connection = useMemo(() => class {
    constructor(node1, node2) {
      this.node1 = node1;
      this.node2 = node2;
      this.strength = Math.random() * 0.8 + 0.2;
      this.energy = 0;
      this.targetEnergy = 0;
      this.pulsePhase = Math.random() * Math.PI * 2;
      this.pulseSpeed = Math.random() * 0.03 + 0.01;
      this.color = this.getConnectionColor();
    }

    getConnectionColor() {
      const colors = ['#3B82F6', '#8B5CF6', '#06B6D4', '#10B981'];
      return colors[Math.floor(Math.random() * colors.length)];
    }

    update(time) {
      this.pulsePhase += this.pulseSpeed;
      
      // Calculate distance and connection strength
      const dx = this.node2.x - this.node1.x;
      const dy = this.node2.y - this.node1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Energy flows based on node activations
      this.targetEnergy = (this.node1.activation + this.node2.activation) * 0.5 * this.strength;
      this.energy += (this.targetEnergy - this.energy) * 0.1;
      
      // Random energy spikes
      if (Math.random() < 0.005) {
        this.targetEnergy = Math.random() * 0.8 + 0.2;
      }
    }

    draw(ctx, time = 0) {
      if (this.energy < 0.1) return;

      const dx = this.node2.x - this.node1.x;
      const dy = this.node2.y - this.node1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 200) return; // Don't draw very long connections

      const pulse = Math.sin(this.pulsePhase) * 0.3 + 0.7;
      const opacity = this.energy * pulse * 0.6;

      // Connection line
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      
      // Gradient along the line
      const gradient = ctx.createLinearGradient(
        this.node1.x, this.node1.y,
        this.node2.x, this.node2.y
      );
      gradient.addColorStop(0, `${this.color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(0.5, `${this.color}${Math.floor(opacity * 200).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(1, `${this.color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`);

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2 + this.energy * 3;
      ctx.lineCap = 'round';
      
      ctx.beginPath();
      ctx.moveTo(this.node1.x, this.node1.y);
      ctx.lineTo(this.node2.x, this.node2.y);
      ctx.stroke();

      // Energy particles flowing along the connection
      if (this.energy > 0.4) {
        const particleCount = Math.floor(this.energy * 5);
        for (let i = 0; i < particleCount; i++) {
          const progress = (time * 0.001 + i * 0.2) % 1;
          const x = this.node1.x + dx * progress;
          const y = this.node1.y + dy * progress;
          
          ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
          ctx.beginPath();
          ctx.arc(x, y, 1 + this.energy * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }
  }, []);

  // Initialize network
  const initializeNetwork = (canvas) => {
    nodesRef.current = [];
    connectionsRef.current = [];

    // Create nodes in layers
    const layers = 3;
    const nodesPerLayer = Math.ceil(nodeCount / layers);
    
    for (let layer = 0; layer < layers; layer++) {
      for (let i = 0; i < nodesPerLayer; i++) {
        const x = (canvas.width / (nodesPerLayer + 1)) * (i + 1) + (Math.random() - 0.5) * 100;
        const y = (canvas.height / (layers + 1)) * (layer + 1) + (Math.random() - 0.5) * 100;
        nodesRef.current.push(new Node(x, y, layer));
      }
    }

    // Create connections
    for (let i = 0; i < nodesRef.current.length; i++) {
      for (let j = i + 1; j < nodesRef.current.length; j++) {
        const node1 = nodesRef.current[i];
        const node2 = nodesRef.current[j];
        const dx = node2.x - node1.x;
        const dy = node2.y - node1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Connect nearby nodes or nodes in adjacent layers
        if (distance < 150 || Math.abs(node1.layer - node2.layer) === 1) {
          if (Math.random() < 0.3) { // 30% chance of connection
            connectionsRef.current.push(new Connection(node1, node2));
          }
        }
      }
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

    // Update and draw connections first (behind nodes)
    connectionsRef.current.forEach(connection => {
      connection.update(timeRef.current);
      connection.draw(ctx, timeRef.current);
    });

    // Update and draw nodes
    nodesRef.current.forEach(node => {
      node.update(timeRef.current, canvas);
      node.draw(ctx);
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
      
      initializeNetwork({ width: rect.width, height: rect.height });
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
  }, [nodeCount, intensity, colors]);

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
