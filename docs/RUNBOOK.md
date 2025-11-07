# Operations Runbook

## Issue: Calls not connecting

**Symptoms**: Calls answer but no AI response, or calls fail to connect entirely

**Debug Steps**:
1. Check Retell dashboard for agent status
2. Verify `RETELL_API_KEY` is valid and not expired
3. Check webhook logs in `/api/retell/webhook`
4. Verify `retell_agent_id` is set in businesses table
5. Test webhook signature verification

**Database Query**:
```sql
SELECT id, business_name, retell_agent_id, phone_number 
FROM businesses 
WHERE phone_number = '+1234567890';
```

**Solutions**:
- **Agent not created**: Re-run onboarding or create agent manually
- **Invalid API key**: Update `RETELL_API_KEY` in environment variables
- **Webhook failing**: Check webhook URL and signature verification
- **Agent inactive**: Activate agent in Retell dashboard

**Escalation**: If issue persists > 30 minutes, escalate to engineering team

## Issue: Dashboard not loading

**Symptoms**: White screen, loading spinner, or "Something went wrong" error

**Debug Steps**:
1. Check browser console for JavaScript errors
2. Verify JWT token is valid and not expired
3. Test `/api/dashboard/data` endpoint directly
4. Check Supabase connection and RLS policies
5. Verify user has proper permissions

**API Test**:
```bash
curl -H "Authorization: Bearer <token>" \
  https://app.cloudgreet.com/api/dashboard/data
```

**Solutions**:
- **Token expired**: User needs to re-login
- **Database error**: Check Supabase status and RLS policies
- **Permission issue**: Verify user role and business access
- **Frontend error**: Check for JavaScript errors in console

**Quick Fix**: Clear localStorage and re-login

## Issue: Webhooks failing

**Symptoms**: No data appearing in dashboard, calls not being recorded

**Debug Steps**:
1. Check Retell webhook logs in dashboard
2. Verify webhook signature verification
3. Check database for new calls/appointments
4. Review `/api/retell/webhook` and `/api/telnyx/voice-webhook` logs
5. Test webhook endpoints manually

**Webhook Test**:
```bash
curl -X POST https://app.cloudgreet.com/api/retell/webhook \
  -H "Content-Type: application/json" \
  -H "X-Retell-Signature: <signature>" \
  -d '{"test": "data"}'
```

**Solutions**:
- **Signature mismatch**: Verify `RETELL_WEBHOOK_SECRET`
- **Endpoint down**: Check server status and logs
- **Database error**: Verify database connection and permissions
- **Rate limiting**: Check if webhook is being rate limited

## Issue: AI insights not generating

**Symptoms**: AI insights section empty or showing "No insights available"

**Debug Steps**:
1. Check OpenAI API key and quota
2. Verify call data exists in database
3. Test `/api/analytics/ai-insights` endpoint
4. Check for errors in insight generation process
5. Verify business has sufficient call data

**Database Check**:
```sql
SELECT COUNT(*) as call_count, 
       COUNT(CASE WHEN transcript IS NOT NULL THEN 1 END) as transcribed_calls
FROM calls 
WHERE business_id = '<business_id>' 
  AND created_at > NOW() - INTERVAL '30 days';
```

**Solutions**:
- **No call data**: Business needs more calls for insights
- **API quota exceeded**: Check OpenAI usage and billing
- **Generation error**: Check logs for specific error messages
- **Configuration issue**: Verify insight generation settings

## Issue: Real-time updates not working

**Symptoms**: Dashboard not updating in real-time, WebSocket connection issues

**Debug Steps**:
1. Check WebSocket connection in browser dev tools
2. Verify WebSocket server is running
3. Test WebSocket endpoint connectivity
4. Check for firewall or proxy issues
5. Verify business ID in WebSocket connection

**WebSocket Test**:
```javascript
const ws = new WebSocket('wss://app.cloudgreet.com/api/websocket/dashboard/<business_id>');
ws.onopen = () => console.log('Connected');
ws.onmessage = (event) => console.log('Message:', event.data);
ws.onerror = (error) => console.error('Error:', error);
```

**Solutions**:
- **Connection failed**: Check WebSocket server status
- **Firewall blocking**: Verify WebSocket ports are open
- **Business ID invalid**: Check business ID format
- **Server overloaded**: Check server resources and scaling

## Issue: Performance degradation

**Symptoms**: Slow page loads, high response times, timeouts

