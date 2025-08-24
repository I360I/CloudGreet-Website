"use client"

import Link from "next/link"
import { useState, useEffect } from "react"

export default function DashboardPage() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [showNotifications, setShowNotifications] = useState(false)
  const [selectedGoalType, setSelectedGoalType] = useState('revenue')
  const [showGoalSelector, setShowGoalSelector] = useState(false)
  const [editingGoal, setEditingGoal] = useState<number | null>(null)
  const [tempTarget, setTempTarget] = useState<number>(0)
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    icon: '🎯',
    current: 0,
    target: 0,
    unit: '$'
  })

  // Mock data - replace with real API calls later
  const dashboardData = {
    monthlyRevenue: 47850,
    cloudGreetCost: 1200,
    netProfit: 46650,
    roi: 3888,
    callsAnswered: 342,
    appointmentsBooked: 89,
    missedCallsPrevented: 127,
    averageResponseTime: 2.3,
    customerSatisfaction: 4.8,
    totalSavings: 156000
  }

  const recentBookings = [
    { id: 1, customer: "Mike Johnson", service: "Kitchen Remodel", value: 8500, time: "2 hours ago", status: "confirmed" },
    { id: 2, customer: "Sarah Chen", service: "Bathroom Renovation", value: 4200, time: "4 hours ago", status: "confirmed" },
    { id: 3, customer: "David Wilson", service: "Deck Installation", value: 6800, time: "6 hours ago", status: "pending" },
    { id: 4, customer: "Lisa Rodriguez", service: "Flooring Replacement", value: 3400, time: "8 hours ago", status: "confirmed" }
  ]

  const goalTypes = {
    revenue: "Revenue Goals",
    growth: "Business Growth", 
    efficiency: "Operational Goals",
    customer: "Customer Goals"
  }

  const [goals, setGoals] = useState({
    revenue: [
      { id: 1, title: "Monthly Revenue Target", description: "Reach \$50K monthly revenue", icon: "💰", current: 47850, target: 50000, unit: "$" },
      { id: 2, title: "Quarterly Growth", description: "25% revenue increase this quarter", icon: "📈", current: 23, target: 25, unit: "%" },
      { id: 3, title: "High-Value Jobs", description: "Book 5 jobs over \$10K this month", icon: "💎", current: 3, target: 5, unit: " jobs" },
      { id: 4, title: "Annual Revenue Goal", description: "Hit \$600K annual revenue", icon: "🎯", current: 485000, target: 600000, unit: "$" }
    ],
    growth: [
      { id: 5, title: "New Customer Acquisition", description: "Gain 15 new customers this month", icon: "👥", current: 12, target: 15, unit: " customers" },
      { id: 6, title: "Service Expansion", description: "Launch 2 new service offerings", icon: "🔧", current: 1, target: 2, unit: " services" },
      { id: 7, title: "Market Reach", description: "Expand to 3 new neighborhoods", icon: "🗺️", current: 2, target: 3, unit: " areas" },
      { id: 8, title: "Team Growth", description: "Hire 2 additional contractors", icon: "👷", current: 1, target: 2, unit: " hires" }
    ],
    efficiency: [
      { id: 9, title: "Project Completion", description: "Complete 25 projects this month", icon: "✅", current: 21, target: 25, unit: " projects" },
      { id: 10, title: "Booking Efficiency", description: "Convert 30% of calls to bookings", icon: "📞", current: 26, target: 30, unit: "%" },
      { id: 11, title: "Schedule Optimization", description: "Reduce scheduling gaps by 50%", icon: "📅", current: 35, target: 50, unit: "%" },
      { id: 12, title: "Follow-up Success", description: "90% follow-up completion rate", icon: "🔄", current: 87, target: 90, unit: "%" }
    ],
    customer: [
      { id: 13, title: "Customer Satisfaction", description: "Maintain 4.8+ star rating", icon: "⭐", current: 4.8, target: 4.8, unit: " stars" },
      { id: 14, title: "Repeat Business", description: "40% of revenue from repeat customers", icon: "🔁", current: 35, target: 40, unit: "%" },
      { id: 15, title: "Referral Program", description: "Generate 10 referrals this month", icon: "🤝", current: 7, target: 10, unit: " referrals" },
      { id: 16, title: "Review Generation", description: "Collect 20 new reviews this month", icon: "💬", current: 16, target: 20, unit: " reviews" }
    ]
  })

  const currentGoals = goals[selectedGoalType as keyof typeof goals]

  const updateGoalTarget = (goalId: number, newTarget: number) => {
    setGoals(prevGoals => {
      const updatedGoals = { ...prevGoals }
      Object.keys(updatedGoals).forEach(category => {
        updatedGoals[category as keyof typeof updatedGoals] = updatedGoals[category as keyof typeof updatedGoals].map(goal =>
          goal.id === goalId ? { ...goal, target: newTarget } : goal
        )
      })
      return updatedGoals
    })
  }

  const addCustomGoal = () => {
    if (!newGoal.title || !newGoal.target) return
    
    const goalWithId = {
      ...newGoal,
      id: Date.now() // Simple ID generation
    }
    
    setGoals(prevGoals => ({
      ...prevGoals,
      [selectedGoalType]: [...prevGoals[selectedGoalType as keyof typeof prevGoals], goalWithId]
    }))
    
    setNewGoal({
      title: '',
      description: '',
      icon: '🎯',
      current: 0,
      target: 0,
      unit: '$'
    })
    setShowAddGoal(false)
  }

  const deleteGoal = (goalId: number) => {
    setGoals(prevGoals => {
      const updatedGoals = { ...prevGoals }
      Object.keys(updatedGoals).forEach(category => {
        updatedGoals[category as keyof typeof updatedGoals] = updatedGoals[category as keyof typeof updatedGoals].filter(goal => goal.id !== goalId)
      })
      return updatedGoals
    })
  }

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      {/* Navigation */}
      <header className="relative z-50 bg-black/20 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center group">
                <div>
                  <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 group-hover:scale-105 transition-transform duration-300">
                    CloudGreet
                  </span>
                  <div className="text-xs text-blue-300 font-semibold">AI RECEPTIONIST • DASHBOARD</div>
                </div>
              </Link>
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-right">
                <div className="text-white font-semibold">Welcome back, Anthony!</div>
                <div className="text-blue-300 text-sm">{currentTime.toLocaleString()}</div>
              </div>
              
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                >
                  <span className="text-white text-xl">🔔</span>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                </button>
                
                {showNotifications && (
                  <div className="absolute right-0 top-12 w-80 bg-black/80 backdrop-blur-xl rounded-2xl border border-white/20 p-4 shadow-2xl">
                    <h3 className="text-white font-bold mb-3">Recent Activity</h3>
                    <div className="space-y-2">
                      <div className="text-green-400 text-sm">✅ New booking: \$4,200 bathroom renovation</div>
                      <div className="text-blue-400 text-sm">📞 97% call answer rate this week</div>
                      <div className="text-purple-400 text-sm">🎯 Achievement unlocked: Perfect Week</div>
                    </div>
                  </div>
                )}
              </div>

              <Link href="/" className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors">
                Back to Site
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Hero ROI Card */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-green-500 via-blue-600 to-purple-600 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="relative z-10 text-center">
              <h1 className="text-4xl font-black text-white mb-4">
                📈 This month CloudGreet generated <span className="text-yellow-300">${dashboardData.monthlyRevenue.toLocaleString()}</span> in revenue
              </h1>
              <p className="text-2xl text-white/90 mb-6">
                That's a <span className="font-black text-yellow-300">{dashboardData.roi}% ROI</span> on your ${dashboardData.cloudGreetCost} subscription
              </p>
              <div className="flex items-center justify-center space-x-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">${dashboardData.netProfit.toLocaleString()}</div>
                  <div className="text-white/80">Net Profit</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{dashboardData.callsAnswered}</div>
                  <div className="text-white/80">Calls Answered</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{dashboardData.appointmentsBooked}</div>
                  <div className="text-white/80">Jobs Booked</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/20 p-6 hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-4">
              <div className="text-2xl">📞</div>
              <div className="text-green-400 text-sm font-semibold">+23% vs last month</div>
            </div>
            <div className="text-3xl font-bold text-white mb-2">{dashboardData.callsAnswered}</div>
            <div className="text-white/60">Calls Answered</div>
            <div className="text-xs text-white/40 mt-2">97.3% answer rate</div>
          </div>

          <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/20 p-6 hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-4">
              <div className="text-2xl">📅</div>
              <div className="text-green-400 text-sm font-semibold">+31% vs last month</div>
            </div>
            <div className="text-3xl font-bold text-white mb-2">{dashboardData.appointmentsBooked}</div>
            <div className="text-white/60">Appointments Booked</div>
            <div className="text-xs text-white/40 mt-2">26% conversion rate</div>
          </div>

          <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/20 p-6 hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-4">
              <div className="text-2xl">⚡</div>
              <div className="text-blue-400 text-sm font-semibold">Industry leading</div>
            </div>
            <div className="text-3xl font-bold text-white mb-2">{dashboardData.averageResponseTime}s</div>
            <div className="text-white/60">Avg Response Time</div>
            <div className="text-xs text-white/40 mt-2">Under 3 rings</div>
          </div>

          <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/20 p-6 hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-4">
              <div className="text-2xl">⭐</div>
              <div className="text-yellow-400 text-sm font-semibold">Excellent</div>
            </div>
            <div className="text-3xl font-bold text-white mb-2">{dashboardData.customerSatisfaction}/5</div>
            <div className="text-white/60">Customer Rating</div>
            <div className="text-xs text-white/40 mt-2">Based on 127 reviews</div>
          </div>
        </div>

        {/* Recent Bookings & Goals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Bookings */}
          <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <span className="mr-3">💼</span>
              Recent Bookings
            </h2>
            <div className="space-y-4">
              {recentBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                  <div>
                    <div className="text-white font-semibold">{booking.customer}</div>
                    <div className="text-white/60 text-sm">{booking.service}</div>
                    <div className="text-white/40 text-xs">{booking.time}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-bold">${booking.value.toLocaleString()}</div>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {booking.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Goals & Progress */}
          <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <span className="mr-3">🎯</span>
                {goalTypes[selectedGoalType as keyof typeof goalTypes]}
              </h2>
              
              <div className="flex items-center space-x-2">
                {/* Add Goal Button */}
                <button
                  onClick={() => setShowAddGoal(true)}
                  className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 rounded-lg text-green-400 text-sm transition-colors flex items-center space-x-1"
                >
                  <span>+</span>
                  <span>Add Goal</span>
                </button>
                
                {/* Goal Type Selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowGoalSelector(!showGoalSelector)}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors flex items-center space-x-1"
                  >
                    <span>Switch Goals</span>
                    <span className="text-xs">⚙️</span>
                  </button>
                  
                  {showGoalSelector && (
                    <div className="absolute right-0 top-10 w-48 bg-black/90 backdrop-blur-xl rounded-xl border border-white/20 p-2 shadow-2xl z-10">
                      {Object.entries(goalTypes).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => {
                            setSelectedGoalType(key)
                            setShowGoalSelector(false)
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            selectedGoalType === key 
                              ? 'bg-blue-500/30 text-blue-300' 
                              : 'text-white/80 hover:bg-white/10'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              {currentGoals.map((goal) => {
                const progress = Math.min((goal.current / goal.target) * 100, 100)
                const isCompleted = goal.current >= goal.target
                const isEditing = editingGoal === goal.id
                
                return (
                  <div key={goal.id} className={`p-4 rounded-xl border-2 transition-all ${
                    isCompleted 
                      ? 'bg-gradient-to-r from-green-500/20 to-blue-500/20 border-green-500/30' 
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{goal.icon}</div>
                        <div>
                          <div className="text-white font-semibold">{goal.title}</div>
                          <div className="text-white/60 text-sm">{goal.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          {isCompleted ? (
                            <div className="text-green-400 text-sm font-semibold flex items-center">
                              <span className="mr-1">✅</span>
                              Complete!
                            </div>
                          ) : isEditing ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                value={tempTarget}
                                onChange={(e) => setTempTarget(Number(e.target.value))}
                                className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                                placeholder="Target"
                              />
                              <button
                                onClick={() => {
                                  updateGoalTarget(goal.id, tempTarget)
                                  setEditingGoal(null)
                                }}
                                className="text-green-400 hover:text-green-300 text-sm"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => setEditingGoal(null)}
                                className="text-red-400 hover:text-red-300 text-sm"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className="text-white/60 text-sm">
                              {goal.current.toLocaleString()}{goal.unit} / {goal.target.toLocaleString()}{goal.unit}
                            </div>
                          )}
                        </div>
                        
                        {!isCompleted && !isEditing && (
                          <div className="flex flex-col space-y-1">
                            <button
                              onClick={() => {
                                setEditingGoal(goal.id)
                                setTempTarget(goal.target)
                              }}
                              className="text-blue-400 hover:text-blue-300 text-xs"
                              title="Edit target"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => deleteGoal(goal.id)}
                              className="text-red-400 hover:text-red-300 text-xs"
                              title="Delete goal"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mb-2">
                      <div className="w-full bg-white/10 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all duration-500 ${
                            isCompleted 
                              ? 'bg-gradient-to-r from-green-400 to-blue-400' 
                              : 'bg-gradient-to-r from-blue-500 to-purple-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-xs">
                      <span className="text-white/40">Progress: {Math.round(progress)}%</span>
                      {!isCompleted && (
                        <span className="text-white/40">
                          {(goal.target - goal.current).toLocaleString()}{goal.unit} to go
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Add Goal Modal */}
            {showAddGoal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-black/80 backdrop-blur-xl rounded-2xl border border-white/20 p-6 w-full max-w-md mx-4">
                  <h3 className="text-xl font-bold text-white mb-4">Add Custom Goal</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-white/80 text-sm mb-2">Goal Title</label>
                      <input
                        type="text"
                        value={newGoal.title}
                        onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                        placeholder="e.g., Monthly Revenue Target"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-white/80 text-sm mb-2">Description</label>
                      <input
                        type="text"
                        value={newGoal.description}
                        onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                        placeholder="e.g., Reach \$50K monthly revenue"
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-white/80 text-sm mb-2">Icon</label>
                        <input
                          type="text"
                          value={newGoal.icon}
                          onChange={(e) => setNewGoal({...newGoal, icon: e.target.value})}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-center"
                          placeholder="🎯"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-white/80 text-sm mb-2">Target</label>
                        <input
                          type="number"
                          value={newGoal.target}
                          onChange={(e) => setNewGoal({...newGoal, target: Number(e.target.value)})}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                          placeholder="50000"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-white/80 text-sm mb-2">Unit</label>
                        <select
                          value={newGoal.unit}
                          onChange={(e) => setNewGoal({...newGoal, unit: e.target.value})}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                        >
                          <option value="$">$</option>
                          <option value="%">%</option>
                          <option value=" jobs"> jobs</option>
                          <option value=" customers"> customers</option>
                          <option value=" projects"> projects</option>
                          <option value=" reviews"> reviews</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      onClick={() => setShowAddGoal(false)}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addCustomGoal}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white transition-colors"
                    >
                      Add Goal
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button 
            onClick={() => alert('Detailed Reports coming soon! This will show comprehensive analytics of your business performance.')}
            className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-xl rounded-2xl border border-blue-500/30 p-6 hover:scale-105 transition-transform cursor-pointer"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-white mb-2">View Detailed Reports</h3>
              <p className="text-white/60 text-sm">Deep dive into your performance metrics</p>
            </div>
          </button>

          <button 
            onClick={() => alert('Settings panel coming soon! Customize your AI receptionist, business hours, and preferences.')}
            className="bg-gradient-to-br from-green-500/20 to-blue-500/20 backdrop-blur-xl rounded-2xl border border-green-500/30 p-6 hover:scale-105 transition-transform cursor-pointer"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">⚙️</div>
              <h3 className="text-xl font-bold text-white mb-2">Customize Settings</h3>
                            <p className="text-white/60 text-sm">Adjust your AI receptionist preferences</p>
            </div>
          </button>

          <button 
            onClick={() => alert('Upgrade options coming soon! Unlock advanced features, priority support, and enhanced analytics.')}
            className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl rounded-2xl border border-purple-500/30 p-6 hover:scale-105 transition-transform cursor-pointer"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-bold text-white mb-2">Upgrade Plan</h3>
              <p className="text-white/60 text-sm">Unlock advanced features and analytics</p>
            </div>
          </button>
        </div>
      </main>
    </div>
  )
}

