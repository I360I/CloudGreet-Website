# Launch Day Runbook

This runbook provides step-by-step procedures for CloudGreet launch day operations.

## Pre-Launch (T-24 Hours)

### Final Verification
1. Run complete pre-launch checklist (`docs/PRE_LAUNCH_CHECKLIST.md`)
2. Verify all synthetic monitors are active and passing
3. Test critical flows one final time:
   - User registration
   - Onboarding completion
   - Test call placement
   - Contact form submission
4. Verify all environment variables are set in production
5. Confirm database backups are configured

### Team Briefing
1. Schedule launch day briefing call
2. Review launch plan and success criteria
3. Assign on-call responsibilities
4. Share contact information and escalation paths
5. Review monitoring dashboards

## Launch Day (T-0)

### Launch Sequence

#### Step 1: Final System Check (T-30 minutes)
```bash
# Check all synthetic monitors
# Verify GitHub Actions workflows are running
# Check Vercel deployment status
# Verify database connectivity
```

**Checklist:**
- [ ] All monitors green
- [ ] No critical errors in logs
- [ ] Database responsive
- [ ] All services healthy

#### Step 2: Enable Production Features (T-15 minutes)
1. Verify production environment variables
2. Enable public registration (if disabled)
3. Verify webhook endpoints are public
4. Test one final end-to-end flow

#### Step 3: Launch Announcement (T-0)
1. Update website status to "Live"
2. Enable marketing campaigns
3. Post launch announcement
4. Monitor initial traffic

### Monitoring Plan

#### First Hour (Critical)
- **Every 15 minutes:**
  - Check error logs for critical errors
  - Review synthetic monitor status
  - Check registration success rate
  - Monitor API response times

- **Metrics to Watch:**
  - Registration errors
  - Onboarding completion rate
  - Call routing failures
  - API error rate

#### First 4 Hours
- **Every 30 minutes:**
  - Review error logs
  - Check synthetic monitors
  - Review customer signups
  - Monitor support inbox

- **Metrics to Watch:**
  - User signups
  - Onboarding completions
  - First calls placed
  - Support requests

#### First 24 Hours
- **Every 2 hours:**
  - Review error logs
  - Check synthetic monitors
  - Review customer activity
  - Monitor support requests

- **Daily Review:**
  - Total signups
  - Onboarding completion rate
  - Call success rate
  - Support ticket volume

## Issue Response Procedures

### Critical Issues (P0)

**Definition:** System completely down, no users can sign up, calls not routing

**Response:**
1. **Immediate:** Acknowledge issue in team channel
2. **Within 5 minutes:** Assess impact and begin investigation
3. **Within 15 minutes:** Implement fix or rollback
4. **Within 30 minutes:** Verify fix and communicate status

**Escalation:**
- If not resolved in 15 minutes → Escalate to technical lead
- If not resolved in 30 minutes → Escalate to CTO/Founder

### High Priority Issues (P1)

**Definition:** Major feature broken, significant user impact

**Response:**
1. **Within 15 minutes:** Acknowledge and investigate
2. **Within 1 hour:** Implement fix or workaround
3. **Within 2 hours:** Verify fix and communicate

**Escalation:**
- If not resolved in 1 hour → Escalate to technical lead

### Medium Priority Issues (P2)

**Definition:** Minor feature issue, limited user impact

**Response:**
1. **Within 1 hour:** Acknowledge and investigate
2. **Within 4 hours:** Implement fix
3. **Within 8 hours:** Verify fix

### Low Priority Issues (P3)

**Definition:** Cosmetic issues, no functional impact

**Response:**
1. **Within 24 hours:** Acknowledge
2. **Within 1 week:** Implement fix

## Common Issues & Solutions

### Registration Failing
**Symptoms:** Users cannot sign up, 500 errors

**Debug Steps:**
1. Check application logs for registration errors
2. Verify Supabase connection
3. Check database constraints
4. Verify environment variables

**Solution:**
- Check `app/api/auth/register-simple/route.ts` logs
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Check database for constraint violations

