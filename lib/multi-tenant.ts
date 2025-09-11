import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth'

export interface TenantContext {
  userId: string
  tenantId: string
  businessName: string
  businessType: string
  calendarProvider?: string
  calendarId?: string
  phoneNumber?: string
  retellAgentId?: string
  stripeCustomerId?: string
}

export async function getTenantContext(request: NextRequest): Promise<TenantContext | null> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return null
    }

    return {
      userId: session.user.id,
      tenantId: session.user.tenant_id || session.user.id,
      businessName: session.user.business_name,
      businessType: session.user.business_type,
      calendarProvider: session.user.calendar_provider,
      calendarId: session.user.calendar_id,
      phoneNumber: session.user.phone_number,
      retellAgentId: session.user.retell_agent_id,
      stripeCustomerId: session.user.stripe_customer_id
    }
  } catch (error) {
    console.error('Error getting tenant context:', error)
    return null
  }
}

export function createTenantFilter(tenantId: string) {
  return {
    user_id: tenantId
  }
}

export function validateTenantAccess(userId: string, resourceUserId: string): boolean {
  return userId === resourceUserId
}

