# CloudGreet Runbooks

## Incident Response Procedures

### On-Call Rotation
- Primary: [Your Name]
- Secondary: [Backup Name]
- Escalation: founders@cloudgreet.com

### Severity Levels

**P0 - Critical (Immediate Response)**
- Site down
- Payment processing broken
- Data loss
- Security breach

**P1 - High (Response within 1 hour)**
- Major feature broken
- High error rate (>10%)
- Performance degradation

**P2 - Medium (Response within 4 hours)**
- Minor feature broken
- Moderate error rate (5-10%)
- User-reported bugs

**P3 - Low (Response within 24 hours)**
- Cosmetic issues
- Low error rate (<5%)
- Enhancement requests

---

## Common Incidents

### Site Down (P0)

**Symptoms:**
- All pages return 500/503
- Health check fails
- Vercel dashboard shows errors

**Diagnosis:**
1. Check Vercel dashboard for deployment status
2. Check function logs for errors
3. Verify environment variables are set
4. Check database connectivity

**Resolution:**
1. **Rollback Deployment**
   ```bash
   # In Vercel dashboard:
   # Deployments > Find last working > Promote to Production
   ```

2. **Check Environment Variables**
   - Verify all required vars are set
   - Check for typos in variable names
   - Verify secrets are correct

3. **Check Database**
   ```sql
   -- Test connection
   SELECT 1;
   
   -- Check for locks
   SELECT * FROM pg_locks WHERE NOT granted;
   ```

4. **Restart Functions**
   - Redeploy in Vercel
   - Or wait for automatic restart

**Prevention:**
- Test deployments in preview environment first
- Use feature flags for risky changes
- Monitor error rates

---

### High Error Rate (P1)

**Symptoms:**
- Error rate > 10%
- Multiple users reporting issues
- Sentry alerts firing

**Diagnosis:**
1. Check Sentry for error patterns
2. Review Vercel function logs
3. Check database performance
4. Verify external API status

**Resolution:**
1. **Identify Root Cause**
   ```bash
   # Check recent errors in Sentry
   # Review error stack traces
   # Check for common patterns
   ```

2. **Quick Fixes**
   - Rollback if recent deployment
   - Disable feature flag if new feature
   - Increase rate limits if rate limiting issue

3. **Database Issues**
   ```sql
   -- Check for slow queries
   SELECT * FROM pg_stat_statements 
   ORDER BY mean_exec_time DESC 
   LIMIT 10;
   
   -- Check connection count
   SELECT count(*) FROM pg_stat_activity;
   ```

4. **External API Issues**
   - Check Stripe status: https://status.stripe.com
   - Check Retell status: Check Retell dashboard
   - Check Telnyx status: Check Telnyx dashboard
   - Implement fallbacks if available

**Prevention:**
- Monitor error rates with alerts
- Set up health checks
- Test external API failures

---

### Payment Processing Broken (P0)

**Symptoms:**
- Stripe checkout not working
- Webhooks not processing
- Subscriptions not activating

**Diagnosis:**
1. Check Stripe dashboard for errors
2. Verify webhook endpoint is accessible
3. Check webhook logs in Stripe
4. Verify `STRIPE_SECRET_KEY` is set

**Resolution:**
1. **Verify Webhook Configuration**
   - Check webhook URL in Stripe dashboard
   - Verify signature verification is working
   - Test webhook manually

2. **Check Webhook Processing**
   ```bash
   # Check Vercel logs for webhook errors
   # Verify webhook secret matches
   ```

3. **Manual Fixes**
   - Manually activate subscriptions if needed
   - Retry failed webhooks in Stripe dashboard
   - Process pending payments manually

**Prevention:**
- Monitor webhook success rate
- Set up alerts for failed payments
- Test webhook processing regularly

---

### Database Performance Issues (P1)

**Symptoms:**
- Slow API responses (>2s)
- Timeout errors
- High database CPU usage

**Diagnosis:**
```sql
-- Check for slow queries
SELECT 
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Check for locks
SELECT 
  pid,
  usename,
  application_name,
  state,
  query
FROM pg_stat_activity
WHERE state != 'idle';
```

