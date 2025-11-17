/**
 * Business Theme System
 * Generates personalized themes and utilities for each business
 */

export interface BusinessTheme {
  primaryColor: string // Hex color
  secondaryColor: string // Hex color
  serviceColors: Record<string, string> // service name → hex color
  labelMap: Record<string, string> // generic term → business-specific term
  iconMap: Record<string, string> // service name → lucide icon name
}

export interface TimeSlot {
  time: string // '09:00', '09:30', etc.
  available: boolean
  reason?: 'outside_business_hours' | 'past_time' | 'already_booked'
}

// Primary color mapping (EXACT)
const PRIMARY_COLORS: Record<string, string> = {
  'HVAC': '#3b82f6', // blue-500
  'Painting': '#8b5cf6', // purple-500
  'Roofing': '#f97316', // orange-500
  'Plumbing': '#06b6d4', // cyan-500
  'Electrical': '#eab308', // yellow-500
  'Landscaping': '#22c55e', // green-500
  'Cleaning': '#6366f1', // indigo-500
  'General': '#8b5cf6' // purple-500 (default)
}

// Secondary color mapping
const SECONDARY_COLORS: Record<string, string> = {
  'HVAC': '#60a5fa', // blue-400
  'Painting': '#a78bfa', // purple-400
  'Roofing': '#fb923c', // orange-400
  'Plumbing': '#22d3ee', // cyan-400
  'Electrical': '#fcd34d', // yellow-400
  'Landscaping': '#4ade80', // green-400
  'Cleaning': '#818cf8', // indigo-400
  'General': '#a78bfa' // purple-400 (default)
}

// Label mapping (EXACT)
const LABEL_MAPS: Record<string, Record<string, string>> = {
  'HVAC': {
    appointment: 'Service Call',
    customer: 'Customer',
    job: 'Service Call',
    service: 'Service'
  },
  'Painting': {
    appointment: 'Job',
    customer: 'Client',
    job: 'Job',
    service: 'Service'
  },
  'Roofing': {
    appointment: 'Job',
    customer: 'Client',
    job: 'Job',
    service: 'Service'
  },
  'Plumbing': {
    appointment: 'Service Call',
    customer: 'Customer',
    job: 'Service Call',
    service: 'Service'
  },
  'Electrical': {
    appointment: 'Service Call',
    customer: 'Customer',
    job: 'Service Call',
    service: 'Service'
  },
  'Landscaping': {
    appointment: 'Job',
    customer: 'Client',
    job: 'Job',
    service: 'Service'
  },
  'Cleaning': {
    appointment: 'Service',
    customer: 'Client',
    job: 'Service',
    service: 'Service'
  },
  'General': {
    appointment: 'Appointment',
    customer: 'Customer',
    job: 'Job',
    service: 'Service'
  }
}

// Icon mapping (EXACT) - lucide-react icon names
const SERVICE_ICONS: Record<string, string> = {
  'HVAC Repair': 'Wrench',
  'AC Installation': 'Wind',
  'Heating Repair': 'Flame',
  'Furnace Service': 'Flame',
  'Duct Cleaning': 'Wind',
  'Painting': 'Paintbrush',
  'Interior Painting': 'Paintbrush',
  'Exterior Painting': 'Paintbrush',
  'Roofing': 'Home',
  'Roof Repair': 'Home',
  'Roof Replacement': 'Home',
  'Plumbing': 'Droplet',
  'Plumbing Repair': 'Droplet',
  'Drain Cleaning': 'Droplet',
  'Electrical': 'Zap',
  'Electrical Repair': 'Zap',
  'Panel Upgrade': 'Zap',
  'Landscaping': 'Trees',
  'Lawn Care': 'Trees',
  'Tree Service': 'Trees',
  'Cleaning': 'Sparkles',
  'House Cleaning': 'Sparkles',
  'Commercial Cleaning': 'Sparkles'
}

/**
 * Hash string to color (EXACT implementation)
 * Generates consistent HSL color from string
 */
