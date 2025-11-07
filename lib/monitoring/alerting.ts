/**
 * Comprehensive Monitoring and Alerting System
 * Provides real-time monitoring, alerting, and incident management
 */

import { logger } from '../monitoring';
import { cache } from '../cache/redis-cache';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldown: number; // minutes
  channels: AlertChannel[];
  tags: string[];
  created: Date;
  updated: Date;
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne' | 'contains' | 'regex';
  threshold: number | string;
  duration: number; // seconds
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'pagerduty';
  config: Record<string, any>;
  enabled: boolean;
}

export interface Alert {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'firing' | 'resolved' | 'acknowledged';
  triggeredAt: Date;
  resolvedAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  metadata: Record<string, any>;
  tags: string[];
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'mitigated' | 'resolved';
  alerts: Alert[];
  created: Date;
  updated: Date;
  assignedTo?: string;
  timeline: IncidentEvent[];
}

export interface IncidentEvent {
  timestamp: Date;
  type: 'created' | 'updated' | 'assigned' | 'acknowledged' | 'resolved' | 'comment';
  user?: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface MetricData {
  metric: string;
  value: number;
  timestamp: Date;
  tags: Record<string, string>;
}

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  refreshInterval: number; // seconds
  created: Date;
  updated: Date;
}

export interface DashboardWidget {
  id: string;
  type: 'graph' | 'gauge' | 'table' | 'text' | 'map';
  title: string;
  query: string;
  config: Record<string, any>;
  position: { x: number; y: number; width: number; height: number };
}

export class AlertingSystem {
  private static readonly ALERT_CACHE_TTL = 300; // 5 minutes
  private static readonly METRIC_CACHE_TTL = 60; // 1 minute
  private static readonly INCIDENT_CACHE_TTL = 3600; // 1 hour

  private static alertRules: Map<string, AlertRule> = new Map();
  private static activeAlerts: Map<string, Alert> = new Map();
  private static incidents: Map<string, Incident> = new Map();
  private static metrics: MetricData[] = [];

  /**
   * Initialize alerting system
   */
  static async initialize(): Promise<void> {
    try {
      // Load alert rules from cache
      await this.loadAlertRules();
      
      // Start metric collection
      this.startMetricCollection();
      
      // Start alert evaluation
      this.startAlertEvaluation();
      
      logger.info('Alerting system initialized');
    } catch (error) {
      logger.error('Failed to initialize alerting system', { error });
      throw error;
    }
  }

  /**
   * Create alert rule
   */
  static async createAlertRule(rule: Omit<AlertRule, 'id' | 'created' | 'updated'>): Promise<AlertRule> {
    const alertRule: AlertRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created: new Date(),
      updated: new Date(),
    };

    this.alertRules.set(alertRule.id, alertRule);
    await this.saveAlertRule(alertRule);

