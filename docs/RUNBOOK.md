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

## Issue: Registration failing

**Symptoms**: `/register-simple` form returns an error banner or API responds with `5xx`/`4xx`.

**Debug Steps**:
1. Tail production logs (`vercel logs <deployment-url> --json`) and capture the latest `errorMessage`, `errorCode`, and `errorDetails` fields.
2. Reproduce with `node scripts/monitor-registration.js --base-url https://<deployment-domain>` to get a precise response payload.
3. In Supabase SQL editor, check for partial rows:
   ```sql
   SELECT id, email, created_at
   FROM custom_users
   WHERE email = 'test@example.com'
   ORDER BY created_at DESC
   LIMIT 5;
   ```
4. Verify matching auth user exists:
   ```sql
   SELECT id, email
   FROM auth.users
   WHERE email = 'test@example.com';
   ```
5. Inspect businesses table:
   ```sql
   SELECT id, business_name, owner_id
   FROM businesses
   WHERE owner_id = '...';
   ```

**Solutions**:
- **Supabase insert blocked** (`code: 23503`, `PGRST204`, `42501`): confirm the referenced `auth.users` row was created. If missing, rerun `createUser` via Supabase auth admin or delete the partial `custom_users` entry and retry.
- **Email already exists** (`code: 409`): user previously registered. Resend onboarding email or guide them to `/login`.
- **Invalid payload** (`code: validation_failed`): front-end inputs not trimmed. Reproduce and fix the form validation.
- **Supabase outage**: check https://status.supabase.com and suspend marketing until resolved.

**Rollback / Cleanup**:
1. Delete the business row (if created):
   ```sql
   DELETE FROM businesses WHERE id = '<business_id>';
   ```
2. Delete the custom profile:
   ```sql
   DELETE FROM custom_users WHERE id = '<auth_user_id>';
   ```
3. Delete the core profile:
   ```sql
   DELETE FROM users WHERE id = '<auth_user_id>';
   ```
4. Remove the auth user:
   ```sql
   SELECT auth.admin_remove_user('<auth_user_id>');
   ```
5. Confirm no orphaned data remains (`appointments`, `sms_logs`, etc.) referencing the same business ID.

**Escalation**: Registration must be restored within 30 minutes. If root cause is unclear, page engineering and freeze paid traffic.

## Issue: Synthetic monitors failing (voice/SMS)

**Symptoms**: GitHub Action `Synthetic Voice & SMS Monitors` fails or Slack/Email alert triggered.

**Debug Steps**:
1. Inspect workflow run logs (Actions → Synthetic Voice & SMS Monitors) for failing step (`monitor-voice-agent` or `monitor-sms-opt-in`).
2. Voice failure:
   - Verify `RETELL_API_KEY` and `SYNTHETIC_VOICE_AGENT_ID` secrets in GitHub/Vercel.
   - Place a manual test call using Retell console; confirm greeting + escalation phrase.
   - Check `compliance_events` table for the latest `voice` entries to ensure webhook reached us.
3. SMS failure:
   - Confirm `TELNYX_API_KEY`, `TELNYX_MONITOR_NUMBER`, `TELNYX_TEST_RECIPIENT` secrets.
   - Check Telnyx messaging logs for HELP/STOP responses.
   - Ensure `/api/sms/webhook` returned `200` in Telnyx delivery logs.
4. After remediation, re-run the workflow manually to clear the alert.

**Database Query**:
```sql
SELECT channel, event_type, created_at, metadata
FROM compliance_events
WHERE channel IN ('voice','sms')
ORDER BY created_at DESC
LIMIT 20;
```

**Escalation**: If synthetic monitors fail for >2 consecutive runs, notify product + success leads and pause outbound campaigns until voice/SMS flows are healthy.

## Issue: Compliance audit discrepancies

**Symptoms**: Missing consent records, regulators request proof, or STOP responses not honoured.

**Debug Steps**:
1. Query `compliance_events` for the subscriber in question:
   ```sql
   SELECT *
   FROM compliance_events
   WHERE metadata->'request'->>'from' LIKE '+1555%'
   ORDER BY created_at DESC;
   ```
2. Check legacy `consents` table for historical HELP/STOP logs.
3. Inspect `/api/internal/compliance/audit` response (requires internal token) to verify recent entries.
4. Replay the user's journey: trigger SMS HELP/STOP, onboarding submission, and confirm new compliance entries.

**Solutions**:
- **STOP not honoured**: Ensure Telnyx webhook hit our endpoint (review logs) and that downstream systems respect the consent flag.
- **Missing onboarding log**: Re-run the onboarding step; if reproducible, inspect the specific API route for logging coverage.
- **Audit export needed**: Download compliance events and share with legal in CSV format.

**Escalation**: For any regulator/legal request, escalate immediately to the compliance owner and respond within SLA (typically <24h).

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

## Issue: Toll-free number inventory depleted

**Symptoms**: Onboarding logs "No available phone numbers" or Telnyx provisioning workflow fails to assign a number.