function hashStringToColor(str: string, businessType: string): string {
  let hash = 0
  const combined = `${businessType}-${str}`
  
  for (let i = 0; i < combined.length; i++) {
    hash = combined.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  // Generate hue (0-360) from hash
  const hue = Math.abs(hash) % 360
  
  // Use fixed saturation (70%) and lightness (50%) for consistency
  return `hsl(${hue}, 70%, 50%)`
}

/**
 * Convert HSL to hex
 */
function hslToHex(hsl: string): string {
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
  if (!match) return '#8b5cf6' // fallback
  
  const h = parseInt(match[1]) / 360
  const s = parseInt(match[2]) / 100
  const l = parseInt(match[3]) / 100
  
  let r, g, b
  
  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }
  
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Get business theme (EXACT implementation)
 */
export function getBusinessTheme(businessType: string, services: string[]): BusinessTheme {
  const normalizedType = businessType || 'General'
  const primaryColor = PRIMARY_COLORS[normalizedType] || PRIMARY_COLORS['General']
  const secondaryColor = SECONDARY_COLORS[normalizedType] || SECONDARY_COLORS['General']
  
  // Generate service colors
  const serviceColors: Record<string, string> = {}
  services.forEach(service => {
    const hslColor = hashStringToColor(service, normalizedType)
    serviceColors[service] = hslToHex(hslColor)
  })
  
  // Get label map
  const labelMap = LABEL_MAPS[normalizedType] || LABEL_MAPS['General']
  
  // Get icon map (filter to only services this business offers)
  const iconMap: Record<string, string> = {}
  services.forEach(service => {
    iconMap[service] = SERVICE_ICONS[service] || 'Circle'
  })
  
  return {
    primaryColor,
    secondaryColor,
    serviceColors,
    labelMap,
    iconMap
  }
}

/**
 * Get service color for a specific service
 */
export function getServiceColor(serviceName: string, businessType: string): string {
  const theme = getBusinessTheme(businessType, [serviceName])
  return theme.serviceColors[serviceName] || theme.primaryColor
}

/**
 * Get business-specific label
 */
export function getBusinessLabel(term: string, businessType: string): string {
  const normalizedType = businessType || 'General'
  const labelMap = LABEL_MAPS[normalizedType] || LABEL_MAPS['General']
  return labelMap[term.toLowerCase()] || term
}

/**
 * Get service icon name
 */
export function getServiceIcon(serviceName: string): string {
  return SERVICE_ICONS[serviceName] || 'Circle'
}

/**
 * Get available time slots for a date
 */
export async function getAvailableTimeSlots(
  businessHours: Record<string, any>,
  date: Date,
  timezone: string,
  existingAppointments: Array<{ start_time: string; end_time: string }> = []
): Promise<TimeSlot[]> {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const dayOfWeek = dayNames[date.getDay()]
  
  const dayHours = businessHours[dayOfWeek]
  if (!dayHours || !dayHours.enabled) {
    return []
  }
  
  const slots: TimeSlot[] = []
  const [startHour, startMin] = dayHours.start.split(':').map(Number)
  const [endHour, endMin] = dayHours.end.split(':').map(Number)
  
  const startTime = new Date(date)
  startTime.setHours(startHour, startMin, 0, 0)
  
  const endTime = new Date(date)
  endTime.setHours(endHour, endMin, 0, 0)
  
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  
  let currentTime = new Date(startTime)
  while (currentTime < endTime) {
    const timeString = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`
    
    // Check if past time (if today)
    if (isToday && currentTime < now) {
      slots.push({ time: timeString, available: false, reason: 'past_time' })
    } else {
      // Check for conflicts with existing appointments
      const hasConflict = existingAppointments.some(apt => {
        const aptStart = new Date(apt.start_time)
        const aptEnd = new Date(apt.end_time)
        return currentTime >= aptStart && currentTime < aptEnd
      })
      
      slots.push({
        time: timeString,
        available: !hasConflict,
        reason: hasConflict ? 'already_booked' : undefined
      })
    }
    
    // Add 30 minutes
    currentTime.setMinutes(currentTime.getMinutes() + 30)
  }
  
  return slots
}

/**
 * Format date in business timezone
 */
export function formatBusinessDate(date: Date, timezone: string): string {
  try {
    // Use Intl.DateTimeFormat for timezone-aware formatting
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
    return formatter.format(date)
  } catch (error) {
    // Fallback to local formatting
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }
}

/**
 * Format time in business timezone (12-hour format)
 */
export function formatBusinessTime(time: string, timezone: string): string {
  try {
    // Parse time string (HH:mm format)
    const [hours, minutes] = time.split(':').map(Number)
    const date = new Date()
    date.setHours(hours, minutes, 0, 0)
    
    // Format in 12-hour format
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    return formatter.format(date)
  } catch (error) {
    // Fallback to simple formatting
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`
  }
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) {
    return '$0.00'
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Format phone number for display
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return ''
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '')
  
  // Handle E.164 format (+1XXXXXXXXXX)
  if (digits.length === 11 && digits.startsWith('1')) {
    const areaCode = digits.slice(1, 4)
    const exchange = digits.slice(4, 7)
    const number = digits.slice(7, 11)
    return `(${areaCode}) ${exchange}-${number}`
  }
  
  // Handle 10-digit format
  if (digits.length === 10) {
    const areaCode = digits.slice(0, 3)
    const exchange = digits.slice(3, 6)
    const number = digits.slice(6, 10)
    return `(${areaCode}) ${exchange}-${number}`
  }
  
  // Return original if can't format
  return phone
}

