# CloudGreet Testing Checklist

## Pre-Launch Testing Requirements

### ✅ Phase 1: Critical Path Testing

#### Registration & Authentication
- [ ] User can register with valid email/password
- [ ] Registration validates email format
- [ ] Registration validates password strength
- [ ] Duplicate email registration fails gracefully
- [ ] User can login with correct credentials
- [ ] Login fails with incorrect credentials
- [ ] Login rate limiting works (10 attempts per 15 min)
- [ ] JWT token is stored securely
- [ ] Token expiration works correctly
- [ ] Logout clears token

#### Onboarding Flow
- [ ] Onboarding wizard loads for new users
- [ ] Step 1: Business profile saves correctly
- [ ] Step 2: Services & hours saves correctly
- [ ] Step 3: Calendar OAuth redirects to Google
- [ ] Step 4: Phone provisioning assigns number
- [ ] Step 5: Billing redirects to Stripe checkout
- [ ] Onboarding completion creates Retell agent
- [ ] Onboarding completion creates Stripe customer
- [ ] Onboarding completion provisions phone number
- [ ] Progress persists across page refreshes

#### Phone & AI Agent
- [ ] Phone number is displayed in dashboard
- [ ] Test call button initiates call
- [ ] Test call reaches assigned number
- [ ] AI agent answers test call
- [ ] AI agent can have conversation
- [ ] AI agent can book appointment
- [ ] Appointment appears in dashboard
- [ ] Appointment syncs to Google Calendar (if connected)

#### Calendar Integration
- [ ] Google Calendar OAuth flow works
- [ ] Calendar connection status shows correctly
- [ ] Appointments sync to Google Calendar
- [ ] Token refresh works when expired
- [ ] Calendar disconnect works
- [ ] Reconnect works after disconnect

#### Billing & Payments
- [ ] Stripe checkout session creates correctly
- [ ] Successful payment activates subscription
- [ ] Subscription status shows in dashboard
- [ ] Billing dashboard loads correctly
- [ ] Stripe portal link works
- [ ] Per-booking fees are calculated correctly
- [ ] Invoice webhooks update subscription status

### ✅ Phase 2: Admin Dashboard Testing

#### Admin Authentication
- [ ] Admin login works with admin credentials
- [ ] Non-admin users cannot access admin pages
- [ ] Admin sidebar navigation works
- [ ] Admin logout works

#### Client Management
- [ ] Clients list loads with pagination
- [ ] Client search works
- [ ] Client filters work (status, type)
- [ ] Client detail page loads
- [ ] Client activity stats display correctly
- [ ] Client revenue calculation is accurate

#### Analytics & Reporting
- [ ] Usage analytics load without errors
- [ ] Charts render correctly
- [ ] Date range filters work
- [ ] Export functions work
- [ ] Customer success snapshot loads
- [ ] Billing reconciliation loads

#### System Management
- [ ] Knowledge base CRUD operations work
- [ ] Integration management works
- [ ] Outreach templates load
- [ ] Audit logs are accessible
- [ ] Employee management works

### ✅ Phase 3: Error Handling & Edge Cases

#### Error Scenarios
- [ ] Invalid JSON in request body returns 400
- [ ] Missing required fields returns 400
- [ ] Unauthorized requests return 401
- [ ] Forbidden requests return 403
- [ ] Not found resources return 404
- [ ] Rate limiting returns 429
- [ ] Server errors return 500
- [ ] Service unavailable returns 503

#### Edge Cases
- [ ] Empty database tables don't crash
- [ ] Missing environment variables handled gracefully
- [ ] External API failures don't crash app
- [ ] Large request bodies are rejected (1MB limit)
- [ ] Concurrent requests handled correctly
- [ ] Token expiration handled gracefully
- [ ] Network timeouts handled correctly

#### Data Validation
- [ ] Phone numbers validated correctly
- [ ] Email addresses validated correctly
- [ ] Dates validated correctly
- [ ] UUIDs validated correctly
- [ ] SQL injection attempts blocked
- [ ] XSS attempts sanitized

### ✅ Phase 4: Performance Testing

#### Response Times
- [ ] Landing page loads < 2s
- [ ] Dashboard loads < 3s
- [ ] API endpoints respond < 500ms
- [ ] Database queries optimized (no N+1)
- [ ] Images optimized and lazy-loaded

#### Load Testing
- [ ] Handles 100 concurrent users
- [ ] Handles 1000 requests/minute
- [ ] Rate limiting prevents abuse
- [ ] Database connection pooling works
- [ ] No memory leaks under load

