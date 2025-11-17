'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Modal } from '@/app/components/ui/Modal'
import { FormField } from '@/app/components/ui/FormField'
import { DatePicker } from '@/app/components/ui/DatePicker'
import { TimePicker } from '@/app/components/ui/TimePicker'
import { Select } from '@/app/components/ui/Select'
import { Button } from '@/app/components/ui/Button'
import { useBusinessData } from '@/app/hooks/useBusinessData'
import { useDashboardData } from '@/app/contexts/DashboardDataContext'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { validateAndFormatPhone } from '@/lib/phone-validation'
import { z } from 'zod'
import { useToast } from '@/app/contexts/ToastContext'

interface CreateAppointmentModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  initialDate?: Date
  initialTime?: string
}

const appointmentSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required').max(100, 'Name too long'),
  customer_phone: z.string().min(1, 'Phone number is required'),
  customer_email: z.string().email('Invalid email').optional().or(z.literal('')),
  service_type: z.string().min(1, 'Service type is required'),
  scheduled_date: z.date(),
  start_time: z.string().min(1, 'Start time is required'),
  duration: z.number().min(15).max(480),
  estimated_value: z.number().min(0).optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(1000).optional()
})

export function CreateAppointmentModal({
  open,
  onClose,
  onSuccess,
  initialDate,
  initialTime
}: CreateAppointmentModalProps) {
  const { business, theme, getServiceColor } = useBusinessData()
  const { addOptimisticUpdate, refreshAppointments } = useDashboardData()
  const toast = useToast()
  
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    service_type: '',
    scheduled_date: initialDate || new Date(),
    start_time: initialTime || '',
    duration: business?.averageAppointmentDuration || 60,
    estimated_value: '',
    address: '',
    notes: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const serviceOptions = (business?.services || []).map(service => ({
    value: service,
    label: service,
    color: getServiceColor(service)
  }))

  const durationOptions = [
    { value: '30', label: '30 minutes' },
    { value: '60', label: '1 hour' },
    { value: '90', label: '1.5 hours' },
    { value: '120', label: '2 hours' },
    { value: 'custom', label: 'Custom' }
  ]

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

      // Create optimistic appointment
      const tempId = `temp-${Date.now()}`
      const optimisticAppointment = {
        id: tempId,
        customer_name: validated.customer_name,
        customer_phone: validated.customer_phone,
        customer_email: validated.customer_email,
        service_type: validated.service_type,
        scheduled_date: validated.scheduled_date.toISOString().split('T')[0],
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        duration: validated.duration,
        estimated_value: validated.estimated_value,
        address: validated.address,
        notes: validated.notes,
        status: 'scheduled' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Add optimistic update
      addOptimisticUpdate({
        id: tempId,
        type: 'create',
        data: optimisticAppointment
      })

      // Submit to API
      const response = await fetchWithAuth('/api/appointments/create', {
        method: 'POST',
        body: JSON.stringify({
          customer_name: validated.customer_name,
          customer_phone: validated.customer_phone,
          customer_email: validated.customer_email || undefined,
          service_type: validated.service_type,
          scheduled_date: validated.scheduled_date.toISOString().split('T')[0],
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          duration: validated.duration,
          estimated_value: validated.estimated_value,
          address: validated.address,
          notes: validated.notes
        })
      })

      if (!response.ok) {
        // Rollback optimistic update on error
        const error = await response.json()
        if (error.errors) {
          setErrors(error.errors)
        } else {
          toast.showError('Failed to create appointment', error.error || 'Unknown error')
        }
        // Note: Optimistic update will be auto-cleaned up after 10 seconds
        return
      }

      // Refresh appointments to get real data
      await refreshAppointments()
      
      toast.showSuccess('Appointment created successfully')
      onSuccess?.()
      onClose()
      
      // Reset form
      setFormData({
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        service_type: '',
        scheduled_date: new Date(),
        start_time: '',
        duration: business?.averageAppointmentDuration || 60,
        estimated_value: '',
        address: '',
        notes: ''
      })
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

  const primaryColor = theme?.primaryColor || '#8b5cf6'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Appointment"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Customer Name */}
        <FormField label="Customer Name" required error={errors.customer_name}>
          <input
            type="text"
            value={formData.customer_name}
            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
            className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2"
            style={{ focusRingColor: primaryColor }}
            maxLength={100}
          />
        </FormField>

        {/* Customer Phone */}
        <FormField label="Customer Phone" required error={errors.customer_phone}>
          <input
            type="tel"
            value={formData.customer_phone}
            onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
            className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2"
            placeholder="(555) 555-5555"
          />
        </FormField>

        {/* Customer Email */}
        <FormField label="Customer Email" error={errors.customer_email}>
          <input
            type="email"
            value={formData.customer_email}
            onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
            className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2"
          />
        </FormField>

        {/* Service Type */}
        <FormField label="Service Type" required error={errors.service_type}>
          <Select
            options={serviceOptions}
            value={formData.service_type}
            onChange={(value) => setFormData({ ...formData, service_type: value })}
            placeholder="Select service"
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
            />
          </FormField>

          <FormField label="Time" required error={errors.start_time}>
            <TimePicker
              value={formData.start_time}
              onChange={(time) => setFormData({ ...formData, start_time: time || '' })}
              date={formData.scheduled_date}
              businessHours={business?.hours}
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
          />
        </FormField>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/50">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            style={{ backgroundColor: primaryColor }}
          >
            {loading ? 'Creating...' : 'Create Appointment'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

