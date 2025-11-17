'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Modal } from '@/app/components/ui/Modal'
import { FormField } from '@/app/components/ui/FormField'
import { DatePicker } from '@/app/components/ui/DatePicker'
import { TimePicker } from '@/app/components/ui/TimePicker'
import { Select } from '@/app/components/ui/Select'
import { Button } from '@/app/components/ui/Button'
import { ConfirmationModal } from '@/app/components/ui/ConfirmationModal'
import { useBusinessData } from '@/app/hooks/useBusinessData'
import { useDashboardData } from '@/app/contexts/DashboardDataContext'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { validateAndFormatPhone } from '@/lib/phone-validation'
import { z } from 'zod'
import { useToast } from '@/app/contexts/ToastContext'
import { Trash2, Loader2 } from 'lucide-react'

interface EditAppointmentModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  appointmentId: string
}

const appointmentSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required').max(100, 'Name too long'),
  customer_phone: z.string().min(1, 'Phone number is required'),
  customer_email: z.string().email('Invalid email').optional().or(z.literal('')),
  service_type: z.string().min(1, 'Service type is required'),
  scheduled_date: z.date(),
  start_time: z.string().min(1, 'Start time is required'),
  duration: z.number().min(15).max(480),
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']),
  estimated_value: z.number().min(0).optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(1000).optional()
})

