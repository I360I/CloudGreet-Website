"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useUser } from "@/hooks/useUser"
import { signOut } from "next-auth/react"

interface DashboardData {
  user: {
    id: string
    email: string
    companyName: string | null
    subscriptionPlan: string
  }
  metrics: {
    monthlyRevenue: number
    cloudGreetCost: number
    netProfit: number
    roi: number
    callsAnswered: number
    appointmentsBooked: number
    missedCallsPrevented: number
    averageResponseTime: number
    customerSatisfaction: number
    totalSavings: number
  }
  recentBookings: Array<{
    id: string
    customer: string
    service: string
    value: number
    time: string
    status: string
  }>
  goals: Array<{
    id: string
    title: string
    description: string
    icon: string
    current: number
    target: number
    unit: string
    goalType: string
  }>
}

export default function DashboardPage() {
  const { user, isLoading: userLoading, isAuthenticated } = useUser()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  // Fetch user-specific data using email
  useEffect(() => {
    if (!isAuthenticated || userLoading || !user?.email) return

    const fetchUserData = async () => {
      try {
        console.log("Fetching data for user:", user.email)
        
        const response = await fetch('/api/user-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: user.email })
        })
        
        if (response.ok) {
          const userData = await response.json()
          console.log("User data received:", userData)
          
          // Create dashboard data with user's real info
          const dashboardData = {
            user: userData.user,
            metrics: userData.metrics,
            recentBookings: [
              { id: "1", customer: "Mike Johnson", service: "Kitchen Remodel", value: 8500, time: "2 hours ago", status: "confirmed" },
              { id: "2", customer: "Sarah Chen", service: "Bathroom Renovation", value: 4200, time: "4 hours ago", status: "confirmed" },
              { id: "3", customer: "David Wilson", service: "Deck Installation", value: 6800, time: "6 hours ago", status: "pending" },
              { id: "4", customer: "Lisa Rodriguez", service: "Flooring Replacement", value: 3400, time: "8 hours ago", status: "confirmed" }
            ],
            goals: [
              { id: "1", title: "Monthly Revenue Target", description: `Reach $${(userData.metrics.monthlyRevenue + 10000).toLocaleString()} monthly revenue`, icon: "📈", current: userData.metrics.monthlyRevenue, target: userData.metrics.monthlyRevenue + 10000, unit: "$", goalType: "revenue" },
              { id: "2", title: "New Customer Acquisition", description: "Gain 15 new customers this month", icon: "👥", current: 12, target: 15, unit: " customers", goalType: "growth" },
              { id: "3", title: "Project Completion", description: "Complete 25 projects this month", icon: "✓", current: 21, target: 25, unit: " projects", goalType: "efficiency" },
              { id: "4", title: "Customer Satisfaction", description: "Maintain 4.5+ star rating", icon: "★", current: 4.8, target: 4.5, unit: "/5", goalType: "customer" }
            ]
          }
          
          setDashboardData(dashboardData)
        } else {
          console.error("Failed to fetch user data")
          setError("Failed to load your data")
        }
      } catch (error) {
        console.error("Fetch error:", error)
        setError("Something went wrong")
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [isAuthenticated, userLoading, user])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500/30 border-t-blue-500 mx-auto mb-4"></div>
            <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border-2 border-blue-400/20 mx-auto"></div>
          </div>
          <p className="text-slate-300 font-medium">Loading your command center...</p>
        </div>
      </div>
    )
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4 font-medium">{error || "Failed to load dashboard"}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  const { metrics, recentBookings, goals } = dashboardData

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Professional CSS Animations */}
      <style jsx>{`
        @keyframes liquidFlow3D {
          0% { 
            background-position: 0% 20%, 100% 80%, 50% 50%, 25% 75%, 75% 25%;
          }
          20% { 
            background-position: 20% 0%, 80% 100%, 30% 70%, 80% 20%, 40% 60%;
          }
          40% { 
            background-position: 100% 30%, 0% 70%, 70% 30%, 40% 90%, 90% 10%;
          }
          60% { 
            background-position: 80% 100%, 20% 0%, 90% 10%, 10% 60%, 60% 40%;
          }
          80% { 
            background-position: 0% 80%, 100% 20%, 10% 90%, 70% 30%, 30% 70%;
          }
          100% { 
            background-position: 0% 20%, 100% 80%, 50% 50%, 25% 75%, 75% 25%;
          }
        }
        
        @keyframes bubbleFloat3D {
          0%, 100% { 
            background-position: 0% 20%, 100% 80%, 50% 50%;
            opacity: 0.4;
          }
          25% { 
            background-position: 20% 0%, 80% 100%, 30% 70%;
            opacity: 0.8;
          }
          50% { 
            background-position: 100% 30%, 0% 70%, 70% 30%;
            opacity: 0.6;
          }
          75% { 
            background-position: 80% 100%, 20% 0%, 90% 10%;
            opacity: 0.7;
          }
        }
        
        @keyframes surfaceWave3D {
          0%, 100% { 
            background-position: 0% 50%, 100% 50%;
            opacity: 0.3;
          }
          50% { 
            background-position: 50% 0%, 50% 100%;
            opacity: 0.7;
          }
        }
        
        @keyframes liquidDepth {
          0%, 100% { 
            filter: brightness(1) contrast(1.1);
          }
          50% { 
            filter: brightness(1.1) contrast(1.2);
          }
        }
        
        .liquid-container {
          /* COMPLETELY STATIC CONTAINER - NO MOVEMENT AT ALL */
          background: #1e293b;
          border: 2px solid #334155;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
          /* NO animations, NO transforms, NO movement */
        }
        
        .liquid-content {
          /* ALL movement happens ONLY in this layer */
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: inherit;
          overflow: hidden;
          
          background: 
            /* 3D Surface highlights - top layer */
            radial-gradient(ellipse at 25% 15%, rgba(255, 255, 255, 0.6) 0%, transparent 20%),
            radial-gradient(ellipse at 75% 10%, rgba(255, 255, 255, 0.4) 0%, transparent 15%),
            radial-gradient(ellipse at 50% 5%, rgba(255, 255, 255, 0.3) 0%, transparent 12%),
            
            /* 3D Bubble layers - middle depth */
            radial-gradient(circle at 15% 85%, rgba(139, 92, 246, 0.95) 0%, rgba(139, 92, 246, 0.3) 25%, transparent 40%),
            radial-gradient(circle at 85% 15%, rgba(99, 102, 241, 0.9) 0%, rgba(99, 102, 241, 0.2) 30%, transparent 45%),
            radial-gradient(circle at 35% 65%, rgba(168, 85, 247, 0.8) 0%, rgba(168, 85, 247, 0.1) 20%, transparent 35%),
            radial-gradient(circle at 65% 25%, rgba(147, 51, 234, 0.7) 0%, rgba(147, 51, 234, 0.1) 25%, transparent 40%),
            radial-gradient(circle at 45% 80%, rgba(124, 58, 237, 0.6) 0%, rgba(124, 58, 237, 0.1) 15%, transparent 30%),
            
            /* Deep liquid base - bottom layer */
            linear-gradient(
              135deg,
              #1e3a8a 0%,
              #1e40af 10%,
              #3b82f6 25%,
              #4f46e5 40%,
              #6366f1 55%,
              #8b5cf6 70%,
              #a855f7 85%,
              #6366f1 100%
            );
          
          background-size: 
            180% 180%, 160% 160%, 140% 140%,
            400% 400%, 350% 350%, 380% 380%, 320% 320%, 360% 360%,
            300% 300%;
          
          animation: liquidFlow3D 35s ease-in-out infinite, liquidDepth 8s ease-in-out infinite;
        }
        
        .liquid-content::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            /* 3D Surface ripples */
            radial-gradient(ellipse at 35% 25%, rgba(255, 255, 255, 0.7) 0%, transparent 12%),
            radial-gradient(ellipse at 85% 65%, rgba(255, 255, 255, 0.5) 0%, transparent 15%),
            radial-gradient(ellipse at 15% 75%, rgba(255, 255, 255, 0.4) 0%, transparent 18%),
            
            /* 3D Floating particle bubbles */
            radial-gradient(circle at 55% 35%, rgba(139, 92, 246, 0.8) 0%, rgba(139, 92, 246, 0.2) 15%, transparent 30%),
            radial-gradient(circle at 25% 65%, rgba(99, 102, 241, 0.7) 0%, rgba(99, 102, 241, 0.1) 20%, transparent 35%),
            radial-gradient(circle at 75% 85%, rgba(168, 85, 247, 0.6) 0%, rgba(168, 85, 247, 0.1) 12%, transparent 25%),
            radial-gradient(circle at 65% 15%, rgba(147, 51, 234, 0.5) 0%, rgba(147, 51, 234, 0.1) 18%, transparent 30%);
          
          background-size: 
            120% 120%, 140% 140%, 130% 130%,
            250% 250%, 280% 280%, 200% 200%, 220% 220%;
          
          animation: bubbleFloat3D 22s ease-in-out infinite reverse;
          border-radius: inherit;
        }
        
        .liquid-content::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            /* 3D Surface tension waves - ONLY background-position moves */
            linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.1) 8%, transparent 15%),
            linear-gradient(90deg, rgba(255, 255, 255, 0.2) 0%, transparent 6%),
            
            /* 3D Deep shadow gradients */
            linear-gradient(0deg, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.3) 15%, transparent 30%),
            linear-gradient(270deg, rgba(0, 0, 0, 0.4) 0%, transparent 12%);
          
          background-size: 150% 150%, 120% 120%, 100% 100%, 100% 100%;
          border-radius: inherit;
          animation: surfaceWave3D 15s ease-in-out infinite;
          pointer-events: none;
        }
        
        @keyframes logoShimmer {
          0% { background-position: -200% 0%; }
          100% { background-position: 200% 0%; }
        }
        
        .logo-gradient {
          background: linear-gradient(
            90deg,
            #60a5fa 0%,
            #a78bfa 20%,
            #f472b6 40%,
            #ffffff 50%,
            #f472b6 60%,
            #a78bfa 80%,
            #60a5fa 100%
          );
          background-size: 400% 100%;
          animation: logoShimmer 3s ease-in-out infinite;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        @keyframes cardFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-2px); }
        }
        
        .metric-card {
          animation: cardFloat 6s ease-in-out infinite;
          transition: all 0.3s ease;
        }
        
        .metric-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }
        
        @keyframes dataStream {
          0% { opacity: 0; transform: translateX(-20px); }
          50% { opacity: 1; transform: translateX(0px); }
          100% { opacity: 0; transform: translateX(20px); }
        }
        
        .booking-item {
          animation: dataStream 0.8s ease-out;
        }
        
        .revenue-card-flat {
          /* NO 3D effects on the card container */
        }
        
        .revenue-content {
          position: relative;
          z-index: 10;
        }
      `}</style>

      {/* Enhanced Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-purple-600/10 via-blue-600/5 to-transparent rounded-full blur-3xl animate-pulse" style={{animationDelay: '3s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-r from-pink-600/5 via-purple-600/8 to-blue-600/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '6s'}}></div>
      </div>

      {/* Professional Navigation */}
      <header className="relative z-50 bg-slate-900/60 backdrop-blur-2xl border-b border-slate-700/50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center group">
                <div>
                  <span className="text-3xl font-bold logo-gradient group-hover:scale-110 transition-transform duration-500">
                    CloudGreet
                  </span>
                  <div className="text-xs text-slate-400 font-medium tracking-widest">AI COMMAND CENTER</div>
                </div>
              </Link>
            </div>

            <div className="flex items-center space-x-6">
              <Link 
                href="/integrations"
                className="px-6 py-3 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 rounded-xl text-slate-200 hover:text-white transition-all duration-300 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                ⚡ Integrations
              </Link>
              
              <div className="text-right">
                <div className="text-white font-semibold text-lg">
                  {dashboardData.user.companyName || user?.name || 'Commander'}
                </div>
                <div className="text-blue-400 text-sm font-medium font-mono">{currentTime.toLocaleTimeString()}</div>
              </div>
              
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-xl text-white transition-all duration-300 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Flat Container with 3D Liquid Inside */}
        <div className="mb-8 revenue-card-flat">
          <div className="liquid-container rounded-2xl p-10 shadow-2xl relative overflow-hidden">
            {/* 3D Liquid Layer */}
            <div className="liquid-content"></div>
            
            {/* Flat overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/20 rounded-2xl z-5"></div>
            
            <div className="revenue-content text-center">
              <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-2xl tracking-tight">
                Monthly Revenue: <span className="text-blue-100 font-bold">${metrics.monthlyRevenue.toLocaleString()}</span>
              </h1>
              <p className="text-xl text-blue-100 mb-8 drop-shadow-lg font-medium">
                ROI: <span className="font-bold text-emerald-300">{metrics.roi}%</span> on your ${metrics.cloudGreetCost} investment
              </p>
              <div className="grid grid-cols-3 gap-12">
                <div className="text-center transform hover:scale-110 transition-transform duration-300">
                  <div className="text-3xl font-bold text-white drop-shadow-lg font-mono">${metrics.netProfit.toLocaleString()}</div>
                  <div className="text-blue-100 font-medium text-base drop-shadow-md">Net Profit</div>
                </div>
                <div className="text-center transform hover:scale-110 transition-transform duration-300">
                  <div className="text-3xl font-bold text-white drop-shadow-lg font-mono">{metrics.callsAnswered}</div>
                  <div className="text-blue-100 font-medium text-base drop-shadow-md">Calls Handled</div>
                </div>
                <div className="text-center transform hover:scale-110 transition-transform duration-300">
                  <div className="text-3xl font-bold text-white drop-shadow-lg font-mono">{metrics.appointmentsBooked}</div>
                  <div className="text-blue-100 font-medium text-base drop-shadow-md">Jobs Booked</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="metric-card bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700/50 p-6 shadow-xl hover:border-blue-500/50 transition-all duration-300" style={{animationDelay: '0.1s'}}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">📞</span>
              </div>
              <div className="text-green-400 text-xs font-semibold bg-green-400/10 px-3 py-1 rounded-full tracking-wide">THIS MONTH</div>
            </div>
            <div className="text-3xl font-bold text-white mb-2 font-mono">{metrics.callsAnswered}</div>
            <div className="text-slate-400 font-medium">Calls Answered</div>
          </div>

          <div className="metric-card bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700/50 p-6 shadow-xl hover:border-purple-500/50 transition-all duration-300" style={{animationDelay: '0.2s'}}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">📅</span>
              </div>
              <div className="text-green-400 text-xs font-semibold bg-green-400/10 px-3 py-1 rounded-full tracking-wide">BOOKED</div>
            </div>
            <div className="text-3xl font-bold text-white mb-2 font-mono">{metrics.appointmentsBooked}</div>
            <div className="text-slate-400 font-medium">Appointments</div>
          </div>

          <div className="metric-card bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700/50 p-6 shadow-xl hover:border-blue-500/50 transition-all duration-300" style={{animationDelay: '0.3s'}}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">⚡</span>
              </div>
              <div className="text-blue-400 text-xs font-semibold bg-blue-400/10 px-3 py-1 rounded-full tracking-wide">AVERAGE</div>
            </div>
            <div className="text-3xl font-bold text-white mb-2 font-mono">{metrics.averageResponseTime}s</div>
            <div className="text-slate-400 font-medium">Response Time</div>
          </div>

          <div className="metric-card bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700/50 p-6 shadow-xl hover:border-yellow-500/50 transition-all duration-300" style={{animationDelay: '0.4s'}}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-600 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">★</span>
              </div>
              <div className="text-yellow-400 text-xs font-semibold bg-yellow-400/10 px-3 py-1 rounded-full tracking-wide">RATING</div>
            </div>
            <div className="text-3xl font-bold text-white mb-2 font-mono">{metrics.customerSatisfaction}/5</div>
            <div className="text-slate-400 font-medium">Customer Rating</div>
          </div>
        </div>

        {/* Professional Recent Bookings */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700/50 p-8 mb-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-8 flex items-center">
            <span className="mr-4 text-3xl">💼</span>
            Recent Bookings
            <div className="ml-4 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </h2>
          {recentBookings.length > 0 ? (
            <div className="space-y-4">
              {recentBookings.map((booking, index) => (
                <div key={booking.id} className="booking-item flex items-center justify-between p-6 bg-gradient-to-r from-slate-800 to-slate-750 rounded-xl hover:from-slate-700 hover:to-slate-650 transition-all duration-300 transform hover:scale-[1.02] shadow-lg" style={{animationDelay: `${index * 0.1}s`}}>
                  <div>
                    <div className="text-white font-semibold text-lg">{booking.customer}</div>
                    <div className="text-slate-300 font-medium">{booking.service}</div>
                    <div className="text-slate-500 text-sm font-medium">{booking.time}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-bold text-xl font-mono">${booking.value.toLocaleString()}</div>
                    <div className={`text-xs px-3 py-2 rounded-full font-semibold ${
                      booking.status === 'confirmed' 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    }`}>
                      {booking.status.toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-6">📋</div>
              <h3 className="text-2xl font-semibold text-white mb-4">No bookings yet</h3>
              <p className="text-slate-400 text-lg">Your AI receptionist is ready to start booking appointments</p>
            </div>
          )}
        </div>

        {/* Professional Goals Section */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700/50 p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-8 flex items-center">
            <span className="mr-4 text-3xl">🎯</span>
            Business Goals
            <div className="ml-4 flex space-x-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
              <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
            </div>
          </h2>
          {goals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {goals.map((goal, index) => {
                const progress = Math.min((goal.current / goal.target) * 100, 100)
                const isCompleted = goal.current >= goal.target
                
                return (
                  <div key={goal.id} className={`p-6 rounded-2xl border-2 transition-all duration-500 transform hover:scale-105 shadow-xl ${
                    isCompleted 
                      ? 'bg-gradient-to-br from-green-900/30 to-emerald-900/20 border-green-500/50 shadow-green-500/20' 
                      : 'bg-gradient-to-br from-slate-800 to-slate-750 border-slate-600/50 hover:border-blue-500/50'
                  }`} style={{animationDelay: `${index * 0.1}s`}}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="text-3xl transform hover:scale-125 transition-transform duration-300">{goal.icon}</div>
                        <div>
                          <div className="text-white font-semibold text-lg">{goal.title}</div>
                          <div className="text-slate-400 font-medium">{goal.description}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        {isCompleted ? (
                          <div className="text-green-400 text-sm font-bold flex items-center bg-green-400/10 px-3 py-2 rounded-full">
                            <span className="mr-2">✅</span>
                            COMPLETE!
                          </div>
                        ) : (
                          <div className="text-slate-300 text-sm font-medium">
                            <span className="text-white text-lg font-mono">{goal.current.toLocaleString()}</span>{goal.unit} / <span className="font-mono">{goal.target.toLocaleString()}</span>{goal.unit}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="w-full bg-slate-700 rounded-full h-4 shadow-inner">
                        <div 
                          className={`h-4 rounded-full transition-all duration-1000 shadow-lg ${
                            isCompleted 
                              ? 'bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 shadow-green-400/50' 
                              : 'bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 shadow-blue-500/50'
                          }`}
                          style={{ width: `${progress}%` }}
                        >
                          <div className="h-full bg-gradient-to-r from-white/20 to-transparent rounded-full"></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400 font-medium">
                        <span className="text-white font-semibold">{Math.round(progress)}%</span> complete
                      </span>
                      {!isCompleted && (
                        <span className="text-slate-400 font-medium">
                          <span className="text-white font-semibold font-mono">{(goal.target - goal.current).toLocaleString()}</span>{goal.unit} remaining
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-6">🎯</div>
              <h3 className="text-2xl font-semibold text-white mb-4">No goals set</h3>
              <p className="text-slate-400 text-lg mb-8">Set goals to track your business progress</p>
              <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                🚀 Add Your First Goal
              </button>
            </div>
          )}
        </div>

        {/* Professional Footer Stats */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-2xl p-6 border border-blue-500/30 text-center transform hover:scale-105 transition-all duration-300">
            <div className="text-blue-400 font-semibold text-sm mb-2 tracking-wide">SYSTEM STATUS</div>
            <div className="text-white font-bold text-2xl mb-3">ONLINE</div>
            <div className="w-full bg-blue-900/50 rounded-full h-3">
              <div className="bg-gradient-to-r from-blue-400 to-cyan-400 h-3 rounded-full w-full animate-pulse shadow-lg shadow-blue-400/30"></div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-2xl p-6 border border-purple-500/30 text-center transform hover:scale-105 transition-all duration-300">
            <div className="text-purple-400 font-semibold text-sm mb-2 tracking-wide">AI EFFICIENCY</div>
            <div className="text-white font-bold text-2xl mb-3 font-mono">98.7%</div>
            <div className="w-full bg-purple-900/50 rounded-full h-3">
              <div className="bg-gradient-to-r from-purple-400 to-pink-400 h-3 rounded-full w-[98.7%] animate-pulse shadow-lg shadow-purple-400/30"></div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-2xl p-6 border border-green-500/30 text-center transform hover:scale-105 transition-all duration-300">
            <div className="text-green-400 font-semibold text-sm mb-2 tracking-wide">UPTIME</div>
            <div className="text-white font-bold text-2xl mb-3 font-mono">99.9%</div>
            <div className="w-full bg-green-900/50 rounded-full h-3">
              <div className="bg-gradient-to-r from-green-400 to-emerald-400 h-3 rounded-full w-[99.9%] animate-pulse shadow-lg shadow-green-400/30"></div>
            </div>
          </div>
        </div>

        {/* Professional Command Center Footer */}
        <div className="mt-12 bg-gradient-to-r from-slate-900/50 to-slate-800/50 rounded-2xl border border-slate-700/30 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-slate-300 font-medium">CloudGreet AI System Active</span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-slate-400 font-medium">
              <span className="font-mono">Last Updated: {currentTime.toLocaleString()}</span>
              <span>•</span>
              <span className="font-mono">Version 2.1.0</span>
              <span>•</span>
              <span className="text-green-400 font-semibold">All Systems Operational</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
