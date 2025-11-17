'use client'

import { useState } from 'react'
import { Save, Key, Eye, EyeOff } from 'lucide-react'
import { useBusinessData } from '@/app/hooks/useBusinessData'
import { FormField } from '@/app/components/ui/FormField'
import { Button } from '@/app/components/ui/Button'

interface SecurityTabProps {
  saving: boolean
  onSave: () => void
}

export default function SecurityTab({ saving, onSave }: SecurityTabProps) {
  const { theme } = useBusinessData()
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

  const primaryColor = theme?.primaryColor || '#8b5cf6'

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
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <Key className="h-5 w-5" style={{ color: primaryColor }} />
        <h2 className="text-xl font-semibold text-white">Security Settings</h2>
      </div>
      
      <div className="space-y-4">
        <FormField label="Current Password">
          <div className="relative">
            <input
              type={showPasswords.current ? 'text' : 'password'}
              value={passwordData.currentPassword}
              onChange={(e) => handleInputChange('currentPassword', e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 pr-10"
              style={{ focusRingColor: primaryColor }}
              placeholder="Enter current password"
              aria-label="Current password"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              onClick={() => togglePasswordVisibility('current')}
              aria-label={showPasswords.current ? 'Hide password' : 'Show password'}
            >
              {showPasswords.current ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </FormField>
        
        <FormField label="New Password">
          <div className="relative">
            <input
              type={showPasswords.new ? 'text' : 'password'}
              value={passwordData.newPassword}
              onChange={(e) => handleInputChange('newPassword', e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 pr-10"
              style={{ focusRingColor: primaryColor }}
              placeholder="Enter new password"
              aria-label="New password"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              onClick={() => togglePasswordVisibility('new')}
              aria-label={showPasswords.new ? 'Hide password' : 'Show password'}
            >
              {showPasswords.new ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </FormField>
        
        <FormField label="Confirm New Password">
          <div className="relative">
            <input
              type={showPasswords.confirm ? 'text' : 'password'}
              value={passwordData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 pr-10"
              style={{ focusRingColor: primaryColor }}
              placeholder="Confirm new password"
              aria-label="Confirm new password"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              onClick={() => togglePasswordVisibility('confirm')}
              aria-label={showPasswords.confirm ? 'Hide password' : 'Show password'}
            >
              {showPasswords.confirm ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </FormField>
        
        <div className="flex justify-end pt-4 border-t border-slate-700/50">
          <Button
            onClick={handleSave}
            disabled={saving}
            style={{ backgroundColor: primaryColor }}
            aria-label="Change password"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Change Password
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}