**Debug Steps**:
1. Open the admin dashboard → `Phone Number Inventory` and confirm `Available` count.
2. If zero, check Supabase directly:
   ```sql
   SELECT number, status, assigned_to, created_at
   FROM toll_free_numbers
   ORDER BY created_at DESC;
   ```
3. Review onboarding logs (`vercel logs <deployment> --since 30m | grep "No available phone numbers"`).
4. Confirm Telnyx portal has spare numbers ready to import.

**Solutions**:
- Provision new toll-free numbers in Telnyx, then paste them into the admin bulk uploader (one per line). Status will default to `available`.
- If numbers exist but are `suspended`, change status back to `available` from the admin table after verifying compliance.
- For stuck assignments, set status to `available`, clear `assigned_to`, and re-run onboarding.

**Escalation**: If inventory cannot be replenished within 2 hours, pause paid acquisition and notify the ops channel so onboarding doesn’t stall for new customers.

## Synthetic monitor failures

**Symptoms**: `Synthetic Monitors` GitHub Action fails or sends Slack/PagerDuty alert citing registration/login/health check failure.

**Debug Steps**:
1. Open the failing workflow run in GitHub → view `Run synthetic monitors` step for the exact error (includes Vercel trace ID).
2. Re-run locally with `node scripts/monitor-registration.js --base-url https://<deployment-domain>` using the same base URL.
3. Inspect Vercel logs filtered by the trace ID from the synthetic output (`vercel logs <deployment> --since 1h | grep <vercelId>`).
4. Follow the relevant sections of this runbook (`Registration failing`, `Dashboard not loading`) depending on which stage failed.

**Solutions**:
- **Registration stage**: see “Registration failing” above.
- **Login stage**: confirm `/api/auth/login-simple` returns 200; reset password manually if necessary.
- **Health stage**: see “Dashboard not loading” and the `/api/health` handler logs.

**Escalation**: If synthetic monitors fail twice consecutively (2 hours) escalate to engineering and place marketing campaigns on hold.

### Outreach runner monitor failing

**Symptoms**: `Monitor outreach runner` step in the Synthetic Monitors workflow exits with `outreach_failed` or `processed=0`.

**Debug Steps**:
1. Hit the internal endpoint manually using the cron secret:
   ```bash
   curl -X POST \
     -H "x-cron-secret: $CRON_SECRET" \
     https://<app-domain>/api/internal/outreach-runner
   ```
2. Check Supabase `outreach_events` and `prospects` tables for recent updates.
3. Inspect Vercel logs for `Prospect sync failed` or `Outreach runner failed` messages (`vercel logs <deployment> --since 30m | grep outreach`).
4. Validate Apollo/Clearbit credentials in the admin settings UI.

**Solutions**:
- Rotate the Apollo/Clearbit keys if calls are returning 401/403.
- Confirm `OUTREACH_RUNNER_URL` and `CRON_SECRET` secrets point at the production deployment.
- If Telnyx/Resend limits are exhausted, pause the cron and switch to fallback provider.

**Escalation**: If the runner cannot process leads for >4 hours, pause outbound cadences and notify sales leadership.

### Sales workspace monitor failing

**Symptoms**: `Monitor sales workspace` step fails with `login_failed` or `leads_failed`.

**Debug Steps**:
1. Ensure the monitoring credentials exist (`MONITOR_EMPLOYEE_EMAIL`, `MONITOR_EMPLOYEE_PASSWORD`). Re-run `node scripts/seed-demo-data.js` if needed.
2. Manually call the APIs:
   ```bash
   curl -X POST https://<app-domain>/api/auth/login-simple \
     -H "Content-Type: application/json" \
     -d '{"email":"<monitor-email>","password":"<monitor-password>"}'
   ```
   Use the returned token to hit `/api/employee/leads`.
3. Review Supabase `sales_activities` / `sales_tasks` tables for anomalies.
4. Check Vercel logs for auth middleware errors affecting `/api/employee/*`.

**Solutions**:
- Reset the monitoring user’s password via Supabase if the credential changed.
- Confirm the monitoring user has `role = 'sales'` in `custom_users`.
- Re-run `scripts/seed-demo-data.js` to rehydrate demo content.

**Escalation**: If the sales workspace is down for >1 hour, notify the revenue team and communicate manual fallback.

## Demo data seeding (support/training tenant)

**When to run**: Need fresh demo accounts for sales training, or when synthetic sales monitor credentials drift.

**Command**:
```bash
node scripts/seed-demo-data.js
```

**Environment**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- Optional overrides: `DEMO_OWNER_EMAIL`, `DEMO_OWNER_PASSWORD`, `DEMO_EMPLOYEE_EMAIL`, `DEMO_EMPLOYEE_PASSWORD`

**Outputs**:
- Owner email/password
- Sales rep email/password (used by monitors)
- Business ID

**After running**:
1. Update GitHub Actions secrets (`MONITOR_EMPLOYEE_EMAIL`, `MONITOR_EMPLOYEE_PASSWORD`) if credentials changed.
2. Share refreshed credentials with the sales/demo team.
3. Verify `/employee/dashboard` loads with the new user.

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