**Resolution:**
1. **Kill Long-Running Queries**
   ```sql
   -- Find problematic queries
   SELECT pid, query, state, now() - query_start as duration
   FROM pg_stat_activity
   WHERE state != 'idle'
   ORDER BY duration DESC;
   
   -- Kill if necessary (be careful!)
   SELECT pg_terminate_backend(pid);
   ```

2. **Add Indexes**
   ```sql
   -- Identify missing indexes
   -- Add indexes for frequently queried columns
   CREATE INDEX CONCURRENTLY idx_table_column ON table(column);
   ```

3. **Optimize Queries**
   - Review slow query logs
   - Rewrite inefficient queries
   - Use query optimization functions

**Prevention:**
- Monitor query performance
- Set up slow query alerts
- Regular database maintenance

---

### Rate Limiting Issues (P2)

**Symptoms:**
- Legitimate users getting rate limited
- Rate limits not working (no Redis)

**Diagnosis:**
1. Check if Redis is configured
2. Verify rate limit logic
3. Check rate limit logs

**Resolution:**
1. **Enable Redis**
   - Set up Upstash Redis
   - Add `REDIS_REST_URL` and `REDIS_REST_TOKEN`
   - Update code to use Redis rate limiting

2. **Adjust Rate Limits**
   - Increase limits if too restrictive
   - Decrease limits if abuse detected

3. **Whitelist IPs** (if needed)
   - Add IP whitelist to rate limiting logic

**Prevention:**
- Use Redis for production
- Monitor rate limit metrics
- Set appropriate limits

---

### Calendar Sync Issues (P2)

**Symptoms:**
- Appointments not syncing to Google Calendar
- Calendar connection failing
- Token refresh errors

**Diagnosis:**
1. Check calendar connection status
2. Verify Google OAuth tokens
3. Check token expiration
4. Review calendar sync logs

**Resolution:**
1. **Reconnect Calendar**
   - User can reconnect in dashboard
   - Or admin can trigger reconnection

2. **Refresh Tokens**
   ```typescript
   // Token refresh should happen automatically
   // If not, check refresh logic
   ```

3. **Manual Sync**
   - Trigger manual sync for affected users
   - Or wait for automatic retry

**Prevention:**
- Monitor calendar sync success rate
- Set up alerts for sync failures
- Test token refresh regularly

---

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Error Rate**
   - Target: < 1%
   - Alert if: > 5%
   - Critical if: > 10%

2. **Response Time**
   - Target: < 500ms (p95)
   - Alert if: > 1s
   - Critical if: > 2s

3. **Uptime**
   - Target: > 99.9%
   - Alert if: < 99%
   - Critical if: < 95%

4. **Payment Success Rate**
   - Target: > 99%
   - Alert if: < 95%
   - Critical if: < 90%

5. **Call Success Rate**
   - Target: > 95%
   - Alert if: < 90%
   - Critical if: < 80%

### Alert Channels

- **Slack:** #cloudgreet-alerts
- **Email:** oncall@cloudgreet.com
- **Sentry:** Automatic error alerts
- **PagerDuty:** For P0 incidents (optional)

---

## Maintenance Procedures

### Weekly Tasks
- [ ] Review error logs
- [ ] Check database performance
- [ ] Review slow queries
- [ ] Check external API status
- [ ] Review user feedback

### Monthly Tasks
- [ ] Database maintenance (VACUUM, ANALYZE)
- [ ] Review and optimize slow queries
- [ ] Update dependencies
- [ ] Review security logs
- [ ] Performance testing

### Quarterly Tasks
- [ ] Security audit
- [ ] Performance optimization
- [ ] Capacity planning
- [ ] Disaster recovery testing
- [ ] Documentation updates

---

## Emergency Contacts

- **Vercel Support:** https://vercel.com/support
- **Supabase Support:** https://supabase.com/support
- **Stripe Support:** https://support.stripe.com
- **Retell Support:** Check Retell dashboard
- **Telnyx Support:** Check Telnyx dashboard

---

## Post-Incident

After resolving an incident:

1. **Document Incident**
   - What happened?
   - Root cause?
   - Resolution steps?
   - Prevention measures?

2. **Update Runbooks**
   - Add new procedures if needed
   - Update existing procedures
   - Share learnings with team

3. **Follow-Up**
   - Check for related issues
   - Monitor for recurrence
   - Implement prevention measures




