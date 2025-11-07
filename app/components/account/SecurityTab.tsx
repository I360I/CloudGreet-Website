'use client'

import { useState } from 'react'
import { Save, Key, Eye, EyeOff } from 'lucide-react'

interface SecurityTabProps {
  saving: boolean
  onSave: () => void
}

export default function SecurityTab({ saving, onSave }: SecurityTabProps) {
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })

  const handleInputChange = (field: string, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }))
  }

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const handleSave = () => {
    onSave()
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-6">
        <Key className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Security Settings</h2>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Current Password</label>
          <div className="relative">
            <input
              type={showPasswords.current ? 'text' : 'password'}
              value={passwordData.currentPassword}
              onChange={(e) => handleInputChange('currentPassword', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
              placeholder="Enter current password"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
              onClick={() => togglePasswordVisibility('current')}
            >
              {showPasswords.current ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">New Password</label>
          <div className="relative">
            <input
              type={showPasswords.new ? 'text' : 'password'}
              value={passwordData.newPassword}
              onChange={(e) => handleInputChange('newPassword', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
              placeholder="Enter new password"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
              onClick={() => togglePasswordVisibility('new')}
            >
              {showPasswords.new ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Confirm New Password</label>
          <div className="relative">
            <input
              type={showPasswords.confirm ? 'text' : 'password'}
              value={passwordData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
              placeholder="Confirm new password"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
              onClick={() => togglePasswordVisibility('confirm')}
            >
              {showPasswords.confirm ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
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
                Change Password
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}