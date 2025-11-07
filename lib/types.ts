// TypeScript type definitions for CloudGreet platform

export interface JWTPayload {
  userId: string
  businessId: string
  email: string
  role: 'user' | 'admin'
  iat: number
  exp: number
}

// Database Types
export interface Business {
  id: string
  business_name: string
  business_type?: string
  phone_number?: string
  website?: string
  address?: string
  email: string
  industry?: string
  timezone?: string
  business_hours?: Record<string, unknown>
  ai_agent_id?: string
  retell_agent_id?: string
  stripe_customer_id?: string
  subscription_status?: string
  stripe_subscription_id?: string
  services?: string[]
  service_areas?: string[]
  onboarding_completed?: boolean
  notification_phone?: string
  sms_forwarding_enabled?: boolean
  ai_agent_enabled?: boolean
  greeting_message?: string
  created_at: string
  updated_at: string
}

export interface Call {
  id: string
  business_id: string
  from_number?: string
  to_number?: string
  status: 'initiated' | 'ringing' | 'answered' | 'completed' | 'failed' | 'busy' | 'no-answer' | 'in-progress'
  duration?: number
  recording_url?: string
  transcript?: string
  sentiment?: 'positive' | 'neutral' | 'negative'
  call_summary?: string
  call_analysis?: Record<string, unknown>
  satisfaction_score?: number
  ai_response_time?: number
  retell_call_id?: string
  call_id?: string
  started_at?: string
  ended_at?: string
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  business_id: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  service_type: string
  scheduled_date: string
  appointment_date?: string
  appointment_time?: string
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show'
  notes?: string
  estimated_value?: number
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface EnrichedLead {
  id: string
  business_id: string
  owner_email?: string
  owner_name?: string
  owner_phone?: string
  business_name: string
  business_phone?: string
  business_address?: string
  business_website?: string
  industry?: string
  lead_score?: number
  notes?: string
  tags?: string[]
  enrichment_status?: string
  enrichment_attempts?: number
  website?: string
  business_type?: string
  city?: string
  state?: string
  google_rating?: number
  google_review_count?: number
  phone?: string
  employee_count_min?: number
  employee_count_max?: number
  estimated_revenue_min?: number
  estimated_revenue_max?: number
  has_online_booking?: boolean
  has_live_chat?: boolean
  has_ai_receptionist?: boolean
  detected_technologies?: string[]
  first_contact_date?: string
  contact_attempts?: number
  emails_sent?: number
  sms_sent?: number
  created_at: string
  updated_at: string
}

export interface AIAgent {
  id: string
  business_id: string
  name: string
  greeting_message?: string
  personality?: string
  voice_settings?: Record<string, unknown>
  tone?: string
  voice?: string
  max_call_duration?: number
  is_active?: boolean
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  business_id: string
  type: string
  message: string
  title?: string
  read?: boolean
  priority?: string
  action_url?: string
  status: string
  sent_at?: string
  created_at: string
}

export interface SMSMessage {
  id: string
  business_id: string
  to_number: string
  from_number: string
  message: string
  status: string
  sent_at?: string
  created_at: string
}

export interface EmailLog {
  id: string
  business_id: string
  to_email: string
  from_email: string
  subject: string
  status: string
  sent_at?: string
  created_at: string
}

export interface AutomationExecution {
  id: string
  business_id: string
  type: string
  status: string
  executed_at?: string
  created_at: string
}

export interface Campaign {
  id: string
  business_id: string
  name: string
  type: string
  status: string
  created_at: string
}

export interface EmailTemplate {
  id: string
  business_id: string
  name: string
  subject: string
  body: string
  created_at: string
  updated_at: string
}

export interface PhoneNumber {
  id: string
  business_id: string
  number: string
  type: string
  status: string
  created_at: string
}

export interface TollFreeNumber {
  id: string
  business_id: string
  number: string
  status: string
  created_at: string
}

export interface Conversation {
  id: string
  business_id: string
  type: string
  status: string
  created_at: string
  updated_at: string
}

export interface ConversationMessage {
  id: string
  conversation_id: string
  role: string
  content: string
  created_at: string
}

export interface MarketIntelligence {
  id: string
  business_id: string
  type: string
  data: Record<string, unknown>
  created_at: string
}

export interface LeadEnrichment {
  id: string
  business_id: string
  lead_id: string
  status: string
  data: Record<string, unknown>
  created_at: string
}

export interface BulkEnrichment {
  id: string
  business_id: string
  status: string
  total_leads: number
  processed_leads: number
  successful_leads: number
  failed_leads: number
  started_at?: string
  completed_at?: string
  error_summary?: string
  created_at: string
}

export interface ABTesting {
  id: string
  business_id: string
  name: string
  status: string
  variants: Record<string, unknown>
  created_at: string
}

export interface PerformanceCache {
  id: string
  business_id: string
  key: string
  value: Record<string, unknown>
  expires_at?: string
  created_at: string
}

export interface SecurityAudit {
  id: string
  business_id: string
  type: string
  status: string
  findings: Record<string, unknown>
  created_at: string
}

export interface SystemHealth {
  id: string
  metric: string
  value: number | string
  timestamp: string
  created_at: string
}

export interface WebhookEvent {
  id: string
  event_id: string
  provider: string
  event_type: string
  processed_at: string
  created_at: string
}

// API Response Types
export interface APIResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedAPIResponse<T = unknown> extends APIResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Dashboard Types
export interface DashboardMetrics {
  totalCalls: number
  answeredCalls: number
  missedCalls: number
  totalAppointments: number
  totalRevenue: number
  conversionRate: number
  avgCallDuration: number
}

export interface RealtimeMetrics {
  activeCalls: number
  callsToday: number
  appointmentsToday: number
}

export interface DashboardData {
  businessId: string
  totalCalls: number
  answeredCalls: number
  missedCalls: number
  appointmentsBooked: number
  appointmentsCompleted: number
  totalRevenue: number
  netROI: number
  recentCalls: Call[]
  recentAppointments: Appointment[]
  recentLeads: EnrichedLead[]
}

// Analytics Types
export interface CallAnalyticsData {
  callVolumeHeatmap: Array<{
    hour: number
    day: string
    calls: number
  }>
  callDurationTrend: Array<{
    date: string
    avgDuration: number
  }>
  conversionFunnel: Array<{
    step: string
    count: number
    percentage: number
  }>
  sentimentAnalysis: {
    positive: number
    neutral: number
    negative: number
  }
  totalCalls: number
  avgCallDuration: number
  conversionRate: number
}

export interface ROIData {
  totalCalls: number
  answeredCalls: number
  missedCalls: number
  appointmentsBooked: number
  appointmentsCompleted: number
  totalRevenue: number
  totalFees: number
  netROI: number
  roiPercentage: number
  closeRate: number
  conversionRate: number
}

export interface CallQualityMetrics {
  avgCallDuration: number
  avgResponseTime: number
  audioQuality: number
  dropRate: number
  customerSatisfaction: number
}

export interface AIInsight {
  id: string
  type: 'peak_time' | 'conversion_tip' | 'revenue_opportunity' | 'performance_trend'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  actionable: boolean
  created_at: string
}

// Business Hours
export interface BusinessHours {
  [key: string]: {
    open: string
    close: string
    isOpen: boolean
  }
}

// Event Types
export interface TelnyxWebhookEvent {
  data: {
    event_type: string
    payload: {
      call_control_id: string
      to: string
      from: string
      direction: 'inbound' | 'outbound'
      state: string
    }
  }
}

export interface RetellWebhookEvent {
  call_id: string
  agent_id: string
  event: 'call_started' | 'call_ended' | 'call_analyzed'
  call_summary?: string
  transcript?: string
  recording_url?: string
  sentiment?: 'positive' | 'neutral' | 'negative'
  duration?: number
  timestamp: string
}

// Form Types
export interface LoginForm {
  email: string
  password: string
}

export interface RegisterForm {
  email: string
  password: string
  businessName: string
  businessType?: string
  phone?: string
  website?: string
  address?: string
}

export interface ContactForm {
  firstName: string
  lastName: string
  email: string
  business?: string
  subject: string
  message: string
}

// Utility Types
export type Timeframe = '7d' | '30d' | '90d'
export type CallStatus = Call['status']
export type AppointmentStatus = Appointment['status']
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
export type Sentiment = Call['sentiment']

// Generic Types
export type ID = string
export type Timestamp = string
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

// API Error Types
export interface APIError {
  code: string
  message: string
  details?: Record<string, unknown>
  timestamp: string
}

// Context Types
export interface AuthContextType {
  user: Business | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  loading: boolean
}

export interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void
  hideToast: () => void
}

// Hook Return Types
export interface UseDashboardDataReturn {
  data: DashboardData | null
  loading: boolean
  error: Error | null
  refetch: () => void
}

export interface UseRealtimeMetricsReturn {
  metrics: {
    callsToday: number
    revenueToday: number
    appointmentsToday: number
  }
  loading: boolean
  error: Error | null
}

// Logging Types
export interface LogContext {
  [key: string]: string | number | boolean | undefined
}

// Rate Limiting Types
export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
}

// Admin Types
export interface AdminAuth {
  admin?: {
    id: string
    email: string
    role: string
  }
  error?: string
  response?: Response
}

// Lead Types (for Apollo Killer)
export interface Lead {
  id: string
  businessName: string
  contactName: string
  email: string
  phone: string
  company: string
  industry: string
  website: string
  address: string
  city: string
  state: string
  zipCode: string
  country: string
  leadScore: number
  status: string
  source: string
  notes: string
  tags: string[]
  createdAt: string
  updatedAt: string
}
