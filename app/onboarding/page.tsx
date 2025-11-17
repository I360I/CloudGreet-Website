'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Globe,
  Loader2,
  MapPin,
  Phone,
  Settings,
  Sparkles,
  PenSquare,
  User,
  Wallet
} from 'lucide-react'
import { useToast } from '@/app/contexts/ToastContext'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'

type BusinessHours = Record<
  'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday',
  {
    start: string
    end: string
    enabled: boolean
  }
>

type BusinessState = {
  id: string
  business_name: string
  business_type: string
  email: string
  phone: string | null
  phone_number: string | null
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  website: string | null
  services: string[] | null
  service_areas: string[] | null
  business_hours: BusinessHours | null
  timezone: string | null
  calendar_connected: boolean | null
  onboarding_completed: boolean | null
  onboarding_step: number | null
  onboarding_data?: Record<string, unknown> | null
  greeting_message?: string | null
  tone?: 'professional' | 'friendly' | 'casual' | null
  description?: string | null
}

type UserState = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
}

type OnboardingState = {
  business: BusinessState | null
  onboarding: {
    completed: boolean
    step: number
  }
  user: UserState | null
  tollFreeInventory: {
    available: number
  }
}

const defaultHours: BusinessHours = {
  monday: { start: '09:00', end: '17:00', enabled: true },
  tuesday: { start: '09:00', end: '17:00', enabled: true },
  wednesday: { start: '09:00', end: '17:00', enabled: true },
  thursday: { start: '09:00', end: '17:00', enabled: true },
  friday: { start: '09:00', end: '17:00', enabled: true },
  saturday: { start: '10:00', end: '14:00', enabled: false },
  sunday: { start: '10:00', end: '14:00', enabled: false }
}

const steps = [
  { key: 1, label: 'Business Profile', icon: User },
  { key: 2, label: 'Services & Hours', icon: Settings },
  { key: 3, label: 'Calendar Connect', icon: CalendarDays },
  { key: 4, label: 'Phone Provisioning', icon: Phone },
  { key: 5, label: 'Billing & Launch', icon: Wallet }
]

type BusinessFormState = {
  businessName: string
  businessType: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zipCode: string
  website: string
  description: string
  greetingMessage: string
  tone: 'professional' | 'friendly' | 'casual'
}

type ServicesFormState = {
  servicesText: string
  serviceAreasText: string
  timezone: string
  businessHours: BusinessHours
}

type PhoneFormState = {
  existingNumber: string
  areaCode: string
}

function OnboardingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { showError, showSuccess } = useToast()

  const [loading, setLoading] = useState(true)
  const [state, setState] = useState<OnboardingState | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [savingBusiness, setSavingBusiness] = useState(false)
  const [savingServices, setSavingServices] = useState(false)
  const [provisioningPhone, setProvisioningPhone] = useState(false)
  const [completing, setCompleting] = useState(false)

  const [businessForm, setBusinessForm] = useState<BusinessFormState>({
    businessName: '',
    businessType: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    website: '',
    description: '',
    greetingMessage: '',
    tone: 'professional'
  })

  const [servicesForm, setServicesForm] = useState<ServicesFormState>({
    servicesText: '',
    serviceAreasText: '',
    timezone: 'America/New_York',
    businessHours: defaultHours
  })

  const [phoneForm, setPhoneForm] = useState<PhoneFormState>({
    existingNumber: '',
    areaCode: ''
  })

  const calendarStatus = useMemo(
    () => state?.business?.calendar_connected ?? false,
    [state?.business?.calendar_connected]
  )

  const phoneStatus = useMemo(() => {
    const number = state?.business?.phone_number || state?.business?.phone
    return number ? number : null
  }, [state?.business?.phone_number, state?.business?.phone])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const response = await fetchWithAuth('/api/onboarding/state')
        
        if (!response.ok) {
          let errorData
          try {
            errorData = await response.json()
          } catch {
            errorData = {}
          }
          throw new Error(errorData?.error || `Failed to load onboarding state (${response.status})`)
        }

        let data
        try {
          data = await response.json()
        } catch (jsonError) {
          throw new Error('Invalid response from server')
        }

        setState(data)

        if (data.business) {
          setBusinessForm({
            businessName: data.business.business_name || '',
            businessType: data.business.business_type || '',
            email: data.business.email || '',
            phone: data.business.phone || '',
            address: data.business.address || '',
            city: data.business.city || '',
            state: data.business.state || '',
            zipCode: data.business.zip_code || '',
            website: data.business.website || '',
            description: data.business.description || '',
            greetingMessage:
              data.business.greeting_message ||
              (data.business.business_name
                ? `Hello, thank you for calling ${data.business.business_name}. How can I help you today?`
                : ''),
            tone: (data.business.tone as BusinessFormState['tone']) || 'professional'
          })

          const services = (data.business.services || []).join(', ')
          const areas = (data.business.service_areas || []).join(', ')

          setServicesForm({
            servicesText: services,
            serviceAreasText: areas,
            timezone: data.business.timezone || 'America/New_York',
            businessHours: data.business.business_hours || defaultHours
          })

          setPhoneForm((prev) => ({
            ...prev,
            existingNumber: data.business.phone_number || data.business.phone || prev.existingNumber
          }))
        }

        const completed = data.onboarding?.completed
        const stepFromServer = data.onboarding?.step ?? 0
        const initialStep = completed ? 5 : Math.min(5, Math.max(stepFromServer + 1, 1))
        setCurrentStep(initialStep)

        const calendarParam = searchParams.get('calendar')
        if (calendarParam === 'success') {
          showSuccess('Google Calendar connected', 'Your availability will now sync automatically.')
          router.replace('/onboarding')
        } else if (calendarParam === 'error') {
          showError('Calendar connection failed', 'Please try again or reconnect later.')
          router.replace('/onboarding')
        }
      } catch (error) {
        showError(
          'Failed to load onboarding',
          error instanceof Error ? error.message : 'Unknown error'
        )
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [router, searchParams, showError, showSuccess])

  const handleSaveBusiness = async () => {
    try {
      setSavingBusiness(true)
      const response = await fetchWithAuth('/api/onboarding/business', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(businessForm)
      })
      
      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        throw new Error(errorData?.error || `Failed to save business profile (${response.status})`)
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error('Invalid response from server')
      }
      showSuccess('Business profile saved', 'Let’s configure your services next.')
      setCurrentStep(2)
    } catch (error) {
      showError(
        'Unable to save business profile',
        error instanceof Error ? error.message : 'Unknown error'
      )
    } finally {
      setSavingBusiness(false)
    }
  }

  const handleSaveServices = async () => {
    try {
      setSavingServices(true)
      const services = servicesForm.servicesText
        .split(',')
        .map((service) => service.trim())
        .filter(Boolean)
      const serviceAreas = servicesForm.serviceAreasText
        .split(',')
        .map((area) => area.trim())
        .filter(Boolean)

      const response = await fetchWithAuth('/api/onboarding/services', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          services,
          serviceAreas,
          timezone: servicesForm.timezone,
          businessHours: servicesForm.businessHours
        })
      })
      
      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        throw new Error(errorData?.error || `Failed to save services (${response.status})`)
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error('Invalid response from server')
      }

      showSuccess('Services saved', 'Now connect your calendar for real-time scheduling.')
      setCurrentStep(3)
    } catch (error) {
      showError(
        'Unable to save services',
        error instanceof Error ? error.message : 'Unknown error'
      )
    } finally {
      setSavingServices(false)
    }
  }

  const handleConnectCalendar = async () => {
    try {
      const response = await fetchWithAuth('/api/onboarding/calendar/google')
      
      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        throw new Error(errorData?.error || `Unable to start Google Calendar connect (${response.status})`)
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error('Invalid response from server')
      }

      if (!data.url) {
        throw new Error('Invalid response from server')
      }
      window.location.href = data.url
    } catch (error) {
      showError(
        'Google Calendar connection failed',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  const handleDisconnectCalendar = async () => {
    try {
      const response = await fetch('/api/onboarding/calendar/google', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`
        }
      })
      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        throw new Error(errorData?.error || `Unable to disconnect calendar (${response.status})`)
      }
      showSuccess('Calendar disconnected', 'Reconnect any time to keep appointments in sync.')
      setState((prev) =>
        prev
          ? {
              ...prev,
              business: prev.business
                ? { ...prev.business, calendar_connected: false }
                : prev.business
            }
          : prev
      )
    } catch (error) {
      showError(
        'Failed to disconnect calendar',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  const handleProvisionPhone = async () => {
    try {
      setProvisioningPhone(true)
      const payload: Record<string, string> = {}
      if (phoneForm.existingNumber) {
        payload.existingNumber = phoneForm.existingNumber
      }
      if (phoneForm.areaCode) {
        payload.areaCode = phoneForm.areaCode
      }

      const response = await fetchWithAuth('/api/onboarding/phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        throw new Error(errorData?.error || `Failed to configure phone number (${response.status})`)
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error('Invalid response from server')
      }

      showSuccess('Phone number ready', `We assigned ${data.phoneNumber} to your account.`)
      setState((prev) =>
        prev
          ? {
              ...prev,
              business: prev.business
                ? {
                    ...prev.business,
                    phone_number: data.phoneNumber,
                    phone: data.phoneNumber
                  }
                : prev.business
            }
          : prev
      )
      setCurrentStep(5)
    } catch (error) {
      showError(
        'Phone provisioning failed',
        error instanceof Error ? error.message : 'Unknown error'
      )
    } finally {
      setProvisioningPhone(false)
    }
  }

  const handleComplete = async () => {
    if (!state?.business) return
    try {
      setCompleting(true)
      const ownerName = state.user
        ? [state.user.first_name, state.user.last_name].filter(Boolean).join(' ')
        : ''

      const response = await fetchWithAuth('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessName: businessForm.businessName,
          businessType: businessForm.businessType,
          email: businessForm.email,
          phone: state.business.phone_number || businessForm.phone,
          address: businessForm.address,
          city: businessForm.city,
          state: businessForm.state,
          zipCode: businessForm.zipCode,
          website: businessForm.website,
          services: servicesForm.servicesText.split(',').map((s) => s.trim()).filter(Boolean),
          serviceAreas: servicesForm.serviceAreasText.split(',').map((a) => a.trim()).filter(Boolean),
          businessHours: servicesForm.businessHours,
          greetingMessage: businessForm.greetingMessage,
          tone: businessForm.tone,
          ownerName,
          description: businessForm.description
        })
      })
      
      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        throw new Error(errorData?.error || `Failed to complete onboarding (${response.status})`)
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error('Invalid response from server')
      }

      if (!data.success) {
        throw new Error(data?.error || 'Failed to complete onboarding')
      }

      // Show success message
      showSuccess(
        'Onboarding complete!', 
        data.phoneNumber 
          ? `Your AI receptionist is ready! Phone number: ${data.phoneNumber}. Redirecting to billing...`
          : 'Your AI receptionist is being set up. Redirecting to billing...'
      )

      // Small delay to show success message, then redirect
      setTimeout(() => {
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl
        } else {
          router.push('/dashboard')
        }
      }, 2000)
    } catch (error) {
      showError(
        'Unable to complete onboarding',
        error instanceof Error ? error.message : 'Unknown error'
      )
    } finally {
      setCompleting(false)
    }
  }

  const renderStepIndicator = () => (
    <div className="flex flex-wrap gap-3">
      {steps.map((step) => {
        const Icon = step.icon
        const completed = currentStep > step.key
        const active = currentStep === step.key
        return (
          <div
            key={step.key}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
              active
                ? 'border-blue-400/40 bg-blue-500/10 text-blue-100 shadow-[0_0_20px_rgba(59,130,246,0.35)]'
                : completed
                  ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
                  : 'border-white/10 bg-white/5 text-slate-300'
            }`}
          >
            <span
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${
                completed
                  ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-100'
                  : active
                    ? 'border-blue-400/50 bg-blue-500/20 text-blue-100'
                    : 'border-white/10 bg-white/10 text-slate-300'
              }`}
            >
              {completed ? <CheckCircle2 className="h-4 w-4" /> : step.key}
            </span>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500">{`Step ${step.key}`}</span>
              <span className="flex items-center gap-1 text-sm font-semibold text-white">
                {step.label}
                {active && <Icon className="h-4 w-4 text-blue-200" />}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )

  const renderBusinessForm = () => (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 md:p-8 shadow-xl">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Business Profile</h2>
        <p className="text-sm text-slate-400">
          Tell us who you are so every greeting, email, and agent message gets the details right.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-300">
          <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Business name</span>
          <input
            type="text"
            value={businessForm.businessName}
            onChange={(event) =>
              setBusinessForm((prev) => ({ ...prev, businessName: event.target.value }))
            }
            className="w-full rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-3 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all"
            placeholder="Acme Home Services"
          />
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Industry</span>
          <input
            type="text"
            value={businessForm.businessType}
            onChange={(event) =>
              setBusinessForm((prev) => ({ ...prev, businessType: event.target.value }))
            }
            className="w-full rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-3 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all"
            placeholder="HVAC, Painting, Roofing..."
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-300">
          <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Email</span>
          <input
            type="email"
            value={businessForm.email}
            onChange={(event) =>
              setBusinessForm((prev) => ({ ...prev, email: event.target.value }))
            }
            className="w-full rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-3 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all"
            placeholder="owner@example.com"
          />
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Main phone</span>
          <input
            type="tel"
            value={businessForm.phone}
            onChange={(event) =>
              setBusinessForm((prev) => ({ ...prev, phone: event.target.value }))
            }
            className="w-full rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-3 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all"
            placeholder="+1 415 555 0100"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-300">
          <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Street address</span>
          <input
            type="text"
            value={businessForm.address}
            onChange={(event) =>
              setBusinessForm((prev) => ({ ...prev, address: event.target.value }))
            }
            className="w-full rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-3 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all"
            placeholder="123 Main Street"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-2 text-sm text-slate-300">
            <span className="text-xs uppercase tracking-[0.3em] text-slate-500">City</span>
            <input
              type="text"
              value={businessForm.city}
              onChange={(event) =>
                setBusinessForm((prev) => ({ ...prev, city: event.target.value }))
              }
              className="w-full rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-3 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all"
              placeholder="Austin"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            <span className="text-xs uppercase tracking-[0.3em] text-slate-500">State</span>
            <input
              type="text"
              value={businessForm.state}
              onChange={(event) =>
                setBusinessForm((prev) => ({ ...prev, state: event.target.value }))
              }
              className="w-full rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-3 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all"
              placeholder="TX"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Zip</span>
            <input
              type="text"
              value={businessForm.zipCode}
              onChange={(event) =>
                setBusinessForm((prev) => ({ ...prev, zipCode: event.target.value }))
              }
              className="w-full rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-3 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all"
              placeholder="78701"
            />
          </label>
        </div>
      </div>

      <label className="space-y-2 text-sm text-slate-300">
        <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Website</span>
        <input
          type="url"
          value={businessForm.website}
          onChange={(event) =>
            setBusinessForm((prev) => ({ ...prev, website: event.target.value }))
          }
          className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
          placeholder="https://example.com"
        />
      </label>

      <label className="space-y-2 text-sm text-slate-300">
        <span className="text-xs uppercase tracking-[0.3em] text-slate-500">What should the agent say?</span>
        <textarea
          value={businessForm.greetingMessage}
          onChange={(event) =>
            setBusinessForm((prev) => ({ ...prev, greetingMessage: event.target.value }))
          }
          rows={4}
          className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
          placeholder={`Hello, thank you for calling ${businessForm.businessName || 'our team'}. How can I help you today?`}
        />
      </label>

      <label className="space-y-2 text-sm text-slate-300">
        <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Brand tone</span>
        <div className="flex flex-wrap gap-2">
          {(['professional', 'friendly', 'casual'] as BusinessFormState['tone'][]).map((toneOption) => (
            <button
              key={toneOption}
              type="button"
              onClick={() => setBusinessForm((prev) => ({ ...prev, tone: toneOption }))}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-300 ${
                businessForm.tone === toneOption
                  ? 'border border-blue-400/40 bg-blue-500/20 text-blue-100'
                  : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {toneOption}
            </button>
          ))}
        </div>
      </label>

      <label className="space-y-2 text-sm text-slate-300">
        <span className="text-xs uppercase tracking-[0.3em] text-slate-500">About your business</span>
        <textarea
          value={businessForm.description}
          onChange={(event) =>
            setBusinessForm((prev) => ({ ...prev, description: event.target.value }))
          }
          rows={4}
          className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
          placeholder="We provide residential HVAC installation and 24/7 emergency repair across Austin and San Antonio."
        />
      </label>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleSaveBusiness}
          disabled={savingBusiness}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-400/40 bg-blue-500/20 px-6 py-3 text-sm font-semibold text-blue-100 shadow-lg transition-all duration-300 hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savingBusiness ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Save & continue
        </button>
      </div>
    </div>
  )

  const renderServicesForm = () => (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 md:p-8 shadow-xl">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Services & Availability</h2>
        <p className="text-sm text-slate-400">
          These details power qualification, scheduling, and when CloudGreet introduces your business.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-300">
          <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Services offered</span>
          <textarea
            value={servicesForm.servicesText}
            onChange={(event) =>
              setServicesForm((prev) => ({ ...prev, servicesText: event.target.value }))
            }
            rows={4}
            className="w-full rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-3 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all"
            placeholder="Residential HVAC install, Annual maintenance, Emergency repair"
          />
          <p className="text-xs text-slate-500">Separate with commas</p>
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Service areas</span>
          <textarea
            value={servicesForm.serviceAreasText}
            onChange={(event) =>
              setServicesForm((prev) => ({ ...prev, serviceAreasText: event.target.value }))
            }
            rows={4}
            className="w-full rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-3 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all"
            placeholder="Austin, Round Rock, San Marcos"
          />
          <p className="text-xs text-slate-500">Separate with commas</p>
        </label>
      </div>

      <label className="space-y-2 text-sm text-slate-300">
        <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Timezone</span>
        <input
          type="text"
          value={servicesForm.timezone}
          onChange={(event) =>
            setServicesForm((prev) => ({ ...prev, timezone: event.target.value }))
          }
          className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
          placeholder="America/Chicago"
        />
      </label>

      <div className="space-y-3">
        <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Business hours</span>
        <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
          {Object.entries(servicesForm.businessHours).map(([day, config]) => (
            <div
              key={day}
              className="grid items-center gap-2 sm:grid-cols-[120px,1fr,1fr,auto]"
            >
              <span className="font-semibold capitalize text-white">{day}</span>
              <label className="flex items-center gap-2">
                <span className="text-slate-500">Start</span>
                <input
                  type="time"
                  value={config.start}
                  onChange={(event) =>
                    setServicesForm((prev) => ({
                      ...prev,
                      businessHours: {
                        ...prev.businessHours,
                        [day]: { ...prev.businessHours[day as keyof BusinessHours], start: event.target.value }
                      }
                    }))
                  }
                  className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl px-3 py-2 text-xs text-white placeholder:text-gray-400 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all"
                />
              </label>
              <label className="flex items-center gap-2">
                <span className="text-slate-500">End</span>
                <input
                  type="time"
                  value={config.end}
                  onChange={(event) =>
                    setServicesForm((prev) => ({
                      ...prev,
                      businessHours: {
                        ...prev.businessHours,
                        [day]: { ...prev.businessHours[day as keyof BusinessHours], end: event.target.value }
                      }
                    }))
                  }
                  className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl px-3 py-2 text-xs text-white placeholder:text-gray-400 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all"
                />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(event) =>
                    setServicesForm((prev) => ({
                      ...prev,
                      businessHours: {
                        ...prev.businessHours,
                        [day]: { ...prev.businessHours[day as keyof BusinessHours], enabled: event.target.checked }
                      }
                    }))
                  }
                  className="h-4 w-4 rounded border border-white/20 bg-white/10 text-blue-500 focus:ring-blue-400"
                />
                <span className="text-slate-400">Open</span>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleSaveServices}
          disabled={savingServices}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-400/40 bg-blue-500/20 px-6 py-3 text-sm font-semibold text-blue-100 shadow-lg transition-all duration-300 hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savingServices ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Settings className="h-4 w-4" />
          )}
          Save & continue
        </button>
      </div>
    </div>
  )

  const renderCalendarStep = () => (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 md:p-8 shadow-xl">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Connect your calendar</h2>
        <p className="text-sm text-slate-400">
          When CloudGreet books appointments, we’ll check your availability and drop meetings
          directly onto your calendar.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-start gap-3">
          <CalendarDays className="h-6 w-6 text-blue-300" />
          <div className="space-y-1 text-sm text-slate-200">
            <p className="font-semibold text-white">Google Calendar</p>
            <p className="text-slate-400">
              We only request read/write access to manage events you book through CloudGreet.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/50 p-4 text-sm text-slate-300">
          <p className="flex items-center gap-2 text-slate-200">
            <span
              className={`h-2 w-2 rounded-full ${
                calendarStatus ? 'bg-emerald-400' : 'bg-slate-500'
              }`}
            />
            {calendarStatus ? 'Google Calendar is connected' : 'Calendar not connected yet'}
          </p>
          {calendarStatus && (
            <p className="mt-2 text-xs text-slate-500">
              We refresh tokens automatically to keep your availability synced.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleConnectCalendar}
            className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/20 px-6 py-3 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/30"
          >
            <CalendarDays className="h-4 w-4" />
            {calendarStatus ? 'Reconnect Google Calendar' : 'Connect Google Calendar'}
          </button>
          {calendarStatus && (
            <button
              type="button"
              onClick={handleDisconnectCalendar}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl px-6 py-3 text-sm font-semibold text-slate-200 shadow-lg transition-all duration-300 hover:bg-white/10"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-xs text-slate-300">
        <p className="font-semibold text-white">Why connect?</p>
        <ul className="mt-2 space-y-2 text-slate-400">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-3 w-3 text-emerald-300" />
            Automatically prevents double-booking and respects padding rules.
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-3 w-3 text-emerald-300" />
            Sends invites with your branding and confirmation emails to leads.
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-3 w-3 text-emerald-300" />
            Enables live availability checks inside AI conversations.
          </li>
        </ul>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => setCurrentStep(4)}
          className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-500/20 px-6 py-3 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/30"
        >
          Continue to phone setup
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )

  const renderPhoneStep = () => (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 md:p-8 shadow-xl">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Provision a forwarding number</h2>
        <p className="text-sm text-slate-400">
          Every caller dials one branded number. We route calls to your AI agent, track attribution,
          and forward hot leads to your team.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
        <div className="flex items-center gap-2 text-slate-200">
          <Phone className="h-4 w-4 text-blue-300" />
          <span>Current CloudGreet number</span>
        </div>
        <p className="mt-2 text-lg font-semibold text-white">
          {phoneStatus ? phoneStatus : 'No number assigned yet'}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Available inventory: {state?.tollFreeInventory.available ?? 0} toll-free numbers
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-300">
          <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Use an existing number</span>
          <input
            type="text"
            value={phoneForm.existingNumber}
            onChange={(event) =>
              setPhoneForm((prev) => ({ ...prev, existingNumber: event.target.value }))
            }
            className="w-full rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-3 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all"
            placeholder="+1 888 555 0100"
          />
          <p className="text-xs text-slate-500">
            We’ll assign this number to your account and handle routing.
          </p>
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Or provision by area code</span>
          <input
            type="text"
            maxLength={3}
            value={phoneForm.areaCode}
            onChange={(event) =>
              setPhoneForm((prev) => ({ ...prev, areaCode: event.target.value.replace(/\D/g, '') }))
            }
            className="w-full rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-3 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all"
            placeholder="888"
          />
          <p className="text-xs text-slate-500">
            Requires Telnyx credentials. We’ll pick the next available number.
          </p>
        </label>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleProvisionPhone}
          disabled={provisioningPhone}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-400/40 bg-blue-500/20 px-6 py-3 text-sm font-semibold text-blue-100 shadow-lg transition-all duration-300 hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {provisioningPhone ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
          {phoneStatus ? 'Update number' : 'Provision number'}
        </button>
      </div>
    </div>
  )

  const renderSummaryStep = () => (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 md:p-8 shadow-xl">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Ready to launch CloudGreet</h2>
        <p className="text-sm text-slate-400">
          Review your configuration and lock in billing. You’ll instantly unlock AI call handling,
          SMS automation, and lead routing.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          <div className="flex items-center gap-2 text-white">
            <User className="h-4 w-4 text-blue-300" />
            <span className="font-semibold">Business</span>
          </div>
          <p>{businessForm.businessName}</p>
          <p>{businessForm.businessType}</p>
          <p>{businessForm.email}</p>
          {phoneStatus && <p>{phoneStatus}</p>}
        </div>
        <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          <div className="flex items-center gap-2 text-white">
            <Globe className="h-4 w-4 text-blue-300" />
            <span className="font-semibold">Coverage</span>
          </div>
          <p className="text-slate-400">
            Services: {servicesForm.servicesText || 'Not specified'}
          </p>
          <p className="text-slate-400">
            Service areas: {servicesForm.serviceAreasText || 'Not specified'}
          </p>
        </div>
      </div>

      <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
        <div className="flex items-center gap-2 text-white">
          <Clock className="h-4 w-4 text-blue-300" />
          <span className="font-semibold">Schedule sync</span>
        </div>
        <p>
          Calendar connection:{' '}
          {calendarStatus ? (
            <span className="text-emerald-300">Connected</span>
          ) : (
            <span className="text-amber-300">Not connected</span>
          )}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          <div className="flex items-center gap-2 text-white">
            <MapPin className="h-4 w-4 text-blue-300" />
            <span className="font-semibold">Location</span>
          </div>
          <p>{businessForm.address}</p>
          <p>
            {[businessForm.city, businessForm.state, businessForm.zipCode]
              .filter(Boolean)
              .join(', ')}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          <div className="flex items-center gap-2 text-white">
            <PenSquare className="h-4 w-4 text-blue-300" />
            <span className="font-semibold">Voice & brand</span>
          </div>
          <p>Tone: {businessForm.tone}</p>
          <p className="text-slate-400">
            {businessForm.greetingMessage || 'Default greeting will be used'}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-emerald-500/10 p-4 text-sm text-emerald-100">
        <p className="font-semibold text-emerald-200">Launch checklist</p>
        <ul className="mt-2 space-y-1 text-emerald-200">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> AI agent pre-configured with your services
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Toll-free number ready for call forwarding
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Stripe checkout opens to activate subscription
          </li>
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Questions? Email founders@cloudgreet.com — we’ll help you finish the last mile.
        </p>
        <button
          type="button"
          onClick={handleComplete}
          disabled={completing}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-400/40 bg-blue-500/20 px-6 py-3 text-sm font-semibold text-blue-100 shadow-lg transition-all duration-300 hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {completing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Launch CloudGreet
        </button>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (currentStep) {
      case 1:
        return renderBusinessForm()
      case 2:
        return renderServicesForm()
      case 3:
        return renderCalendarStep()
      case 4:
        return renderPhoneStep()
      case 5:
        return renderSummaryStep()
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-black to-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
        <header className="space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.4em] text-slate-300">
            Onboarding wizard
          </span>
          <div className="max-w-3xl space-y-3">
            <h1 className="text-3xl font-semibold sm:text-4xl">
              Launch your AI receptionist in under ten minutes
            </h1>
            <p className="text-base text-slate-300 sm:text-lg">
              We’ll collect what CloudGreet needs to greet callers, qualify leads, sync appointments,
              and route hot opportunities back to your team.
            </p>
          </div>
        </header>

        <section className="mt-10">{renderStepIndicator()}</section>

        <section className="mt-8">
          {loading ? (
            <div className="flex justify-center py-32">
              <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
            </div>
          ) : (
            renderContent()
          )}
        </section>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-black to-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-lg font-mono">LOADING...</div>
        </div>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  )
}

