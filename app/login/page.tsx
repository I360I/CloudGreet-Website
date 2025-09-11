"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Mail, Lock, ArrowRight, Zap, UserPlus, HelpCircle, Shield, CheckCircle } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [businessType, setBusinessType] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [isSignup, setIsSignup] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    console.log("🚀 Form submission:", { email, password, businessName, businessType, isSignup })

    try {
      if (isSignup) {
        // SIGNUP FLOW - Create new account with business info
        if (!email || !password || !businessName || !businessType) {
          setError("Please fill in all fields")
          return
        }
        
        console.log("✅ Account creation successful, redirecting to dashboard")
        
        // Create user data with business info from signup
        const newUser = {
          id: `user-${Date.now()}`,
          email: email,
          name: businessName + ' Owner',
          business_name: businessName,
          business_type: businessType,
          phone_number: '+1 (555) 123-4567',
          calendar_provider: 'Google Calendar',
          retell_agent_id: `agent-${Date.now()}`
        }
        
        // Store user data in localStorage
        localStorage.setItem('demoUser', JSON.stringify(newUser))
        
        // Force redirect to dashboard
        window.location.href = "/dashboard"
      } else {
        // LOGIN FLOW - Existing user
        if (!email || !password) {
          setError("Please enter both email and password")
          return
        }
        
        console.log("✅ Login successful, redirecting to dashboard")
        
        // For demo purposes, create a user with the email as business name
        const existingUser = {
          id: 'existing-user-123',
          email: email,
          name: email.split('@')[0] + ' Owner',
          business_name: email.split('@')[0] + ' Business',
          business_type: 'Professional Services',
          phone_number: '+1 (555) 123-4567',
          calendar_provider: 'Google Calendar',
          retell_agent_id: 'existing-agent-456'
        }
        
        // Store user data in localStorage
        localStorage.setItem('demoUser', JSON.stringify(existingUser))
        
        // Force redirect to dashboard
        window.location.href = "/dashboard"
      }
    } catch (error) {
      console.log("💥 Login exception:", error)
      setError("Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col">
      {/* Header */}
      <header className="w-full p-6">
        <Link href="/" className="inline-flex items-center space-x-3 group">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">CloudGreet</div>
            <div className="text-xs text-blue-600 font-semibold tracking-wider">AI RECEPTIONIST</div>
          </div>
        </Link>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          {/* Login Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/20">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {isSignup ? 'Create Account' : 'Welcome Back'}
              </h1>
              <p className="text-gray-600">
                {isSignup ? 'Get started with CloudGreet' : 'Sign in to your CloudGreet account'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Business Name Field - Only for Signup */}
              {isSignup && (
                <div>
                  <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name
                  </label>
                  <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="businessName"
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                      placeholder="Enter your business name"
                      required={isSignup}
                    />
                  </div>
                </div>
              )}

              {/* Business Type Field - Only for Signup */}
              {isSignup && (
                <div>
                  <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-2">
                    Business Type
                  </label>
                  <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      id="businessType"
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                      required={isSignup}
                    >
                      <option value="">Select business type</option>
                      <option value="HVAC Services">HVAC Services</option>
                      <option value="Painting Services">Painting Services</option>
                      <option value="Roofing Services">Roofing Services</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none transition-all duration-300 ${
                      isFocused 
                        ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{isSignup ? 'Creating Account...' : 'Signing In...'}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <span>{isSignup ? 'Create Account' : 'Sign In'}</span>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </button>
            </form>


            {/* Links */}
            <div className="mt-6 text-center space-y-3">
              {!isSignup && (
                <Link 
                  href="/forgot-password" 
                  className="block text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <HelpCircle className="w-4 h-4 inline mr-1" />
                  Forgot your password?
                </Link>
              )}
              <div className="text-sm text-gray-600">
                {isSignup ? "Already have an account? " : "Don't have an account? "}
                <button 
                  onClick={() => setIsSignup(!isSignup)}
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  <UserPlus className="w-4 h-4 inline mr-1" />
                  {isSignup ? 'Sign In' : 'Create Account'}
                </button>
              </div>
            </div>
          </div>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don't have an account?{" "}
              <Link href="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
                Create Account
              </Link>
            </p>
          </div>

          {/* Security Features */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-green-500" />
                <span>Secure Login</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-blue-500" />
                <span>2FA Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
