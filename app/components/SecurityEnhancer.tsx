'use client'

import React, { useEffect, useCallback } from 'react'

interface SecurityEnhancerProps {
  children: React.ReactNode
}

export default function SecurityEnhancer({ children }: SecurityEnhancerProps) {
  
  // Content Security Policy enforcement
  useEffect(() => {
    const enforceCSP = () => {
      // Remove any inline scripts that might be dangerous
      const inlineScripts = document.querySelectorAll('script:not([src])')
      inlineScripts.forEach(script => {
        if (script.textContent && !script.textContent.includes('nonce-')) {
          console.warn('Removed potentially unsafe inline script')
          script.remove()
        }
      })

      // Sanitize any dynamically added content
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element
              
              // Remove dangerous attributes
              const dangerousAttrs = ['onclick', 'onload', 'onerror', 'onmouseover']
              dangerousAttrs.forEach(attr => {
                if (element.hasAttribute(attr)) {
                  element.removeAttribute(attr)
                  console.warn(`Removed dangerous attribute: ${attr}`)
                }
              })

              // Sanitize script tags
              if (element.tagName === 'SCRIPT') {
                const script = element as HTMLScriptElement
                if (!script.src && script.textContent) {
                  console.warn('Removed potentially unsafe inline script')
                  element.remove()
                }
              }
            }
          })
        })
      })

      observer.observe(document.body, {
        childList: true,
        subtree: true
      })

      return () => observer.disconnect()
    }

    const cleanup = enforceCSP()
    return cleanup
  }, [])

  // XSS Protection
  useEffect(() => {
    const sanitizeInput = (input: string): string => {
      return input
        .replace(/[<>]/g, '') // Remove angle brackets
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .replace(/script/gi, '') // Remove script tags
    }

    // Override innerHTML to sanitize content
    const originalInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')
    if (originalInnerHTML) {
      Object.defineProperty(Element.prototype, 'innerHTML', {
        set: function(value: string) {
          const sanitized = sanitizeInput(value)
          originalInnerHTML.set?.call(this, sanitized)
        },
        get: originalInnerHTML.get
      })
    }

    return () => {
      if (originalInnerHTML) {
        Object.defineProperty(Element.prototype, 'innerHTML', originalInnerHTML)
      }
    }
  }, [])

  // Clickjacking Protection
  useEffect(() => {
    const preventClickjacking = () => {
      // Check if we're in a frame
      if (window.top !== window.self) {
        // Check if parent is from same origin
        try {
          window.parent.location.href
        } catch (e) {
          // If we can't access parent, we're in a cross-origin frame
          document.body.innerHTML = `
            <div style="
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              background: #1e293b;
              color: white;
              font-family: system-ui;
              text-align: center;
              padding: 20px;
            ">
              <div>
                <h1>Security Notice</h1>
                <p>This page cannot be displayed in a frame.</p>
                <button onclick="window.top.location.href = window.location.href" 
                        style="
                          background: #3b82f6;
                          color: white;
                          border: none;
                          padding: 10px 20px;
                          border-radius: 5px;
                          cursor: pointer;
                          margin-top: 10px;
                        ">
                  Open in New Tab
                </button>
              </div>
            </div>
          `
          return
        }
      }
    }

    preventClickjacking()
  }, [])

  // Rate Limiting for Client-Side Actions
  const createRateLimiter = useCallback((maxRequests: number, windowMs: number) => {
    const requests: number[] = []
    
    return () => {
      const now = Date.now()
      const windowStart = now - windowMs
      
      // Remove old requests
      while (requests.length > 0 && requests[0] < windowStart) {
        requests.shift()
      }
      
      if (requests.length >= maxRequests) {
        return false
      }
      
      requests.push(now)
      return true
    }
  }, [])

  const apiRateLimiter = createRateLimiter(10, 60000) // 10 requests per minute
  const clickRateLimiter = createRateLimiter(5, 1000) // 5 clicks per second

  // Intercept fetch requests for rate limiting
  useEffect(() => {
    const originalFetch = window.fetch
    
    window.fetch = async (...args) => {
      if (!apiRateLimiter()) {
        throw new Error('Rate limit exceeded. Please slow down.')
      }
      
      return originalFetch(...args)
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [apiRateLimiter])

  // Input Validation and Sanitization
  useEffect(() => {
    const validateInput = (input: HTMLInputElement | HTMLTextAreaElement) => {
      const value = input.value
      
      // Check for XSS patterns
      const xssPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /<iframe/i,
        /<object/i,
        /<embed/i
      ]
      
      if (xssPatterns.some(pattern => pattern.test(value))) {
        input.value = value.replace(/[<>]/g, '')
        console.warn('Potentially malicious input detected and sanitized')
      }
    }

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        validateInput(target)
      }
    }

    document.addEventListener('input', handleInput)
    document.addEventListener('paste', handleInput)

    return () => {
      document.removeEventListener('input', handleInput)
      document.removeEventListener('paste', handleInput)
    }
  }, [])

  // Secure Cookie Handling
  useEffect(() => {
    const secureCookies = () => {
      // Ensure all cookies are secure in production
      if (process.env.NODE_ENV === 'production') {
        const cookies = document.cookie.split(';')
        cookies.forEach(cookie => {
          const [name] = cookie.trim().split('=')
          if (name && !cookie.includes('Secure') && !cookie.includes('HttpOnly')) {
            console.warn(`Cookie ${name} should be marked as Secure and HttpOnly`)
          }
        })
      }
    }

    secureCookies()
  }, [])

  // Detect and prevent DevTools usage (optional security measure)
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      let devtools = { open: false, orientation: null }
      
      const detectDevTools = () => {
        const threshold = 160
        
        if (window.outerHeight - window.innerHeight > threshold || 
            window.outerWidth - window.innerWidth > threshold) {
          if (!devtools.open) {
            devtools.open = true
            console.warn('DevTools detected')
            // You could redirect or show a warning here
          }
        } else {
          devtools.open = false
        }
      }

      const interval = setInterval(detectDevTools, 500)
      
      return () => clearInterval(interval)
    }
  }, [])

  // Prevent right-click context menu (optional)
  useEffect(() => {
    const preventContextMenu = (e: MouseEvent) => {
      if (process.env.NODE_ENV === 'production') {
        e.preventDefault()
      }
    }

    document.addEventListener('contextmenu', preventContextMenu)
    
    return () => {
      document.removeEventListener('contextmenu', preventContextMenu)
    }
  }, [])

  // Prevent text selection (optional)
  useEffect(() => {
    const preventSelection = (e: Event) => {
      if (process.env.NODE_ENV === 'production') {
        e.preventDefault()
      }
    }

    document.addEventListener('selectstart', preventSelection)
    
    return () => {
      document.removeEventListener('selectstart', preventSelection)
    }
  }, [])

  // Add security headers via meta tags
  useEffect(() => {
    const addSecurityHeaders = () => {
      // Add Content Security Policy
      const csp = document.createElement('meta')
      csp.httpEquiv = 'Content-Security-Policy'
      csp.content = `
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        font-src 'self' https://fonts.gstatic.com;
        img-src 'self' data: https:;
        connect-src 'self' https: wss:;
        frame-ancestors 'none';
        base-uri 'self';
        form-action 'self';
      `.replace(/\s+/g, ' ').trim()
      
      if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
        document.head.appendChild(csp)
      }
    }

    addSecurityHeaders()
  }, [])

  return <>{children}</>
}
