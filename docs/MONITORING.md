# CloudGreet Monitoring & Observability Guide

## Overview

This document outlines the comprehensive monitoring and observability strategy for CloudGreet, including health checks, alerting, logging, and performance monitoring.

## Monitoring Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │   Monitoring    │    │   Alerting      │
│   (CloudGreet)  │───►│   Stack         │───►│   System        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Logs          │    │   Metrics       │    │   Notifications │
│   (Structured)  │    │   (Prometheus)  │    │   (Slack/Email) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Health Checks

### System Health Endpoints

#### GET /api/health
**Purpose**: Overall system health status
**Response Time**: < 100ms
**Frequency**: Every 30 seconds

```json
{
  "success": true,
  "data": {
    "overall": "healthy",
    "checks": [
      {
        "name": "database",
        "status": "healthy",
        "message": "Database is healthy. Query time: 45ms",
        "duration": 45,
        "timestamp": "2024-01-15T10:30:00Z"
      },
      {
        "name": "redis",
        "status": "healthy",
        "message": "Redis is healthy. Operation time: 12ms",
        "duration": 12,
        "timestamp": "2024-01-15T10:30:00Z"
      },
      {
        "name": "external_apis",
        "status": "degraded",
        "message": "2/3 external APIs are healthy",
        "duration": 1250,
        "timestamp": "2024-01-15T10:30:00Z"
      }
    ],
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "uptime": 86400000,
    "environment": "production"
  }
}
```

#### GET /api/health/detailed
**Purpose**: Detailed health information for debugging
**Response Time**: < 500ms
**Frequency**: On-demand

### Health Check Components

#### Database Health
- **Connection Test**: Basic connectivity check
- **Query Performance**: Simple SELECT query timing
- **Write Test**: INSERT/DELETE operation test
- **Thresholds**: 
  - Healthy: < 200ms
  - Degraded: 200ms - 1000ms
  - Unhealthy: > 1000ms

#### Redis Health
- **Connection Test**: Basic connectivity check
- **Operation Test**: SET/GET/DELETE operations
- **Memory Usage**: Current memory consumption
- **Thresholds**:
  - Healthy: < 100ms
  - Degraded: 100ms - 500ms
  - Unhealthy: > 500ms

#### External APIs Health
- **Telnyx API**: Voice/SMS service availability
- **Retell AI**: AI agent service availability
- **Google Calendar**: Calendar integration availability
- **Supabase**: Database service availability
- **Thresholds**:
  - Healthy: All APIs responding
  - Degraded: 1-2 APIs failing
  - Unhealthy: 3+ APIs failing

#### System Resources
- **CPU Usage**: Current CPU utilization
- **Memory Usage**: Current memory consumption
- **Disk Space**: Available disk space
- **Thresholds**:
  - Healthy: < 80% usage
  - Degraded: 80% - 90% usage
  - Unhealthy: > 90% usage

## Metrics Collection

### Application Metrics

#### Performance Metrics
```typescript
interface PerformanceMetrics {
  // API Response Times
  api_response_time: {
    endpoint: string;
    method: string;
    duration: number;
    status_code: number;
  };
  
  // Database Query Performance
  db_query_time: {
    query: string;
    duration: number;
    rows_affected: number;
  };
  
  // Cache Performance
  cache_hit_rate: {
    cache_key: string;
    hit: boolean;
    duration: number;
  };
}
```

#### Business Metrics
```typescript
interface BusinessMetrics {
  // Lead Management
  leads_created: number;
  leads_qualified: number;
  leads_converted: number;
  
  // Appointment Management
  appointments_scheduled: number;
  appointments_completed: number;
  appointments_cancelled: number;
  
  // Communication
  calls_made: number;
  sms_sent: number;
  emails_sent: number;
  
  // AI Agent Performance
  agent_conversations: number;
  agent_success_rate: number;
  agent_escalation_rate: number;
}
```

#### System Metrics
```typescript
interface SystemMetrics {
  // Resource Usage
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  
  // Request Volume
  requests_per_second: number;
  concurrent_users: number;
  
  // Error Rates
  error_rate: number;
  timeout_rate: number;
  retry_rate: number;
}
```

### Metrics Collection Strategy

#### High-Frequency Metrics (Every 1 minute)
- API response times
- Database query performance
- Cache hit rates
- System resource usage
- Request volume

#### Medium-Frequency Metrics (Every 5 minutes)
- Business metrics
- Error rates
- External API health
- User activity

