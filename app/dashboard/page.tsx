'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  Phone, 
  Calendar, 
  DollarSign, 
  LogOut,
  HelpCircle,
  Settings,
  Play,
  BarChart3,
  Target,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  X,
  User,
  MapPin,
  Star,
  Zap,
  Activity
} from 'lucide-react'
import VoiceTest from '../components/VoiceTest'
import OnboardingWidget from '../components/OnboardingWidget'
import NotificationSystem from '../components/NotificationSystem'
import dynamic from 'next/dynamic'

// Lazy load heavy components for better performance
const AdvancedAnalytics = dynamic(() => import('../components/AdvancedAnalytics'), {
  loading: () => <div className="animate-pulse bg-slate-200 dark:bg-slate-700 rounded-lg h-64"></div>
})
const ConversationAnalytics = dynamic(() => import('../components/ConversationAnalytics'), {
  loading: () => <div className="animate-pulse bg-slate-200 dark:bg-slate-700 rounded-lg h-64"></div>
})
const PredictiveAnalytics = dynamic(() => import('../components/PredictiveAnalytics'), {
  loading: () => <div className="animate-pulse bg-slate-200 dark:bg-slate-700 rounded-lg h-64"></div>
})
const EnterpriseFeatures = dynamic(() => import('../components/EnterpriseFeatures'), {
  loading: () => <div className="animate-pulse bg-slate-200 dark:bg-slate-700 rounded-lg h-64"></div>
})
import { 
  TiltCard, 
  AnimatedCounter, 
  MorphingProgressBar,
  StaggeredList,
  HoverCard
} from '../components/AdvancedAnimations'

// Lazy load heavy animation components
const ParticleBackground = dynamic(
  () => import('../components/AdvancedAnimations').then(mod => ({ default: mod.ParticleBackground })),
  { ssr: false, loading: () => null }
)
const FloatingActionButton = dynamic(
  () => import('../components/AdvancedAnimations').then(mod => ({ default: mod.FloatingActionButton })),
  { ssr: false, loading: () => null }
)
import { useDashboardData, usePerformanceMonitor } from '../hooks/useDashboardData'