## Incident Response Procedures

### On-Call Rotation
- Primary: [Your Name]
- Secondary: [Backup Name]
- Escalation: founders@cloudgreet.com

### Severity Levels

**P0 - Critical (Immediate Response)**
- Site down
- Payment processing broken
- Data loss
- Security breach

**P1 - High (Response within 1 hour)**
- Major feature broken
- High error rate (>10%)
- Performance degradation

**P2 - Medium (Response within 4 hours)**
- Minor feature broken
- Moderate error rate (5-10%)
- User-reported bugs

**P3 - Low (Response within 24 hours)**
- Cosmetic issues
- Low error rate (<5%)
- Enhancement requests

---

## Common Incidents

### Site Down (P0)

**Symptoms:**
- All pages return 500/503
- Health check fails
- Vercel dashboard shows errors

**Diagnosis:**
1. Check Vercel dashboard for deployment status
2. Check function logs for errors
3. Verify environment variables are set
4. Check database connectivity

**Resolution:**
1. **Rollback Deployment**
   ```bash
   # In Vercel dashboard:
   # Deployments > Find last working > Promote to Production
   ```

2. **Check Environment Variables**
   - Verify all required vars are set
   - Check for typos in variable names
   - Verify secrets are correct

3. **Check Database**
   ```sql
   -- Test connection
   SELECT 1;
   
   -- Check for locks
   SELECT * FROM pg_locks WHERE NOT granted;
   ```

4. **Restart Functions**
   - Redeploy in Vercel
   - Or wait for automatic restart

**Prevention:**
- Test deployments in preview environment first
- Use feature flags for risky changes
- Monitor error rates

---

### High Error Rate (P1)

**Symptoms:**
- Error rate > 10%
- Multiple users reporting issues
- Sentry alerts firing

**Diagnosis:**
1. Check Sentry for error patterns
2. Review Vercel function logs
3. Check database performance
4. Verify external API status

**Resolution:**
1. **Identify Root Cause**
   ```bash
   # Check recent errors in Sentry
   # Review error stack traces
   # Check for common patterns
   ```

2. **Quick Fixes**
   - Rollback if recent deployment
   - Disable feature flag if new feature
   - Increase rate limits if rate limiting issue

3. **Database Issues**
   ```sql
   -- Check for slow queries
   SELECT * FROM pg_stat_statements 
   ORDER BY mean_exec_time DESC 
   LIMIT 10;
   
   -- Check connection count
   SELECT count(*) FROM pg_stat_activity;
   ```

4. **External API Issues**
   - Check Stripe status: https://status.stripe.com
   - Check Retell status: Check Retell dashboard
   - Check Telnyx status: Check Telnyx dashboard
   - Implement fallbacks if available

**Prevention:**
- Monitor error rates with alerts
- Set up health checks
- Test external API failures

---

### Payment Processing Broken (P0)

**Symptoms:**
- Stripe checkout not working
- Webhooks not processing
- Subscriptions not activating

**Diagnosis:**
1. Check Stripe dashboard for errors
2. Verify webhook endpoint is accessible
3. Check webhook logs in Stripe
4. Verify `STRIPE_SECRET_KEY` is set

**Resolution:**
1. **Verify Webhook Configuration**
   - Check webhook URL in Stripe dashboard
   - Verify signature verification is working
   - Test webhook manually

2. **Check Webhook Processing**
   ```bash
   # Check Vercel logs for webhook errors
   # Verify webhook secret matches
   ```

3. **Manual Fixes**
   - Manually activate subscriptions if needed
   - Retry failed webhooks in Stripe dashboard
   - Process pending payments manually

**Prevention:**
- Monitor webhook success rate
- Set up alerts for failed payments
- Test webhook processing regularly

---

### Database Performance Issues (P1)

**Symptoms:**
- Slow API responses (>2s)
- Timeout errors
- High database CPU usage

**Diagnosis:**
```sql
-- Check for slow queries
SELECT 
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Check for locks
SELECT 
  pid,
  usename,
  application_name,
  state,
  query
FROM pg_stat_activity
WHERE state != 'idle';
```

