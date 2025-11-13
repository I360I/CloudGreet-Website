<!-- 9e9c202b-e887-4a05-b84b-85d61d4c97de feaf2d4e-455c-473c-b37c-560e6a69a5a6 -->
# Pre-Launch Verification & Churn Reduction Plan

## Goal

Reduce estimated churn from 40-50% to 15-25% by verifying critical systems and fixing gaps before launch.

## Critical Gaps Identified

1. **SIP Format Unverified** - The Telnyx→Retell SIP bridge format hasn't been tested with a real call
2. **No End-to-End Call Test** - No script to verify the complete call flow works
3. **Retell Linking Unknown** - API linking may require manual fallback
4. **Onboarding Error Handling** - Errors could be clearer
5. **Support System Validation** - Need to verify all support channels work

---

## Phase 1: SIP Format Verification (CRITICAL - Blocks Launch)

### 1.1 Create Real Call Test Script

**File**: `scripts/test-sip-bridge.js`

Create a script that:

- Places a real test call through Telnyx to a test business number
- Monitors webhook logs to see which SIP format succeeds
- Verifies call connects to Retell AI agent
- Logs the successful SIP format for future reference
- Tests all 3 fallback formats if needed

**Acceptance Criteria**:

- Script successfully places test call
- Call connects to Retell AI (not just Telnyx)
- Logs show which SIP format worked
- If all formats fail, logs detailed error for debugging

### 1.2 Admin UI: SIP Format Tester

**File**: `app/admin/test-call/page.tsx`

Create admin page with:

- Button to place test call to any business number
- Real-time log viewer showing SIP transfer attempts
- Success/failure indicators
- Option to manually specify SIP format for testing

**Acceptance Criteria**:

- Admin can test any business's call routing
- Shows which SIP format succeeded
- Displays clear success/failure status

### 1.3 Update SIP Format Based on Test Results

**File**: `app/api/telnyx/voice-webhook/route.ts`

If test reveals correct format:

- Update primary SIP format to match test results
- Keep fallbacks but reorder based on success rate
- Add logging to track which format succeeds in production

**Acceptance Criteria**:

- Primary SIP format matches verified working format
- Fallbacks ordered by likelihood of success
- Production logs show format success rates

---

## Phase 2: Retell Linking Verification

### 2.1 Test Retell API Linking

**File**: `scripts/test-retell-linking.js`

Create script to:

- Test if Retell API endpoint `/v2/link-phone-number` exists
- Attempt to link a test phone number to a test agent
- Log success/failure with detailed error messages
- Document manual linking process if API doesn't work

**Acceptance Criteria**:

- Script tests Retell linking API
- Logs clear success/failure
- Documents manual process if needed

### 2.2 Admin UI: Manual Retell Linking Helper

**File**: `app/admin/phone-inventory/page.tsx` (enhancement)

Add to existing phone inventory page:

- Button to "Link to Retell" for each assigned number
- Shows Retell agent ID and phone number for easy copy/paste
- Instructions for manual linking in Retell dashboard
- Status indicator showing if number is linked

**Acceptance Criteria**:

- Admin can see which numbers need manual linking
- Clear instructions for Retell dashboard linking
- Status updates when linking is complete

---

## Phase 3: End-to-End Call Flow Testing

### 3.1 Create Comprehensive E2E Test

**File**: `scripts/test-complete-call-flow.js`

Create script that tests:

1. Customer calls business toll-free number
2. Telnyx webhook fires → call bridged to Retell
3. Retell AI answers and has conversation
4. AI books appointment (if applicable)
5. SMS confirmation sent
6. Call logged in database
7. Appointment appears in dashboard

**Acceptance Criteria**:

- All steps complete successfully
- Logs show each step's success/failure
- Test can be run repeatedly for verification

### 3.2 Synthetic Monitor: Call Flow Health

**File**: `.github/workflows/test-call-flow.yml`

Create GitHub Actions workflow that:

- Runs E2E call flow test daily
- Alerts on failure
- Tracks success rate over time

**Acceptance Criteria**:

- Automated daily testing
- Alerts sent on failure
- Success rate tracked in logs

---

## Phase 4: Onboarding Error Handling Improvements

### 4.1 Enhanced Error Messages

**File**: `app/api/onboarding/complete/route.ts`

Improve error handling:

- Return specific error messages for each failure point
- Include actionable next steps in error responses
- Log detailed errors for debugging
- Provide retry mechanisms where possible

**Acceptance Criteria**:

- Users see clear, actionable error messages
- Errors include next steps (e.g., "Contact support at...")
- Detailed errors logged for debugging

### 4.2 Onboarding Progress Recovery

