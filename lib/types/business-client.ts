/**
 * Type definitions for business/client data in admin pages
 */

export interface BusinessClient {
  id: string
  business_name: string
  business_type?: string | null
  phone_number?: string | null
  email?: string | null
  retell_agent_id?: string | null
  [key: string]: unknown
}

export interface TestCallPayload {
  phoneNumber: string
  businessId?: string
  businessInfo?: {
    name?: string
    type?: string
    services?: string[]
  }
  [key: string]: unknown
}




