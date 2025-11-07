/**
 * Database Query Optimization System
 * Provides query analysis, optimization suggestions, and performance monitoring
 */

import { supabaseAdmin } from '../supabase';
import { logger } from '../monitoring';
import { cache } from '../cache/redis-cache';

export interface QueryStats {
  query: string;
  executionTime: number;
  rowCount: number;
  cacheHit: boolean;
  timestamp: number;
  userId?: string;
  businessId?: string;
}

export interface OptimizationSuggestion {
  type: 'index' | 'join' | 'filter' | 'limit' | 'select';
  description: string;
  impact: 'high' | 'medium' | 'low';
  query: string;
  suggestedQuery?: string;
}

export interface QueryPlan {
  query: string;
  estimatedCost: number;
  executionTime: number;
  suggestions: OptimizationSuggestion[];
  indexes: string[];
  joins: number;
  filters: number;
}

export class QueryOptimizer {
  private static readonly CACHE_TTL = 300; // 5 minutes
  private static readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second
  private static readonly QUERY_STATS_KEY = 'query:stats';

  /**
   * Analyze and optimize a query
   */
  static async analyzeQuery(
    query: string,
    params: any[] = [],
    context: { userId?: string; businessId?: string } = {}
  ): Promise<QueryPlan> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = `query:analysis:${Buffer.from(query).toString('base64')}`;
      const cached = await cache.get<QueryPlan>(cacheKey);
      
      if (cached) {
        logger.debug('Query analysis cache hit', { query: query.substring(0, 100) });
        return cached;
      }

      // Analyze query structure
      const analysis = this.analyzeQueryStructure(query);
      
      // Get execution plan
      const executionPlan = await this.getExecutionPlan(query, params);
      
      // Generate optimization suggestions
      const suggestions = this.generateSuggestions(query, analysis, executionPlan);
      
      // Calculate estimated cost
      const estimatedCost = this.calculateEstimatedCost(analysis, executionPlan);
      
      const queryPlan: QueryPlan = {
        query,
        estimatedCost,
        executionTime: Date.now() - startTime,
        suggestions,
        indexes: analysis.indexes,
        joins: analysis.joins,
        filters: analysis.filters,
      };

      // Cache the analysis
      await cache.set(cacheKey, queryPlan, { ttl: this.CACHE_TTL });

      // Log slow queries
      if (queryPlan.executionTime > this.SLOW_QUERY_THRESHOLD) {
        logger.warn('Slow query detected', {
          query: query.substring(0, 200),
          executionTime: queryPlan.executionTime,
          suggestions: suggestions.length,
        });
      }