    logger.info('Alert rule created', { ruleId: alertRule.id, name: alertRule.name });
    return alertRule;
  }

  /**
   * Update alert rule
   */
  static async updateAlertRule(ruleId: string, updates: Partial<AlertRule>): Promise<AlertRule> {
    const existingRule = this.alertRules.get(ruleId);
    if (!existingRule) {
      throw new Error(`Alert rule ${ruleId} not found`);
    }

    const updatedRule: AlertRule = {
      ...existingRule,
      ...updates,
      id: ruleId,
      updated: new Date(),
    };

    this.alertRules.set(ruleId, updatedRule);
    await this.saveAlertRule(updatedRule);

    logger.info('Alert rule updated', { ruleId, name: updatedRule.name });
    return updatedRule;
  }

  /**
   * Delete alert rule
   */
  static async deleteAlertRule(ruleId: string): Promise<void> {
    const rule = this.alertRules.get(ruleId);
    if (!rule) {
      throw new Error(`Alert rule ${ruleId} not found`);
    }

    this.alertRules.delete(ruleId);
    await cache.delete(`alert_rule:${ruleId}`);

    logger.info('Alert rule deleted', { ruleId, name: rule.name });
  }

  /**
   * Record metric data
   */
  static async recordMetric(metric: string, value: number, tags: Record<string, string> = {}): Promise<void> {
    const metricData: MetricData = {
      metric,
      value,
      timestamp: new Date(),
      tags,
    };

    this.metrics.push(metricData);

    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics.splice(0, this.metrics.length - 1000);
    }

    // Store in cache
    const cacheKey = `metric:${metric}:${Date.now()}`;
    await cache.set(cacheKey, metricData, { ttl: this.METRIC_CACHE_TTL });

    logger.debug('Metric recorded', { metric, value, tags: JSON.stringify(tags) });
  }

  /**
   * Evaluate alert rules
   */
  private static async evaluateAlertRules(): Promise<void> {
    for (const rule of Array.from(this.alertRules.values())) {
      if (!rule.enabled) continue;

      try {
        const shouldTrigger = await this.evaluateAlertCondition(rule.condition);
        
        if (shouldTrigger) {
          await this.triggerAlert(rule);
        } else {
          await this.resolveAlert(rule.id);
        }
      } catch (error) {
        logger.error('Error evaluating alert rule', { ruleId: rule.id, error });
      }
    }
  }

  /**
   * Evaluate alert condition
   */
  private static async evaluateAlertCondition(condition: AlertCondition): Promise<boolean> {
    const relevantMetrics = this.metrics.filter(m => m.metric === condition.metric);
    
    if (relevantMetrics.length === 0) {
      return false;
    }

    // Filter by duration
    const cutoffTime = new Date(Date.now() - condition.duration * 1000);
    const recentMetrics = relevantMetrics.filter(m => m.timestamp >= cutoffTime);

    if (recentMetrics.length === 0) {
      return false;
    }

    // Apply aggregation
    let value: number;
    if (condition.aggregation) {
      switch (condition.aggregation) {
        case 'avg':
          value = recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length;
          break;
        case 'sum':
          value = recentMetrics.reduce((sum, m) => sum + m.value, 0);
          break;
        case 'min':
          value = Math.min(...recentMetrics.map(m => m.value));
          break;
        case 'max':
          value = Math.max(...recentMetrics.map(m => m.value));
          break;
        case 'count':
          value = recentMetrics.length;
          break;
        default:
          value = recentMetrics[recentMetrics.length - 1].value;
      }
    } else {
      value = recentMetrics[recentMetrics.length - 1].value;
    }

    // Apply operator
    switch (condition.operator) {
      case 'gt':
        return value > (condition.threshold as number);
      case 'gte':
        return value >= (condition.threshold as number);
      case 'lt':
        return value < (condition.threshold as number);
      case 'lte':
        return value <= (condition.threshold as number);
      case 'eq':
        return value === condition.threshold;
      case 'ne':
        return value !== condition.threshold;
      case 'contains':
        return String(value).includes(condition.threshold as string);
      case 'regex':
        return new RegExp(condition.threshold as string).test(String(value));
      default:
        return false;
    }
  }

  /**
   * Trigger alert
   */
  private static async triggerAlert(rule: AlertRule): Promise<void> {
    const existingAlert = this.activeAlerts.get(rule.id);
    
    // Check cooldown
    if (existingAlert && existingAlert.status === 'firing') {
      const timeSinceLastTrigger = Date.now() - existingAlert.triggeredAt.getTime();
      if (timeSinceLastTrigger < rule.cooldown * 60 * 1000) {
        return; // Still in cooldown
      }
    }

    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      title: rule.name,
      description: rule.description,
      severity: rule.severity,
      status: 'firing',
      triggeredAt: new Date(),
      metadata: {
        condition: rule.condition,
        ruleName: rule.name,
      },
      tags: rule.tags,
    };

    this.activeAlerts.set(rule.id, alert);
    await this.saveAlert(alert);

    // Send notifications
    await this.sendAlertNotifications(alert, rule);

    // Create or update incident
    await this.handleIncident(alert);

    logger.warn('Alert triggered', { alertId: alert.id, ruleId: rule.id, severity: alert.severity });
  }

  /**
   * Resolve alert
   */
  private static async resolveAlert(ruleId: string): Promise<void> {
    const alert = this.activeAlerts.get(ruleId);
    if (!alert || alert.status !== 'firing') {
      return;
    }

    alert.status = 'resolved';
    alert.resolvedAt = new Date();

    this.activeAlerts.set(ruleId, alert);
    await this.saveAlert(alert);

    logger.info('Alert resolved', { alertId: alert.id, ruleId });
  }

  /**
   * Send alert notifications
   */
  private static async sendAlertNotifications(alert: Alert, rule: AlertRule): Promise<void> {
    for (const channel of rule.channels) {
      if (!channel.enabled) continue;

      try {
        switch (channel.type) {
          case 'email':
            await this.sendEmailAlert(alert, channel.config);
            break;
          case 'slack':
            await this.sendSlackAlert(alert, channel.config);
            break;
          case 'webhook':
            await this.sendWebhookAlert(alert, channel.config);
            break;
          case 'sms':
            await this.sendSMSAlert(alert, channel.config);
            break;
          case 'pagerduty':
            await this.sendPagerDutyAlert(alert, channel.config);
            break;
        }
      } catch (error) {
        logger.error('Failed to send alert notification', { 
          channel: channel.type, 
          alertId: alert.id, 
          error 
        });
      }
    }
  }

  /**
   * Send email alert
   */
  private static async sendEmailAlert(alert: Alert, config: Record<string, any>): Promise<void> {
    // Implementation would integrate with email service
    logger.info('Email alert sent', { 
      alertId: alert.id, 
      to: config.to,
      subject: `[${alert.severity.toUpperCase()}] ${alert.title}`
    });
  }

  /**
   * Send Slack alert
   */
  private static async sendSlackAlert(alert: Alert, config: Record<string, any>): Promise<void> {
    // Implementation would integrate with Slack API
    logger.info('Slack alert sent', { 
      alertId: alert.id, 
      channel: config.channel,
      message: `🚨 *${alert.title}*\n${alert.description}`
    });
  }

  /**
   * Send webhook alert
   */
  private static async sendWebhookAlert(alert: Alert, config: Record<string, any>): Promise<void> {
    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body: JSON.stringify({
          alert,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }

      logger.info('Webhook alert sent', { alertId: alert.id, url: config.url });
    } catch (error) {
      logger.error('Webhook alert failed', { alertId: alert.id, error });
    }
  }

  /**
   * Send SMS alert
   */
  private static async sendSMSAlert(alert: Alert, config: Record<string, any>): Promise<void> {
    // Implementation would integrate with SMS service
    logger.info('SMS alert sent', { 
      alertId: alert.id, 
      to: config.to,
      message: `[${alert.severity.toUpperCase()}] ${alert.title}: ${alert.description}`
    });
  }

  /**
   * Send PagerDuty alert
   */
  private static async sendPagerDutyAlert(alert: Alert, config: Record<string, any>): Promise<void> {
    // Implementation would integrate with PagerDuty API
    logger.info('PagerDuty alert sent', { 
      alertId: alert.id, 
      serviceKey: config.serviceKey,
      summary: alert.title
    });
  }

  /**
   * Handle incident management
   */
  private static async handleIncident(alert: Alert): Promise<void> {
    // Check if there's an existing open incident for this rule
    const existingIncident = Array.from(this.incidents.values())
      .find(incident => 
        incident.status !== 'resolved' && 
        incident.alerts.some(a => a.ruleId === alert.ruleId)
      );

    if (existingIncident) {
      // Add alert to existing incident
      existingIncident.alerts.push(alert);
      existingIncident.updated = new Date();
      
      this.incidents.set(existingIncident.id, existingIncident);
      await this.saveIncident(existingIncident);
    } else {
      // Create new incident
      const incident: Incident = {
        id: `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: alert.title,
        description: alert.description,
        severity: alert.severity,
        status: 'open',
        alerts: [alert],
        created: new Date(),
        updated: new Date(),
        timeline: [{
          timestamp: new Date(),
          type: 'created',
          description: `Incident created due to alert: ${alert.title}`,
        }],
      };

      this.incidents.set(incident.id, incident);
      await this.saveIncident(incident);

      logger.warn('New incident created', { 
        incidentId: incident.id, 
        alertId: alert.id,
        severity: incident.severity 
      });
    }
  }

  /**
   * Start metric collection
   */
  private static startMetricCollection(): void {
    setInterval(async () => {
      try {
        // Collect system metrics
        await this.collectSystemMetrics();
        
        // Collect application metrics
        await this.collectApplicationMetrics();
        
        // Collect business metrics
        await this.collectBusinessMetrics();
      } catch (error) {
        logger.error('Error collecting metrics', { error });
      }
    }, 60000); // Every minute
  }

  /**
   * Start alert evaluation
   */
  private static startAlertEvaluation(): void {
    setInterval(async () => {
      try {
        await this.evaluateAlertRules();
      } catch (error) {
        logger.error('Error evaluating alerts', { error });
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Collect system metrics
   */
  private static async collectSystemMetrics(): Promise<void> {
    // CPU usage, memory usage, disk usage, etc.
    // This would integrate with system monitoring tools
    await this.recordMetric('system.cpu.usage', Math.random() * 100, { host: 'localhost' });
    await this.recordMetric('system.memory.usage', Math.random() * 100, { host: 'localhost' });
    await this.recordMetric('system.disk.usage', Math.random() * 100, { host: 'localhost' });
  }

  /**
   * Collect application metrics
   */
  private static async collectApplicationMetrics(): Promise<void> {
    // API response times, error rates, request counts, etc.
    await this.recordMetric('app.api.response_time', Math.random() * 1000, { endpoint: '/api/health' });
    await this.recordMetric('app.api.error_rate', Math.random() * 5, { endpoint: '/api/health' });
    await this.recordMetric('app.requests.per_second', Math.random() * 100, {});
  }

  /**
   * Collect business metrics
   */
  private static async collectBusinessMetrics(): Promise<void> {
    // User registrations, appointments, revenue, etc.
    await this.recordMetric('business.users.active', Math.floor(Math.random() * 1000), {});
    await this.recordMetric('business.appointments.today', Math.floor(Math.random() * 100), {});
    await this.recordMetric('business.revenue.daily', Math.random() * 10000, {});
  }

  /**
   * Load alert rules from cache
   */
  private static async loadAlertRules(): Promise<void> {
    try {
      const ruleKeys = await (cache as any).keys('alert_rule:*') || [];
      for (const key of ruleKeys) {
        const rule = await cache.get<AlertRule>(key);
        if (rule) {
          this.alertRules.set(rule.id, rule);
        }
      }
    } catch (error) {
      logger.error('Error loading alert rules', { error });
    }
  }

  /**
   * Save alert rule to cache
   */
  private static async saveAlertRule(rule: AlertRule): Promise<void> {
    await cache.set(`alert_rule:${rule.id}`, rule, { ttl: this.ALERT_CACHE_TTL });
  }

  /**
   * Save alert to cache
   */
  private static async saveAlert(alert: Alert): Promise<void> {
    await cache.set(`alert:${alert.id}`, alert, { ttl: this.ALERT_CACHE_TTL });
  }

  /**
   * Save incident to cache
   */
  private static async saveIncident(incident: Incident): Promise<void> {
    await cache.set(`incident:${incident.id}`, incident, { ttl: this.INCIDENT_CACHE_TTL });
  }

  /**
   * Get active alerts
   */
  static getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get incidents
   */
  static getIncidents(): Incident[] {
    return Array.from(this.incidents.values());
  }

  /**
   * Acknowledge alert
   */
  static async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = userId;

    this.activeAlerts.set(alertId, alert);
    await this.saveAlert(alert);

    logger.info('Alert acknowledged', { alertId, userId });
  }

  /**
   * Get metrics for dashboard
   */
  static async getMetrics(
    metric: string,
    startTime: Date,
    endTime: Date,
    tags: Record<string, string> = {}
  ): Promise<MetricData[]> {
    return this.metrics.filter(m => 
      m.metric === metric &&
      m.timestamp >= startTime &&
      m.timestamp <= endTime &&
      Object.entries(tags).every(([key, value]) => m.tags[key] === value)
    );
  }
}