### Calls Not Routing
**Symptoms:** Calls not connecting to Retell AI

**Debug Steps:**
1. Check Telnyx webhook logs
2. Verify SIP format in logs
3. Check Retell agent status
4. Verify phone number linking

**Solution:**
- Check `app/api/telnyx/voice-webhook/route.ts` logs
- Verify SIP format matches Retell requirements
- Check phone number is linked to Retell agent
- Use admin test call UI to debug

### Onboarding Failing
**Symptoms:** Users cannot complete onboarding

**Debug Steps:**
1. Check onboarding completion logs
2. Verify phone number availability
3. Check Retell agent creation
4. Verify Stripe integration

**Solution:**
- Check `app/api/onboarding/complete/route.ts` logs
- Verify toll-free numbers available
- Check Retell API key configuration
- Verify Stripe API key

### Support Email Not Working
**Symptoms:** Contact form submissions not received

**Debug Steps:**
1. Check contact form API logs
2. Verify Resend API key
3. Check support email inbox
4. Verify email delivery

**Solution:**
- Check `app/api/contact/submit/route.ts` logs
- Verify `RESEND_API_KEY` configured
- Check `SUPPORT_EMAIL` setting
- Verify email delivery in Resend dashboard

## Success Criteria

### Launch Day Success
- **System Uptime:** >99.9%
- **Registration Success Rate:** >95%
- **Onboarding Completion Rate:** >80%
- **Call Routing Success Rate:** >90%
- **Support Response Time:** <2 hours

### Week 1 Success
- **System Uptime:** >99.8%
- **Total Signups:** >10
- **Onboarding Completion Rate:** >75%
- **Call Success Rate:** >85%
- **Customer Satisfaction:** >4/5

### Month 1 Success
- **System Uptime:** >99.9%
- **Total Signups:** >50
- **Onboarding Completion Rate:** >80%
- **Call Success Rate:** >90%
- **Churn Rate:** <25%

## Communication Plan

### Internal Communication
- **Team Channel:** Use Slack/Discord for real-time updates
- **Status Updates:** Every 2 hours during first 24 hours
- **Incident Reports:** Within 1 hour of resolution

### Customer Communication
- **Status Page:** Update status page for any issues
- **Support Responses:** Respond within 2 hours
- **Outage Notifications:** Notify affected users within 30 minutes

## Rollback Procedures

### When to Rollback
- Critical system failure
- Data corruption risk
- Security vulnerability
- >50% error rate

### Rollback Steps
1. **Immediate:** Disable new registrations
2. **Within 5 minutes:** Revert to previous deployment
3. **Within 15 minutes:** Verify system stability
4. **Within 30 minutes:** Communicate status

### Post-Rollback
1. Investigate root cause
2. Fix issue in development
3. Test fix thoroughly
4. Plan re-deployment

## Post-Launch Review

### Day 1 Review
- Review all metrics
- Identify any issues
- Document lessons learned
- Plan improvements

### Week 1 Review
- Review customer feedback
- Analyze usage patterns
- Identify optimization opportunities
- Plan feature improvements

### Month 1 Review
- Comprehensive metrics review
- Customer success review
- Technical debt assessment
- Roadmap planning

## Emergency Contacts

### Technical Lead
- **Name:** `_________________`
- **Phone:** `_________________`
- **Email:** `_________________`

### CTO/Founder
- **Name:** `_________________`
- **Phone:** `_________________`
- **Email:** `_________________`

### Support Lead
- **Name:** `_________________`
- **Phone:** `_________________`
- **Email:** `_________________`

## Monitoring Dashboards

### Vercel Dashboard
- URL: https://vercel.com/dashboard
- Check: Deployment status, logs, metrics

### Supabase Dashboard
- URL: https://supabase.com/dashboard
- Check: Database status, logs, metrics

### GitHub Actions
- URL: https://github.com/[repo]/actions
- Check: Synthetic monitor status

### Application Logs
- Check: Vercel logs, Supabase logs
- Monitor: Error rates, response times

---

**Last Updated:** `_________________`
**Next Review:** `_________________`

