# Fix Critical Issues & Complete Features Plan

## Status: Ready for Implementation

## Executive Summary

This plan addresses **critical runtime failures** and **non-functional features** that will cause user-facing issues in production. All issues are prioritized by business impact.

---

## ✅ COMPLETED

### 1. Dashboard Route Fix (CRITICAL - FIXED)
- **File**: `app/api/dashboard/data/route.ts`
- **Issue**: Using deprecated `verifyJWT` instead of `requireAuth`, missing tenant isolation
- **Fix Applied**: 
  - Switched to `requireAuth` with proper property access
  - Added tenant isolation check (`.eq('id', authResult.businessId)`)
  - Verified all queries use `businessId` for isolation
- **Status**: ✅ **FIXED**

---

## 🔴 CRITICAL PRIORITY (Fix Immediately)

### 2. Contact Form - Data Loss
- **File**: `app/api/contact/submit/route.ts`
- **Issue**: Submissions are logged but NOT saved to database or sent via email
- **Impact**: Customer inquiries are lost, no way to follow up
- **Business Risk**: Lost leads, poor customer experience, potential legal issues
- **Fix Required**:
  1. Create `contact_submissions` table in Supabase (if doesn't exist)
  2. Save submission to database with timestamp
  3. Send email notification to support team via Resend
  4. Return confirmation with ticket ID
- **Estimated Time**: 2-3 hours
- **Acceptance Criteria**:
  - [ ] Submissions saved to `contact_submissions` table
  - [ ] Support team receives email notification
  - [ ] User receives confirmation with ticket ID
  - [ ] Error handling for email failures (queue for retry)

### 3. SMS Sending - False Success
- **File**: `app/api/sms/send/route.ts`
- **Issue**: Returns success but doesn't actually send SMS via Telnyx/Twilio
- **Impact**: Users think SMS was sent, but recipients never receive it
- **Business Risk**: Lost communication, customer complaints, trust issues
- **Fix Required**:
  1. Integrate with Telnyx SMS API (or Twilio if preferred)
  2. Handle rate limits and retries
  3. Update database with actual delivery status
  4. Handle opt-out (STOP/HELP) responses
  5. Add proper error handling for API failures
- **Estimated Time**: 4-6 hours
- **Acceptance Criteria**:
  - [ ] SMS actually sent via Telnyx API
  - [ ] Delivery status tracked in database
  - [ ] Rate limit handling with queue
  - [ ] STOP/HELP keyword handling
  - [ ] Error messages for failures

### 4. Test Call - Non-Functional
- **File**: `app/api/test/realtime-call/route.ts`
- **Issue**: Returns success but doesn't initiate actual call
- **Impact**: Users can't test their AI agent, onboarding blocked
- **Business Risk**: Users can't verify setup works, high churn risk
- **Fix Required**:
  1. Integrate with Telnyx Call Control API or Retell AI
  2. Create call session with proper webhook URLs
  3. Return actual call ID for tracking
  4. Handle call status updates
- **Estimated Time**: 4-5 hours
- **Acceptance Criteria**:
  - [ ] Actual phone call initiated
  - [ ] Call connects to AI agent
  - [ ] Call status tracked in database
  - [ ] Webhook receives call events

---

## 🟡 HIGH PRIORITY (Fix This Week)

### 5. Error Monitoring - No External Tracking
- **File**: `app/api/monitoring/error/route.ts`
- **Issue**: Errors logged locally but not sent to Sentry/error tracking
- **Impact**: Production errors invisible, can't debug issues
- **Business Risk**: Silent failures, poor reliability, customer complaints
- **Fix Required**:
  1. Integrate Sentry SDK
  2. Send errors to Sentry with context
  3. Set up error alerts
  4. Add source maps for better debugging
- **Estimated Time**: 2-3 hours
- **Acceptance Criteria**:
  - [ ] Errors appear in Sentry dashboard
  - [ ] Alerts configured for critical errors
  - [ ] Source maps uploaded
  - [ ] Error context includes user/business info

### 6. Environment Variable Validation
- **Issue**: No validation that required env vars exist at startup
- **Impact**: App crashes at runtime when env vars missing
- **Business Risk**: Deployment failures, downtime
- **Fix Required**:
  1. Create `lib/env-validation.ts`
  2. Validate all required env vars at app startup
  3. Fail fast with clear error messages
  4. Document all required vars in `.env.example`
- **Estimated Time**: 1-2 hours
- **Acceptance Criteria**:
  - [ ] App fails to start if required vars missing
  - [ ] Clear error message listing missing vars
  - [ ] `.env.example` has all vars documented
  - [ ] Validation runs before any API routes

### 7. Tenant Isolation Audit
- **Issue**: Need to verify ALL API routes properly isolate data by `businessId`
- **Impact**: Potential data leakage between businesses
- **Business Risk**: Security breach, GDPR violations, legal liability
- **Fix Required**:
  1. Audit all API routes for tenant isolation
  2. Ensure all queries filter by `businessId` from auth token
  3. Add tests for tenant isolation
  4. Document isolation requirements
- **Estimated Time**: 3-4 hours
- **Acceptance Criteria**:
  - [ ] All routes verified for tenant isolation
  - [ ] Tests confirm users can't access other business data
  - [ ] Documentation updated
  - [ ] Security review completed

---

## 🟢 MEDIUM PRIORITY (Fix This Month)

### 8. Telnyx Call Initiation
- **File**: `app/api/telnyx/initiate-call/route.ts`
- **Issue**: TODO comment, not implemented
- **Impact**: Landing page "Test Call" button doesn't work
- **Fix Required**: Implement Telnyx call initiation
- **Estimated Time**: 3-4 hours

### 9. Database Schema Validation
- **Issue**: No validation that required tables/columns exist
- **Impact**: Runtime errors if schema changes
- **Fix Required**: Add schema validation/migration checks
- **Estimated Time**: 2-3 hours

### 10. API Rate Limiting
- **Issue**: No rate limiting on public endpoints
- **Impact**: Vulnerable to abuse, potential DDoS
- **Fix Required**: Implement rate limiting middleware
- **Estimated Time**: 2-3 hours

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Critical Fixes (Week 1)
- [x] Fix dashboard route authentication
- [ ] Implement contact form database save
- [ ] Implement contact form email notification
- [ ] Implement SMS sending via Telnyx
- [ ] Implement test call initiation

### Phase 2: High Priority (Week 2)
- [ ] Integrate Sentry error tracking
- [ ] Add environment variable validation
- [ ] Complete tenant isolation audit
- [ ] Add tenant isolation tests

### Phase 3: Medium Priority (Week 3-4)
- [ ] Implement Telnyx call initiation
- [ ] Add database schema validation
- [ ] Implement API rate limiting
- [ ] Complete documentation

---

## 🧪 TESTING REQUIREMENTS

### For Each Fix:
1. **Unit Tests**: Test the new functionality
2. **Integration Tests**: Test with actual APIs (Telnyx, Resend, Sentry)
3. **E2E Tests**: Test user flows end-to-end
4. **Error Handling**: Test failure scenarios
5. **Security Tests**: Verify tenant isolation

---

## 📊 SUCCESS METRICS

- **Contact Form**: 100% of submissions saved and notified
- **SMS**: 95%+ delivery success rate
- **Test Calls**: 100% success rate for call initiation
- **Error Tracking**: 100% of errors captured in Sentry
- **Tenant Isolation**: 0 data leakage incidents
- **Uptime**: 99.9% availability

---

## 🚨 ROLLBACK PLAN

For each critical fix:
1. Keep old code commented for 1 week
2. Monitor error rates and user feedback
3. Have rollback script ready
4. Document any breaking changes

---

## 📝 NOTES

- All fixes must maintain backward compatibility where possible
- All new features must include proper error handling
- All database changes must include migrations
- All API integrations must handle rate limits and retries
- All user-facing changes must include loading states and error messages

---

**Last Updated**: $(date)
**Status**: Ready for Implementation
**Priority**: Critical

