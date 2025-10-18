# COMPREHENSIVE SMOKE AND MIRRORS LIST

## APIs THAT FAKE SUCCESS (Need to be fixed or deleted)

### 1. `/api/automation/follow-up-sequence/route.ts`
- **Lines 291-319**: `executeEmailAction`, `executeCallAction`, `executeDemoScheduleAction` all return fake success without actually doing anything
- **Fix**: Either integrate with real services (Resend for email, Telnyx for calls, Calendly for demos) or delete the API

### 2. `/api/sms/forward/route.ts`
- Returns success without actually forwarding SMS
- **Fix**: Integrate with Telnyx SMS forwarding or delete

### 3. `/api/sms/send-review/route.ts`
- Returns success without actually sending review requests
- **Fix**: Integrate with real SMS service or delete

### 4. `/api/phone/handle-call/route.ts`
- Returns success without actually handling calls
- **Fix**: Integrate with Telnyx call handling or delete

### 5. `/api/apollo-killer/tracking/sms-delivery/route.ts`
- Returns success without actually tracking SMS
- **Fix**: Integrate with Telnyx delivery tracking or delete

## COMPONENTS WITH FAKE DATA

### 1. `/app/components/SimpleOnboardingWizard.tsx` (24 fake/demo references)
- Likely has hardcoded demo data
- **Fix**: Audit and remove all fake data

### 2. `/app/components/OnboardingWizard.tsx` (14 fake/demo references)
- Likely has hardcoded demo data
- **Fix**: Audit and remove all fake data

### 3. `/app/components/CampaignBuilder.tsx` (4 fake/demo references)
- **Fix**: Audit and remove all fake data

### 4. `/app/components/LeadActivityTracker.tsx` (4 fake/demo references)
- **Fix**: Audit and remove all fake data

### 5. `/app/components/IntelligentLeadScoring.tsx` (5 fake/demo references)
- **Fix**: Audit and remove all fake data

### 6. `/app/components/AIAgentCustomization.tsx` (5 fake/demo references)
- **Fix**: Audit and remove all fake data

## APIs WITH PLACEHOLDER CODE (104 total matches across 29 files)

Need to audit each one individually:
- `/app/api/admin/convert-lead-to-client/route.ts`
- `/app/api/health/route.ts` (14 matches!)
- `/app/api/click-to-call/initiate/route.ts`
- `/app/api/leads/scoring/advanced/route.ts`
- `/app/api/leads/segmentation/route.ts` (9 matches!)
- `/app/api/automation/email-templates/route.ts` (9 matches!)
- `/app/api/support/proactive-help/route.ts` (11 matches!)
- `/app/api/ai/conversation-demo/route.ts` (5 matches!)
- And 21 more files...

## NEXT STEPS

1. Start with the worst offenders (files with 9+ matches)
2. For each file:
   - Read the entire file
   - Identify fake data, placeholder functions, incomplete features
   - Either fix it completely or delete it
   - Test after each fix
3. Move to the next file

## PRIORITY ORDER

1. **HIGH PRIORITY - FAKE SUCCESS RETURNS**
   - `/api/automation/follow-up-sequence/route.ts`
   - `/api/sms/forward/route.ts`
   - `/api/sms/send-review/route.ts`
   - `/api/phone/handle-call/route.ts`

2. **MEDIUM PRIORITY - PLACEHOLDER CODE**
   - `/app/api/health/route.ts` (14 matches)
   - `/app/api/support/proactive-help/route.ts` (11 matches)
   - `/app/api/automation/email-templates/route.ts` (9 matches)
   - `/app/api/leads/segmentation/route.ts` (9 matches)

3. **LOW PRIORITY - COMPONENT FAKE DATA**
   - `/app/components/SimpleOnboardingWizard.tsx` (24 matches)
   - `/app/components/OnboardingWizard.tsx` (14 matches)

