export const productionConfig = {
  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'cloudgreet_production',
    user: process.env.DB_USER || 'cloudgreet_user',
    password: process.env.DB_PASSWORD || '',
    ssl: true,
    maxConnections: 20,
    connectionTimeout: 2000,
    idleTimeout: 30000
  },

  // Azure Communication Services
  azure: {
    connectionString: process.env.AZURE_COMMUNICATION_CONNECTION_STRING || '',
    endpoint: process.env.AZURE_COMMUNICATION_ENDPOINT || ''
  },

  // Stripe Configuration
  stripe: {
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || ''
  },

  // Retell AI Configuration
  retell: {
    apiKey: process.env.RETELL_API_KEY || ''
  },

  // Security Configuration
  security: {
    jwtSecret: process.env.JWT_SECRET || '',
    encryptionKey: process.env.ENCRYPTION_KEY || '',
    sessionSecret: process.env.NEXTAUTH_SECRET || '',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['https://your-domain.com']
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
  },

  // Monitoring
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN || '',
    logLevel: process.env.LOG_LEVEL || 'info'
  },

  // Email Configuration
  email: {
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT || '587'),
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    },
    fromEmail: process.env.FROM_EMAIL || 'noreply@your-domain.com'
  },

  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },

  // Application Configuration
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com',
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'https://api.your-domain.com',
    environment: process.env.NODE_ENV || 'production'
  },

  // Business Configuration
  business: {
    defaultTimezone: process.env.DEFAULT_TIMEZONE || 'America/New_York',
    defaultCurrency: process.env.DEFAULT_CURRENCY || 'USD',
    defaultLanguage: process.env.DEFAULT_LANGUAGE || 'en'
  },

  // Feature Flags
  features: {
    analytics: process.env.ENABLE_ANALYTICS === 'true',
    debugMode: process.env.ENABLE_DEBUG_MODE === 'true',
    maintenanceMode: process.env.ENABLE_MAINTENANCE_MODE === 'true'
  }
}

// Validation function
export function validateProductionConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check required environment variables
  const requiredVars = [
    'DB_HOST',
    'DB_PASSWORD',
    'AZURE_COMMUNICATION_CONNECTION_STRING',
    'STRIPE_SECRET_KEY',
    'RETELL_API_KEY',
    'JWT_SECRET',
    'NEXTAUTH_SECRET'
  ]

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`)
    }
  }

  // Validate database configuration
  if (!productionConfig.database.host || !productionConfig.database.password) {
    errors.push('Database configuration is incomplete')
  }

  // Validate Azure configuration
  if (!productionConfig.azure.connectionString || !productionConfig.azure.endpoint) {
    errors.push('Azure Communication Services configuration is incomplete')
  }

  // Validate Stripe configuration
  if (!productionConfig.stripe.secretKey || !productionConfig.stripe.publishableKey) {
    errors.push('Stripe configuration is incomplete')
  }

  // Validate security configuration
  if (!productionConfig.security.jwtSecret || !productionConfig.security.sessionSecret) {
    errors.push('Security configuration is incomplete')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Export default configuration
export default productionConfig
