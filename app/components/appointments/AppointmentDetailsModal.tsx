'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Modal } from '@/app/components/ui/Modal'
import { Button } from '@/app/components/ui/Button'
import { ConfirmationModal } from '@/app/components/ui/ConfirmationModal'
import { useBusinessData } from '@/app/hooks/useBusinessData'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { useToast } from '@/app/contexts/ToastContext'
import { 
  Edit, 
  Trash2, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Clock, 
  DollarSign,
  ExternalLink,
  Loader2,
  FileText
} from 'lucide-react'

interface AppointmentDetailsModalProps {
  open: boolean
  onClose: () => void
  onEdit?: () => void
  onDelete?: () => void
  appointmentId: string | null
}

export function AppointmentDetailsModal({
  open,
  onClose,
  onEdit,
  onDelete,
  appointmentId
}: AppointmentDetailsModalProps) {
  const { business, theme, getServiceColor, formatDate, formatTime, formatCurrency } = useBusinessData()
  const toast = useToast()
  
  const [appointment, setAppointment] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [notesExpanded, setNotesExpanded] = useState(false)

  const primaryColor = theme?.primaryColor || '#8b5cf6'

  useEffect(() => {
    if (open && appointmentId) {
      fetchAppointment()
    } else {
      setAppointment(null)
    }
  }, [open, appointmentId])

  const fetchAppointment = async () => {
    try {
      setLoading(true)
      const response = await fetchWithAuth(`/api/appointments/${appointmentId}`)

      if (!response.ok) {
        const error = await response.json()
        toast.showError('Failed to load appointment', error.error || 'Unknown error')
        onClose()
        return
      }

      const data = await response.json()
      if (!data.success || !data.appointment) {
        toast.showError('Appointment not found')
        onClose()
        return
      }

      setAppointment(data.appointment)
    } catch (err) {
      toast.showError('Failed to load appointment', err instanceof Error ? err.message : 'Unknown error')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!appointmentId) return

    try {
      setDeleting(true)
      const response = await fetchWithAuth(`/api/appointments/${appointmentId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        toast.showError('Failed to delete appointment', error.error || 'Unknown error')
        return
      }

      toast.showSuccess('Appointment deleted successfully')
      onDelete?.()
      onClose()
      setShowDeleteConfirm(false)
    } catch (err) {
      toast.showError('Failed to delete appointment', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setDeleting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, { bg: string; text: string; border: string }> = {
      scheduled: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30' },
      confirmed: { bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-500/30' },
      completed: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/30' },
      cancelled: { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/30' },
      no_show: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500/30' }
    }

    const colors = statusColors[status] || statusColors.scheduled
    return `px-3 py-1 rounded-full text-sm font-medium border ${colors.bg} ${colors.text} ${colors.border}`
  }

  if (!appointment && !loading) {
    return null
  }

  const serviceColor = appointment ? getServiceColor(appointment.service_type) : primaryColor
  const startTime = appointment ? new Date(appointment.start_time) : null
  const endTime = appointment ? new Date(appointment.end_time) : null
  const scheduledDate = appointment ? new Date(appointment.scheduled_date) : null

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title=""
        size="lg"
        aria-labelledby="appointment-details-modal-title"
        aria-describedby="appointment-details-modal-description"
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            <span className="ml-3 text-slate-400">Loading appointment...</span>
          </div>
        ) : appointment ? (
          <div className="space-y-6" id="appointment-details-modal-description">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 
                  id="appointment-details-modal-title"
                  className="text-2xl font-bold text-white mb-2"
                >
                  {appointment.customer_name}
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="px-3 py-1 rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: serviceColor }}
                  >
                    {appointment.service_type}
                  </span>
                  <span className={getStatusBadge(appointment.status)}>
                    {appointment.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Date</span>
                </div>
                <p className="text-lg font-semibold text-white">
                  {scheduledDate ? formatDate(scheduledDate) : 'N/A'}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Time</span>
                </div>
                <p className="text-lg font-semibold text-white">
                  {startTime && endTime 
                    ? `${formatTime(startTime.toTimeString().slice(0, 5))} - ${formatTime(endTime.toTimeString().slice(0, 5))}`
                    : 'N/A'}
                </p>
              </div>
            </div>

            {/* Customer Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Customer Information</h3>
              <div className="space-y-2">
                {appointment.customer_phone && (
                  <a
                    href={`tel:${appointment.customer_phone}`}
                    className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
                    aria-label={`Call ${appointment.customer_name} at ${appointment.customer_phone}`}
                  >
                    <Phone className="w-4 h-4" />
                    <span>{appointment.customer_phone}</span>
                  </a>
                )}
                {appointment.customer_email && (
                  <a
                    href={`mailto:${appointment.customer_email}`}
                    className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
                    aria-label={`Email ${appointment.customer_name} at ${appointment.customer_email}`}
                  >
                    <Mail className="w-4 h-4" />
                    <span>{appointment.customer_email}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Service Details */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Service Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-slate-400">Duration</span>
                  <p className="text-white font-medium">{appointment.duration || 60} minutes</p>
                </div>
                {appointment.estimated_value && (
                  <div>
                    <span className="text-sm text-slate-400">Estimated Value</span>
                    <p className="text-white font-medium flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      {formatCurrency(appointment.estimated_value)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Address */}
            {appointment.address && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-semibold uppercase tracking-wide">Address</span>
                </div>
                <p className="text-white">{appointment.address}</p>
                {appointment.address && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(appointment.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
                    style={{ color: primaryColor }}
                    aria-label="Open address in Google Maps"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on Google Maps
                  </a>
                )}
              </div>
            )}

            {/* Google Calendar Link */}
            {business?.calendarConnected && startTime && (
              <div>
                <a
                  href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${appointment.service_type} - ${appointment.customer_name}`)}&dates=${startTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endTime?.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(appointment.notes || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
                  style={{ color: primaryColor }}
                  aria-label="Open in Google Calendar"
                >
                  <Calendar className="w-4 h-4" />
                  Open in Google Calendar
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Notes */}
            {appointment.notes && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-400">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm font-semibold uppercase tracking-wide">Notes</span>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className={`text-slate-300 ${notesExpanded ? '' : 'line-clamp-3'}`}>
                    {appointment.notes}
                  </p>
                  {appointment.notes.length > 150 && (
                    <button
                      onClick={() => setNotesExpanded(!notesExpanded)}
                      className="mt-2 text-sm hover:opacity-80 transition-opacity"
                      style={{ color: primaryColor }}
                      aria-label={notesExpanded ? 'Collapse notes' : 'Expand notes'}
                    >
                      {notesExpanded ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-800/50">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting}
                className="text-red-400 border-red-400/30 hover:bg-red-400/10"
                icon={<Trash2 className="w-4 h-4" />}
                iconPosition="left"
                aria-label="Delete appointment"
              >
                Delete
              </Button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={deleting}
                  aria-label="Close appointment details"
                >
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    onEdit?.()
                    onClose()
                  }}
                  disabled={deleting}
                  primaryColor={primaryColor}
                  icon={<Edit className="w-4 h-4" />}
                  iconPosition="left"
                  aria-label="Edit appointment"
                >
                  Edit
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmationModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Appointment"
        message="Are you sure you want to delete this appointment? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        loading={deleting}
      />
    </>
  )
}

