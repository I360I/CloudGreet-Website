// Common types used throughout the application

export interface JobDetails {
  service_type: string
  customer_phone: string
  business_id: string
  property_size?: number
  urgency?: string
  location?: string
  description?: string
  budget_range?: string
  timeline?: string
  special_requirements?: string
}

export interface PricingRule {
  id: string
  business_id: string
  service_type: string
  condition_field: string
  condition_operator: string
  condition_value: string
  price: number
  rule_name: string
  created_at: string
  updated_at: string
}

export interface EstimateBreakdown {
  rule_name: string
  price: number
  condition: string
}

export interface Estimate {
  total_price: number
  breakdown: EstimateBreakdown[]
  confidence_score: number
  notes: string
}

export interface Lead {
  id: string
  business_id: string
  name: string
  email: string
  phone: string
  company?: string
  source: string
  status: string
  score: number
  created_at: string
  updated_at: string
  notes?: string
  tags?: string[]
  rating?: number
  business_type?: string
  industry?: string
  company_size?: string
  location?: string
  website?: string
  linkedin_url?: string
  has_ai_receptionist?: boolean
  detected_technologies?: string[]
  linkedin_profiles?: LinkedInProfile[]
}

export interface LinkedInProfile {
  name: string
  title: string
  company: string
  location: string
  profile_url: string
  image_url?: string
}

export interface ContactInfo {
  name: string
  email: string
  phone: string
  company?: string
  business_type?: string
  rating?: number
  industry?: string
  company_size?: string
  location?: string
  website?: string
  linkedin_url?: string
  notes?: string
  tags?: string[]
}

export interface Appointment {
  id: string
  business_id: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  service_type: string
  scheduled_date: string
  duration: number
  status: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface Business {
  id: string
  business_name: string
  business_type: string
  email: string
  phone: string
  address: string
  services?: string[]
  service_areas?: string[]
  business_hours?: BusinessHours
  ai_agent_id?: string
  created_at: string
  updated_at: string
}

export interface BusinessHours {
  monday: DayHours
  tuesday: DayHours
  wednesday: DayHours
  thursday: DayHours
  friday: DayHours
  saturday: DayHours
  sunday: DayHours
}

export interface DayHours {
  open: boolean
  start_time?: string
  end_time?: string
}

export interface AISettings {
  greetingMessage?: string
  tone?: string
  services?: string[]
  serviceAreas?: string[]
  businessHours?: BusinessHours
  pricingRules?: PricingRule[]
  specialInstructions?: string
}

export interface AIAgent {
  id: string
  business_id: string
  agent_id: string
  greeting_message: string
  tone: string
  services: string[]
  service_areas: string[]
  business_hours: BusinessHours
  pricing_rules: PricingRule[]
  special_instructions?: string
  created_at: string
  updated_at: string
}

export interface NotificationSettings {
  emailNotifications: boolean
  smsNotifications: boolean
  callNotifications: boolean
  marketingEmails: boolean
}

export interface UserProfile {
  name: string
  email: string
  phone: string
  businessName: string
  businessType: string
  address: string
  role: string
}

export interface PasswordData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface WebSocketMessage {
  type: string
  data: unknown
  timestamp: string
  businessId: string
}

export interface SessionData {
  controller: ReadableStreamDefaultController
  encoder: TextEncoder
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export interface QueryResult<T> {
  data: T | null
  error: string | null
}

export interface RevenueOptimizedConfig {
  businessHours: BusinessHours
  services: string[]
  serviceAreas: string[]
  pricingRules: PricingRule[]
  businessType: string
  specialInstructions?: string
}

export interface PricingScripts {
  emergency: {
    script: string
    multiplier: number
  }
  standard: {
    script: string
    multiplier: number
  }
  premium: {
    script: string
    multiplier: number
  }
}

export interface ObjectionHandling {
  [key: string]: string
}

export interface ClosingTechniques {
  assumptive: string
  urgency: string
  value: string
  alternative: string
}

export interface AgentData {
  agent_id: string
  name: string
  voice_id: string
  language: string
  created_at: string
  updated_at: string
}

export interface PhoneValidationResult {
  isValid: boolean
  formatted: string
  country: string
  type: string
  carrier?: string
}

export interface LeadScoringResult {
  score: number
  insights: string[]
  confidence: number
  factors: {
    contact_quality: number
    company_size: number
    industry_relevance: number
    engagement_level: number
    timing: number
  }
}

export interface ContactActivity {
  lead_id: string
  activity_type: string
  details: {
    method: string
    content: string
    timestamp: string
    status: string
    response?: string
  }
  created_at: string
}

export interface ReminderMessage {
  type: string
  content: string
  scheduled_time: string
  recipient: string
  method: string
}

export interface TestResult {
  status: 'success' | 'error'
  message: string
  details?: unknown
}

export interface WorkingPromptConfig {
  greetingMessage: string
  tone: string
  services: string[]
  serviceAreas: string[]
  businessHours: BusinessHours
  pricingRules: PricingRule[]
  specialInstructions?: string
}

export interface AgentConfiguration {
  greeting: string
  tone: string
  services: string[]
  serviceAreas: string[]
  businessHours: BusinessHours
  pricingRules: PricingRule[]
  specialInstructions?: string
}

export interface ValidationFunction<T> {
  (input: T): boolean
}

export interface ErrorDetails {
  code: string
  message: string
  field?: string
  value?: unknown
}

export interface APIError {
  success: false
  error: ErrorDetails
  requestId?: string
  timestamp: string
}

export interface APISuccess<T> {
  success: true
  data: T
  requestId?: string
  timestamp: string
}

export type APIResponse<T> = APISuccess<T> | APIError

export interface PaginationParams {
  page: number
  limit: number
  offset: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface FilterParams {
  search?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  businessId?: string
  userId?: string
}

export interface SortParams {
  field: string
  direction: 'asc' | 'desc'
}

export interface QueryParams extends PaginationParams, FilterParams, SortParams {}

export interface DatabaseError {
  code: string
  message: string
  details?: string
  hint?: string
}

export interface SupabaseResponse<T> {
  data: T | null
  error: DatabaseError | null
}

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyGenerator?: (request: Request) => string
}

export interface SecurityHeaders {
  'Content-Security-Policy'?: string
  'Strict-Transport-Security'?: string
  'X-Frame-Options'?: string
  'X-Content-Type-Options'?: string
  'X-XSS-Protection'?: string
  'Referrer-Policy'?: string
  'Permissions-Policy'?: string
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  message: string
  timestamp: string
  requestId?: string
  userId?: string
  businessId?: string
  metadata?: Record<string, unknown>
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  services: {
    database: ServiceHealth
    redis: ServiceHealth
    external: ServiceHealth
  }
  metrics: {
    responseTime: number
    memoryUsage: number
    cpuUsage: number
  }
}

export interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'degraded'
  responseTime?: number
  error?: string
  lastChecked: string
}

export interface MonitoringAlert {
  id: string
  type: 'error' | 'performance' | 'security' | 'business'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  timestamp: string
  resolved: boolean
  resolvedAt?: string
  metadata?: Record<string, unknown>
}

export interface PerformanceMetrics {
  responseTime: number
  throughput: number
  errorRate: number
  cpuUsage: number
  memoryUsage: number
  timestamp: string
}

export interface BusinessMetrics {
  totalCalls: number
  answeredCalls: number
  missedCalls: number
  appointments: number
  revenue: number
  conversionRate: number
  averageCallDuration: number
  period: string
}

export interface CallMetrics {
  callId: string
  duration: number
  status: string
  quality: number
  transcript?: string
  recordingUrl?: string
  createdAt: string
}

export interface LeadMetrics {
  totalLeads: number
  qualifiedLeads: number
  convertedLeads: number
  averageScore: number
  topSources: Array<{
    source: string
    count: number
    conversionRate: number
  }>
  period: string
}

export interface RevenueMetrics {
  totalRevenue: number
  monthlyRecurring: number
  oneTimeRevenue: number
  averageDealSize: number
  growthRate: number
  period: string
}

export interface DashboardData {
  business: BusinessMetrics
  calls: CallMetrics[]
  leads: LeadMetrics
  revenue: RevenueMetrics
  performance: PerformanceMetrics
  alerts: MonitoringAlert[]
}

export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'json'
  fields: string[]
  filters?: FilterParams
  dateRange?: {
    from: string
    to: string
  }
}

