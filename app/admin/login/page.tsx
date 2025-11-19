'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/app/contexts/ToastContext'
import { Shield, UserPlus, Home, Loader2 } from 'lucide-react'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { showError, showSuccess } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        showError('Invalid response from server. Please try again.')
        return
      }

      if (!response.ok) {
        showError(data?.message || `Login failed (${response.status})`)
        return
      }

      if (data.success && data.data?.token) {
        // Store token
        localStorage.setItem('token', data.data.token)
        
        // Check if user is admin
        if (data.data.user?.role === 'admin' || data.data.user?.is_admin) {
          router.push('/admin/clients')
          showSuccess('Successfully logged in')
        } else {
          showError('Admin access required')
          localStorage.removeItem('token')
        }
      } else {
        showError(data?.message || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      showError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Matrix-style grid background */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `
          linear-gradient(rgba(147, 51, 234, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(147, 51, 234, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px'
      }}></div>
      
      <div className="bg-black border-2 border-purple-500/30 rounded-none p-4 md:p-6 w-full max-w-md relative z-10 shadow-[0_0_30px_rgba(147,51,234,0.3)]">
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-purple-500"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-purple-500"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-purple-500"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-purple-500"></div>
        
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 border-2 border-purple-500 mb-3 bg-black">
            <Shield className="w-6 h-6 text-purple-500" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white mb-2 font-mono tracking-wider leading-tight">ADMIN LOGIN</h1>
          <p className="text-gray-400 font-mono text-xs md:text-sm leading-snug">ACCESS ADMIN DASHBOARD</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-purple-400 mb-2 font-mono">
              EMAIL
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-black border-2 border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all font-mono"
              placeholder="admin@cloudgreet.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-purple-400 mb-2 font-mono">
              PASSWORD
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-black border-2 border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all font-mono"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black border-2 border-purple-500 text-purple-400 py-3 font-mono font-semibold hover:bg-purple-500/10 hover:text-purple-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-wider"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                LOGGING IN...
              </>
            ) : (
              'LOGIN'
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t-2 border-purple-500/30 space-y-3">
          <a
            href="/"
            className="flex items-center justify-center gap-2 w-full text-center text-sm text-gray-500 hover:text-gray-400 transition-colors py-2 font-mono"
          >
            <Home className="w-4 h-4" />
            BACK TO HOME
          </a>
          <p className="text-center text-xs text-gray-500 font-mono mt-4">
            After logging in, use the sidebar to create employees
          </p>
        </div>
      </div>
    </div>
  )
}