**File**: `app/api/onboarding/state/route.ts` (enhancement)

Add recovery features:

- Save progress at each step
- Allow resuming from last completed step
- Show what's already completed
- Skip completed steps on retry

**Acceptance Criteria**:

- Users can resume onboarding if interrupted
- Progress saved between steps
- Clear indication of what's done vs. remaining

---

## Phase 5: Support System Validation

### 5.1 Verify Contact Form Works

**File**: `app/api/contact/submit/route.ts`

Test and verify:

- Form submissions are received
- Emails are sent to support inbox
- Confirmation messages displayed to user
- Errors handled gracefully

**Acceptance Criteria**:

- Test submission succeeds
- Support receives email
- User sees confirmation

### 5.2 Verify Help Center Content

**File**: `app/help/page.tsx`

Review and enhance:

- All FAQs are accurate and helpful
- Links to support channels work
- Search functionality works
- Content covers common issues

**Acceptance Criteria**:

- Help center answers common questions
- All links functional
- Search returns relevant results

### 5.3 Support Email Verification

**File**: Documentation update

Verify:

- Support email address is monitored
- Auto-responder configured (optional)
- Response time expectations documented

**Acceptance Criteria**:

- Support email receives messages
- Response process documented
- Expected response time communicated

---

## Phase 6: Pre-Launch Checklist & Documentation

### 6.1 Create Pre-Launch Checklist

**File**: `docs/PRE_LAUNCH_CHECKLIST.md`

Document:

- All systems verified working
- Test results recorded
- Support channels validated
- Known issues documented
- Rollback plan if issues found

**Acceptance Criteria**:

- Complete checklist with all items verified
- Test results documented
- Known issues listed with workarounds

### 6.2 Launch Day Runbook

**File**: `docs/LAUNCH_DAY_RUNBOOK.md`

Create runbook with:

- Step-by-step launch procedure
- Monitoring checklist
- Issue response procedures
- Escalation contacts
- Success criteria

**Acceptance Criteria**:

- Clear launch procedure
- Monitoring plan defined
- Issue response documented

---

## Success Criteria

### Must Have (Blocks Launch):

- [ ] SIP format verified with real call test
- [ ] At least 1 successful end-to-end call flow test
- [ ] Retell linking process documented (API or manual)
- [ ] Contact form verified working

### Should Have (Reduces Churn):

- [ ] Onboarding error handling improved
- [ ] Help center content reviewed
- [ ] Support email verified
- [ ] Pre-launch checklist completed

### Nice to Have (Polish):

- [ ] Admin UI for call testing
- [ ] Automated daily call flow tests
- [ ] Onboarding progress recovery

---

## Risk Mitigation

### If SIP Format Wrong:

- Test reveals correct format → Update code → Re-test
- If format unknown → Contact Retell support → Document → Update

### If Retell Linking Fails:

- API doesn't work → Create admin UI helper → Document manual process
- Manual process required → Add to onboarding instructions

### If E2E Test Fails:

- Identify failure point → Fix issue → Re-test
- Document workaround if needed

---

## Timeline Estimate

- **Phase 1 (SIP Verification)**: 4-6 hours
- **Phase 2 (Retell Linking)**: 2-3 hours
- **Phase 3 (E2E Testing)**: 3-4 hours
- **Phase 4 (Error Handling)**: 2-3 hours
- **Phase 5 (Support Validation)**: 1-2 hours
- **Phase 6 (Documentation)**: 2-3 hours

**Total**: 14-21 hours

---

## Expected Outcome

After completion:

- **Churn Risk**: Reduced from 40-50% to 15-25%
- **Confidence**: High that calls will work on launch
- **Support**: Ready to handle customer issues
- **Documentation**: Complete for launch day operations

### To-dos

- [ ] Check every admin route listed in ENDPOINTS_AUTH_SUMMARY.md - verify which exist and which are missing
- [ ] Create real call test script (scripts/test-sip-bridge.js) to verify SIP format works
- [ ] Create admin UI for testing call routing (app/admin/test-call/page.tsx)
- [ ] Update SIP format in voice-webhook based on test results
- [ ] Test Retell API linking and document manual process if needed
- [ ] Add manual Retell linking helper to phone inventory page
- [ ] Create comprehensive end-to-end call flow test script
- [ ] Create GitHub Actions workflow for daily call flow testing
- [ ] Improve onboarding error messages and add recovery features
- [ ] Test and verify contact form works end-to-end
- [ ] Review and verify help center content and functionality
- [ ] Verify support email is monitored and response process documented
- [ ] Create comprehensive pre-launch checklist with all verification results
- [ ] Create launch day runbook with procedures and monitoring plan