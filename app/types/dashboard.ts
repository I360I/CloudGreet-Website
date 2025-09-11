// Dashboard Types and Interfaces
export interface User {
  id: string
  email: string
  name: string
  companyName?: string
  phoneNumber?: string
  businessType?: string
  onboardingStatus: 'pending' | 'processing' | 'active'
  phoneConnected: boolean
  googleCalendarConnected: boolean
  createdAt: Date
  updatedAt: Date
}

export interface OnboardingData {
  businessName: string
  businessType: string
  industry: string
  phoneNumber: string
  address: string
  website?: string
  description: string
  preferredReceptionistStyle: 'professional' | 'friendly' | 'casual' | 'formal'
  businessHours: {
    monday: { open: string; close: string; closed: boolean }
    tuesday: { open: string; close: string; closed: boolean }
    wednesday: { open: string; close: string; closed: boolean }
    thursday: { open: string; close: string; closed: boolean }
    friday: { open: string; close: string; closed: boolean }
    saturday: { open: string; close: string; closed: boolean }
    sunday: { open: string; close: string; closed: boolean }
  }
  services: string[]
  targetAudience: string
  specialInstructions?: string
}

export interface CallStats {
  totalCalls: number
  answeredCalls: number
  missedCalls: number
  averageCallDuration: number
  totalCallTime: number
  callsToday: number
  callsThisWeek: number
  callsThisMonth: number
  peakHours: { hour: number; count: number }[]
  callQuality: {
    excellent: number
    good: number
    fair: number
    poor: number
  }
}

export interface MessageStats {
  totalMessages: number
  unreadMessages: number
  messagesToday: number
  messagesThisWeek: number
  messagesThisMonth: number
  responseTime: number
  satisfactionScore: number
}

export interface BookingStats {
  totalBookings: number
  confirmedBookings: number
  pendingBookings: number
  cancelledBookings: number
  bookingsToday: number
  bookingsThisWeek: number
  bookingsThisMonth: number
  averageBookingValue: number
  popularServices: { service: string; count: number }[]
}

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: Date
  end: Date
  allDay: boolean
  location?: string
  attendees?: string[]
  status: 'confirmed' | 'pending' | 'cancelled'
  source: 'manual' | 'ai_receptionist' | 'google_calendar'
  serviceType?: string
  customerInfo?: {
    name: string
    phone: string
    email?: string
  }
}

export interface AIReceptionistConfig {
  greetingMessage: string
  businessHours: string
  services: string[]
  pricing: string
  bookingInstructions: string
  emergencyContact?: string
  customScripts: string[]
  language: 'english' | 'spanish' | 'french' | 'german'
  voice: 'male' | 'female'
  personality: 'professional' | 'friendly' | 'casual' | 'formal'
}

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
}

export interface DashboardMetrics {
  calls: CallStats
  messages: MessageStats
  bookings: BookingStats
  revenue: {
    total: number
    thisMonth: number
    thisWeek: number
    today: number
    growth: number
  }
  customerSatisfaction: number
  aiPerformance: {
    accuracy: number
    responseTime: number
    customerRating: number
  }
}

export interface QuickAction {
  id: string
  title: string
  description: string
  icon: string
  action: () => void
  color: string
  disabled?: boolean
}

export interface RecentActivity {
  id: string
  type: 'call' | 'message' | 'booking' | 'system'
  title: string
  description: string
  timestamp: Date
  status: 'completed' | 'pending' | 'failed'
  priority: 'low' | 'medium' | 'high'
}
