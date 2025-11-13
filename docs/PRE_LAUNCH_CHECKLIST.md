# Pre-Launch Checklist

This checklist must be completed before launching CloudGreet to production customers.

## Critical Systems Verification

### SIP Format & Call Routing
- [ ] **SIP Format Verified**: Run `scripts/test-sip-bridge.js` and verify at least one SIP format succeeds
- [ ] **Call Routing Test**: Place test call via admin UI (`/admin/test-call`) and verify it connects to Retell AI
- [ ] **End-to-End Test**: Run `scripts/test-complete-call-flow.js` and verify complete flow works
- [ ] **SIP Format Updated**: If test reveals correct format, update `app/api/telnyx/voice-webhook/route.ts` with verified format
- [ ] **Fallback Tested**: Verify fallback messages play correctly when SIP transfer fails

**Test Results:**
- SIP Format Used: `_________________`
- Test Call Status: `_________________`
- Retell Connection: `_________________`
- Date Tested: `_________________`

### Retell Linking
- [ ] **API Linking Tested**: Run `scripts/test-retell-linking.js` to verify API linking works
- [ ] **Manual Process Documented**: If API doesn't work, manual linking process is documented
- [ ] **Admin UI Helper**: Retell linking helper available in phone inventory page
- [ ] **Linking Status**: All assigned numbers linked to Retell agents

**Test Results:**
- API Linking Works: `_________________`
- Manual Process Required: `_________________`
- Numbers Linked: `_________________`

### Onboarding Flow
- [ ] **Registration Works**: Test user registration end-to-end
- [ ] **Onboarding Completes**: Test full onboarding flow completes successfully
- [ ] **Error Messages**: Verify error messages are clear and actionable
- [ ] **Recovery**: Test onboarding recovery/resume functionality
- [ ] **Phone Provisioning**: Verify phone numbers are assigned during onboarding
- [ ] **Agent Creation**: Verify Retell agents are created during onboarding

**Test Results:**
- Registration Success Rate: `_________________`
- Onboarding Completion Rate: `_________________`
- Error Message Quality: `_________________`

### Support Systems
- [ ] **Contact Form**: Test contact form submission works
- [ ] **Email Delivery**: Verify support emails are received
- [ ] **Help Center**: Review help center content for accuracy
- [ ] **Support Email**: Verify support@cloudgreet.com is monitored
- [ ] **Response Process**: Document support response process

**Test Results:**
- Contact Form Works: `_________________`
- Emails Received: `_________________`
- Help Center Reviewed: `_________________`
- Support Email Monitored: `_________________`

## Infrastructure & Monitoring

### Synthetic Monitors
- [ ] **Registration Monitor**: Hourly registration monitor running
- [ ] **Call Flow Monitor**: Daily call flow test running
- [ ] **Outreach Monitor**: Outreach runner monitor active
- [ ] **Sales Dashboard Monitor**: Sales dashboard monitor active
- [ ] **Voice Agent Monitor**: Voice agent synthetic monitor active
- [ ] **SMS Monitor**: SMS opt-in monitor active

**Monitor Status:**
- All Monitors Active: `_________________`
- Last Successful Run: `_________________`

### Environment Variables
- [ ] **All Required Variables Set**: Verify all required env vars in Vercel
- [ ] **Secrets Configured**: All API keys and secrets configured
- [ ] **Webhook URLs**: All webhook URLs point to production
- [ ] **Database**: Supabase production database configured

**Environment Check:**
- Variables Complete: `_________________`
- Secrets Configured: `_________________`
- Webhooks Valid: `_________________`

### Database
- [ ] **Migrations Applied**: All migrations applied to production database
- [ ] **Phone Numbers**: Toll-free numbers seeded in inventory
- [ ] **Demo Data**: Demo data seeded (if needed)
- [ ] **Backups**: Database backups configured

**Database Status:**
- Migrations Complete: `_________________`
- Phone Inventory: `_________________` numbers available
- Backups Configured: `_________________`

## Documentation

### Runbooks
- [ ] **Runbook Updated**: `docs/RUNBOOK.md` includes all critical procedures
- [ ] **Call Routing**: Call routing troubleshooting documented
- [ ] **Onboarding Issues**: Onboarding error resolution documented
- [ ] **Support Procedures**: Support response procedures documented

### Launch Documentation
- [ ] **Launch Runbook**: `docs/LAUNCH_DAY_RUNBOOK.md` created
- [ ] **Monitoring Plan**: Monitoring and alerting plan documented
- [ ] **Rollback Plan**: Rollback procedures documented
- [ ] **Success Criteria**: Launch success criteria defined

## Pre-Launch Testing

### Manual Testing
- [ ] **Full User Journey**: Test complete user journey from signup to first call
- [ ] **Admin Dashboard**: Test all admin dashboard features
- [ ] **Employee Dashboard**: Test employee dashboard features
- [ ] **Phone System**: Test incoming and outgoing calls
- [ ] **SMS**: Test SMS sending and receiving
- [ ] **Calendar**: Test calendar integration

### Performance Testing
- [ ] **Page Load Times**: Verify page load times are acceptable
- [ ] **API Response Times**: Verify API response times are acceptable
- [ ] **Database Queries**: Verify no slow queries
- [ ] **Concurrent Users**: Test with multiple concurrent users

## Security & Compliance

### Security
- [ ] **Authentication**: JWT authentication working correctly
- [ ] **Authorization**: Role-based access control working
- [ ] **Secrets**: No secrets in code or logs
- [ ] **HTTPS**: All endpoints use HTTPS
- [ ] **CORS**: CORS configured correctly

### Compliance
- [ ] **TCPA Compliance**: SMS opt-out handling implemented
- [ ] **Privacy Policy**: Privacy policy linked and accessible
- [ ] **Terms of Service**: Terms of service linked and accessible
- [ ] **Data Retention**: Data retention policies documented

## Launch Readiness Sign-Off

### Technical Lead
- [ ] All critical systems verified
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Ready for launch

**Signed:** `_________________` **Date:** `_________________`

### Business Lead
- [ ] Support systems ready
- [ ] Customer success plan in place
- [ ] Marketing materials ready
- [ ] Ready for launch

**Signed:** `_________________` **Date:** `_________________`

## Post-Launch Monitoring

### First 24 Hours
- [ ] Monitor error logs hourly
- [ ] Check synthetic monitors every 4 hours
- [ ] Review customer signups
- [ ] Monitor call success rate
- [ ] Check support inbox

### First Week
- [ ] Daily error log review
- [ ] Daily synthetic monitor review
- [ ] Weekly customer success review
- [ ] Weekly performance review

---

**Last Updated:** `_________________`
**Next Review:** `_________________`