#### Low-Frequency Metrics (Every 15 minutes)
- Aggregated performance data
- Trend analysis
- Capacity planning metrics

## Logging Strategy

### Log Levels

#### ERROR
- System failures
- Database connection errors
- External API failures
- Authentication failures
- Critical business logic errors

#### WARN
- Performance degradation
- Deprecated API usage
- Resource usage warnings
- Security events
- Business logic warnings

#### INFO
- User actions
- API requests
- Business events
- System state changes
- Deployment events

#### DEBUG
- Detailed execution flow
- Variable values
- Function entry/exit
- Development debugging

### Structured Logging

#### Log Format
```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "level": "INFO",
  "message": "User created successfully",
  "service": "cloudgreet-api",
  "version": "1.0.0",
  "environment": "production",
  "request_id": "req_123456789",
  "user_id": "user_123",
  "business_id": "business_456",
  "correlation_id": "corr_789",
  "metadata": {
    "endpoint": "/api/users",
    "method": "POST",
    "status_code": 201,
    "duration": 150,
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0..."
  }
}
```

#### Log Categories

##### Authentication Logs
```json
{
  "category": "auth",
  "event": "login_success",
  "user_id": "user_123",
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "session_id": "session_456"
}
```

##### Business Logic Logs
```json
{
  "category": "business",
  "event": "lead_created",
  "lead_id": "lead_789",
  "business_id": "business_456",
  "source": "web",
  "qualification_score": 85
}
```

##### API Logs
```json
{
  "category": "api",
  "endpoint": "/api/leads",
  "method": "POST",
  "status_code": 201,
  "duration": 150,
  "request_size": 1024,
  "response_size": 512
}
```

##### Error Logs
```json
{
  "category": "error",
  "error_type": "ValidationError",
  "error_message": "Invalid email format",
  "stack_trace": "...",
  "context": {
    "field": "email",
    "value": "invalid-email"
  }
}
```

## Alerting System

### Alert Rules

#### Critical Alerts (Immediate Response Required)

##### System Down
- **Condition**: Health check fails for 2 consecutive checks
- **Severity**: Critical
- **Channels**: PagerDuty, Slack, Email, SMS
- **Response Time**: < 5 minutes

##### Database Unavailable
- **Condition**: Database health check fails
- **Severity**: Critical
- **Channels**: PagerDuty, Slack, Email
- **Response Time**: < 5 minutes

##### High Error Rate
- **Condition**: Error rate > 10% for 5 minutes
- **Severity**: Critical
- **Channels**: PagerDuty, Slack
- **Response Time**: < 10 minutes

#### High Priority Alerts (Response Required Within 1 Hour)

##### Performance Degradation
- **Condition**: Average response time > 2 seconds for 10 minutes
- **Severity**: High
- **Channels**: Slack, Email
- **Response Time**: < 1 hour

##### High Memory Usage
- **Condition**: Memory usage > 85% for 15 minutes
- **Severity**: High
- **Channels**: Slack, Email
- **Response Time**: < 1 hour

##### External API Failures
- **Condition**: External API failure rate > 20% for 10 minutes
- **Severity**: High
- **Channels**: Slack, Email
- **Response Time**: < 1 hour

#### Medium Priority Alerts (Response Required Within 4 Hours)

##### Disk Space Warning
- **Condition**: Disk usage > 80%
- **Severity**: Medium
- **Channels**: Slack, Email
- **Response Time**: < 4 hours

##### Unusual Traffic Patterns
- **Condition**: Request volume > 200% of normal for 30 minutes
- **Severity**: Medium
- **Channels**: Slack
- **Response Time**: < 4 hours

##### Cache Miss Rate High
- **Condition**: Cache miss rate > 30% for 20 minutes
- **Severity**: Medium
- **Channels**: Slack
- **Response Time**: < 4 hours

#### Low Priority Alerts (Response Required Within 24 Hours)

##### Deprecated API Usage
- **Condition**: Deprecated API endpoint called > 10 times
- **Severity**: Low
- **Channels**: Email
- **Response Time**: < 24 hours

##### Log Volume Anomaly
- **Condition**: Log volume > 150% of normal for 1 hour
- **Severity**: Low
- **Channels**: Email
- **Response Time**: < 24 hours

### Alert Channels

#### PagerDuty
- **Purpose**: Critical alerts requiring immediate response
- **Integration**: REST API
- **Escalation**: 5 minutes → 15 minutes → 30 minutes
- **On-call Rotation**: Weekly rotation

