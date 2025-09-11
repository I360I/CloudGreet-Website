// Business type definitions and utilities

export type BusinessType = 'hvac' | 'roofing' | 'painting'

export interface BusinessTypeConfig {
  name: string
  displayName: string
  description: string
  services: string[]
  keywords: string[]
  color: string
  icon: string
}

export const BUSINESS_TYPES: Record<BusinessType, BusinessTypeConfig> = {
  hvac: {
    name: 'hvac',
    displayName: 'HVAC',
    description: 'Heating, Ventilation, and Air Conditioning Services',
    services: [
      'AC Repair',
      'Heating Repair',
      'HVAC Installation',
      'Maintenance',
      'Duct Cleaning',
      'Emergency Service'
    ],
    keywords: [
      'air conditioning',
      'heating',
      'hvac',
      'furnace',
      'ac unit',
      'thermostat',
      'ductwork',
      'refrigerant'
    ],
    color: '#3B82F6',
    icon: '❄️'
  },
  roofing: {
    name: 'roofing',
    displayName: 'Roofing',
    description: 'Roofing Installation, Repair, and Maintenance',
    services: [
      'Roof Repair',
      'Roof Installation',
      'Gutter Cleaning',
      'Siding',
      'Storm Damage',
      'Roof Inspection'
    ],
    keywords: [
      'roof',
      'shingles',
      'gutter',
      'siding',
      'storm damage',
      'leak',
      'roofing contractor',
      'roof replacement'
    ],
    color: '#EF4444',
    icon: '🏠'
  },
  painting: {
    name: 'painting',
    displayName: 'Painting',
    description: 'Interior and Exterior Painting Services',
    services: [
      'Interior Painting',
      'Exterior Painting',
      'Cabinet Painting',
      'Deck Staining',
      'Pressure Washing',
      'Color Consultation'
    ],
    keywords: [
      'paint',
      'painting',
      'interior',
      'exterior',
      'cabinet',
      'deck',
      'staining',
      'color'
    ],
    color: '#10B981',
    icon: '🎨'
  }
}

export function getBusinessTypeConfig(type: BusinessType): BusinessTypeConfig {
  return BUSINESS_TYPES[type] || BUSINESS_TYPES.hvac
}

export function getAllBusinessTypes(): BusinessTypeConfig[] {
  return Object.values(BUSINESS_TYPES)
}

export function isValidBusinessType(type: string): type is BusinessType {
  return type in BUSINESS_TYPES
}

export function getBusinessTypeByKeyword(keyword: string): BusinessType | null {
  const lowerKeyword = keyword.toLowerCase()
  
  for (const [type, config] of Object.entries(BUSINESS_TYPES)) {
    if (config.keywords.some(k => k.toLowerCase().includes(lowerKeyword))) {
      return type as BusinessType
    }
  }
  
  return null
}

export function getBusinessTypeColor(type: BusinessType): string {
  return getBusinessTypeConfig(type).color
}

export function getBusinessTypeIcon(type: BusinessType): string {
  return getBusinessTypeConfig(type).icon
}

export function getBusinessTypeServices(type: BusinessType): string[] {
  return getBusinessTypeConfig(type).services
}

export function getBusinessTypeKeywords(type: BusinessType): string[] {
  return getBusinessTypeConfig(type).keywords
}

// Alias for getBusinessTypeConfig
export function getBusinessType(type: BusinessType): BusinessTypeConfig {
  return getBusinessTypeConfig(type)
}

// Check if a call is an emergency based on business type
export function isEmergencyCall(businessType: BusinessType, callContent: string): boolean {
  const emergencyKeywords = {
    hvac: ['emergency', 'urgent', 'no heat', 'no ac', 'broken', 'leak', 'gas leak', 'carbon monoxide'],
    roofing: ['emergency', 'urgent', 'leak', 'storm damage', 'wind damage', 'hail damage', 'tree damage'],
    painting: ['emergency', 'urgent', 'water damage', 'mold', 'flood damage']
  }
  
  const keywords = emergencyKeywords[businessType] || []
  const lowerContent = callContent.toLowerCase()
  
  return keywords.some(keyword => lowerContent.includes(keyword))
}