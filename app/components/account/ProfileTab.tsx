'use client'

import { useState } from 'react'
import { Save, User } from 'lucide-react'
import { useBusinessData } from '@/app/hooks/useBusinessData'
import { FormField } from '@/app/components/ui/FormField'
import { Button } from '@/app/components/ui/Button'

interface UserProfile {
  name: string
  email: string
  phone: string
  businessName: string
  businessType: string
  address: string
  role: string
}

interface ProfileTabProps {
  profile: UserProfile
  setProfile: (profile: UserProfile) => void
  saving: boolean
  setSaving: (saving: boolean) => void
  onSave: () => void
}

export default function ProfileTab({ profile, setProfile, saving, setSaving, onSave }: ProfileTabProps) {
  const { theme } = useBusinessData()
  const [formData, setFormData] = useState(profile)

  const primaryColor = theme?.primaryColor || '#8b5cf6'

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setProfile({ ...formData, [field]: value })
  }

  const handleSave = () => {
    onSave()
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <User className="h-5 w-5" style={{ color: primaryColor }} />
        <h2 className="text-xl font-semibold text-white">Profile Information</h2>
      </div>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Full Name">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2"
              style={{ focusRingColor: primaryColor }}
              placeholder="Enter your full name"
              aria-label="Full name"
            />
          </FormField>
          
          <FormField label="Email Address">
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2"
              style={{ focusRingColor: primaryColor }}
              placeholder="Enter your email"
              aria-label="Email address"
            />
          </FormField>
          
          <FormField label="Phone Number">
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2"
              style={{ focusRingColor: primaryColor }}
              placeholder="Enter your phone number"
              aria-label="Phone number"
            />
          </FormField>
          
          <FormField label="Business Name">
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => handleInputChange('businessName', e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2"
              style={{ focusRingColor: primaryColor }}
              placeholder="Enter your business name"
              aria-label="Business name"
            />
          </FormField>
        </div>
        
        <FormField label="Business Address">
          <input
            type="text"
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2"
            style={{ focusRingColor: primaryColor }}
            placeholder="Enter your business address"
            aria-label="Business address"
          />
        </FormField>
        
        <div className="flex justify-end pt-4 border-t border-slate-700/50">
          <Button
            onClick={handleSave}
            disabled={saving}
            style={{ backgroundColor: primaryColor }}
            aria-label="Save profile changes"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}