      return queryPlan;
    } catch (error) {
      logger.error('Query analysis error', { error: error instanceof Error ? error.message : JSON.stringify(error), query: query.substring(0, 100) });
      throw error;
    }
  }

  /**
   * Execute query with optimization
   */
  static async executeOptimizedQuery<T>(
    query: string,
    params: any[] = [],
    context: { userId?: string; businessId?: string } = {}
  ): Promise<{ data: T[]; stats: QueryStats }> {
    const startTime = Date.now();
    
    try {
      // Analyze query first
      const plan = await this.analyzeQuery(query, params, context);
      
      // Apply optimizations if any high-impact suggestions exist
      const optimizedQuery = this.applyOptimizations(query, plan.suggestions);
      
      // Execute query
      const { data, error } = await supabaseAdmin.rpc('execute_query', {
        query: optimizedQuery,
        params: params,
      });

      if (error) {
        throw error;
      }

      const executionTime = Date.now() - startTime;
      const stats: QueryStats = {
        query: optimizedQuery,
        executionTime,
        rowCount: data?.length || 0,
        cacheHit: false,
        timestamp: Date.now(),
        userId: context.userId,
        businessId: context.businessId,
      };

      // Store query stats
      await this.storeQueryStats(stats);

      return { data: data || [], stats };
    } catch (error) {
      logger.error('Query execution error', { error: error instanceof Error ? error.message : JSON.stringify(error), query: query.substring(0, 100) });
      throw error;
    }
  }

  /**
   * Analyze query structure
   */
  private static analyzeQueryStructure(query: string): {
    indexes: string[];
    joins: number;
    filters: number;
    hasLimit: boolean;
    hasOrderBy: boolean;
    selectColumns: string[];
    fromTables: string[];
  } {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Extract table names
    const fromMatch = normalizedQuery.match(/from\s+(\w+)/g);
    const fromTables = fromMatch ? fromMatch.map(match => match.replace('from ', '')) : [];
    
    // Extract select columns
    const selectMatch = normalizedQuery.match(/select\s+(.*?)\s+from/);
    const selectColumns = selectMatch 
      ? selectMatch[1].split(',').map(col => col.trim())
      : [];
    
    // Count joins
    const joins = (normalizedQuery.match(/\bjoin\b/g) || []).length;
    
    // Count filters
    const filters = (normalizedQuery.match(/\bwhere\b/g) || []).length + 
                   (normalizedQuery.match(/\band\b/g) || []).length + 
                   (normalizedQuery.match(/\bor\b/g) || []).length;
    
    // Check for limit
    const hasLimit = normalizedQuery.includes('limit');
    
    // Check for order by
    const hasOrderBy = normalizedQuery.includes('order by');
    
    // Identify potential indexes
    const indexes: string[] = [];
    if (normalizedQuery.includes('where')) {
      const whereMatch = normalizedQuery.match(/where\s+(.*?)(?:\s+group\s+by|\s+order\s+by|\s+limit|$)/);
      if (whereMatch) {
        const whereClause = whereMatch[1];
        const columnMatches = whereClause.match(/(\w+)\s*[=<>!]/g);
        if (columnMatches) {
          columnMatches.forEach(match => {
            const column = match.replace(/\s*[=<>!].*/, '');
            indexes.push(`${fromTables[0]}_${column}_idx`);
          });
        }
      }
    }
    
    return {
      indexes,
      joins,
      filters,
      hasLimit,
      hasOrderBy,
      selectColumns,
      fromTables,
    };
  }

  /**
   * Get execution plan (simplified)
   */
  private static async getExecutionPlan(query: string, params: any[]): Promise<any> {
    try {
      // This is a simplified version - in production, you'd use actual EXPLAIN
      const { data, error } = await supabaseAdmin.rpc('explain_query', {
        query: query,
        params: params,
      });

      if (error) {
        logger.warn('Could not get execution plan', { error: error instanceof Error ? error.message : JSON.stringify(error) });
        return { cost: 1000, rows: 1000 }; // Default values
      }

      return data || { cost: 1000, rows: 1000 };
    } catch (error) {
      logger.warn('Execution plan error', { error: error instanceof Error ? error.message : JSON.stringify(error) });
      return { cost: 1000, rows: 1000 };
    }
  }

  /**
   * Generate optimization suggestions
   */
  private static generateSuggestions(
    query: string,
    analysis: any,
    executionPlan: any
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const normalizedQuery = query.toLowerCase();

    // Check for missing indexes
    if (analysis.filters > 0 && analysis.indexes.length === 0) {
      suggestions.push({
        type: 'index',
        description: 'Consider adding indexes on filtered columns',
        impact: 'high',
        query: query.substring(0, 100),
        suggestedQuery: `CREATE INDEX IF NOT EXISTS idx_${analysis.fromTables[0]}_filtered_columns ON ${analysis.fromTables[0]} (column_name);`,
      });
    }

    // Check for SELECT *
    if (normalizedQuery.includes('select *')) {
      suggestions.push({
        type: 'select',
        description: 'Avoid SELECT * - specify only needed columns',
        impact: 'medium',
        query: query.substring(0, 100),
        suggestedQuery: query.replace(/select\s+\*/i, 'SELECT id, name, created_at'),
      });
    }

    // Check for missing LIMIT
    if (!analysis.hasLimit && analysis.joins > 2) {
      suggestions.push({
        type: 'limit',
        description: 'Add LIMIT clause to prevent large result sets',
        impact: 'medium',
        query: query.substring(0, 100),
        suggestedQuery: query + ' LIMIT 1000',
      });
    }

    // Check for inefficient joins
    if (analysis.joins > 3) {
      suggestions.push({
        type: 'join',
        description: 'Consider breaking down complex joins or using subqueries',
        impact: 'high',
        query: query.substring(0, 100),
      });
    }

    // Check for missing WHERE clause on large tables
    if (analysis.fromTables.some((table: string) => ['users', 'leads', 'appointments'].includes(table)) && analysis.filters === 0) {
      suggestions.push({
        type: 'filter',
        description: 'Add WHERE clause to filter large tables',
        impact: 'high',
        query: query.substring(0, 100),
      });
    }

    return suggestions;
  }

  /**
   * Calculate estimated cost
   */
  private static calculateEstimatedCost(analysis: any, executionPlan: any): number {
    let cost = 100; // Base cost
    
    // Add cost for joins
    cost += analysis.joins * 50;
    
    // Add cost for filters (without indexes)
    cost += analysis.filters * 20;
    
    // Add cost for large result sets
    if (!analysis.hasLimit) {
      cost += 200;
    }
    
    // Add cost for complex queries
    if (analysis.selectColumns.includes('*')) {
      cost += 100;
    }
    
    return Math.round(cost);
  }

  /**
   * Apply optimizations to query
   */
  private static applyOptimizations(query: string, suggestions: OptimizationSuggestion[]): string {
    let optimizedQuery = query;
    
    // Apply high-impact optimizations
    const highImpactSuggestions = suggestions.filter(s => s.impact === 'high');
    
    for (const suggestion of highImpactSuggestions) {
      if (suggestion.type === 'select' && suggestion.suggestedQuery) {
        optimizedQuery = suggestion.suggestedQuery;
      } else if (suggestion.type === 'limit' && suggestion.suggestedQuery) {
        optimizedQuery = suggestion.suggestedQuery;
      }
    }
    
    return optimizedQuery;
  }

  /**
   * Store query statistics
   */
  private static async storeQueryStats(stats: QueryStats): Promise<void> {
    try {
      const statsKey = `${this.QUERY_STATS_KEY}:${Date.now()}`;
      await cache.set(statsKey, stats, { ttl: 86400 }); // 24 hours
      
      // Also store in a list for analysis
      const statsListKey = `${this.QUERY_STATS_KEY}:list`;
      const existingStats = await cache.get<QueryStats[]>(statsListKey) || [];
      existingStats.push(stats);
      
      // Keep only last 1000 queries
      if (existingStats.length > 1000) {
        existingStats.splice(0, existingStats.length - 1000);
      }
      
      await cache.set(statsListKey, existingStats, { ttl: 86400 });
    } catch (error) {
      logger.error('Error storing query stats', { error: error instanceof Error ? error.message : JSON.stringify(error) });
    }
  }

  /**
   * Get query performance statistics
   */
  static async getQueryStats(): Promise<{
    totalQueries: number;
    averageExecutionTime: number;
    slowQueries: number;
    topSlowQueries: QueryStats[];
    suggestions: OptimizationSuggestion[];
  }> {
    try {
      const statsListKey = `${this.QUERY_STATS_KEY}:list`;
      const allStats = await cache.get<QueryStats[]>(statsListKey) || [];
      
      const totalQueries = allStats.length;
      const averageExecutionTime = allStats.reduce((sum, stat) => sum + stat.executionTime, 0) / totalQueries;
      const slowQueries = allStats.filter(stat => stat.executionTime > this.SLOW_QUERY_THRESHOLD).length;
      
      const topSlowQueries = allStats
        .filter(stat => stat.executionTime > this.SLOW_QUERY_THRESHOLD)
        .sort((a, b) => b.executionTime - a.executionTime)
        .slice(0, 10);
      
      // Generate overall suggestions
      const suggestions: OptimizationSuggestion[] = [];
      if (slowQueries > totalQueries * 0.1) {
        suggestions.push({
          type: 'index',
          description: 'High number of slow queries detected - consider adding more indexes',
          impact: 'high',
          query: 'Multiple queries',
        });
      }
      
      if (averageExecutionTime > 500) {
        suggestions.push({
          type: 'filter',
          description: 'Average query time is high - consider adding more filters',
          impact: 'medium',
          query: 'Multiple queries',
        });
      }
      
      return {
        totalQueries,
        averageExecutionTime: Math.round(averageExecutionTime),
        slowQueries,
        topSlowQueries,
        suggestions,
      };
    } catch (error) {
      logger.error('Error getting query stats', { error: error instanceof Error ? error.message : JSON.stringify(error) });
      return {
        totalQueries: 0,
        averageExecutionTime: 0,
        slowQueries: 0,
        topSlowQueries: [],
        suggestions: [],
      };
    }
  }

  /**
   * Create recommended indexes
   */
  static async createRecommendedIndexes(): Promise<string[]> {
    try {
      const commonIndexes = [
        'CREATE INDEX IF NOT EXISTS idx_appointments_business_id ON appointments(business_id);',
        'CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_date ON appointments(scheduled_date);',
        'CREATE INDEX IF NOT EXISTS idx_leads_business_id ON leads(business_id);',
        'CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);',
        'CREATE INDEX IF NOT EXISTS idx_users_business_id ON users(business_id);',
        'CREATE INDEX IF NOT EXISTS idx_calls_business_id ON calls(business_id);',
        'CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at);',
        'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);',
        'CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);',
      ];

      const createdIndexes: string[] = [];
      
      for (const indexQuery of commonIndexes) {
        try {
          const { error } = await supabaseAdmin.rpc('execute_sql', { sql: indexQuery });
          if (!error) {
            createdIndexes.push(indexQuery);
            logger.info('Index created successfully', { index: indexQuery });
          } else {
            logger.warn('Failed to create index', { index: indexQuery, error: error instanceof Error ? error.message : JSON.stringify(error) });
          }
        } catch (error) {
          logger.error('Error creating index', { index: indexQuery, error: error instanceof Error ? error.message : JSON.stringify(error) });
        }
      }

      return createdIndexes;
    } catch (error) {
      logger.error('Error creating recommended indexes', { error: error instanceof Error ? error.message : JSON.stringify(error) });
      return [];
    }
  }
}





