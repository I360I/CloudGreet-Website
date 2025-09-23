# CloudGreet Rollback and Incident Response Runbook

## 🚨 Emergency Rollback Procedures

### Critical Incident Response (0-15 minutes)

#### 1. Immediate Assessment
```bash
# Check system status
curl -f https://cloudgreet.com/api/health || echo "Service down"

# Check error rates
curl -s https://cloudgreet.com/api/health | jq '.error_rate'

# Check database connectivity
curl -s https://cloudgreet.com/api/health | jq '.database'
```

#### 2. Emergency Rollback (Vercel)
```bash
# Rollback to previous deployment
vercel rollback

# Or rollback to specific deployment
vercel rollback <deployment-url>

# Check rollback status
vercel ls
```

#### 3. Database Rollback (if needed)
```sql
-- Emergency database rollback
-- WARNING: Only use if database changes caused issues

-- Rollback to previous schema
-- (Execute COMPLETE_DATABASE_OVERHAUL.sql from backup)

-- Check database health
SELECT 
  schemaname,
  tablename,
  hasrules,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public';
```

### Incident Classification

#### P0 - Critical (Service Down)
- **Response Time**: 0-15 minutes
- **Escalation**: Immediate
- **Actions**:
  1. Rollback to last known good deployment
  2. Notify all stakeholders
  3. Activate incident response team
  4. Begin root cause analysis

#### P1 - High (Major Feature Broken)
- **Response Time**: 15-30 minutes
- **Escalation**: Within 1 hour
- **Actions**:
  1. Assess impact and scope
  2. Implement hotfix if possible
  3. Rollback if necessary
  4. Notify affected users

#### P2 - Medium (Minor Feature Issues)
- **Response Time**: 30-60 minutes
- **Escalation**: Within 4 hours
- **Actions**:
  1. Document issue
  2. Plan fix for next release
  3. Monitor for escalation
  4. Update status page

#### P3 - Low (Cosmetic Issues)
- **Response Time**: 1-4 hours
- **Escalation**: Next business day
- **Actions**:
  1. Log issue
  2. Plan fix for next release
  3. No immediate action required

## 🔄 Rollback Procedures

### 1. Application Rollback

#### Vercel Rollback
```bash
# List recent deployments
vercel ls

# Rollback to previous deployment
vercel rollback

# Rollback to specific deployment
vercel rollback <deployment-url>

# Verify rollback
curl -f https://cloudgreet.com/api/health
```

#### Environment Variable Rollback
```bash
# Check current environment variables
vercel env ls

# Rollback environment variables
vercel env pull .env.local

# Update environment variables
vercel env add VARIABLE_NAME
```

### 2. Database Rollback

#### Schema Rollback
```sql
-- Emergency schema rollback
-- Execute from backup COMPLETE_DATABASE_OVERHAUL.sql

-- Check current schema
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

#### Data Rollback
```sql
-- Data rollback (if needed)
-- WARNING: This will lose recent data

-- Backup current data
CREATE TABLE backup_users AS SELECT * FROM users;
CREATE TABLE backup_businesses AS SELECT * FROM businesses;

-- Restore from backup
-- (Execute data restoration scripts)
```

### 3. Configuration Rollback

#### Vercel Configuration
```bash
# Check current configuration
cat vercel.json

# Rollback configuration
git checkout HEAD~1 vercel.json

# Deploy configuration changes
vercel --prod
```

#### Next.js Configuration
```bash
# Check current configuration
cat next.config.js

# Rollback configuration
git checkout HEAD~1 next.config.js

# Restart application
vercel --prod
```

## 🚨 Incident Response Procedures

### 1. Detection and Alerting

#### Automated Monitoring
```typescript
// Health check endpoint
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(),
      external_apis: await checkExternalAPIs(),
      performance: await checkPerformance()
    }
  }
  
  if (health.checks.database === false) {
    // Trigger alert
    await sendAlert('Database connectivity issue')
  }
  
  return NextResponse.json(health)
}
```

#### Manual Monitoring
```bash
# Check application health
curl -f https://cloudgreet.com/api/health

# Check database connectivity
curl -s https://cloudgreet.com/api/health | jq '.checks.database'

# Check external services
curl -s https://cloudgreet.com/api/health | jq '.checks.external_apis'
```

### 2. Communication Procedures

#### Internal Communication
```bash
# Slack notification
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"🚨 CRITICAL: CloudGreet service down"}' \
  https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Email notification
echo "Critical incident detected" | mail -s "CloudGreet Alert" team@cloudgreet.com
```

#### External Communication
```bash
# Status page update
curl -X POST https://status.cloudgreet.com/api/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Service Outage",
    "status": "investigating",
    "message": "We are investigating reports of service issues"
  }'
```

### 3. Root Cause Analysis

#### Log Analysis
```bash
# Check application logs
vercel logs

# Check database logs
# (Access Supabase dashboard)

# Check external service logs
# (Check Telnyx, Stripe, OpenAI dashboards)
```

#### Performance Analysis
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://cloudgreet.com/api/health

# Check error rates
curl -s https://cloudgreet.com/api/health | jq '.error_rate'

# Check database performance
curl -s https://cloudgreet.com/api/health | jq '.checks.database'
```

## 🔧 Troubleshooting Procedures

### 1. Common Issues

#### Database Connection Issues
```bash
# Check database connectivity
curl -s https://cloudgreet.com/api/health | jq '.checks.database'

# If database is down:
# 1. Check Supabase status
# 2. Verify environment variables
# 3. Check connection limits
# 4. Restart database connections
```

