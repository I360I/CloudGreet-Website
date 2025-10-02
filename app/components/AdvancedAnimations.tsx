'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform, useSpring, useMotionValue, useAnimation } from 'framer-motion'
import { Sparkles, Star, Zap, Heart, ArrowRight } from 'lucide-react'

interface AdvancedAnimationsProps {
  children: React.ReactNode
}

export default function AdvancedAnimations({ children }: AdvancedAnimationsProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isReducedMotion, setIsReducedMotion] = useState(false)
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll()
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Detect reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setIsReducedMotion(mediaQuery.matches)
    
    const handleChange = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handleChange)
    
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Mouse tracking for parallax effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
    }

    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.hasAttribute('data-animate-on-hover')) {
        setHoveredElement(target)
      }
    }

    const handleMouseLeave = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target === hoveredElement) {
        setHoveredElement(null)
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseenter', handleMouseEnter, true)
    document.addEventListener('mouseleave', handleMouseLeave, true)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseenter', handleMouseEnter, true)
      document.removeEventListener('mouseleave', handleMouseLeave, true)
    }
  }, [hoveredElement, mouseX, mouseY])

  // Parallax transforms
  const backgroundX = useTransform(mouseX, [0, window.innerWidth], [-20, 20])
  const backgroundY = useTransform(mouseY, [0, window.innerHeight], [-20, 20])
  const scrollYSpring = useSpring(scrollY, { stiffness: 100, damping: 30 })

  // Floating particles
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 2
  }))

  // Scroll-triggered animations
  const scrollScale = useTransform(scrollYSpring, [0, 1000], [1, 0.95])
  const scrollOpacity = useTransform(scrollYSpring, [0, 500], [1, 0.8])

  // Advanced hover effects
  const createHoverEffect = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const distance = Math.sqrt(
      Math.pow(mousePosition.x - centerX, 2) + Math.pow(mousePosition.y - centerY, 2)
    )
    
    const maxDistance = Math.sqrt(Math.pow(rect.width, 2) + Math.pow(rect.height, 2)) / 2
    const intensity = Math.max(0, 1 - distance / maxDistance)
    
    return {
      scale: 1 + intensity * 0.05,
      rotateX: (mousePosition.y - centerY) / 10,
      rotateY: (mousePosition.x - centerX) / 10,
      boxShadow: `0 ${intensity * 20}px ${intensity * 40}px rgba(59, 130, 246, ${intensity * 0.3})`
    }
  }

  // Micro-interactions for buttons
  const buttonVariants = {
    rest: { scale: 1, boxShadow: '0 0 0 rgba(59, 130, 246, 0)' },
    hover: { 
      scale: 1.02, 
      boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)',
      transition: { type: 'spring', stiffness: 400, damping: 10 }
    },
    tap: { 
      scale: 0.98,
      transition: { type: 'spring', stiffness: 600, damping: 15 }
    }
  }

  // Page transition variants
  const pageVariants = {
    initial: { opacity: 0, y: 20, scale: 0.98 },
    in: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        duration: 0.5, 
        ease: [0.22, 1, 0.36, 1],
        staggerChildren: 0.1
      }
    },
    out: { 
      opacity: 0, 
      y: -20, 
      scale: 1.02,
      transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
    }
  }

  const itemVariants = {
    initial: { opacity: 0, y: 20 },
    in: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
    }
  }

  // Success animation
  const successVariants = {
    initial: { scale: 0, rotate: -180 },
    animate: { 
      scale: 1, 
      rotate: 0,
      transition: { 
        type: 'spring', 
        stiffness: 500, 
        damping: 25,
        delay: 0.1
      }
    },
    exit: { 
      scale: 0, 
      rotate: 180,
      transition: { duration: 0.2 }
    }
  }

  // Loading animation
  const loadingVariants = {
    animate: {
      rotate: 360,
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: 'linear'
      }
    }
  }

  // Pulse animation for notifications
  const pulseVariants = {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [0.8, 1, 0.8],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    }
  }

  // Stagger animation for lists
  const staggerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const staggerItemVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.3 }
    }
  }

  // Magnetic effect for interactive elements
  const magneticVariants = {
    rest: { x: 0, y: 0 },
    hover: (custom: { x: number; y: number }) => ({
      x: custom.x * 0.1,
      y: custom.y * 0.1,
      transition: { type: 'spring', stiffness: 300, damping: 20 }
    })
  }

  // Glitch effect
  const glitchVariants = {
    rest: { x: 0 },
    hover: {
      x: [0, -2, 2, -2, 2, 0],
      transition: { duration: 0.3 }
    }
  }

  // Morphing animation
  const morphVariants = {
    rest: { borderRadius: '8px' },
    hover: {
      borderRadius: ['8px', '16px', '8px'],
      transition: { duration: 0.5, ease: 'easeInOut' }
    }
  }

  // Add animation attributes to elements
  useEffect(() => {
    if (isReducedMotion) return

    const addAnimationAttributes = () => {
      // Add hover effects to buttons
      const buttons = document.querySelectorAll('button, [role="button"]')
      buttons.forEach(button => {
        button.setAttribute('data-animate-on-hover', 'true')
      })

      // Add scroll animations to sections
      const sections = document.querySelectorAll('section, .animate-on-scroll')
      sections.forEach((section, index) => {
        section.setAttribute('data-animate-delay', (index * 0.1).toString())
      })
    }

    addAnimationAttributes()

    const observer = new MutationObserver(addAnimationAttributes)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [isReducedMotion])

  if (isReducedMotion) {
    return <>{children}</>
  }

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      {/* Animated Background */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          x: backgroundX,
          y: backgroundY,
          scale: scrollScale,
          opacity: scrollOpacity
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5" />
        
        {/* Floating Particles */}
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-1 h-1 bg-blue-400/30 rounded-full"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`
            }}
            animate={{
              y: [-20, 20, -20],
              opacity: [0.3, 1, 0.3],
              scale: [0.5, 1, 0.5]
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: 'easeInOut'
            }}
          />
        ))}
      </motion.div>

      {/* Main Content with Page Transitions */}
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="in"
        exit="out"
        className="relative z-10"
      >
        {children}
      </motion.div>

      {/* Interactive Hover Effects */}
      {hoveredElement && (
        <motion.div
          className="fixed pointer-events-none z-50"
          style={{
            left: mousePosition.x - 10,
            top: mousePosition.y - 10
          }}
          animate={createHoverEffect(hoveredElement)}
        >
          <div className="w-20 h-20 border-2 border-blue-400/30 rounded-full bg-blue-400/10 backdrop-blur-sm" />
        </motion.div>
      )}

      {/* Success Animation Overlay */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
        variants={successVariants}
        initial="initial"
        animate={false}
        exit="exit"
      >
        <div className="bg-green-500 text-white rounded-full p-6">
          <motion.div
            variants={successVariants}
            initial="initial"
            animate="animate"
          >
            <Sparkles className="w-12 h-12" />
          </motion.div>
        </div>
      </motion.div>

      {/* Global Animation Styles */}
      <style jsx global>{`
        [data-animate-on-hover] {
          transition: transform 0.2s ease-out;
        }
        
        [data-animate-on-hover]:hover {
          transform: translateY(-2px);
        }
        
        .animate-on-scroll {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }
        
        .animate-on-scroll.in-view {
          opacity: 1;
          transform: translateY(0);
        }
        
        .magnetic {
          transition: transform 0.2s ease-out;
        }
        
        .glitch {
          position: relative;
        }
        
        .glitch::before,
        .glitch::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
        
        .glitch::before {
          animation: glitch-1 0.3s infinite;
          color: #ff0000;
          z-index: -1;
        }
        
        .glitch::after {
          animation: glitch-2 0.3s infinite;
          color: #00ff00;
          z-index: -2;
        }
        
        @keyframes glitch-1 {
          0%, 14%, 15%, 49%, 50%, 99%, 100% {
            transform: translate(0);
          }
          15%, 49% {
            transform: translate(-2px, -2px);
          }
        }
        
        @keyframes glitch-2 {
          0%, 20%, 21%, 62%, 63%, 99%, 100% {
            transform: translate(0);
          }
          21%, 62% {
            transform: translate(2px, 2px);
          }
        }
        
        .morphing {
          transition: border-radius 0.3s ease-out;
        }
        
        .morphing:hover {
          border-radius: 20px;
        }
        
        .floating {
          animation: float 3s ease-in-out infinite;
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        .pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
        
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
          }
          50% {
            box-shadow: 0 0 40px rgba(59, 130, 246, 0.6);
          }
        }
      `}</style>
    </div>
  )
}

