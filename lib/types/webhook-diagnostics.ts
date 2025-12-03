/**
 * Type definitions for webhook diagnostics
 */

export interface WebhookDiagnostics {
  retell: {
    reachable: boolean
    envVarsSet: boolean
    issues: string[]
  }
  telnyx: {
    reachable: boolean
    envVarsSet: boolean
    issues: string[]
  }
  overall: {
    status: 'healthy' | 'degraded' | 'unhealthy'
    recommendations: string[]
  }
}




