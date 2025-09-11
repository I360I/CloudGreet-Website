'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, 
  Zap, 
  Star, 
  Heart, 
  TrendingUp, 
  Activity,
  Bell,
  Phone,
  Calendar,
  X
} from 'lucide-react'

// Particle system for background effects
export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<any[]>([])
  const animationRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Create particles (optimized for performance)
    const createParticles = () => {
      particlesRef.current = []
      for (let i = 0; i < 15; i++) { // Fewer particles
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.2, // Slower movement
          vy: (Math.random() - 0.5) * 0.2,
          size: Math.random() * 1 + 0.5, // Smaller particles
          opacity: Math.random() * 0.2 + 0.1, // Lower opacity
          color: `hsl(${Math.random() * 20 + 220}, 50%, 70%)` // Less color variation
        })
      }
    }

    createParticles()

    let lastTime = 0
    const animate = (currentTime: number) => {
      // Throttle animation to 30fps for better performance
      if (currentTime - lastTime < 33) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }
      lastTime = currentTime

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particlesRef.current.forEach(particle => {
        particle.x += particle.vx
        particle.y += particle.vy

        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1

        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = particle.color
        ctx.globalAlpha = particle.opacity
        ctx.fill()
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ 
        background: 'transparent',
        opacity: 0.3
      }}
    />
  )
}

// Advanced loading animation with morphing shapes
export function MorphingLoader() {
  const [currentShape, setCurrentShape] = useState(0)
  const shapes = ['circle', 'square', 'triangle', 'diamond']

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentShape(prev => (prev + 1) % shapes.length)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center justify-center h-32">
      <motion.div
        className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl"
        animate={{
          rotate: 360,
          scale: [1, 1.2, 1],
          borderRadius: currentShape === 'circle' ? '50%' : 
                       currentShape === 'square' ? '0%' :
                       currentShape === 'triangle' ? '0%' : '25%'
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <motion.div
          className="w-full h-full flex items-center justify-center"
          animate={{
            rotate: -360
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <Sparkles className="w-8 h-8 text-white" />
        </motion.div>
      </motion.div>
    </div>
  )
}

// Floating action button with advanced animations
export function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="absolute bottom-16 right-0 space-y-3"
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
            >
              <Phone className="w-6 h-6 text-white" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
            >
              <Calendar className="w-6 h-6 text-white" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
            >
              <Bell className="w-6 h-6 text-white" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-2xl hover:shadow-3xl transition-all duration-300"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={{
          rotate: isOpen ? 45 : 0,
          boxShadow: isHovered ? 
            "0 25px 50px -12px rgba(59, 130, 246, 0.5)" : 
            "0 10px 25px -3px rgba(0, 0, 0, 0.1)"
        }}
      >
        <motion.div
          animate={{ rotate: isOpen ? -45 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <Zap className="w-8 h-8 text-white" />
        </motion.div>
      </motion.button>
    </div>
  )
}

// Simple tilt card
export function TiltCard({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <motion.div
      className={`transform-gpu ${className}`}
      whileHover={{ 
        rotateY: 5,
        rotateX: 5,
        scale: 1.02
      }}
      transition={{ duration: 0.3 }}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px'
      }}
    >
      {children}
    </motion.div>
  )
}

// Optimized animated counter
export function AnimatedCounter({ 
  value, 
  duration = 1000, 
  className = "" 
}: { 
  value: number, 
  duration?: number, 
  className?: string 
}) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    // Skip animation for small values to improve performance
    if (value < 10) {
      setDisplayValue(value)
      return
    }

    const startTime = Date.now()
    const startValue = 0

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Simplified easing for better performance
      const easeOut = 1 - Math.pow(1 - progress, 2)
      const currentValue = Math.floor(startValue + (value - startValue) * easeOut)
      
      setDisplayValue(currentValue)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [value, duration])

  return (
    <span className={className}>
      {displayValue.toLocaleString()}
    </span>
  )
}

// Advanced progress bar with morphing
export function MorphingProgressBar({ 
  progress, 
  label, 
  color = "blue" 
}: { 
  progress: number, 
  label: string, 
  color?: string 
}) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600"
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <span className="text-sm text-slate-500 dark:text-slate-400">{progress}%</span>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${colorClasses[color as keyof typeof colorClasses]} rounded-full relative`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        >
          <motion.div
            className="absolute inset-0 bg-white/30 rounded-full"
            animate={{
              x: ['-100%', '100%']
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </motion.div>
      </div>
    </div>
  )
}

// Optimized staggered list animation
export function StaggeredList({ 
  children, 
  className = "" 
}: { 
  children: React.ReactNode[], 
  className?: string 
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.05 // Faster stagger
          }
        }
      }}
    >
      {Array.isArray(children) ? children.map((child, index) => (
        <motion.div
          key={index}
          variants={{
            hidden: { opacity: 0, y: 10 }, // Smaller movement
            visible: { opacity: 1, y: 0 }
          }}
          transition={{ duration: 0.3 }} // Faster animation
        >
          {child}
        </motion.div>
      )) : children}
    </motion.div>
  )
}

// Advanced notification with morphing
export function MorphingNotification({ 
  type, 
  message, 
  isVisible, 
  onClose 
}: { 
  type: 'success' | 'error' | 'warning' | 'info', 
  message: string, 
  isVisible: boolean, 
  onClose: () => void 
}) {
  const icons = {
    success: CheckCircle,
    error: X,
    warning: AlertTriangle,
    info: Bell
  }

  const colors = {
    success: "from-green-500 to-green-600",
    error: "from-red-500 to-red-600",
    warning: "from-yellow-500 to-yellow-600",
    info: "from-blue-500 to-blue-600"
  }

  const Icon = icons[type]

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -50 }}
          className="fixed top-4 right-4 z-50 max-w-sm"
        >
          <motion.div
            className={`bg-gradient-to-r ${colors[type]} text-white p-4 rounded-2xl shadow-2xl backdrop-blur-sm`}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center space-x-3">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: 2 }}
              >
                <Icon className="w-6 h-6" />
              </motion.div>
              <span className="flex-1 font-medium">{message}</span>
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Simple hover effects for cards
export function HoverCard({ 
  children, 
  className = "" 
}: { 
  children: React.ReactNode, 
  className?: string 
}) {
  return (
    <motion.div
      className={`relative overflow-hidden ${className}`}
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  )
}
