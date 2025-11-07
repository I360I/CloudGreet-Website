/**
 * Professional SMS Templates for Client Acquisition
 * Optimized for different business types with personalization
 */

export interface SMSTemplate {
  id: string
  name: string
  message: string
  businessType: string[]
  variables: string[]
  followUpDays: number
  priority: 'high' | 'medium' | 'low'
  maxLength: number
}

export const smsTemplates: SMSTemplate[] = [
  // HVAC SMS Templates
  {
    id: 'hvac_initial_sms',
    name: 'HVAC Initial SMS',
    message: `Hi {owner_name}, I have an AI receptionist that can help {business_name} never miss another call. 15-min demo? Reply YES or call {your_phone}.`,
    businessType: ['HVAC', 'Heating', 'Cooling', 'Air Conditioning'],
    variables: ['owner_name', 'business_name', 'your_phone'],
    followUpDays: 1,
    priority: 'high',
    maxLength: 160
  },

  {
    id: 'hvac_follow_up_sms',
    name: 'HVAC Follow-up SMS',
    message: `Quick follow-up: AI receptionist for {business_name} could save you $2-5K monthly in missed calls. Still interested? Reply YES.`,
    businessType: ['HVAC', 'Heating', 'Cooling', 'Air Conditioning'],
    variables: ['business_name'],
    followUpDays: 3,
    priority: 'high',
    maxLength: 160
  },

  // Plumbing SMS Templates
  {
    id: 'plumbing_initial_sms',
    name: 'Plumbing Initial SMS',
    message: `Hi {owner_name}, AI receptionist for {business_name} can answer emergency calls 24/7. Demo? Reply YES or call {your_phone}.`,
    businessType: ['Plumbing', 'Emergency Plumbing', 'Pipe Repair'],
    variables: ['owner_name', 'business_name', 'your_phone'],
    followUpDays: 1,
    priority: 'high',
    maxLength: 160
  },

  {
    id: 'plumbing_emergency_sms',
    name: 'Plumbing Emergency SMS',
    message: `Emergency calls don't wait. AI receptionist for {business_name} answers 24/7. Free trial. Reply YES.`,
    businessType: ['Plumbing', 'Emergency Plumbing', 'Pipe Repair'],
    variables: ['business_name'],
    followUpDays: 2,
    priority: 'high',
    maxLength: 160
  },

  // Roofing SMS Templates
  {
    id: 'roofing_initial_sms',
    name: 'Roofing Initial SMS',
    message: `Hi {owner_name}, storm season coming. AI receptionist for {business_name} captures insurance calls 24/7. Demo? Reply YES.`,
    businessType: ['Roofing', 'Roof Repair', 'Storm Damage'],
    variables: ['owner_name', 'business_name'],
    followUpDays: 1,
    priority: 'high',
    maxLength: 160
  },

  {
    id: 'roofing_storm_sms',
    name: 'Roofing Storm SMS',
    message: `Storm season = insurance calls. AI receptionist for {business_name} never misses them. $75K+ potential. Reply YES for demo.`,
    businessType: ['Roofing', 'Roof Repair', 'Storm Damage'],
    variables: ['business_name'],
    followUpDays: 2,
    priority: 'high',
    maxLength: 160
  },

  // General Service Business SMS
  {
    id: 'general_initial_sms',
    name: 'General Service SMS',
    message: `Hi {owner_name}, AI receptionist for {business_name} answers calls 24/7. Never miss another customer. Demo? Reply YES.`,
    businessType: ['General Services', 'Contractor', 'Service Business'],
    variables: ['owner_name', 'business_name'],
    followUpDays: 2,
    priority: 'medium',
    maxLength: 160
  },

  {
    id: 'general_follow_up_sms',
    name: 'General Follow-up SMS',
    message: `Quick follow-up: AI receptionist for {business_name} could recover $2-5K monthly in missed calls. Still interested? Reply YES.`,
    businessType: ['General Services', 'Contractor', 'Service Business'],
    variables: ['business_name'],
    followUpDays: 4,
    priority: 'medium',
    maxLength: 160
  },

  // Demo Invite SMS
  {
    id: 'demo_invite_sms',
    name: 'Demo Invite SMS',
    message: `Thanks for your interest! 15-min AI receptionist demo for {business_name}. Available today 2-4 PM or tomorrow 10 AM-12 PM. Reply with time.`,
    businessType: ['All'],
    variables: ['business_name'],
    followUpDays: 1,
    priority: 'high',
    maxLength: 160
  },

  // Urgent Follow-up SMS
  {
    id: 'urgent_follow_up_sms',
    name: 'Urgent Follow-up SMS',
    message: `Last chance: AI receptionist for {business_name}. 30-day free trial. No risk. Reply YES or call {your_phone}.`,
    businessType: ['All'],
    variables: ['business_name', 'your_phone'],
    followUpDays: 0,
    priority: 'high',
    maxLength: 160
  },

  // Quick Demo SMS
  {
    id: 'quick_demo_sms',
    name: 'Quick Demo SMS',
    message: `5-min AI receptionist demo for {business_name}. Show you how it works. Call {your_phone} now or reply YES.`,
    businessType: ['All'],
    variables: ['business_name', 'your_phone'],
    followUpDays: 0,
    priority: 'high',
    maxLength: 160
  }
]

/**
 * getSMSTemplateById - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await getSMSTemplateById(param1, param2)
 * ```
 */
export function getSMSTemplateById(id: string): SMSTemplate | undefined {
  return smsTemplates.find(template => template.id === id)
}

/**
 * getSMSTemplatesByBusinessType - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await getSMSTemplatesByBusinessType(param1, param2)
 * ```
 */
export function getSMSTemplatesByBusinessType(businessType: string): SMSTemplate[] {
  return smsTemplates.filter(template => 
    template.businessType.includes(businessType) || 
    template.businessType.includes('All')
  )
}

/**
 * personalizeSMSTemplate - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await personalizeSMSTemplate(param1, param2)
 * ```
 */
export function personalizeSMSTemplate(template: SMSTemplate, variables: Record<string, string>): string {
  let message = template.message

  // Replace variables in message
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{${key}}`
    message = message.replace(new RegExp(placeholder, 'g'), value)
  })

  return message
}

/**
 * getNextSMSTemplateInSequence - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await getNextSMSTemplateInSequence(param1, param2)
 * ```
 */
export function getNextSMSTemplateInSequence(currentTemplateId: string, businessType: string): SMSTemplate | null {
  const templates = getSMSTemplatesByBusinessType(businessType)
  const currentIndex = templates.findIndex(t => t.id === currentTemplateId)
  
  if (currentIndex === -1 || currentIndex === templates.length - 1) {
    return null // No more templates in sequence
  }
  
  return templates[currentIndex + 1]
}

/**
 * validateSMSLength - Add description here
 * 
 * @param {...any} args - Function parameters
 * @returns {Promise<any>} Function return value
 * @throws {Error} When operation fails
 * 
 * @example
 * ```typescript
 * await validateSMSLength(param1, param2)
 * ```
 */
export function validateSMSLength(message: string, maxLength: number = 160): { isValid: boolean; length: number; overBy: number } {
  const length = message.length
  const overBy = Math.max(0, length - maxLength)
  
  return {
    isValid: length <= maxLength,
    length,
    overBy
  }
}
