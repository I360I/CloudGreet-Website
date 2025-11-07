'use client'

import { useState } from 'react'
import { Save, User } from 'lucide-react'

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
  const [formData, setFormData] = useState(profile)

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setProfile({ ...formData, [field]: value })
  }

  const handleSave = () => {
    onSave()
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-6">
        <User className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Profile Information</h2>
      </div>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your full name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Phone Number</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your phone number"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Business Name</label>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => handleInputChange('businessName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your business name"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Business Address</label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your business address"
          />
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}