#### Slack
- **Purpose**: Team notifications and collaboration
- **Channels**: 
  - `#alerts-critical`: Critical alerts
  - `#alerts-high`: High priority alerts
  - `#alerts-medium`: Medium priority alerts
  - `#deployments`: Deployment notifications
  - `#monitoring`: General monitoring updates

#### Email
- **Purpose**: Detailed alert information and reports
- **Recipients**: 
  - Engineering team: All alerts
  - Management: High and critical alerts
  - Support team: Business-related alerts

#### SMS
- **Purpose**: Critical alerts when other channels fail
- **Recipients**: On-call engineers
- **Rate Limiting**: Max 1 SMS per 5 minutes per recipient

### Alert Suppression

#### Maintenance Windows
- **Duration**: 2-4 hours
- **Frequency**: Weekly
- **Suppressed Alerts**: Performance, capacity, and deployment alerts
- **Not Suppressed**: Critical system failures

#### Known Issues
- **Duration**: Until resolved
- **Process**: Manual suppression with expiration
- **Documentation**: Required for all suppressions

## Dashboards

### Executive Dashboard
**Audience**: Management and stakeholders
**Refresh Rate**: 5 minutes
**Key Metrics**:
- System uptime (99.9% target)
- User growth
- Revenue metrics
- Lead conversion rates
- Customer satisfaction scores

### Engineering Dashboard
**Audience**: Development and operations teams
**Refresh Rate**: 1 minute
**Key Metrics**:
- System health status
- Performance metrics
- Error rates
- Resource utilization
- Deployment status

### Business Dashboard
**Audience**: Business and product teams
**Refresh Rate**: 15 minutes
**Key Metrics**:
- Lead generation
- Appointment bookings
- AI agent performance
- Communication metrics
- User engagement

### Operations Dashboard
**Audience**: Support and operations teams
**Refresh Rate**: 1 minute
**Key Metrics**:
- Real-time system status
- Active incidents
- Performance trends
- Capacity utilization
- Security events

## Incident Management

### Incident Severity Levels

#### P1 - Critical
- **Impact**: Complete service outage
- **Response Time**: 5 minutes
- **Resolution Time**: 1 hour
- **Examples**: Database down, authentication failure

#### P2 - High
- **Impact**: Significant service degradation
- **Response Time**: 15 minutes
- **Resolution Time**: 4 hours
- **Examples**: Slow response times, feature unavailability

#### P3 - Medium
- **Impact**: Minor service impact
- **Response Time**: 1 hour
- **Resolution Time**: 24 hours
- **Examples**: Non-critical feature issues

#### P4 - Low
- **Impact**: Minimal impact
- **Response Time**: 4 hours
- **Resolution Time**: 72 hours
- **Examples**: Cosmetic issues, minor bugs

### Incident Response Process

#### 1. Detection
- Automated monitoring detects issue
- Alert sent to on-call engineer
- Incident created in tracking system

#### 2. Assessment
- Engineer assesses severity and impact
- Incident escalated if necessary
- Communication sent to stakeholders

#### 3. Response
- Incident response team assembled
- Root cause analysis initiated
- Mitigation steps implemented

#### 4. Resolution
- Issue resolved and verified
- Service restored to normal operation
- Post-incident review scheduled

#### 5. Follow-up
- Post-incident review conducted
- Action items identified and assigned
- Monitoring and alerting improved

### Incident Communication

#### Internal Communication
- **Slack**: Real-time updates in `#incidents`
- **Email**: Status updates to stakeholders
- **Phone**: Critical incidents only

#### External Communication
- **Status Page**: Public status updates
- **Email**: Customer notifications for P1/P2 incidents
- **Social Media**: Major incidents only

## Performance Monitoring

### Key Performance Indicators (KPIs)

#### Response Time Targets
- **API Endpoints**: < 500ms (95th percentile)
- **Database Queries**: < 200ms (95th percentile)
- **External API Calls**: < 2 seconds (95th percentile)
- **Page Load Time**: < 3 seconds (95th percentile)

#### Availability Targets
- **Overall Uptime**: 99.9%
- **API Availability**: 99.95%
- **Database Availability**: 99.99%
- **External Dependencies**: 99.5%

#### Throughput Targets
- **API Requests**: 1000 requests/second
- **Database Connections**: 100 concurrent connections
- **Cache Operations**: 10000 operations/second
- **File Uploads**: 100 MB/second

### Performance Testing

#### Load Testing
- **Frequency**: Weekly
- **Duration**: 30 minutes
- **Load**: 2x normal traffic
- **Tools**: k6, Artillery

