import { NextRequest, NextResponse } from 'next/server'
import { withPublic } from '@/lib/middleware'
import { Logger } from '@/lib/logger'
import { db } from '@/lib/database/connection'
import { azureCommunication } from '@/lib/azure-communication'
import Stripe from 'stripe'

async function healthCheck(request: NextRequest) {
  const startTime = Date.now()
  const checks: Record<string, { status: 'healthy' | 'unhealthy'; message?: string; duration?: number }> = {}

  try {
    // Database health check
    const dbStart = Date.now()
    try {
      await db.healthCheck()
      checks.database = { 
        status: 'healthy', 
        duration: Date.now() - dbStart 
      }
    } catch (error) {
      checks.database = { 
        status: 'unhealthy', 
        message: error instanceof Error ? error.message : 'Database connection failed',
        duration: Date.now() - dbStart
      }
    }

    // Azure Communication Services health check
    const azureStart = Date.now()
    try {
      // Test Azure connection by creating a user (this is a lightweight operation)
      await azureCommunication.createUser()
      checks.azure_communication = { 
        status: 'healthy', 
        duration: Date.now() - azureStart 
      }
    } catch (error) {
      checks.azure_communication = { 
        status: 'unhealthy', 
        message: error instanceof Error ? error.message : 'Azure Communication Services unavailable',
        duration: Date.now() - azureStart
      }
    }

    // Stripe health check
    const stripeStart = Date.now()
    try {
      const stripeKey = process.env.STRIPE_SECRET_KEY
      if (stripeKey && !stripeKey.includes('your-') && !stripeKey.includes('demo-')) {
        const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
        await stripe.balance.retrieve() // Lightweight API call
        checks.stripe = { 
          status: 'healthy', 
          duration: Date.now() - stripeStart 
        }
      } else {
        checks.stripe = { 
          status: 'unhealthy', 
          message: 'Stripe API key not configured',
          duration: Date.now() - stripeStart
        }
      }
    } catch (error) {
      checks.stripe = { 
        status: 'unhealthy', 
        message: error instanceof Error ? error.message : 'Stripe API unavailable',
        duration: Date.now() - stripeStart
      }
    }

    // System health check
    const systemStart = Date.now()
    try {
      const memoryUsage = process.memoryUsage()
      const uptime = process.uptime()
      
      checks.system = { 
        status: 'healthy', 
        message: `Memory: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB, Uptime: ${Math.round(uptime)}s`,
        duration: Date.now() - systemStart
      }
    } catch (error) {
      checks.system = { 
        status: 'unhealthy', 
        message: error instanceof Error ? error.message : 'System check failed',
        duration: Date.now() - systemStart
      }
    }

    // Determine overall health
    const allHealthy = Object.values(checks).every(check => check.status === 'healthy')
    const overallStatus = allHealthy ? 'healthy' : 'unhealthy'

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks
    }

    // Log health check results
    if (allHealthy) {
      Logger.info('Health check passed', { duration: response.duration })
    } else {
      Logger.warn('Health check failed', { checks, duration: response.duration })
    }

    return NextResponse.json(response, { 
      status: allHealthy ? 200 : 503 
    })

  } catch (error) {
    Logger.error('Health check error', { error: error instanceof Error ? error.message : 'Unknown error' })
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 })
  }
}

export const GET = withPublic(healthCheck)