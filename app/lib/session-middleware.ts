import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../lib/auth'

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string
    email: string
    name: string
  }
}

export async function requireAuth(request: NextRequest): Promise<{ user: any } | { error: string, status: number }> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return {
        error: 'Authentication required',
        status: 401
      }
    }

    return {
      user: {
        id: (session.user as any).id || session.user.email,
        email: session.user.email,
        name: session.user.name
      }
    }
  } catch (error) {
    console.error('Session middleware error:', error)
    return {
      error: 'Authentication failed',
      status: 500
    }
  }
}

export async function getUserId(request: NextRequest): Promise<string | null> {
  try {
    const authResult = await requireAuth(request)
    if ('error' in authResult) {
      return null
    }
    return authResult.user.id
  } catch (error) {
    console.error('Get user ID error:', error)
    return null
  }
}