#### Stress Testing
- **Frequency**: Monthly
- **Duration**: 1 hour
- **Load**: 5x normal traffic
- **Tools**: k6, Artillery

#### Capacity Testing
- **Frequency**: Quarterly
- **Duration**: 2 hours
- **Load**: 10x normal traffic
- **Tools**: k6, Artillery

## Security Monitoring

### Security Events

#### Authentication Events
- Failed login attempts
- Account lockouts
- Password changes
- Token generation/revocation

#### Authorization Events
- Permission denied events
- Privilege escalation attempts
- Unauthorized access attempts

#### Data Access Events
- Sensitive data access
- Data export/import
- Database queries
- File downloads

#### System Events
- Configuration changes
- Service restarts
- Network connections
- Process executions

### Security Alerts

#### Critical Security Alerts
- Multiple failed login attempts
- Unauthorized access attempts
- Data breach indicators
- Malicious activity detection

#### High Priority Security Alerts
- Unusual access patterns
- Privilege escalation attempts
- Configuration changes
- Network anomalies

#### Medium Priority Security Alerts
- Password policy violations
- Session anomalies
- API abuse
- Resource consumption spikes

## Compliance Monitoring

### GDPR Compliance
- Data processing activities
- Consent management
- Data retention compliance
- Right to be forgotten requests

### SOC 2 Compliance
- Access controls
- Data encryption
- Audit logging
- Incident response

### PCI DSS Compliance
- Payment data handling
- Encryption requirements
- Access restrictions
- Audit trails

## Synthetic Monitors

The GitHub Actions workflow `.github/workflows/synthetic-monitors.yml` runs hourly and can be triggered manually. It now executes three checks:

1. **Registration / login / dashboard health** — `scripts/monitor-registration.js`  
   - Secret requirements: `SYNTHETIC_MONITOR_BASE_URL`
2. **Outreach runner health** — `scripts/monitor-outreach.js`  
   - Secret requirements: `OUTREACH_RUNNER_URL`, `CRON_SECRET`
3. **Sales workspace authentication** — `scripts/monitor-sales-dashboard.js`  
   - Secret requirements: `SYNTHETIC_MONITOR_BASE_URL`, `MONITOR_EMPLOYEE_EMAIL`, `MONITOR_EMPLOYEE_PASSWORD`

### Alert routing
1. Enable the workflow and set all required secrets once production is live.
2. Configure GitHub → Settings → Webhooks (or use the Slack GitHub app) to forward failed workflow notifications to the on-call Slack channel (#cloudgreet-alerts recommended).
3. Follow the relevant runbook sections (`Synthetic monitor failures`, `Outreach runner monitor failing`, `Sales workspace monitor failing`) when an alert fires.
4. Escalate via PagerDuty if the same monitor fails twice consecutively (two hours).

## Monitoring Tools and Integrations

### Primary Tools
- **Health Checks**: Custom implementation
- **Metrics**: Prometheus + Grafana
- **Logs**: Winston + ELK Stack
- **Alerting**: PagerDuty + Slack
- **APM**: New Relic / DataDog

### Secondary Tools
- **Uptime Monitoring**: Pingdom
- **Error Tracking**: Sentry
- **Performance**: WebPageTest
- **Security**: Snyk, OWASP ZAP

### Integrations
- **Slack**: Real-time notifications
- **Email**: Detailed reports
- **SMS**: Critical alerts
- **PagerDuty**: Incident management
- **Jira**: Issue tracking

## Best Practices

### Monitoring Best Practices
1. **Monitor the Right Things**: Focus on business-critical metrics
2. **Set Appropriate Thresholds**: Avoid alert fatigue
3. **Use Multiple Channels**: Redundancy for critical alerts
4. **Regular Review**: Update thresholds and rules
5. **Document Everything**: Clear runbooks and procedures

### Alerting Best Practices
1. **Clear and Actionable**: Alerts should indicate what to do
2. **Proper Escalation**: Escalate when necessary
3. **Avoid Noise**: Suppress non-actionable alerts
4. **Test Regularly**: Verify alert delivery
5. **Learn from Incidents**: Improve based on experience

### Logging Best Practices
1. **Structured Logging**: Use consistent format
2. **Appropriate Levels**: Use correct log levels
3. **Include Context**: Add relevant metadata
4. **Avoid Sensitive Data**: Never log passwords or tokens
5. **Performance Impact**: Minimize logging overhead

This monitoring and observability strategy ensures CloudGreet maintains high availability, performance, and security while providing the necessary visibility for effective operations and incident response.