**Resolution:**
1. **Kill Long-Running Queries**
   ```sql
   -- Find problematic queries
   SELECT pid, query, state, now() - query_start as duration
   FROM pg_stat_activity
   WHERE state != 'idle'
   ORDER BY duration DESC;
   
   -- Kill if necessary (be careful!)
   SELECT pg_terminate_backend(pid);
   ```

2. **Add Indexes**
   ```sql
   -- Identify missing indexes
   -- Add indexes for frequently queried columns
   CREATE INDEX CONCURRENTLY idx_table_column ON table(column);
   ```

3. **Optimize Queries**
   - Review slow query logs
   - Rewrite inefficient queries
   - Use query optimization functions

**Prevention:**
- Monitor query performance
- Set up slow query alerts
- Regular database maintenance

---

### Rate Limiting Issues (P2)

**Symptoms:**
- Legitimate users getting rate limited
- Rate limits not working (no Redis)

**Diagnosis:**
1. Check if Redis is configured
2. Verify rate limit logic
3. Check rate limit logs

**Resolution:**
1. **Enable Redis**
   - Set up Upstash Redis
   - Add `REDIS_REST_URL` and `REDIS_REST_TOKEN`
   - Update code to use Redis rate limiting

2. **Adjust Rate Limits**
   - Increase limits if too restrictive
   - Decrease limits if abuse detected

3. **Whitelist IPs** (if needed)
   - Add IP whitelist to rate limiting logic

**Prevention:**
- Use Redis for production
- Monitor rate limit metrics
- Set appropriate limits

---

### Calendar Sync Issues (P2)

**Symptoms:**
- Appointments not syncing to Google Calendar
- Calendar connection failing
- Token refresh errors

**Diagnosis:**
1. Check calendar connection status
2. Verify Google OAuth tokens
3. Check token expiration
4. Review calendar sync logs

**Resolution:**
1. **Reconnect Calendar**
   - User can reconnect in dashboard
   - Or admin can trigger reconnection

2. **Refresh Tokens**
   ```typescript
   // Token refresh should happen automatically
   // If not, check refresh logic
   ```

3. **Manual Sync**
   - Trigger manual sync for affected users
   - Or wait for automatic retry

**Prevention:**
- Monitor calendar sync success rate
- Set up alerts for sync failures
- Test token refresh regularly

---

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Error Rate**
   - Target: < 1%
   - Alert if: > 5%
   - Critical if: > 10%

2. **Response Time**
   - Target: < 500ms (p95)
   - Alert if: > 1s
   - Critical if: > 2s

3. **Uptime**
   - Target: > 99.9%
   - Alert if: < 99%
   - Critical if: < 95%

4. **Payment Success Rate**
   - Target: > 99%
   - Alert if: < 95%
   - Critical if: < 90%

5. **Call Success Rate**
   - Target: > 95%
   - Alert if: < 90%
   - Critical if: < 80%

### Alert Channels

- **Slack:** #cloudgreet-alerts
- **Email:** oncall@cloudgreet.com
- **Sentry:** Automatic error alerts
- **PagerDuty:** For P0 incidents (optional)

---

## Maintenance Procedures

### Weekly Tasks
- [ ] Review error logs
- [ ] Check database performance
- [ ] Review slow queries
- [ ] Check external API status
- [ ] Review user feedback

### Monthly Tasks
- [ ] Database maintenance (VACUUM, ANALYZE)
- [ ] Review and optimize slow queries
- [ ] Update dependencies
- [ ] Review security logs
- [ ] Performance testing

### Quarterly Tasks
- [ ] Security audit
- [ ] Performance optimization
- [ ] Capacity planning
- [ ] Disaster recovery testing
- [ ] Documentation updates

---

## Emergency Contacts

- **Vercel Support:** https://vercel.com/support
- **Supabase Support:** https://supabase.com/support
- **Stripe Support:** https://support.stripe.com
- **Retell Support:** Check Retell dashboard
- **Telnyx Support:** Check Telnyx dashboard

---

## Post-Incident

After resolving an incident:

1. **Document Incident**
   - What happened?
   - Root cause?
   - Resolution steps?
   - Prevention measures?

2. **Update Runbooks**
   - Add new procedures if needed
   - Update existing procedures
   - Share learnings with team

3. **Follow-Up**
   - Check for related issues
   - Monitor for recurrence
   - Implement prevention measures


