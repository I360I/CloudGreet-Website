'use client'

import { useState, useEffect } from 'react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Card } from './ui/Card'
import { LoadingSpinner } from './ui/LoadingSpinner'

interface AIAgentSettings {
  id: string
  name: string
  greeting: string
  tone: 'professional' | 'friendly' | 'casual'
  services: string[]
  serviceAreas: string[]
  businessHours: Record<string, any>
  specialties: string[]
  emergencyContact: string
  maxCallDuration: number
  interruptionSensitivity: number
  voice: string
  customInstructions: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface AIAgentCustomizationProps {
  businessId: string
}

export default function AIAgentCustomization({ businessId }: AIAgentCustomizationProps) {
  const [settings, setSettings] = useState<AIAgentSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const fetchAgentSettings = async () => {
    try {
      const response = await fetch(`/api/ai-agent/update-settings?businessId=${businessId}`)
      const data = await response.json()
      
      if (data.success) {
        setSettings(data.agent)
      } else {
        setMessage('Failed to load AI agent settings')
      }
    } catch (error) {
      setMessage('Error loading AI agent settings')
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = (key: string, value: any) => {
    if (settings) {
      setSettings({ ...settings, [key]: value })
    }
  }

  useEffect(() => {
    fetchAgentSettings()
  }, [businessId])

  const saveSettings = async () => {
    if (!settings) return

    setSaving(true)
    setMessage('')

    try {
      const response = await fetch('/api/ai-agent/update-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          businessId,
          greetingMessage: settings.greeting,
          tone: settings.tone,
          services: settings.services,
          serviceAreas: settings.serviceAreas,
          businessHours: settings.businessHours,
          specialties: settings.specialties,
          emergencyContact: settings.emergencyContact,
          maxCallDuration: settings.maxCallDuration,
          interruptionSensitivity: settings.interruptionSensitivity,
          voice: settings.voice,
          customInstructions: settings.customInstructions
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setMessage('✅ AI agent settings updated successfully!')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setMessage(`❌ Failed to update settings: ${data.message}`)
      }
    } catch (error) {
      setMessage('❌ Error updating AI agent settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <LoadingSpinner />
        <span className="ml-2">Loading AI agent settings...</span>
      </div>
    )
  }

  if (!settings) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">AI Agent Not Found</h3>
        <p className="text-gray-600">No AI agent found for this business. Please complete onboarding first.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">🤖 Customize Your AI Receptionist</h2>
        
        {message && (
          <div className={`p-4 rounded-lg mb-6 ${
            message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Greeting Message */}
          <div>
            <label className="block text-sm font-medium mb-2">Greeting Message</label>
            <textarea
              value={settings.greeting}
              onChange={(e) => updateSetting('greeting', e.target.value)}
              className="w-full p-3 border rounded-lg"
              rows={3}
              placeholder="Thank you for calling [Business Name]. How can I help you today?"
            />
          </div>

          {/* Tone */}
          <div>
            <label className="block text-sm font-medium mb-2">Communication Tone</label>
            <select
              value={settings.tone}
              onChange={(e) => updateSetting('tone', e.target.value)}
              className="w-full p-3 border rounded-lg"
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="casual">Casual</option>
            </select>
          </div>

          {/* Voice */}
          <div>
            <label className="block text-sm font-medium mb-2">Voice Type</label>
            <select
              value={settings.voice}
              onChange={(e) => updateSetting('voice', e.target.value)}
              className="w-full p-3 border rounded-lg"
            >
              <option value="alloy">Alloy (Professional)</option>
              <option value="echo">Echo (Clear & Confident)</option>
              <option value="fable">Fable (Authoritative)</option>
              <option value="onyx">Onyx (Strong & Reliable)</option>
              <option value="nova">Nova (Friendly)</option>
              <option value="shimmer">Shimmer (Energetic)</option>
            </select>
          </div>

          {/* Max Call Duration */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Max Call Duration: {Math.floor(settings.maxCallDuration / 60)} minutes
            </label>
            <input
              type="range"
              min="60"
              max="1800"
              step="60"
              value={settings.maxCallDuration}
              onChange={(e) => updateSetting('maxCallDuration', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Interruption Sensitivity */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Interruption Sensitivity: {Math.round(settings.interruptionSensitivity * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.interruptionSensitivity}
              onChange={(e) => updateSetting('interruptionSensitivity', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Emergency Contact */}
          <div>
            <label className="block text-sm font-medium mb-2">Emergency Contact</label>
            <Input
              type="text"
              value={settings.emergencyContact}
              onChange={(e) => updateSetting('emergencyContact', e.target.value)}
              placeholder="Owner's direct phone number"
            />
          </div>

          {/* Services */}
          <div>
            <label className="block text-sm font-medium mb-2">Services (one per line)</label>
            <textarea
              value={settings.services.join('\n')}
              onChange={(e) => updateSetting('services', e.target.value.split('\n').filter(s => s.trim()))}
              className="w-full p-3 border rounded-lg"
              rows={4}
              placeholder="HVAC Repair&#10;Air Conditioning Installation&#10;Heating Maintenance"
            />
          </div>

          {/* Service Areas */}
          <div>
            <label className="block text-sm font-medium mb-2">Service Areas (one per line)</label>
            <textarea
              value={settings.serviceAreas.join('\n')}
              onChange={(e) => updateSetting('serviceAreas', e.target.value.split('\n').filter(s => s.trim()))}
              className="w-full p-3 border rounded-lg"
              rows={4}
              placeholder="Downtown Area&#10;North Side&#10;Suburbs within 20 miles"
            />
          </div>

          {/* Custom Instructions */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Custom Instructions</label>
            <textarea
              value={settings.customInstructions || ''}
              onChange={(e) => updateSetting('customInstructions', e.target.value)}
              className="w-full p-3 border rounded-lg"
              rows={4}
              placeholder="Additional specific instructions for your AI receptionist..."
            />
          </div>
        </div>

        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Last updated: {new Date(settings.updatedAt).toLocaleString()}
          </div>
          <Button
            onClick={saveSettings}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <LoadingSpinner />
                <span className="ml-2">Updating AI Agent...</span>
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </Card>

      {/* Agent Status */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">AI Agent Status</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Status:</span>
            <span className={`ml-2 px-2 py-1 rounded ${
              settings.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {settings.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div>
            <span className="font-medium">Agent ID:</span>
            <span className="ml-2 font-mono text-xs">{settings.id}</span>
          </div>
          <div>
            <span className="font-medium">Voice:</span>
            <span className="ml-2 capitalize">{settings.voice}</span>
          </div>
          <div>
            <span className="font-medium">Tone:</span>
            <span className="ml-2 capitalize">{settings.tone}</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