#### API Response Issues
```bash
# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s https://cloudgreet.com/api/health

# If slow responses:
# 1. Check database queries
# 2. Check external API calls
# 3. Check server resources
# 4. Implement caching
```

#### Authentication Issues
```bash
# Check authentication endpoint
curl -X POST https://cloudgreet.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass"}'

# If authentication fails:
# 1. Check JWT secret
# 2. Check database connectivity
# 3. Check user records
# 4. Check password hashing
```

### 2. External Service Issues

#### Stripe Issues
```bash
# Check Stripe connectivity
curl -s https://cloudgreet.com/api/health | jq '.checks.external_apis.stripe'

# If Stripe is down:
# 1. Check Stripe status page
# 2. Verify API keys
# 3. Check webhook endpoints
# 4. Implement fallback
```

#### Telnyx Issues
```bash
# Check Telnyx connectivity
curl -s https://cloudgreet.com/api/health | jq '.checks.external_apis.telnyx'

# If Telnyx is down:
# 1. Check Telnyx status page
# 2. Verify API keys
# 3. Check webhook endpoints
# 4. Implement fallback
```

#### OpenAI Issues
```bash
# Check OpenAI connectivity
curl -s https://cloudgreet.com/api/health | jq '.checks.external_apis.openai'

# If OpenAI is down:
# 1. Check OpenAI status page
# 2. Verify API keys
# 3. Check rate limits
# 4. Implement fallback
```

## 📋 Incident Response Checklist

### Pre-Incident Preparation
- [ ] Monitoring systems configured
- [ ] Alerting systems tested
- [ ] Rollback procedures documented
- [ ] Communication channels established
- [ ] Team contacts updated
- [ ] Status page configured
- [ ] Backup procedures tested
- [ ] Recovery procedures documented

### During Incident
- [ ] Incident detected and classified
- [ ] Response team activated
- [ ] Impact assessment completed
- [ ] Communication sent to stakeholders
- [ ] Rollback executed if necessary
- [ ] Root cause analysis begun
- [ ] Status page updated
- [ ] External services checked
- [ ] Database health verified
- [ ] Performance metrics monitored

### Post-Incident
- [ ] Incident resolved
- [ ] Root cause identified
- [ ] Fix implemented
- [ ] Monitoring improved
- [ ] Documentation updated
- [ ] Team debrief conducted
- [ ] Lessons learned documented
- [ ] Prevention measures implemented
- [ ] Status page updated
- [ ] Stakeholders notified

## 🚀 Recovery Procedures

### 1. Service Recovery

#### Application Recovery
```bash
# Verify service is running
curl -f https://cloudgreet.com/api/health

# Check all endpoints
curl -f https://cloudgreet.com/api/auth/login
curl -f https://cloudgreet.com/api/dashboard/data
curl -f https://cloudgreet.com/api/contact/submit
```

#### Database Recovery
```sql
-- Verify database connectivity
SELECT 1;

-- Check critical tables
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM businesses;
SELECT COUNT(*) FROM call_logs;
```

#### External Service Recovery
```bash
# Test Stripe integration
curl -X POST https://cloudgreet.com/api/stripe/test-customer \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'

# Test Telnyx integration
curl -X POST https://cloudgreet.com/api/telnyx/test-connection

# Test OpenAI integration
curl -X POST https://cloudgreet.com/api/ai/test
```

### 2. Data Recovery

#### Database Backup
```sql
-- Create backup
CREATE TABLE backup_users AS SELECT * FROM users;
CREATE TABLE backup_businesses AS SELECT * FROM businesses;
CREATE TABLE backup_call_logs AS SELECT * FROM call_logs;
```

#### Data Restoration
```sql
-- Restore from backup
INSERT INTO users SELECT * FROM backup_users;
INSERT INTO businesses SELECT * FROM backup_businesses;
INSERT INTO call_logs SELECT * FROM backup_call_logs;
```

### 3. Performance Recovery

#### Cache Clearing
```bash
# Clear Vercel cache
vercel --prod

# Clear CDN cache
# (Access Vercel dashboard)

# Clear application cache
# (Restart application)
```

#### Database Optimization
```sql
-- Analyze database performance
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';

-- Reindex if necessary
REINDEX DATABASE cloudgreet;
```

## 📞 Emergency Contacts

### Internal Team
- **On-Call Engineer**: +1-800-ONCALL
- **Technical Lead**: +1-800-TECH-LEAD
- **DevOps Team**: +1-800-DEVOPS
- **Database Team**: +1-800-DATABASE

### External Services
- **Vercel Support**: support@vercel.com
- **Supabase Support**: support@supabase.com
- **Stripe Support**: support@stripe.com
- **Telnyx Support**: support@telnyx.com
- **OpenAI Support**: support@openai.com

### Escalation Procedures
1. **Level 1**: On-call engineer (0-15 minutes)
2. **Level 2**: Technical lead (15-30 minutes)
3. **Level 3**: CTO (30-60 minutes)
4. **Level 4**: CEO (60+ minutes)

## 📊 Incident Metrics

### Response Time Targets
- **P0 Incidents**: <15 minutes
- **P1 Incidents**: <30 minutes
- **P2 Incidents**: <60 minutes
- **P3 Incidents**: <4 hours

### Recovery Time Targets
- **P0 Incidents**: <1 hour
- **P1 Incidents**: <4 hours
- **P2 Incidents**: <24 hours
- **P3 Incidents**: <72 hours

### Post-Incident Review
- **Incident duration**
- **Root cause analysis**
- **Prevention measures**
- **Process improvements**
- **Team training needs**
- **Tool improvements**
- **Documentation updates**
