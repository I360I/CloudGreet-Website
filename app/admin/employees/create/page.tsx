'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/app/contexts/ToastContext'
import { UserPlus, ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { logger } from '@/lib/monitoring'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

export default function CreateEmployeePage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState<'sales' | 'manager' | 'employee'>('sales')
  const [jobTitle, setJobTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { showError, showSuccess } = useToast()

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format'
    }

    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      showError('Please fix form errors')
      return
    }

    setLoading(true)
    setErrors({})

    try {
      const response = await fetchWithAuth('/api/admin/employees', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          role,
          job_title: jobTitle.trim() || null
        })
      })

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        
        // Handle specific error cases
        if (response.status === 409) {
          setErrors({ email: 'This email is already registered' })
          showError('Email already exists')
        } else if (response.status === 401) {
          showError('Session expired. Please login again.')
          router.push('/admin/login')
          return
        } else {
          showError(errorData.error || `Failed to create employee (${response.status})`)
        }
        return
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        showError('Invalid response from server')
        return
      }

      if (data.success) {
        showSuccess('Employee created successfully!')
        // Reset form
        setEmail('')
        setPassword('')
        setFirstName('')
        setLastName('')
        setJobTitle('')
        setRole('sales')
        setErrors({})
        // Redirect to employees list after 1 second
        setTimeout(() => {
          router.push('/admin/employees')
        }, 1000)
      } else {
        showError(data.error || 'Failed to create employee')
      }
    } catch (error) {
      logger.error('Create employee error', { error: error instanceof Error ? error.message : 'Unknown error' })
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          showError('Session expired. Please login again.')
          router.push('/admin/login')
          return
        }
        showError(`Error: ${error.message}`)
      } else {
        showError('Network error. Please check your connection and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black p-4 relative overflow-hidden">
      {/* Matrix-style grid background */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `
          linear-gradient(rgba(147, 51, 234, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(147, 51, 234, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px'
      }}></div>
      
      <div className="max-w-2xl mx-auto pt-8 relative z-10">
        <Button
          onClick={() => router.push('/admin/employees')}
          variant="outline"
          className="mb-4 bg-black border-2 border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:border-purple-500 font-mono uppercase"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          BACK
        </Button>
        
        <div className="bg-black border-2 border-purple-500/30 p-8 relative shadow-[0_0_30px_rgba(147,51,234,0.3)]">
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-purple-500"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-purple-500"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-purple-500"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-purple-500"></div>
          
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 border-2 border-purple-500 mb-4 bg-black">
              <UserPlus className="w-8 h-8 text-purple-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 font-mono tracking-wider">CREATE EMPLOYEE</h1>
            <p className="text-gray-400 font-mono text-sm">NEW EMPLOYEE ACCOUNT</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-purple-400 mb-2 font-mono uppercase">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 bg-black border-2 border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all font-mono"
                  placeholder="JOHN"
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-purple-400 mb-2 font-mono uppercase">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-3 bg-black border-2 border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all font-mono"
                  placeholder="DOE"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-purple-400 mb-2 font-mono uppercase">
                Email <span className="text-purple-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors({ ...errors, email: '' })
                }}
                required
                className={`w-full px-4 py-3 bg-black border-2 ${
                  errors.email ? 'border-red-500/50' : 'border-purple-500/30'
                } text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all font-mono`}
                placeholder="employee@cloudgreet.com"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p id="email-error" className="mt-1 text-xs text-red-400 font-mono" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-purple-400 mb-2 font-mono uppercase">
                Password <span className="text-purple-500">*</span>
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors({ ...errors, password: '' })
                }}
                required
                minLength={8}
                className={`w-full px-4 py-3 bg-black border-2 ${
                  errors.password ? 'border-red-500/50' : 'border-purple-500/30'
                } text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all font-mono`}
                placeholder="••••••••"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
              />
              {errors.password ? (
                <p id="password-error" className="mt-1 text-xs text-red-400 font-mono" role="alert">
                  {errors.password}
                </p>
              ) : (
                <p className="mt-1 text-xs text-gray-500 font-mono">MIN 8 CHARACTERS</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-purple-400 mb-2 font-mono uppercase">
                  Role <span className="text-purple-500">*</span>
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'sales' | 'manager' | 'employee')}
                  required
                  className="w-full px-4 py-3 bg-black border-2 border-purple-500/30 text-white focus:outline-none focus:border-purple-500 transition-all font-mono"
                >
                  <option value="sales">SALES</option>
                  <option value="manager">MANAGER</option>
                  <option value="employee">EMPLOYEE</option>
                </select>
              </div>

              <div>
                <label htmlFor="jobTitle" className="block text-sm font-medium text-purple-400 mb-2 font-mono uppercase">
                  Job Title
                </label>
                <input
                  id="jobTitle"
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-black border-2 border-purple-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all font-mono"
                  placeholder="SALES REP"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-black border-2 border-purple-500 text-purple-400 py-3 font-mono font-semibold hover:bg-purple-500/10 hover:text-purple-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-wider"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    CREATING...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    CREATE EMPLOYEE
                  </>
                )}
              </button>
              <Button
                type="button"
                onClick={() => router.push('/admin/employees')}
                variant="outline"
                className="px-6 bg-black border-2 border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:border-purple-500 font-mono uppercase"
              >
                CANCEL
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

