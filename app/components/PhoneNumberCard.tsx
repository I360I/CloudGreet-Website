'use client'

import { useState, useEffect } from 'react'
import { Phone, PhoneCall, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useToast } from '@/app/contexts/ToastContext'
import { fetchWithAuth } from '@/lib/auth/fetch-with-auth'
import { Button } from '@/app/components/ui/Button'
import { logger } from '@/lib/monitoring'
import { useBusinessData } from '@/app/hooks/useBusinessData'

interface PhoneNumberCardProps {
  businessId?: string
}

export default function PhoneNumberCard({ businessId }: PhoneNumberCardProps) {
  const { theme } = useBusinessData()
  const { showSuccess, showError } = useToast()
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [calling, setCalling] = useState(false)
  const [hasPhoneNumber, setHasPhoneNumber] = useState(false)

  const primaryColor = theme?.primaryColor || '#8b5cf6'

  useEffect(() => {
    loadPhoneNumber()
  }, [businessId])

  const loadPhoneNumber = async () => {
    try {
      setLoading(true)
      const response = await fetchWithAuth('/api/phone/provision')
      
      if (!response.ok) {
        if (response.status === 404) {
          setHasPhoneNumber(false)
          setPhoneNumber(null)
          return
        }
        throw new Error(`Failed to load phone number (${response.status})`)
      }

      const data = await response.json()
      if (data.hasPhoneNumber && data.phoneNumber) {
        setPhoneNumber(data.phoneNumber)
        setHasPhoneNumber(true)
      } else {
        setHasPhoneNumber(false)
        setPhoneNumber(null)
      }
    } catch (error) {
      logger.error('Failed to load phone number', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      setHasPhoneNumber(false)
      setPhoneNumber(null)
    } finally {
      setLoading(false)
    }
  }

  const handleTestCall = async () => {
    if (!phoneNumber) {
      showError('No phone number', 'Please complete onboarding to get a phone number.')
      return
    }

    try {
      setCalling(true)
      const response = await fetchWithAuth('/api/client/test-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber
        })
      })

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = {}
        }
        throw new Error(errorData?.message || `Failed to place test call (${response.status})`)
      }

      const data = await response.json()
      if (data.success) {
        showSuccess('Test call initiated', 'You should receive a call shortly. Answer to test your AI receptionist!')
      } else {
        throw new Error(data?.message || 'Failed to place test call')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to place test call'
      showError('Test call failed', message)
    } finally {
      setCalling(false)
    }
  }

  const formatPhoneNumber = (phone: string) => {
    // Format as (XXX) XXX-XXXX
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    } else if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
    }
    return phone
  }

  if (loading) {
    return (
      <div className="bg-slate-800/50 border rounded-lg p-6" style={{ borderColor: `${primaryColor}30` }}>
        <div className="flex items-center gap-3 mb-4">
          <Phone className="w-5 h-5" style={{ color: primaryColor }} />
          <h3 className="text-lg font-semibold text-white">Phone Number</h3>
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: primaryColor }} />
          <span className="text-slate-400">Loading...</span>
        </div>
      </div>
    )
  }

  if (!hasPhoneNumber) {
    return (
      <div className="bg-slate-800/50 border rounded-lg p-6" style={{ borderColor: `${primaryColor}30` }}>
        <div className="flex items-center gap-3 mb-4">
          <Phone className="w-5 h-5" style={{ color: primaryColor }} />
          <h3 className="text-lg font-semibold text-white">Phone Number</h3>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4 text-yellow-400" />
          <span className="text-slate-400">No phone number assigned</span>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Complete onboarding to get your AI receptionist phone number.
        </p>
        <Button
          onClick={() => window.location.href = '/onboarding'}
          className="w-full text-white"
          style={{ backgroundColor: primaryColor }}
        >
          Complete Onboarding
        </Button>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 border rounded-lg p-6" style={{ borderColor: `${primaryColor}30` }}>
      <div className="flex items-center gap-3 mb-4">
        <Phone className="w-5 h-5" style={{ color: primaryColor }} />
        <h3 className="text-lg font-semibold text-white">Your AI Receptionist Number</h3>
      </div>
      
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className="text-sm text-slate-400">Phone number active</span>
        </div>
        <div className="text-2xl font-mono font-bold" style={{ color: primaryColor }}>
          {phoneNumber ? formatPhoneNumber(phoneNumber) : 'N/A'}
        </div>
        <p className="text-sm text-slate-500 mt-2">
          Customers can call this number to reach your AI receptionist 24/7.
        </p>
      </div>

      <Button
        onClick={handleTestCall}
        disabled={calling || !phoneNumber}
        className="w-full text-white disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: primaryColor }}
      >
        {calling ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Placing call...
          </>
        ) : (
          <>
            <PhoneCall className="w-4 h-4 mr-2" />
            Test Call
          </>
        )}
      </Button>
      
      <p className="text-xs text-slate-500 mt-3 text-center">
        Click to receive a test call and verify your AI receptionist is working.
      </p>
    </div>
  )
}