export function EditAppointmentModal({
  open,
  onClose,
  onSuccess,
  appointmentId
}: EditAppointmentModalProps) {
  const { business, theme, getServiceColor } = useBusinessData()
  const { addOptimisticUpdate, refreshAppointments } = useDashboardData()
  const toast = useToast()
  
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    service_type: '',
    scheduled_date: new Date(),
    start_time: '',
    duration: 60,
    status: 'scheduled' as const,
    estimated_value: '',
    address: '',
    notes: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const serviceOptions = (business?.services || []).map(service => ({
    value: service,
    label: service,
    color: getServiceColor(service)
  }))

  const statusOptions = [
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'no_show', label: 'No Show' }
  ]

  const durationOptions = [
    { value: '30', label: '30 minutes' },
    { value: '60', label: '1 hour' },
    { value: '90', label: '1.5 hours' },
    { value: '120', label: '2 hours' },
    { value: 'custom', label: 'Custom' }
  ]

  // Fetch appointment data when modal opens
  useEffect(() => {
    if (open && appointmentId) {
      fetchAppointment()
    }
  }, [open, appointmentId])

  const fetchAppointment = async () => {
    try {
      setFetching(true)
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

      const apt = data.appointment
      const scheduledDate = new Date(apt.scheduled_date)
      const startTime = new Date(apt.start_time)
      const timeStr = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`

      setFormData({
        customer_name: apt.customer_name || '',
        customer_phone: apt.customer_phone || '',
        customer_email: apt.customer_email || '',
        service_type: apt.service_type || '',
        scheduled_date: scheduledDate,
        start_time: timeStr,
        duration: apt.duration || 60,
        status: apt.status || 'scheduled',
        estimated_value: apt.estimated_value ? apt.estimated_value.toString() : '',
        address: apt.address || '',
        notes: apt.notes || ''
      })
    } catch (err) {
      toast.showError('Failed to load appointment', err instanceof Error ? err.message : 'Unknown error')
      onClose()
    } finally {
      setFetching(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    try {
      // Validate phone
      const formattedPhone = validateAndFormatPhone(formData.customer_phone)
      if (!formattedPhone) {
        setErrors({ customer_phone: 'Invalid phone number' })
        return
      }

      // Calculate end time
      const [hours, minutes] = formData.start_time.split(':').map(Number)
      const startDateTime = new Date(formData.scheduled_date)
      startDateTime.setHours(hours, minutes, 0, 0)
      
      const endDateTime = new Date(startDateTime)
      endDateTime.setMinutes(endDateTime.getMinutes() + formData.duration)

      // Validate form
      const validated = appointmentSchema.parse({
        ...formData,
        customer_phone: formattedPhone,
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : undefined
      })

      setLoading(true)

      // Create optimistic update
      const optimisticUpdate = {
        customer_name: validated.customer_name,
        customer_phone: validated.customer_phone,
        customer_email: validated.customer_email,
        service_type: validated.service_type,
        scheduled_date: validated.scheduled_date.toISOString().split('T')[0],
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        duration: validated.duration,
        status: validated.status,
        estimated_value: validated.estimated_value,
        address: validated.address,
        notes: validated.notes,
        updated_at: new Date().toISOString()
      }

      // Add optimistic update
      addOptimisticUpdate({
        id: appointmentId,
        type: 'update',
        data: optimisticUpdate
      })

      // Submit to API
      const response = await fetchWithAuth(`/api/appointments/${appointmentId}`, {
        method: 'PUT',
        body: JSON.stringify({
          customer_name: validated.customer_name,
          customer_phone: validated.customer_phone,
          customer_email: validated.customer_email || undefined,
          service_type: validated.service_type,
          scheduled_date: validated.scheduled_date.toISOString().split('T')[0],
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          duration: validated.duration,
          status: validated.status,
          estimated_value: validated.estimated_value,
          address: validated.address,
          notes: validated.notes
        })
      })

      if (!response.ok) {
        const error = await response.json()
        if (error.errors) {
          setErrors(error.errors)
        } else {
          toast.showError('Failed to update appointment', error.error || 'Unknown error')
        }
        // Note: Optimistic update will be auto-cleaned up after 10 seconds
        return
      }

      // Refresh appointments to get real data
      await refreshAppointments()
      
      toast.showSuccess('Appointment updated successfully')
      onSuccess?.()
      onClose()
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        err.errors.forEach(error => {
          if (error.path[0]) {
            fieldErrors[error.path[0].toString()] = error.message
          }
        })
        setErrors(fieldErrors)
      } else {
        toast.showError('An error occurred', 'Please check the form and try again')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      setDeleting(true)

      // Add optimistic update
      addOptimisticUpdate({
        id: appointmentId,
        type: 'delete',
        data: {}
      })

      const response = await fetchWithAuth(`/api/appointments/${appointmentId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        toast.showError('Failed to delete appointment', error.error || 'Unknown error')
        // Note: Optimistic update will be auto-cleaned up after 10 seconds
        return
      }

      // Refresh appointments to get real data
      await refreshAppointments()
      
      toast.showSuccess('Appointment deleted successfully')
      onSuccess?.()
      onClose()
      setShowDeleteConfirm(false)
    } catch (err) {
      toast.showError('Failed to delete appointment', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setDeleting(false)
    }
  }

  const primaryColor = theme?.primaryColor || '#8b5cf6'

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Edit Appointment"
        size="lg"
        aria-labelledby="edit-appointment-modal-title"
        aria-describedby="edit-appointment-modal-description"
      >
        {fetching ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            <span className="ml-3 text-slate-400">Loading appointment...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" id="edit-appointment-modal-description">
            {/* Customer Name */}
            <FormField label="Customer Name" required error={errors.customer_name}>
              <input
                type="text"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2"
                style={{ focusRingColor: primaryColor }}
                maxLength={100}
                aria-label="Customer name"
                aria-describedby={errors.customer_name ? 'customer_name-error' : undefined}
              />
              {errors.customer_name && (
                <span id="customer_name-error" className="text-sm text-red-400" role="alert">
                  {errors.customer_name}
                </span>
              )}
            </FormField>

            {/* Customer Phone */}
            <FormField label="Customer Phone" required error={errors.customer_phone}>
              <input
                type="tel"
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2"
                placeholder="(555) 555-5555"
                aria-label="Customer phone"
                aria-describedby={errors.customer_phone ? 'customer_phone-error' : undefined}
              />
              {errors.customer_phone && (
                <span id="customer_phone-error" className="text-sm text-red-400" role="alert">
                  {errors.customer_phone}
                </span>
              )}
            </FormField>

            {/* Customer Email */}
            <FormField label="Customer Email" error={errors.customer_email}>
              <input
                type="email"
                value={formData.customer_email}
                onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2"
                aria-label="Customer email"
                aria-describedby={errors.customer_email ? 'customer_email-error' : undefined}
              />
              {errors.customer_email && (
                <span id="customer_email-error" className="text-sm text-red-400" role="alert">
                  {errors.customer_email}
                </span>
              )}
            </FormField>

            {/* Service Type */}
            <FormField label="Service Type" required error={errors.service_type}>
              <Select
                options={serviceOptions}
                value={formData.service_type}
                onChange={(value) => setFormData({ ...formData, service_type: value })}
                placeholder="Select service"
                aria-label="Service type"
              />
            </FormField>

            {/* Status */}
            <FormField label="Status" required error={errors.status}>
              <Select
                options={statusOptions}
                value={formData.status}
                onChange={(value) => setFormData({ ...formData, status: value as any })}
                placeholder="Select status"
                aria-label="Appointment status"
              />
            </FormField>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Date" required error={errors.scheduled_date}>
                <DatePicker
                  value={formData.scheduled_date}
                  onChange={(date) => setFormData({ ...formData, scheduled_date: date || new Date() })}
                  minDate={new Date()}
                  businessHours={business?.hours}
                  aria-label="Scheduled date"
                />
              </FormField>

              <FormField label="Time" required error={errors.start_time}>
                <TimePicker
                  value={formData.start_time}
                  onChange={(time) => setFormData({ ...formData, start_time: time || '' })}
                  date={formData.scheduled_date}
                  businessHours={business?.hours}
                  aria-label="Start time"
                />
              </FormField>
            </div>

            {/* Duration */}
            <FormField label="Duration" required error={errors.duration}>
              <Select
                options={durationOptions}
                value={formData.duration.toString()}
                onChange={(value) => setFormData({ ...formData, duration: parseInt(value) })}
                placeholder="Select duration"
                aria-label="Appointment duration"
              />
            </FormField>

            {/* Estimated Value */}
            <FormField label="Estimated Value" error={errors.estimated_value}>
              <input
                type="number"
                value={formData.estimated_value}
                onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2"
                min="0"
                step="0.01"
                placeholder="0.00"
                aria-label="Estimated value"
              />
            </FormField>

            {/* Address */}
            <FormField label="Address" error={errors.address}>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2"
                rows={2}
                maxLength={500}
                aria-label="Address"
              />
            </FormField>

            {/* Notes */}
            <FormField label="Notes" error={errors.notes}>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2"
                rows={3}
                maxLength={1000}
                aria-label="Notes"
              />
            </FormField>

            {/* Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-800/50">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading || deleting}
                className="text-red-400 border-red-400/30 hover:bg-red-400/10"
                aria-label="Delete appointment"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading || deleting}
                  aria-label="Cancel editing"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || deleting}
                  style={{ backgroundColor: primaryColor }}
                  aria-label="Save changes"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmationModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Appointment"
        message="Are you sure you want to delete this appointment? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleting}
      />
    </>
  )
}

