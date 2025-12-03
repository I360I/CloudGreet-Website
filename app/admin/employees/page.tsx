'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/app/contexts/ToastContext'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { UserPlus, Users, Loader2, CheckCircle2, XCircle, Shield } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { logger } from '@/lib/monitoring'

interface Employee {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string
  job_title: string | null
  is_active: boolean
  created_at: string
  last_login: string | null
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { showError, showSuccess } = useToast()

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    setLoading(true)
    try {
      const response = await fetchWithAuth('/api/admin/employees')
      
      if (!response.ok) {
        if (response.status === 401) {
          showError('Session expired. Please login again.')
          router.push('/admin/login')
          return
        }
        showError(`Failed to load employees (${response.status})`)
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
        setEmployees(data.employees || [])
      } else {
        showError(data.error || 'Failed to load employees')
      }
    } catch (error) {
      logger.error('Fetch employees error', { error: error instanceof Error ? error.message : 'Unknown error' })
      showError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const toggleEmployeeStatus = async (employeeId: string, currentStatus: boolean) => {
    if (updatingId) return // Prevent double-clicks
    
    setUpdatingId(employeeId)
    try {
      const response = await fetchWithAuth('/api/admin/employees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          is_active: !currentStatus
        })
      })

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        
        if (response.status === 401) {
          showError('Session expired. Please login again.')
          router.push('/admin/login')
          return
        }
        showError(errorData.error || `Failed to update employee (${response.status})`)
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
        showSuccess(`Employee ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
        fetchEmployees()
      } else {
        showError(data.error || 'Failed to update employee')
      }
        } catch (error) {
          if (error instanceof Error && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
            showError('Session expired. Please login again.')
            router.push('/admin/login')
          } else {
            showError('Network error. Please try again.')
          }
    } finally {
      setUpdatingId(null)
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
      
      <div className="max-w-6xl mx-auto pt-8 relative z-10">
        <div className="bg-black border-2 border-purple-500/30 p-8 relative shadow-[0_0_30px_rgba(147,51,234,0.3)]">
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-purple-500"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-purple-500"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-purple-500"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-purple-500"></div>
          
          <div className="flex justify-between items-center mb-8">
            <div>
              <div className="inline-flex items-center justify-center w-16 h-16 border-2 border-purple-500 mb-4 bg-black">
                <Users className="w-8 h-8 text-purple-500" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2 font-mono tracking-wider">EMPLOYEE MANAGEMENT</h1>
              <p className="text-gray-400 font-mono text-sm">VIEW AND MANAGE EMPLOYEE ACCOUNTS</p>
            </div>
            <Button
              onClick={() => router.push('/admin/employees/create')}
              className="bg-black border-2 border-purple-500 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 font-mono uppercase tracking-wider"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              CREATE EMPLOYEE
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-4" />
              <div className="text-white font-mono">LOADING EMPLOYEES...</div>
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-12 bg-black border-2 border-purple-500/30 relative">
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-purple-500"></div>
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-purple-500"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-purple-500"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-purple-500"></div>
              
              <Users className="w-16 h-16 text-purple-500/50 mx-auto mb-4" />
              <p className="text-gray-300 text-lg mb-2 font-mono">NO EMPLOYEES FOUND</p>
              <p className="text-gray-500 mb-6 font-mono text-sm">CREATE YOUR FIRST EMPLOYEE ACCOUNT</p>
              <Button
                onClick={() => router.push('/admin/employees/create')}
                className="bg-black border-2 border-purple-500 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 font-mono uppercase"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                CREATE FIRST EMPLOYEE
              </Button>
            </div>
          ) : (
            <div className="bg-black border-2 border-purple-500/30 overflow-hidden relative">
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-purple-500"></div>
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-purple-500"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-purple-500"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-purple-500"></div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-black border-b-2 border-purple-500/30">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-purple-400 font-mono uppercase tracking-wider">NAME</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-purple-400 font-mono uppercase tracking-wider">EMAIL</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-purple-400 font-mono uppercase tracking-wider">ROLE</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-purple-400 font-mono uppercase tracking-wider">STATUS</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-purple-400 font-mono uppercase tracking-wider">CREATED</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-purple-400 font-mono uppercase tracking-wider">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-purple-500/10">
                    {employees.map((employee) => (
                      <tr key={employee.id} className="hover:bg-purple-500/5 transition-colors">
                        <td className="px-6 py-4 text-white font-medium font-mono">
                          {employee.first_name || employee.last_name
                            ? `${employee.first_name || ''} ${employee.last_name || ''}`.trim().toUpperCase()
                            : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="px-6 py-4 text-gray-300 font-mono text-sm">{employee.email}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-black border-2 border-purple-500/30 text-purple-400 font-mono uppercase">
                            <Shield className="w-3 h-3 mr-1" />
                            {employee.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 text-xs font-medium bg-black border-2 font-mono uppercase ${
                              employee.is_active
                                ? 'border-green-500/50 text-green-400'
                                : 'border-red-500/50 text-red-400'
                            }`}
                          >
                            {employee.is_active ? (
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                            ) : (
                              <XCircle className="w-3 h-3 mr-1" />
                            )}
                            {employee.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-400 text-sm font-mono">
                          {new Date(employee.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }).toUpperCase()}
                        </td>
                        <td className="px-6 py-4">
                          <Button
                            onClick={() => toggleEmployeeStatus(employee.id, employee.is_active)}
                            variant="outline"
                            size="sm"
                            disabled={updatingId === employee.id}
                            className={`bg-black border-2 font-mono uppercase text-xs ${
                              employee.is_active
                                ? 'border-red-500/50 text-red-400 hover:bg-red-500/10 disabled:opacity-50'
                                : 'border-green-500/50 text-green-400 hover:bg-green-500/10 disabled:opacity-50'
                            }`}
                          >
                            {updatingId === employee.id ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                UPDATING...
                              </>
                            ) : employee.is_active ? (
                              <>
                                <XCircle className="w-3 h-3 mr-1" />
                                DEACTIVATE
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                ACTIVATE
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

