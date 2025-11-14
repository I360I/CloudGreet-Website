'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Users,
  UserPlus,
  FileText,
  CreditCard,
  BarChart3,
  Phone,
  Settings,
  TrendingUp,
  HeartHandshake,
  BookOpen,
  Code,
  TestTube,
  CheckSquare,
  PhoneCall,
  LogOut,
  Menu,
  X,
  Shield,
  Loader2
} from 'lucide-react'
import { useToast } from '@/app/contexts/ToastContext'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

const adminNavItems = [
  { href: '/admin/clients', label: 'CLIENTS', icon: Users, category: 'main' },
  { href: '/admin/employees', label: 'EMPLOYEES', icon: UserPlus, category: 'main' },
  { href: '/admin/leads', label: 'LEADS', icon: FileText, category: 'main' },
  { href: '/admin/billing', label: 'BILLING', icon: CreditCard, category: 'main' },
  { href: '/admin/analytics/usage', label: 'ANALYTICS', icon: BarChart3, category: 'main' },
  { href: '/admin/phone-inventory', label: 'PHONE INVENTORY', icon: Phone, category: 'main' },
  { href: '/admin/acquisition', label: 'ACQUISITION', icon: TrendingUp, category: 'growth' },
  { href: '/admin/customer-success', label: 'CUSTOMER SUCCESS', icon: HeartHandshake, category: 'growth' },
  { href: '/admin/settings', label: 'SETTINGS', icon: Settings, category: 'system' },
  { href: '/admin/knowledge', label: 'KNOWLEDGE', icon: BookOpen, category: 'system' },
  { href: '/admin/code-quality', label: 'CODE QUALITY', icon: Code, category: 'dev' },
  { href: '/admin/manual-tests', label: 'MANUAL TESTS', icon: TestTube, category: 'dev' },
  { href: '/admin/qa', label: 'QA', icon: CheckSquare, category: 'dev' },
  { href: '/admin/test-call', label: 'TEST CALL', icon: PhoneCall, category: 'dev' },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { showSuccess } = useToast()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Don't show sidebar on login page
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/admin/login')
        return
      }

      try {
        // Verify admin access by checking a protected endpoint
        const response = await fetchWithAuth('/api/admin/clients?limit=1')
        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('token')
            router.push('/admin/login')
            return
          }
        }
        
        // Try to get user info from token
        try {
          const tokenParts = token.split('.')
          if (tokenParts.length === 3) {
            const tokenData = JSON.parse(atob(tokenParts[1]))
            setUserEmail(tokenData.email || 'Admin')
          } else {
            setUserEmail('Admin')
          }
        } catch {
          setUserEmail('Admin')
        }
        
        setCheckingAuth(false)
      } catch (error) {
        console.error('Auth check error:', error)
        localStorage.removeItem('token')
        router.push('/admin/login')
      }
    }

    checkAuth()
  }, [router, pathname])

  const handleLogout = () => {
    localStorage.removeItem('token')
    showSuccess('Logged out successfully')
    router.push('/admin/login')
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
        {/* Matrix-style grid background */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `
            linear-gradient(rgba(147, 51, 234, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(147, 51, 234, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}></div>
        <div className="flex flex-col items-center gap-4 relative z-10">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          <div className="text-white text-lg font-mono">LOADING...</div>
        </div>
      </div>
    )
  }

  const mainItems = adminNavItems.filter(item => item.category === 'main')
  const growthItems = adminNavItems.filter(item => item.category === 'growth')
  const systemItems = adminNavItems.filter(item => item.category === 'system')
  const devItems = adminNavItems.filter(item => item.category === 'dev')

  return (
    <div className="min-h-screen bg-black flex relative overflow-hidden">
      {/* Matrix-style grid background */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `
          linear-gradient(rgba(147, 51, 234, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(147, 51, 234, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px'
      }}></div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-black border-r-2 border-purple-500/30
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
          shadow-[0_0_30px_rgba(147,51,234,0.3)]
        `}
      >
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-purple-500"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-purple-500"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-purple-500"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-purple-500"></div>

        {/* Header */}
        <div className="p-6 border-b-2 border-purple-500/30 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border-2 border-purple-500 flex items-center justify-center bg-black">
                <Shield className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <h1 className="text-white font-mono font-bold text-sm tracking-wider">ADMIN</h1>
                <p className="text-purple-400 font-mono text-xs">DASHBOARD</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-purple-400 hover:text-purple-300 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {userEmail && (
            <p className="text-gray-400 font-mono text-xs truncate" title={userEmail}>
              {userEmail}
            </p>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6 relative z-10">
          {/* Main Section */}
          <div>
            <h2 className="text-purple-500/50 font-mono text-xs uppercase tracking-wider mb-3 px-2">
              MAIN
            </h2>
            <div className="space-y-1">
              {mainItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 font-mono text-sm
                      transition-all border-2
                      ${isActive
                        ? 'bg-purple-500/10 border-purple-500/50 text-purple-300'
                        : 'bg-black border-purple-500/10 text-gray-400 hover:bg-purple-500/5 hover:border-purple-500/30 hover:text-purple-400'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="uppercase tracking-wider truncate">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Growth Section */}
          {growthItems.length > 0 && (
            <div>
              <h2 className="text-purple-500/50 font-mono text-xs uppercase tracking-wider mb-3 px-2">
                GROWTH
              </h2>
              <div className="space-y-1">
                {growthItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 font-mono text-sm
                        transition-all border-2
                        ${isActive
                          ? 'bg-purple-500/10 border-purple-500/50 text-purple-300'
                          : 'bg-black border-purple-500/10 text-gray-400 hover:bg-purple-500/5 hover:border-purple-500/30 hover:text-purple-400'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="uppercase tracking-wider truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* System Section */}
          {systemItems.length > 0 && (
            <div>
              <h2 className="text-purple-500/50 font-mono text-xs uppercase tracking-wider mb-3 px-2">
                SYSTEM
              </h2>
              <div className="space-y-1">
                {systemItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 font-mono text-sm
                        transition-all border-2
                        ${isActive
                          ? 'bg-purple-500/10 border-purple-500/50 text-purple-300'
                          : 'bg-black border-purple-500/10 text-gray-400 hover:bg-purple-500/5 hover:border-purple-500/30 hover:text-purple-400'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="uppercase tracking-wider truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Dev Section */}
          {devItems.length > 0 && (
            <div>
              <h2 className="text-purple-500/50 font-mono text-xs uppercase tracking-wider mb-3 px-2">
                DEVELOPMENT
              </h2>
              <div className="space-y-1">
                {devItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 font-mono text-sm
                        transition-all border-2
                        ${isActive
                          ? 'bg-purple-500/10 border-purple-500/50 text-purple-300'
                          : 'bg-black border-purple-500/10 text-gray-400 hover:bg-purple-500/5 hover:border-purple-500/30 hover:text-purple-400'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="uppercase tracking-wider truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t-2 border-purple-500/30 relative z-10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 font-mono text-sm bg-black border-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-all uppercase tracking-wider"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            LOGOUT
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Mobile Header */}
        <header className="lg:hidden bg-black border-b-2 border-purple-500/30 p-4 flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-purple-400 hover:text-purple-300 transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-500" />
            <span className="text-white font-mono text-sm uppercase">ADMIN</span>
          </div>
          <div className="w-6" /> {/* Spacer */}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

