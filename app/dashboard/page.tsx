'use client'

import React, { Suspense, useState } from 'react'
import { motion } from 'framer-motion'
import { DashboardHero } from '@/app/components/DashboardHero'
import { ControlCenter } from '@/app/components/ControlCenter'
import { FullCalendarModal } from '@/app/components/FullCalendarModal'
import { DayDetailsSidebar } from '@/app/components/calendar/DayDetailsSidebar'
import { CreateAppointmentModal } from '@/app/components/appointments/CreateAppointmentModal'
import { EditAppointmentModal } from '@/app/components/appointments/EditAppointmentModal'
import { AppointmentDetailsModal } from '@/app/components/appointments/AppointmentDetailsModal'
import RealAnalytics from '@/app/components/RealAnalytics'
import RealCharts from '@/app/components/RealCharts'
import { DashboardSkeleton } from '@/app/components/DashboardSkeleton'
import { useBusinessData } from '@/app/hooks/useBusinessData'
import { useDashboardData } from '@/app/contexts/DashboardDataContext'
import { useDashboardRefresh } from '@/app/hooks/useDashboardRefresh'
import { LoadingSkeleton } from '@/app/components/ui/LoadingSkeleton'

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const { theme, loading } = useBusinessData()
  const { timeframe, setTimeframe } = useDashboardData()
  const { refreshAll: refreshAllDebounced } = useDashboardRefresh()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showFullCalendar, setShowFullCalendar] = useState(false)
  const [showCreateAppointment, setShowCreateAppointment] = useState(false)
  const [showDaySidebar, setShowDaySidebar] = useState(false)
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null)
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false)
  const [showEditAppointment, setShowEditAppointment] = useState(false)

  const handleDayClick = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    setSelectedDate(dateObj)
    setShowDaySidebar(true)
  }

  const handleFullCalendarClick = () => {
    setShowFullCalendar(true)
  }

  const handleAppointmentClick = (appointment: any) => {
    setSelectedAppointmentId(appointment.id)
    setShowAppointmentDetails(true)
  }

  const handleCreateAppointmentSuccess = async () => {
    // Refresh dashboard data without page reload
    await refreshAllDebounced({ showSuccess: true, silent: false })
  }

  const handleEditAppointmentSuccess = async () => {
    setShowAppointmentDetails(false)
    setShowEditAppointment(false)
    // Refresh dashboard data without page reload
    await refreshAllDebounced({ showSuccess: true, silent: false })
  }

  const handleDeleteAppointmentSuccess = async () => {
    setShowAppointmentDetails(false)
    setShowEditAppointment(false)
    // Refresh dashboard data without page reload
    await refreshAllDebounced({ showSuccess: true, silent: false })
  }

  if (loading || !theme) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <DashboardSkeleton />
        </div>
      </div>
    )
  }

  const primaryColor = theme.primaryColor

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900"
      style={{
        backgroundImage: `linear-gradient(to bottom, ${primaryColor}10, transparent)`
      }}
    >
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Main Layout: 70/30 split */}
        <div className="grid grid-cols-10 gap-6">
          {/* Left Column (70%) */}
          <div className="col-span-10 lg:col-span-7 space-y-6">
            <Suspense fallback={<LoadingSkeleton width="100%" height={200} />}>
              <DashboardHero
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
              />
            </Suspense>

            <Suspense fallback={<LoadingSkeleton width="100%" height={300} />}>
              <RealAnalytics timeframe={timeframe} />
            </Suspense>

            <Suspense fallback={<LoadingSkeleton width="100%" height={400} />}>
              <RealCharts timeframe={timeframe} />
            </Suspense>
          </div>

          {/* Right Column (30%) - Control Center */}
          <div className="col-span-10 lg:col-span-3">
            <Suspense fallback={<LoadingSkeleton width="100%" height={600} />}>
              <ControlCenter
                onDayClick={handleDayClick}
                onFullCalendarClick={handleFullCalendarClick}
                onCreateAppointment={() => setShowCreateAppointment(true)}
              />
            </Suspense>
          </div>
        </div>

        {/* Modals */}
        <FullCalendarModal
          open={showFullCalendar}
          onClose={() => setShowFullCalendar(false)}
          onAppointmentClick={handleAppointmentClick}
          onCreateAppointment={() => {
            setShowFullCalendar(false)
            setShowCreateAppointment(true)
          }}
          onDayClick={(date) => {
            setSelectedDate(date)
            setShowFullCalendar(false)
            setShowDaySidebar(true)
          }}
        />
        
        <DayDetailsSidebar
          open={showDaySidebar}
          onClose={() => {
            setShowDaySidebar(false)
            setSelectedDate(null)
          }}
          selectedDate={selectedDate}
          onAppointmentClick={handleAppointmentClick}
          onCreateAppointment={() => {
            setShowDaySidebar(false)
            setShowCreateAppointment(true)
          }}
        />
        
        <CreateAppointmentModal
          open={showCreateAppointment}
          onClose={() => setShowCreateAppointment(false)}
          onSuccess={handleCreateAppointmentSuccess}
          initialDate={selectedDate || undefined}
        />
        
        <AppointmentDetailsModal
          open={showAppointmentDetails}
          onClose={() => {
            setShowAppointmentDetails(false)
            setSelectedAppointmentId(null)
          }}
          appointmentId={selectedAppointmentId}
          onEdit={() => {
            setShowAppointmentDetails(false)
            setShowEditAppointment(true)
          }}
          onDelete={handleDeleteAppointmentSuccess}
        />
        
        <EditAppointmentModal
          open={showEditAppointment}
          onClose={() => {
            setShowEditAppointment(false)
            setSelectedAppointmentId(null)
          }}
          appointmentId={selectedAppointmentId || ''}
          onSuccess={handleEditAppointmentSuccess}
        />
      </div>
    </div>
  )
}