**Debug Steps**:
1. Check server CPU and memory usage
2. Monitor database query performance
3. Check for slow API endpoints
4. Verify CDN and caching configuration
5. Review error logs for bottlenecks

**Performance Queries**:
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check database size
SELECT pg_size_pretty(pg_database_size('cloudgreet'));
```

**Solutions**:
- **Database slow**: Optimize queries, add indexes
- **API slow**: Check for N+1 queries, add caching
- **Server overloaded**: Scale up resources
- **CDN issues**: Check CDN configuration and cache

## Issue: Authentication failures

**Symptoms**: Users can't login, "Unauthorized" errors, token issues

**Debug Steps**:
1. Check JWT secret configuration
2. Verify token expiration settings
3. Test authentication endpoints
4. Check for clock skew issues
5. Verify user data in database

**Auth Test**:
```bash
# Test login endpoint
curl -X POST https://app.cloudgreet.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}'
```

**Solutions**:
- **JWT secret changed**: Update environment variable
- **Token expired**: Adjust expiration settings
- **Clock skew**: Synchronize server time
- **User not found**: Check user data integrity

## Monitoring & Alerts

### Key Metrics to Watch
- **Response Time**: < 2 seconds average
- **Error Rate**: < 1% of requests
- **Uptime**: > 99.9%
- **Call Success Rate**: > 95%
- **Database Performance**: < 100ms average query time

### Alert Thresholds
- **Critical**: Error rate > 5%, Response time > 10s
- **Warning**: Error rate > 2%, Response time > 5s
- **Info**: Error rate > 1%, Response time > 2s

### Monitoring Tools
- **Sentry**: Error tracking and performance monitoring
- **Vercel Analytics**: Performance and usage metrics
- **Supabase Dashboard**: Database performance and logs
- **Retell Dashboard**: Call quality and agent performance
- **Custom Health Checks**: `/api/health/detailed`

## On-Call Procedures

### P0 - Critical Issues (All calls failing)
1. **Immediate**: Check Telnyx and Retell status pages
2. **5 minutes**: Verify API keys and webhook configuration
3. **10 minutes**: Check database connectivity and RLS policies
4. **15 minutes**: Escalate to engineering team if unresolved
5. **30 minutes**: Consider rollback if issue persists

### P1 - High Impact (Dashboard down, major features broken)
1. **Immediate**: Check Vercel deployment status
2. **5 minutes**: Verify Supabase connectivity
3. **10 minutes**: Check Sentry for error patterns
4. **15 minutes**: Roll back deployment if needed
5. **30 minutes**: Implement hotfix if rollback not possible

### P2 - Medium Impact (Performance issues, minor features broken)
1. **15 minutes**: Check performance metrics and logs
2. **30 minutes**: Identify root cause
3. **1 hour**: Implement fix or workaround
4. **2 hours**: Deploy fix and monitor

### P3 - Low Impact (Cosmetic issues, non-critical features)
1. **Next business day**: Investigate and plan fix
2. **Within 1 week**: Implement and deploy fix

## Escalation Contacts

### Internal Team
- **Primary On-Call**: [Contact Info]
- **Secondary On-Call**: [Contact Info]
- **Engineering Lead**: [Contact Info]
- **Product Manager**: [Contact Info]

### External Services
- **Vercel Support**: support@vercel.com
- **Supabase Support**: support@supabase.com
- **Retell Support**: support@retellai.com
- **Telnyx Support**: support@telnyx.com

## Post-Incident Process

### Immediate (Within 1 hour)
1. Document incident timeline
2. Identify root cause
3. Implement permanent fix
4. Monitor system stability

### Short-term (Within 24 hours)
1. Write incident report
2. Update runbook with new procedures
3. Review monitoring and alerting
4. Schedule post-mortem meeting

### Long-term (Within 1 week)
1. Conduct post-mortem meeting
2. Implement preventive measures
3. Update documentation
4. Review and improve processes

## Maintenance Windows

### Scheduled Maintenance
- **Weekly**: Database maintenance and optimization
- **Monthly**: Security updates and dependency updates
- **Quarterly**: Performance review and optimization

### Emergency Maintenance
- **Immediate**: Critical security patches
- **Within 24 hours**: High-priority bug fixes
- **Within 1 week**: Performance optimizations

### Maintenance Procedures
1. Notify users 24 hours in advance (for scheduled)
2. Put system in maintenance mode
3. Perform maintenance tasks
4. Verify system functionality
5. Remove maintenance mode
6. Monitor for issues