### ✅ Phase 5: Security Testing

#### Authentication & Authorization
- [ ] JWT tokens cannot be forged
- [ ] Password hashing uses bcrypt
- [ ] Admin routes require admin role
- [ ] Tenant isolation enforced
- [ ] CSRF protection works

#### Data Protection
- [ ] PII not logged
- [ ] Secrets not exposed in errors
- [ ] SQL injection prevented
- [ ] XSS attacks prevented
- [ ] CORS configured correctly
- [ ] Security headers present

#### Compliance
- [ ] GDPR export endpoint works
- [ ] GDPR delete endpoint works
- [ ] Audit logs capture all changes
- [ ] Consent tracking works
- [ ] Opt-out handling works

### ✅ Phase 6: Integration Testing

#### External Services
- [ ] Stripe webhooks verified correctly
- [ ] Retell webhooks verified correctly
- [ ] Telnyx webhooks verified correctly
- [ ] Google Calendar OAuth works
- [ ] Email sending works (if configured)
- [ ] SMS sending works (if configured)

#### Database
- [ ] Migrations run successfully
- [ ] Transactions work correctly
- [ ] Foreign keys enforced
- [ ] Indexes improve query performance
- [ ] Soft deletes work correctly

### ✅ Phase 7: Browser Testing

#### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

#### Mobile Browsers
- [ ] iOS Safari
- [ ] Chrome Mobile
- [ ] Responsive design works
- [ ] Touch interactions work

#### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] ARIA labels present
- [ ] Color contrast sufficient
- [ ] Focus indicators visible

## Manual Testing Scenarios

### Scenario 1: New User Journey
1. Visit landing page
2. Click "Get Started"
3. Register account
4. Complete onboarding wizard
5. Connect Google Calendar
6. Provision phone number
7. Complete Stripe checkout
8. Receive test call
9. Verify AI answers
10. Book test appointment
11. Verify appointment in dashboard
12. Verify appointment in Google Calendar

### Scenario 2: Admin Operations
1. Login as admin
2. View clients list
3. View client details
4. Check analytics
5. View billing reconciliation
6. Create employee account
7. View audit logs
8. Manage knowledge base

### Scenario 3: Error Recovery
1. Trigger 429 rate limit
2. Verify error message
3. Wait for reset
4. Verify request succeeds
5. Trigger invalid JSON error
6. Verify graceful error handling
7. Trigger network timeout
8. Verify timeout handling

## Automated Testing

### Unit Tests
- [ ] Run: `npm test` or `pnpm test`
- [ ] All tests pass
- [ ] Coverage > 80%

### E2E Tests
- [ ] Run: `bash scripts/test-e2e-flow.sh`
- [ ] All critical paths pass
- [ ] No regressions

### API Tests
- [ ] Run: `node scripts/test-api-endpoints.js`
- [ ] All endpoints respond correctly
- [ ] Error handling works

## Sign-Off

- [ ] All critical path tests pass
- [ ] All error scenarios handled
- [ ] Performance meets targets
- [ ] Security audit passed
- [ ] Browser compatibility verified
- [ ] Accessibility verified
- [ ] Documentation complete

**Tested By:** _________________  
**Date:** _________________  
**Status:** ☐ Ready for Launch  ☐ Needs Fixes

### Scenario 2: Admin Operations
1. Login as admin
2. View clients list
3. View client details
4. Check analytics
5. View billing reconciliation
6. Create employee account
7. View audit logs
8. Manage knowledge base

### Scenario 3: Error Recovery
1. Trigger 429 rate limit
2. Verify error message
3. Wait for reset
4. Verify request succeeds
5. Trigger invalid JSON error
6. Verify graceful error handling
7. Trigger network timeout
8. Verify timeout handling

## Automated Testing

### Unit Tests
- [ ] Run: `npm test` or `pnpm test`
- [ ] All tests pass
- [ ] Coverage > 80%

### E2E Tests
- [ ] Run: `bash scripts/test-e2e-flow.sh`
- [ ] All critical paths pass
- [ ] No regressions

### API Tests
- [ ] Run: `node scripts/test-api-endpoints.js`
- [ ] All endpoints respond correctly
- [ ] Error handling works

## Sign-Off

- [ ] All critical path tests pass
- [ ] All error scenarios handled
- [ ] Performance meets targets
- [ ] Security audit passed
- [ ] Browser compatibility verified
- [ ] Accessibility verified
- [ ] Documentation complete

**Tested By:** _________________  
**Date:** _________________  
**Status:** ☐ Ready for Launch  ☐ Needs Fixes