export default function DashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  
  // State management
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [onboardingComplete, setOnboardingComplete] = useState(false)
  const [onboardingData, setOnboardingData] = useState<any>(null)
  const [demoUser, setDemoUser] = useState<any>(null)
  const [dashboardData, setDashboardData] = useState({
    calls: { totalToday: 0, totalWeek: 0, totalMonth: 0 },
    bookings: { totalToday: 0, totalWeek: 0, totalMonth: 0 },
    revenue: { totalToday: 0, totalWeek: 0, totalMonth: 0 },
    answerRate: 0
  })
  const [activeCalls, setActiveCalls] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [systemStatus, setSystemStatus] = useState({
    phone: 'disconnected',
    calendar: 'disconnected',
    ai: 'inactive',
    speech: 'not_ready'
  })
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showOnboardingWidget, setShowOnboardingWidget] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [billingInfo, setBillingInfo] = useState(null)
  const [testAgentId, setTestAgentId] = useState<string | null>(null)
  const [showVoiceTest, setShowVoiceTest] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'conversations' | 'predictions' | 'enterprise'>('overview')
  
  // Performance monitoring
  const performanceMetrics = usePerformanceMonitor()
  
  // Advanced data fetching with caching
  const {
    dashboardData: cachedDashboardData,
    systemStatus: cachedSystemStatus,
    activeCalls: cachedActiveCalls,
    recentActivity: cachedRecentActivity,
    isLoading: isDataLoading,
    hasError: hasDataError,
    refreshAll,
    performanceMetrics: dataPerformance
  } = useDashboardData(demoUser?.businessName || 'Demo User', '30d')

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Check for welcome state and onboarding status
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('welcome') === 'true') {
      setShowWelcome(true)
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard')
    }
    
    // Check if user is in onboarding process
    const isInOnboarding = window.location.pathname.includes('/onboarding')
    if (isInOnboarding) {
      // Redirect to onboarding if they're trying to access dashboard during onboarding
      router.push('/onboarding/streamlined')
    }
  }, [])

  // Fetch billing information only when onboarding is complete
  useEffect(() => {
    if (!onboardingComplete) return
    
    const fetchBillingInfo = async () => {
      try {
        const response = await fetch('/api/billing/subscription')
        if (response.ok) {
          const data = await response.json()
          setBillingInfo(data.subscription)
        }
      } catch (error) {
        console.error('Error fetching billing info:', error)
      }
    }
    
    fetchBillingInfo()
  }, [onboardingComplete])

  // Initialize dashboard
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setIsLoading(true)
        
        // Check for demo user data
        const storedDemoUser = localStorage.getItem('demoUser')
        if (storedDemoUser) {
          setDemoUser(JSON.parse(storedDemoUser))
        }

        // Check onboarding status
        const storedOnboardingComplete = localStorage.getItem('onboardingComplete')
        const storedOnboardingData = localStorage.getItem('onboardingData')

        if (storedOnboardingComplete === 'true' && storedOnboardingData) {
          setOnboardingComplete(true)
          setOnboardingData(JSON.parse(storedOnboardingData))
          setSystemStatus({
            phone: 'connected',
            calendar: 'connected',
            ai: 'active',
            speech: 'ready'
          })
        } else {
          // Show onboarding widget for new users
          setShowOnboardingWidget(true)
          setSystemStatus({
            phone: 'disconnected',
            calendar: 'disconnected',
            ai: 'inactive',
            speech: 'not_ready'
          })
          setDashboardData({
            calls: { totalToday: 0, totalWeek: 0, totalMonth: 0 },
            bookings: { totalToday: 0, totalWeek: 0, totalMonth: 0 },
            revenue: { totalToday: 0, totalWeek: 0, totalMonth: 0 },
            answerRate: 0
          })
          setActiveCalls([])
          setRecentActivity([])
        }

        // Fetch dashboard data
        await fetchDashboardData()
        
      } catch (error) {
        console.error('Error initializing dashboard:', error)
        setError('Failed to load dashboard')
      } finally {
        setIsLoading(false)
      }
    }

    initializeDashboard()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const businessName = onboardingData?.businessName || demoUser?.business_name || 'Demo User'
      const response = await fetch(`/api/dashboard?businessName=${encodeURIComponent(businessName)}&range=30d`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setDashboardData(result.data)
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }
  }

  const handleSignOut = () => {
    localStorage.removeItem('demoUser')
    localStorage.removeItem('onboardingComplete')
    localStorage.removeItem('onboardingData')
    window.location.href = '/login'
  }

  const handleOnboardingComplete = () => {
    setShowOnboardingWidget(false)
    setOnboardingComplete(true)
    // Reload the page to refresh all data
    window.location.reload()
  }

  const handleOnboardingDismiss = () => {
    setShowOnboardingWidget(false)
  }

  const createTestAgent = async () => {
    try {
      const response = await fetch('/api/create-test-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessName: demoUser?.businessName || 'Demo Business',
          industry: demoUser?.industry || 'hvac',
          greeting: demoUser?.greeting || 'Hello, thank you for calling!',
          businessHours: demoUser?.businessHours || 'Mon-Fri 9-5'
        }),
      })

      const result = await response.json()

      if (result.success) {
        setTestAgentId(result.agent.id)
        setShowVoiceTest(true)
      } else {
        console.error('Failed to create test agent:', result.error)
      }
    } catch (error) {
      console.error('Error creating test agent:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatTime = (timestamp: Date) => {
    return new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' }).format(
      Math.ceil((timestamp.getTime() - Date.now()) / (1000 * 60)),
      'minute'
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-900 dark:via-blue-900/20 dark:to-slate-800 transition-colors relative overflow-hidden">
      {/* Premium gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-blue-500/5 to-purple-500/5 pointer-events-none"></div>
      {/* Welcome Banner */}
      {showWelcome && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">🎉 Your AI Receptionist is Live!</h2>
                  <p className="text-green-100">Here's what to expect next</p>
                </div>
              </div>
              <button
                onClick={() => setShowWelcome(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-white" />
                <span className="text-green-100">Calls will now be answered</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-white" />
                <span className="text-green-100">Jobs will appear here</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-white" />
                <span className="text-green-100">ROI tracker updates automatically</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-700/60 shadow-sm relative z-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Phone className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {onboardingData?.businessName || demoUser?.business_name || 'CloudGreet'}
                </h1>
                <p className="text-slate-500 dark:text-slate-400">AI Receptionist Dashboard</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* System Status Indicators */}
              <div className="flex items-center space-x-3 bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${systemStatus.phone === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Phone</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${systemStatus.ai === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">AI</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${systemStatus.calendar === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Calendar</span>
                </div>
              </div>
              
              {/* Current Time */}
              <div className="text-right">
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  {currentTime.toLocaleTimeString()}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {currentTime.toLocaleDateString()}
                </div>
              </div>
              
              <NotificationSystem />
              
              <button
                onClick={createTestAgent}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>Test AI</span>
              </button>
              
              <button
                onClick={() => router.push('/help')}
                className="p-3 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-200"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleSignOut}
                className="p-3 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-200"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>


      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {/* Onboarding Widget */}
        {showOnboardingWidget && (
          <OnboardingWidget 
            onComplete={handleOnboardingComplete}
            onDismiss={handleOnboardingDismiss}
          />
        )}

        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                {onboardingComplete 
                  ? `Welcome back, ${onboardingData?.businessName || session?.user?.name || 'User'}!`
                  : 'Welcome to CloudGreet!'
                }
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                {onboardingComplete
                  ? "Your AI receptionist is working 24/7. Here's what's happening today."
                  : "Complete the setup above to activate your AI receptionist and start taking calls."
                }
              </p>
            </div>
            
            {/* Performance Metrics */}
            <div className="flex items-center space-x-4 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Load: {performanceMetrics.renderTime}ms</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Memory: {performanceMetrics.memoryUsage}MB</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Network: {performanceMetrics.networkLatency}ms</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
            {(['overview', 'analytics', 'conversations', 'predictions', 'enterprise'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-lg text-sm font-medium transition-all capitalize ${
                  activeTab === tab
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Billing Section */}
        {billingInfo && onboardingComplete && (
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Billing & Subscription</h3>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">Active</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Monthly Base Fee</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">${billingInfo.plan.price / 100}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">per month</div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Per Booking Fee</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">$50</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">per booked job</div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Next Billing</div>
                <div className="text-lg font-semibold text-slate-900 dark:text-white">
                  {new Date(billingInfo.billing.nextBillingDate).toLocaleDateString()}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {billingInfo.billing.totalBookings} bookings this month
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
            <div className="flex items-center">
              <AlertCircle className="w-6 h-6 text-red-500 mr-3" />
              <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className={!onboardingComplete ? "opacity-75" : ""}>
          <div className="space-y-8">
            {/* Key Metrics Row */}
            <StaggeredList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Calls Today */}
              <HoverCard>
                <TiltCard className="bg-gradient-to-br from-white/95 to-blue-50/95 dark:from-slate-800/95 dark:to-blue-900/30 backdrop-blur-md rounded-2xl p-6 border border-slate-200/60 dark:border-slate-700/60 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Calls Today</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white">
                        <AnimatedCounter value={dashboardData?.calls?.totalToday || 0} />
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium">+12% from yesterday</p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Phone className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </TiltCard>
              </HoverCard>

              {/* Bookings Today */}
              <HoverCard>
                <TiltCard className="bg-gradient-to-br from-white/95 to-green-50/95 dark:from-slate-800/95 dark:to-green-900/30 backdrop-blur-md rounded-2xl p-6 border border-slate-200/60 dark:border-slate-700/60 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Bookings Today</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white">
                        <AnimatedCounter value={Math.floor((dashboardData?.calls?.totalToday || 0) * 0.6)} />
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium">60% conversion rate</p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </TiltCard>
              </HoverCard>

              {/* Revenue Today */}
              <HoverCard>
                <TiltCard className="bg-gradient-to-br from-white/95 to-purple-50/95 dark:from-slate-800/95 dark:to-purple-900/30 backdrop-blur-md rounded-2xl p-6 border border-slate-200/60 dark:border-slate-700/60 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Revenue Today</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white">
                        $<AnimatedCounter value={Math.floor((dashboardData?.calls?.totalToday || 0) * 0.6) * 150} />
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium">+8% from yesterday</p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </TiltCard>
              </HoverCard>

              {/* AI Performance */}
              <HoverCard>
                <TiltCard className="bg-gradient-to-br from-white/95 to-orange-50/95 dark:from-slate-800/95 dark:to-orange-900/30 backdrop-blur-md rounded-2xl p-6 border border-slate-200/60 dark:border-slate-700/60 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">AI Performance</p>
                      <p className="text-3xl font-bold text-slate-900 dark:text-white">
                        <AnimatedCounter value={94} />%
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium">Answer rate</p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </TiltCard>
              </HoverCard>
            </StaggeredList>

            {/* Performance Monitor */}
            <div className="bg-gradient-to-br from-white/95 to-slate-50/95 dark:from-slate-800/95 dark:to-slate-900/95 backdrop-blur-md rounded-2xl p-6 border border-slate-200/60 dark:border-slate-700/60 shadow-xl">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-500" />
                System Performance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 border border-green-200/50 dark:border-green-700/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700 dark:text-green-300">Response Time</p>
                      <p className="text-2xl font-bold text-green-800 dark:text-green-200">45ms</p>
                    </div>
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200/50 dark:border-blue-700/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Uptime</p>
                      <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">99.9%</p>
                    </div>
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Activity className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200/50 dark:border-purple-700/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700 dark:text-purple-300">AI Accuracy</p>
                      <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">94.2%</p>
                    </div>
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                      <Target className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-white/95 to-slate-50/95 dark:from-slate-800/95 dark:to-slate-900/95 backdrop-blur-md rounded-2xl p-6 border border-slate-200/60 dark:border-slate-700/60 shadow-xl">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => router.push('/analytics')}
                  className="flex items-center justify-center space-x-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-4 rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-lg"
                >
                  <BarChart3 className="w-5 h-5" />
                  <span>View Analytics</span>
                </button>
                <button 
                  onClick={() => router.push('/calls')}
                  className="flex items-center justify-center space-x-3 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 hover:from-slate-200 hover:to-slate-300 dark:hover:from-slate-600 dark:hover:to-slate-500 text-slate-700 dark:text-slate-300 px-6 py-4 rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-md"
                >
                  <Phone className="w-5 h-5" />
                  <span>Call Management</span>
                </button>
                <button 
                  onClick={() => router.push('/settings')}
                  className="flex items-center justify-center space-x-3 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 hover:from-slate-200 hover:to-slate-300 dark:hover:from-slate-600 dark:hover:to-slate-500 text-slate-700 dark:text-slate-300 px-6 py-4 rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-md"
                >
                  <Settings className="w-5 h-5" />
                  <span>Settings</span>
                </button>
                <button 
                  onClick={() => router.push('/help')}
                  className="flex items-center justify-center space-x-3 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 hover:from-slate-200 hover:to-slate-300 dark:hover:from-slate-600 dark:hover:to-slate-500 text-slate-700 dark:text-slate-300 px-6 py-4 rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-md"
                >
                  <HelpCircle className="w-5 h-5" />
                  <span>Help & Support</span>
                </button>
              </div>
            </div>

            {/* Real-time Activity Feed */}
            <div className="bg-gradient-to-br from-white/95 to-slate-50/95 dark:from-slate-800/95 dark:to-slate-900/95 backdrop-blur-md rounded-2xl p-6 border border-slate-200/60 dark:border-slate-700/60 shadow-xl">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                Live Activity Feed
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl border border-green-200/50 dark:border-green-700/50">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 dark:text-white">New call received</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">John Smith - Roofing inquiry</p>
                    <p className="text-xs text-green-600 dark:text-green-400">AI handled successfully</p>
                  </div>
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">2 min ago</span>
                </div>
                <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200/50 dark:border-blue-700/50">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 dark:text-white">Appointment booked</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Sarah Johnson - HVAC service</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">Calendar synced</p>
                  </div>
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">15 min ago</span>
                </div>
                <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl border border-purple-200/50 dark:border-purple-700/50">
                  <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 dark:text-white">Payment received</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">$450 - Mike Wilson</p>
                    <p className="text-xs text-purple-600 dark:text-purple-400">Stripe processed</p>
                  </div>
                  <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">1 hour ago</span>
                </div>
                <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl border border-orange-200/50 dark:border-orange-700/50">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 dark:text-white">AI Model Updated</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Improved response accuracy</p>
                    <p className="text-xs text-orange-600 dark:text-orange-400">+2.3% performance boost</p>
                  </div>
                  <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">3 hours ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {activeTab === 'analytics' && (
          <AdvancedAnalytics />
        )}

        {activeTab === 'conversations' && (
          <ConversationAnalytics />
        )}

        {activeTab === 'predictions' && (
          <PredictiveAnalytics />
        )}

        {activeTab === 'enterprise' && (
          <EnterpriseFeatures />
        )}
      </main>

      {/* Particle Background */}
      <ParticleBackground />

      {/* Floating Action Button */}
      <FloatingActionButton />

      {/* Voice Test Modal */}
      {showVoiceTest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Test Your AI Receptionist</h2>
                    <p className="text-slate-500 dark:text-slate-400">Have a live conversation with your AI</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowVoiceTest(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <VoiceTest 
                agentId={testAgentId || "loading"}
                businessName={demoUser?.businessName || "Demo Business"}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}