export interface ImportResult {
  success: boolean
  imported: number
  failed: number
  errors: Array<{
    row: number
    field: string
    message: string
  }>
}

export interface BackupConfig {
  enabled: boolean
  schedule: string
  retention: number
  encryption: boolean
  compression: boolean
  destination: string
}

export interface MigrationResult {
  success: boolean
  version: string
  applied: number
  rolledBack: number
  errors: string[]
  duration: number
}

export interface FeatureFlag {
  name: string
  enabled: boolean
  description: string
  rolloutPercentage: number
  conditions?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface A_BTest {
  id: string
  name: string
  description: string
  variants: Array<{
    name: string
    config: Record<string, unknown>
    traffic: number
  }>
  metrics: string[]
  status: 'draft' | 'running' | 'paused' | 'completed'
  startDate: string
  endDate?: string
  results?: {
    winner: string
    confidence: number
    metrics: Record<string, number>
  }
}

export interface ComplianceConfig {
  gdpr: {
    enabled: boolean
    consentRequired: boolean
    dataRetentionDays: number
    rightToErasure: boolean
  }
  tcpa: {
    enabled: boolean
    optInRequired: boolean
    optOutHandling: boolean
    timeRestrictions: boolean
  }
  accessibility: {
    wcagLevel: 'A' | 'AA' | 'AAA'
    screenReaderSupport: boolean
    keyboardNavigation: boolean
  }
}

export interface AuditLog {
  id: string
  userId: string
  businessId: string
  action: string
  resource: string
  resourceId: string
  changes: Record<string, unknown>
  ipAddress: string
  userAgent: string
  timestamp: string
}

export interface SystemConfig {
  maintenance: {
    enabled: boolean
    message: string
    startTime: string
    endTime: string
  }
  rateLimiting: {
    enabled: boolean
    defaultLimit: number
    burstLimit: number
  }
  monitoring: {
    enabled: boolean
    alerting: boolean
    metrics: boolean
  }
  security: {
    twoFactorRequired: boolean
    passwordPolicy: {
      minLength: number
      requireUppercase: boolean
      requireLowercase: boolean
      requireNumbers: boolean
      requireSymbols: boolean
    }
  }
}
