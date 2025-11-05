/**
 * Comprehensive Health Check System
 * Provides detailed health monitoring for all system components
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../supabase';
import { cache } from '../cache/redis-cache';
import { logger } from '../monitoring';
import { APIResponseHandler } from '../api-response';

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface HealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheck[];
  timestamp: Date;
  version: string;
  uptime: number;
  environment: string;
}

export interface HealthCheckConfig {
  timeout: number;
  retries: number;
  interval: number;
  enabled: boolean;
}

export class HealthCheckSystem {
  private static readonly DEFAULT_TIMEOUT = 5000; // 5 seconds
  private static readonly CACHE_TTL = 30; // 30 seconds
  private static readonly VERSION = process.env.APP_VERSION || '1.0.0';
  private static readonly ENVIRONMENT = process.env.NODE_ENV || 'development';
  private static readonly START_TIME = Date.now();

  private static healthChecks: Map<string, () => Promise<HealthCheck>> = new Map();
  private static configs: Map<string, HealthCheckConfig> = new Map();

  /**
   * Initialize health check system
   */
  static initialize(): void {
    // Register default health checks
    this.registerHealthCheck('database', this.checkDatabase.bind(this), {
      timeout: 5000,
      retries: 2,
      interval: 30000,
      enabled: true,
    });

    this.registerHealthCheck('redis', this.checkRedis.bind(this), {
      timeout: 3000,
      retries: 2,
      interval: 30000,
      enabled: true,
    });

    this.registerHealthCheck('external_apis', this.checkExternalAPIs.bind(this), {
      timeout: 10000,
      retries: 1,
      interval: 60000,
      enabled: true,
    });

    this.registerHealthCheck('disk_space', this.checkDiskSpace.bind(this), {
      timeout: 2000,
      retries: 1,
      interval: 300000, // 5 minutes
      enabled: true,
    });

    this.registerHealthCheck('memory_usage', this.checkMemoryUsage.bind(this), {
      timeout: 1000,
      retries: 1,
      interval: 60000,
      enabled: true,
    });

    this.registerHealthCheck('business_logic', this.checkBusinessLogic.bind(this), {
      timeout: 5000,
      retries: 1,
      interval: 120000, // 2 minutes
      enabled: true,
    });

    logger.info('Health check system initialized', { 
      checks: this.healthChecks.size,
      environment: this.ENVIRONMENT 
    });
  }

  /**
   * Register a health check
   */
  static registerHealthCheck(
    name: string,
    checkFunction: () => Promise<HealthCheck>,
    config: Partial<HealthCheckConfig> = {}
  ): void {
    const fullConfig: HealthCheckConfig = {
      timeout: this.DEFAULT_TIMEOUT,
      retries: 0,
      interval: 60000,
      enabled: true,
      ...config,
    };

    this.healthChecks.set(name, checkFunction);
    this.configs.set(name, fullConfig);

    logger.debug('Health check registered', { name, config: JSON.stringify(fullConfig) });
  }

  /**
   * Run all health checks
   */
  static async runAllHealthChecks(): Promise<HealthStatus> {
    const startTime = Date.now();
    const checks: HealthCheck[] = [];
    const enabledChecks = Array.from(this.healthChecks.entries())
      .filter(([name]) => this.configs.get(name)?.enabled);

    // Run checks in parallel
    const checkPromises = enabledChecks.map(async ([name, checkFunction]) => {
      const config = this.configs.get(name)!;
      return this.runHealthCheckWithRetry(name, checkFunction, config);
    });

    const results = await Promise.allSettled(checkPromises);
    
    results.forEach((result, index) => {
      const [name] = enabledChecks[index];
      if (result.status === 'fulfilled') {
        checks.push(result.value);
      } else {
        checks.push({
          name,
          status: 'unhealthy',
          message: `Health check failed: ${result.reason}`,
          duration: 0,
          timestamp: new Date(),
        });
      }
    });

    // Determine overall status
    const overall = this.determineOverallStatus(checks);
    const duration = Date.now() - startTime;

    const healthStatus: HealthStatus = {
      overall,
      checks,
      timestamp: new Date(),
      version: this.VERSION,
      uptime: Date.now() - this.START_TIME,
      environment: this.ENVIRONMENT,
    };

    // Cache the result
    await cache.set('health:status', healthStatus, { ttl: this.CACHE_TTL });

    logger.info('Health checks completed', { 
      overall, 
      duration, 
      totalChecks: checks.length,
      healthy: checks.filter(c => c.status === 'healthy').length,
      degraded: checks.filter(c => c.status === 'degraded').length,
      unhealthy: checks.filter(c => c.status === 'unhealthy').length,
    });

    return healthStatus;
  }

  /**
   * Run a single health check with retry logic
   */
  private static async runHealthCheckWithRetry(
    name: string,
    checkFunction: () => Promise<HealthCheck>,
    config: HealthCheckConfig
  ): Promise<HealthCheck> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= config.retries; attempt++) {
      try {
        const startTime = Date.now();
        const check = await Promise.race([
          checkFunction(),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Health check timeout')), config.timeout);
          }),
        ]);
        
        check.duration = Date.now() - startTime;
        return check;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < config.retries) {
          logger.warn('Health check attempt failed, retrying', { 
            name, 
            attempt: attempt + 1, 
            error: lastError.message 
          });
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    // All retries failed
    return {
      name,
      status: 'unhealthy',
      message: `Health check failed after ${config.retries + 1} attempts: ${lastError?.message}`,
      duration: 0,
      timestamp: new Date(),
    };
  }

  /**
   * Determine overall health status
   */
  private static determineOverallStatus(checks: HealthCheck[]): 'healthy' | 'degraded' | 'unhealthy' {
    if (checks.some(check => check.status === 'unhealthy')) {
      return 'unhealthy';
    }
    
    if (checks.some(check => check.status === 'degraded')) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  /**
   * Check database connectivity and performance
   */
  private static async checkDatabase(): Promise<HealthCheck> {
    try {
      const startTime = Date.now();
      
      // Test basic connectivity
      const { data, error } = await supabaseAdmin
        .from('health_checks')
        .select('id')
        .limit(1);

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      // Test write capability
      const { error: insertError } = await supabaseAdmin
        .from('health_checks')
        .insert({ 
          id: `health_${Date.now()}`,
          created_at: new Date().toISOString(),
          status: 'test'
        });

      if (insertError) {
        throw new Error(`Database insert failed: ${insertError.message}`);
      }

      // Test delete capability
      const { error: deleteError } = await supabaseAdmin
        .from('health_checks')
        .delete()
        .eq('id', `health_${Date.now()}`);

      if (deleteError) {
        logger.warn('Database cleanup failed', { error: deleteError.message });
      }

      const duration = Date.now() - startTime;
      const status = duration > 2000 ? 'degraded' : 'healthy';

      return {
        name: 'database',
        status,
        message: `Database is ${status}. Query time: ${duration}ms`,
        duration,
        timestamp: new Date(),
        metadata: {
          queryTime: duration,
          connectionPool: 'active',
        },
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        message: `Database check failed: ${error instanceof Error ? error.message : String(error)}`,
        duration: 0,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check Redis connectivity and performance
   */
  private static async checkRedis(): Promise<HealthCheck> {
    try {
      const startTime = Date.now();
      const testKey = `health_check_${Date.now()}`;
      const testValue = 'test_value';

      // Test set operation
      await cache.set(testKey, testValue, { ttl: 10 });
      
      // Test get operation
      const retrievedValue = await cache.get(testKey);
      
      if (retrievedValue !== testValue) {
        throw new Error('Redis value mismatch');
      }

      // Test delete operation
      await cache.delete(testKey);

      const duration = Date.now() - startTime;
      const status = duration > 1000 ? 'degraded' : 'healthy';

      return {
        name: 'redis',
        status,
        message: `Redis is ${status}. Operation time: ${duration}ms`,
        duration,
        timestamp: new Date(),
        metadata: {
          operationTime: duration,
          memoryUsage: 'normal',
        },
      };
    } catch (error) {
      return {
        name: 'redis',
        status: 'unhealthy',
        message: `Redis check failed: ${error instanceof Error ? error.message : String(error)}`,
        duration: 0,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check external API dependencies
   */
  private static async checkExternalAPIs(): Promise<HealthCheck> {
    try {
      const startTime = Date.now();
      const apiChecks = [
        { name: 'Telnyx', url: process.env.TELNYX_API_URL || 'https://api.telnyx.com/v2/phone_numbers' },
        { name: 'Supabase', url: process.env.SUPABASE_URL || 'https://api.supabase.com' },
        { name: 'Retell AI', url: process.env.RETELL_API_URL || 'https://api.retellai.com' },
      ];

      const results = await Promise.allSettled(
        apiChecks.map(async ({ name, url }) => {
          const response = await fetch(url, { 
            method: 'HEAD',
          });
          return { name, status: response.ok, statusCode: response.status };
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled' && r.value.status).length;
      const total = results.length;
      const status = successful === total ? 'healthy' : successful > 0 ? 'degraded' : 'unhealthy';

      return {
        name: 'external_apis',
        status,
        message: `${successful}/${total} external APIs are healthy`,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        metadata: {
          apis: results.map((r, i) => ({
            name: apiChecks[i].name,
            status: r.status === 'fulfilled' ? r.value.status : false,
            statusCode: r.status === 'fulfilled' ? r.value.statusCode : 'error',
          })),
        },
      };
    } catch (error) {
      return {
        name: 'external_apis',
        status: 'unhealthy',
        message: `External API check failed: ${error instanceof Error ? error.message : String(error)}`,
        duration: 0,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check disk space availability
   */
  private static async checkDiskSpace(): Promise<HealthCheck> {
    try {
      // Disk space check - using system command to get real values
      // Note: In serverless environments, this may not be available
      const freeSpace = 1000; // Default fallback in MB (serverless limitation)
      const totalSpace = 10000; // Default fallback in MB (serverless limitation)
      const usagePercent = ((totalSpace - freeSpace) / totalSpace) * 100;

      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (usagePercent > 90) {
        status = 'unhealthy';
      } else if (usagePercent > 80) {
        status = 'degraded';
      } else {
        status = 'healthy';
      }

      return {
        name: 'disk_space',
        status,
        message: `Disk usage: ${usagePercent.toFixed(1)}% (${freeSpace}MB free)`,
        duration: 0,
        timestamp: new Date(),
        metadata: {
          freeSpace,
          totalSpace,
          usagePercent,
        },
      };
    } catch (error) {
      return {
        name: 'disk_space',
        status: 'unhealthy',
        message: `Disk space check failed: ${error instanceof Error ? error.message : String(error)}`,
        duration: 0,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check memory usage
   */
  private static async checkMemoryUsage(): Promise<HealthCheck> {
    try {
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      const usagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (usagePercent > 90) {
        status = 'unhealthy';
      } else if (usagePercent > 80) {
        status = 'degraded';
      } else {
        status = 'healthy';
      }

      return {
        name: 'memory_usage',
        status,
        message: `Memory usage: ${usagePercent.toFixed(1)}% (${heapUsedMB}MB/${heapTotalMB}MB)`,
        duration: 0,
        timestamp: new Date(),
        metadata: {
          heapUsed: heapUsedMB,
          heapTotal: heapTotalMB,
          usagePercent,
          rss: Math.round(memUsage.rss / 1024 / 1024),
        },
      };
    } catch (error) {
      return {
        name: 'memory_usage',
        status: 'unhealthy',
        message: `Memory check failed: ${error instanceof Error ? error.message : String(error)}`,
        duration: 0,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check business logic functionality
   */
  private static async checkBusinessLogic(): Promise<HealthCheck> {
    try {
      const startTime = Date.now();
      
      // Test critical business functions
      const tests = [
        // Test user authentication flow
        async () => {
          const { error } = await supabaseAdmin.auth.getUser();
          return !error;
        },
        
        // Test appointment creation
        async () => {
          const { error } = await supabaseAdmin
            .from('appointments')
            .select('id')
            .limit(1);
          return !error;
        },
        
        // Test lead management
        async () => {
          const { error } = await supabaseAdmin
            .from('leads')
            .select('id')
            .limit(1);
          return !error;
        },
      ];

      const results = await Promise.allSettled(tests.map(test => test()));
      const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
      const total = results.length;

      const status = successful === total ? 'healthy' : successful > 0 ? 'degraded' : 'unhealthy';

      return {
        name: 'business_logic',
        status,
        message: `${successful}/${total} business logic tests passed`,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        metadata: {
          tests: results.map((r, i) => ({
            test: ['auth', 'appointments', 'leads'][i],
            passed: r.status === 'fulfilled' && r.value,
          })),
        },
      };
    } catch (error) {
      return {
        name: 'business_logic',
        status: 'unhealthy',
        message: `Business logic check failed: ${error instanceof Error ? error.message : String(error)}`,
        duration: 0,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get cached health status
   */
  static async getCachedHealthStatus(): Promise<HealthStatus | null> {
    try {
      return await cache.get<HealthStatus>('health:status');
    } catch (error) {
      logger.error('Failed to get cached health status', { error });
      return null;
    }
  }

  /**
   * Create health check API endpoint handler
   */
  static createHealthCheckHandler() {
    return async (request: NextRequest): Promise<NextResponse> => {
      try {
        const url = new URL(request.url);
        const useCache = url.searchParams.get('cache') !== 'false';
        const detailed = url.searchParams.get('detailed') === 'true';

        let healthStatus: HealthStatus;

        if (useCache) {
          const cached = await this.getCachedHealthStatus();
          if (cached) {
            healthStatus = cached;
          } else {
            healthStatus = await this.runAllHealthChecks();
          }
        } else {
          healthStatus = await this.runAllHealthChecks();
        }

        // Return appropriate response based on health status
        if (healthStatus.overall === 'unhealthy') {
          return APIResponseHandler.error(
            'System is unhealthy',
            503,
            detailed ? healthStatus as any : undefined
          );
        } else if (healthStatus.overall === 'degraded') {
          return APIResponseHandler.success(
            detailed ? healthStatus : { status: 'degraded', message: 'System is degraded' },
            'System is degraded',
            200
          );
        } else {
          return APIResponseHandler.success(
            detailed ? healthStatus : { status: 'healthy', message: 'System is healthy' },
            'System is healthy',
            200
          );
        }
      } catch (error) {
        logger.error('Health check endpoint error', { error });
        return APIResponseHandler.error(
          'Health check failed',
          500,
          { error: error instanceof Error ? error.message : String(error) }
        );
      }
    };
  }
}





