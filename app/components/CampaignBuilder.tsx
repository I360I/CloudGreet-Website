'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, 
  Trash2, 
  Edit, 
  Play, 
  Pause, 
  Save, 
  Copy, 
  Settings,
  Mail,
  MessageSquare,
  Clock,
  Target,
  Users,
  BarChart3,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Move
} from 'lucide-react'

interface CampaignStep {
  id: string
  type: 'email' | 'sms' | 'delay' | 'condition'
  name: string
  templateId?: string
  delayHours?: number
  conditions?: any[]
  isActive: boolean
  position: { x: number; y: number }
}

interface Campaign {
  id: string
  name: string
  description: string
  businessType: string[]
  triggerStatus: string
  steps: CampaignStep[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface CampaignBuilderProps {
  onSave: (campaign: Campaign) => void
  onTest: (campaign: Campaign) => void
  initialCampaign?: Campaign
}

export default function CampaignBuilder({ onSave, onTest, initialCampaign }: CampaignBuilderProps) {
  const [campaign, setCampaign] = useState<Campaign>(initialCampaign || {
    id: '',
    name: '',
    description: '',
    businessType: [],
    triggerStatus: 'contacted',
    steps: [],
    isActive: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  const [selectedStep, setSelectedStep] = useState<CampaignStep | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStep, setDragStep] = useState<CampaignStep | null>(null)

  // Available templates
  const emailTemplates = [
    { id: 'hvac_initial', name: 'HVAC Initial Outreach', type: 'email' },
    { id: 'hvac_follow_up', name: 'HVAC Follow-up', type: 'email' },
    { id: 'plumbing_initial', name: 'Plumbing Initial', type: 'email' },
    { id: 'roofing_initial', name: 'Roofing Initial', type: 'email' },
    { id: 'demo_invite', name: 'Demo Invitation', type: 'email' },
    { id: 'final_offer', name: 'Final Offer', type: 'email' }
  ]

  const smsTemplates = [
    { id: 'hvac_initial_sms', name: 'HVAC Initial SMS', type: 'sms' },
    { id: 'hvac_follow_up_sms', name: 'HVAC Follow-up SMS', type: 'sms' },
    { id: 'plumbing_initial_sms', name: 'Plumbing Initial SMS', type: 'sms' },
    { id: 'roofing_initial_sms', name: 'Roofing Initial SMS', type: 'sms' },
    { id: 'demo_invite_sms', name: 'Demo Invite SMS', type: 'sms' }
  ]

  const addStep = (type: CampaignStep['type']) => {
    const newStep: CampaignStep = {
      id: `step_${Date.now()}`,
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Step`,
      isActive: true,
      position: { x: 100, y: campaign.steps.length * 120 + 50 }
    }

    setCampaign(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }))
  }

  const updateStep = (stepId: string, updates: Partial<CampaignStep>) => {
    setCampaign(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId ? { ...step, ...updates } : step
      )
    }))
  }

  const deleteStep = (stepId: string) => {
    setCampaign(prev => ({
      ...prev,
      steps: prev.steps.filter(step => step.id !== stepId)
    }))
    setSelectedStep(null)
  }

  const duplicateStep = (stepId: string) => {
    const step = campaign.steps.find(s => s.id === stepId)
    if (step) {
      const newStep: CampaignStep = {
        ...step,
        id: `step_${Date.now()}`,
        name: `${step.name} (Copy)`,
        position: { x: step.position.x + 50, y: step.position.y + 50 }
      }
      setCampaign(prev => ({
        ...prev,
        steps: [...prev.steps, newStep]
      }))
    }
  }

  const handleDragStart = (step: CampaignStep) => {
    setIsDragging(true)
    setDragStep(step)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    setDragStep(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (dragStep) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      updateStep(dragStep.id, { position: { x, y } })
    }
    handleDragEnd()
  }

  const getStepIcon = (type: CampaignStep['type']) => {
    switch (type) {
      case 'email': return <Mail className="w-5 h-5" />
      case 'sms': return <MessageSquare className="w-5 h-5" />
      case 'delay': return <Clock className="w-5 h-5" />
      case 'condition': return <Target className="w-5 h-5" />
      default: return <Settings className="w-5 h-5" />
    }
  }

  const getStepColor = (type: CampaignStep['type']) => {
    switch (type) {
      case 'email': return 'bg-blue-500'
      case 'sms': return 'bg-green-500'
      case 'delay': return 'bg-yellow-500'
      case 'condition': return 'bg-purple-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Campaign Builder</h1>
            <p className="text-gray-400">Create automated follow-up sequences</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => onTest(campaign)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Test Campaign
            </button>
            <button
              onClick={() => onSave(campaign)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Campaign
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Campaign Settings */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Campaign Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Campaign Name</label>
                  <input
                    type="text"
                    value={campaign.name}
                    onChange={(e) => setCampaign(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter campaign name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={campaign.description}
                    onChange={(e) => setCampaign(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Describe your campaign"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Business Type</label>
                  <select
                    value={campaign.businessType[0] || ''}
                    onChange={(e) => setCampaign(prev => ({ ...prev, businessType: [e.target.value] }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select business type</option>
                    <option value="HVAC">HVAC</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Roofing">Roofing</option>
                    <option value="General Services">General Services</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Trigger Status</label>
                  <select
                    value={campaign.triggerStatus}
                    onChange={(e) => setCampaign(prev => ({ ...prev, triggerStatus: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="new">New Lead</option>
                    <option value="contacted">Contacted</option>
                    <option value="opened">Email Opened</option>
                    <option value="clicked">Link Clicked</option>
                    <option value="replied">Replied</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Step Library */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Add Steps</h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => addStep('email')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg transition-colors"
                >
                  <Mail className="w-5 h-5" />
                  <span>Email</span>
                </button>
                
                <button
                  onClick={() => addStep('sms')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg transition-colors"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>SMS</span>
                </button>
                
                <button
                  onClick={() => addStep('delay')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 rounded-lg transition-colors"
                >
                  <Clock className="w-5 h-5" />
                  <span>Delay</span>
                </button>
                
                <button
                  onClick={() => addStep('condition')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg transition-colors"
                >
                  <Target className="w-5 h-5" />
                  <span>Condition</span>
                </button>
              </div>
            </div>
          </div>

          {/* Campaign Canvas */}
          <div className="lg:col-span-3">
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Campaign Flow</h3>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Users className="w-4 h-4" />
                  <span>{campaign.steps.length} steps</span>
                </div>
              </div>

              <div 
                className="relative min-h-[600px] bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-600 p-6"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <AnimatePresence>
                  {campaign.steps.map((step, index) => (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      drag
                      dragMomentum={false}
                      onDragStart={() => handleDragStart(step)}
                      onDragEnd={handleDragEnd}
                      className={`absolute cursor-move group ${getStepColor(step.type)} rounded-lg p-4 min-w-[200px] ${
                        selectedStep?.id === step.id ? 'ring-2 ring-blue-400' : ''
                      }`}
                      style={{ 
                        left: step.position.x, 
                        top: step.position.y,
                        zIndex: selectedStep?.id === step.id ? 10 : 1
                      }}
                      onClick={() => setSelectedStep(step)}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        {getStepIcon(step.type)}
                        <span className="font-semibold text-sm">{step.name}</span>
                        <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedStep(step)
                            }}
                            className="p-1 hover:bg-white/20 rounded"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              duplicateStep(step.id)
                            }}
                            className="p-1 hover:bg-white/20 rounded"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteStep(step.id)
                            }}
                            className="p-1 hover:bg-white/20 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {step.type === 'email' && step.templateId && (
                        <div className="text-xs opacity-80">
                          Template: {step.templateId}
                        </div>
                      )}

                      {step.type === 'delay' && step.delayHours && (
                        <div className="text-xs opacity-80">
                          Wait: {step.delayHours}h
                        </div>
                      )}

                      {index < campaign.steps.length - 1 && (
                        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {campaign.steps.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-96 text-gray-500">
                    <Move className="w-12 h-12 mb-4" />
                    <p className="text-lg font-medium">Start building your campaign</p>
                    <p className="text-sm">Add steps from the sidebar to create your flow</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Step Editor */}
        {selectedStep && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl mx-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Edit Step</h3>
                <button
                  onClick={() => setSelectedStep(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Step Name</label>
                  <input
                    type="text"
                    value={selectedStep.name}
                    onChange={(e) => updateStep(selectedStep.id, { name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {selectedStep.type === 'email' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Email Template</label>
                    <select
                      value={selectedStep.templateId || ''}
                      onChange={(e) => updateStep(selectedStep.id, { templateId: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select template</option>
                      {emailTemplates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedStep.type === 'sms' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">SMS Template</label>
                    <select
                      value={selectedStep.templateId || ''}
                      onChange={(e) => updateStep(selectedStep.id, { templateId: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select template</option>
                      {smsTemplates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedStep.type === 'delay' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Delay (hours)</label>
                    <input
                      type="number"
                      value={selectedStep.delayHours || 0}
                      onChange={(e) => updateStep(selectedStep.id, { delayHours: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      max="168"
                    />
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedStep.isActive}
                      onChange={(e) => updateStep(selectedStep.id, { isActive: e.target.checked })}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setSelectedStep(null)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setSelectedStep(null)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

