'use client'

import { useState, useEffect } from 'react'
import { 
  Users, 
  Shield, 
  Settings, 
  Activity, 
  Key, 
  Eye, 
  Edit, 
  Trash2,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  UserPlus,
  UserMinus,
  Crown,
  Star
} from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  role: 'owner' | 'admin' | 'manager' | 'viewer'
  status: 'active' | 'inactive' | 'pending'
  lastLogin: Date
  permissions: string[]
  avatar?: string
}

interface AuditLog {
  id: string
  user: string
  action: string
  resource: string
  timestamp: Date
  ipAddress: string
  userAgent: string
  status: 'success' | 'failed' | 'warning'
}

interface SecuritySettings {
  twoFactorAuth: boolean
  sessionTimeout: number
  passwordPolicy: {
    minLength: number
    requireUppercase: boolean
    requireNumbers: boolean
    requireSymbols: boolean
  }
  ipWhitelist: string[]
  apiAccess: boolean
  auditLogging: boolean
}

export default function EnterpriseFeatures() {
  const [users, setUsers] = useState<User[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null)
  const [activeTab, setActiveTab] = useState<'users' | 'security' | 'audit' | 'settings'>('users')
  const [isLoading, setIsLoading] = useState(true)
  const [showAddUser, setShowAddUser] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')

  useEffect(() => {
    fetchEnterpriseData()
  }, [])

  const fetchEnterpriseData = async () => {
    setIsLoading(true)
    try {
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const mockUsers: User[] = [
        {
          id: '1',
          name: 'John Smith',
          email: 'john@company.com',
          role: 'owner',
          status: 'active',
          lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          permissions: ['all'],
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'
        },
        {
          id: '2',
          name: 'Sarah Johnson',
          email: 'sarah@company.com',
          role: 'admin',
          status: 'active',
          lastLogin: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          permissions: ['dashboard', 'analytics', 'users', 'settings'],
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face'
        },
        {
          id: '3',
          name: 'Mike Wilson',
          email: 'mike@company.com',
          role: 'manager',
          status: 'active',
          lastLogin: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
          permissions: ['dashboard', 'analytics', 'calls'],
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'
        },
        {
          id: '4',
          name: 'Lisa Brown',
          email: 'lisa@company.com',
          role: 'viewer',
          status: 'pending',
          lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          permissions: ['dashboard'],
          avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face'
        }
      ]

      const mockAuditLogs: AuditLog[] = [
        {
          id: '1',
          user: 'John Smith',
          action: 'Login',
          resource: 'Dashboard',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          status: 'success'
        },
        {
          id: '2',
          user: 'Sarah Johnson',
          action: 'Update Settings',
          resource: 'User Management',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          ipAddress: '192.168.1.101',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          status: 'success'
        },
        {
          id: '3',
          user: 'Mike Wilson',
          action: 'Failed Login',
          resource: 'Authentication',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
          ipAddress: '192.168.1.102',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          status: 'failed'
        },
        {
          id: '4',
          user: 'Unknown',
          action: 'Unauthorized Access',
          resource: 'API',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
          ipAddress: '203.0.113.1',
          userAgent: 'curl/7.68.0',
          status: 'warning'
        }
      ]

      const mockSecuritySettings: SecuritySettings = {
        twoFactorAuth: true,
        sessionTimeout: 30,
        passwordPolicy: {
          minLength: 12,
          requireUppercase: true,
          requireNumbers: true,
          requireSymbols: true
        },
        ipWhitelist: ['192.168.1.0/24', '10.0.0.0/8'],
        apiAccess: true,
        auditLogging: true
      }

      setUsers(mockUsers)
      setAuditLogs(mockAuditLogs)
      setSecuritySettings(mockSecuritySettings)
    } catch (error) {
      console.error('Error fetching enterprise data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />
      case 'manager':
        return <Users className="w-4 h-4 text-green-500" />
      default:
        return <Eye className="w-4 h-4 text-slate-500" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
      case 'admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
      case 'manager':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-300'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case 'inactive':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === 'all' || user.role === filterRole
    return matchesSearch && matchesRole
  })

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Enterprise Management</h2>
          <div className="animate-pulse bg-slate-200 dark:bg-slate-700 h-10 w-32 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse bg-slate-200 dark:bg-slate-700 h-32 rounded-2xl"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Enterprise Management</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Manage users, security, and audit logs
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-xl font-semibold transition-all duration-200">
            <Download className="w-4 h-4" />
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
        {(['users', 'security', 'audit', 'settings'] as const).map((tab) => (
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

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* User Management Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="all">All Roles</option>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <button
              onClick={() => setShowAddUser(true)}
              className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-xl font-semibold transition-all duration-200"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add User</span>
            </button>
          </div>

          {/* Users Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((user) => (
              <div key={user.id} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-xl object-cover" />
                    ) : (
                      <Users className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{user.name}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{user.email}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Role</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getRoleColor(user.role)}`}>
                      {getRoleIcon(user.role)}
                      <span className="capitalize">{user.role}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Status</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                      {user.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Last Login</span>
                    <span className="text-sm text-slate-900 dark:text-white">{formatTimeAgo(user.lastLogin)}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 mt-4">
                  <button className="flex-1 p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="flex-1 p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                    <Settings className="w-4 h-4" />
                  </button>
                  <button className="flex-1 p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && securitySettings && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Security Settings */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Security Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Two-Factor Authentication</span>
                  <button className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    securitySettings.twoFactorAuth ? 'bg-green-600' : 'bg-slate-300 dark:bg-slate-600'
                  }`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      securitySettings.twoFactorAuth ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Session Timeout</span>
                  <span className="text-slate-900 dark:text-white">{securitySettings.sessionTimeout} minutes</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">API Access</span>
                  <button className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    securitySettings.apiAccess ? 'bg-green-600' : 'bg-slate-300 dark:bg-slate-600'
                  }`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      securitySettings.apiAccess ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Audit Logging</span>
                  <button className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    securitySettings.auditLogging ? 'bg-green-600' : 'bg-slate-300 dark:bg-slate-600'
                  }`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      securitySettings.auditLogging ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Password Policy */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Password Policy</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Minimum Length</span>
                  <span className="text-slate-900 dark:text-white">{securitySettings.passwordPolicy.minLength} characters</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Require Uppercase</span>
                  <button className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    securitySettings.passwordPolicy.requireUppercase ? 'bg-green-600' : 'bg-slate-300 dark:bg-slate-600'
                  }`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      securitySettings.passwordPolicy.requireUppercase ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Require Numbers</span>
                  <button className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    securitySettings.passwordPolicy.requireNumbers ? 'bg-green-600' : 'bg-slate-300 dark:bg-slate-600'
                  }`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      securitySettings.passwordPolicy.requireNumbers ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Require Symbols</span>
                  <button className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    securitySettings.passwordPolicy.requireSymbols ? 'bg-green-600' : 'bg-slate-300 dark:bg-slate-600'
                  }`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      securitySettings.passwordPolicy.requireSymbols ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* IP Whitelist */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">IP Whitelist</h3>
            <div className="space-y-3">
              {securitySettings.ipWhitelist.map((ip, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <span className="font-mono text-slate-900 dark:text-white">{ip}</span>
                  <button className="p-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button className="w-full p-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 transition-colors">
                <Plus className="w-4 h-4 mx-auto mb-1" />
                Add IP Address
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Audit Logs</h3>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {getStatusIcon(log.status)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-slate-900 dark:text-white">{log.user}</h4>
                          <span className="text-sm text-slate-600 dark:text-slate-400">•</span>
                          <span className="text-sm text-slate-600 dark:text-slate-400">{log.action}</span>
                          <span className="text-sm text-slate-600 dark:text-slate-400">•</span>
                          <span className="text-sm text-slate-600 dark:text-slate-400">{log.resource}</span>
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs text-slate-500 dark:text-slate-500">
                            {formatTimeAgo(log.timestamp)}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-500">
                            {log.ipAddress}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        log.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                        log.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">System Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Maintenance Mode</span>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-300 dark:bg-slate-600 transition-colors">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1 transition-transform" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Auto Backup</span>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-green-600 transition-colors">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6 transition-transform" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Error Reporting</span>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-green-600 transition-colors">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6 transition-transform" />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">API Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Rate Limiting</span>
                  <span className="text-slate-900 dark:text-white">1000 req/hour</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">API Version</span>
                  <span className="text-slate-900 dark:text-white">v2.1</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Webhook URL</span>
                  <span className="text-slate-900 dark:text-white">Configured</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
