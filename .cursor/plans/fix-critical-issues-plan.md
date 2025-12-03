# Fix Critical Real Issues - Implementation Plan

## PLAN

### Step 1: Fix Syntax Error (BLOCKING BUILD) ✅
- **File**: `app/api/health/env/route.ts` line 158
- **Issue**: "consul for" instead of "for"
- **Fix**: Change to "for"
- **Priority**: CRITICAL - Blocks build
- **Status**: ✅ FIXED

### Step 2: Add verifyJWT Function (BREAKING) ✅
- **Files**: 
  - `lib/auth-middleware.ts` - Add `verifyJWT` wrapper
  - `app/api/calls/history/route.ts` - Uses `verifyJWT` (needs to work)
  - `app/api/calls/recording/route.ts` - Uses `verifyJWT` (needs to work)
- **Issue**: Endpoints import `verifyJWT` which doesn't exist; they expect `{ user: { id: string } }` format
- **Fix**: Add `verifyJWT` function that wraps `requireAuth` and returns expected format
- **Priority**: HIGH - Breaks authenticated endpoints
- **Status**: ✅ FIXED

### Step 3: Fix Appointments Schema Mismatch (BREAKS APPOINTMENTS) ✅
- **File**: `app/api/retell/voice-webhook/route.ts`
- **Issue**: Schema requires `title TEXT NOT NULL` but insert doesn't include it
- **Fix**: Add `title` field to insert statement (use service name or fallback)
- **Priority**: HIGH - Appointment booking will fail
- **Status**: ✅ FIXED

### Step 4: Add Webhook Signature Verification (SECURITY)
- **Files**: 
  - `app/api/sms/webhook/route.ts` - No signature verification
  - `app/api/retell/voice-webhook/route.ts` - No signature verification
- **Issue**: Public webhook endpoints have no signature verification (security risk)
- **Fix**: 
  - Add Telnyx signature verification to SMS webhook using `lib/webhook-verification.ts`
  - Add Retell signature verification to voice-webhook (need to add `verifyRetellSignature` function)
  - Follow pattern: allow in development, require in production
- **Priority**: HIGH - Security vulnerability
- **Status**: 🔄 IN PROGRESS

### Step 5: Verify Consents Table (WILL CRASH)
- **Files**:
  - `app/api/sms/webhook/route.ts` - Inserts into `consents` table
  - `ULTIMATE_COMPLETE_SUPABASE_SCHEMA.sql` - Verify table exists
  - `migrations/CREATE_CONSENTS_TABLE.sql` - Migration exists
- **Issue**: Consents table may not exist in main schema
- **Fix**: 
  - Verify table exists in main schema
  - If missing, add it OR document that migration must be run
- **Priority**: MEDIUM - Webhook will fail if table missing
- **Status**: ⏳ PENDING

**Acceptance Criteria**
- [ ] All syntax errors fixed - build succeeds
- [ ] `/api/calls/history` returns 401 without auth, 200 with valid JWT
- [ ] `/api/calls/recording` returns 401 without auth, 200 with valid JWT
- [ ] Appointment booking creates record with `title` field populated
- [ ] SMS webhook verifies Telnyx signature in production
- [ ] Retell voice-webhook verifies Retell signature in production (or documents why skipped)
- [ ] Consents table verified in schema or migration documented
- [ ] No TypeScript/build errors
- [ ] All endpoints tested manually or via tests

**Risks/Mitigations**
- **Risk**: Adding signature verification may break existing webhooks in development
  - **Mitigation**: Allow skipping in development mode (NODE_ENV check)
- **Risk**: Retell signature verification may not be documented
  - **Mitigation**: Research Retell docs or create function following HMAC-SHA256 pattern from tests
- **Risk**: Consents table missing could break production
  - **Mitigation**: Add table to main schema OR document migration requirement clearly

**Test Plan**
- **Unit**: 
  - Test `verifyJWT` returns correct format
  - Test webhook signature verification functions
- **Integration**:
  - Test `/api/calls/history` with/without auth
  - Test `/api/calls/recording` with/without auth
  - Test appointment booking creates record with title
  - Test webhook endpoints with valid/invalid signatures
- **Manual**:
  - Verify build succeeds
  - Test auth endpoints in browser/Postman
  - Verify webhook endpoints accept/reject based on signature

## CHANGE SUMMARY

### What changed:
1. Fixed syntax error in health endpoint (build blocker)
2. Added `verifyJWT` wrapper function to auth-middleware
3. Added `title` field to appointments insert

### Why:
- Syntax error prevents build/deployment
- Missing `verifyJWT` breaks two API endpoints
- Missing `title` field violates schema constraint and breaks appointment booking

### Alternatives considered:
- **Auth**: Could update endpoints to use `requireAuth` directly, but `verifyJWT` matches expected interface
- **Title**: Could use different title format, but service name is appropriate

### Migrations:
- None required (consents table migration already exists if needed)

### Rollout/rollback:
- Safe to deploy - fixes are additive/corrective
- No breaking changes to existing functionality
- If issues arise, can revert individual changes

## TEST NOTES

### Commands:
```bash
# Build check
npm run build

# Type check
npm run type-check  # or npx tsc --noEmit

# Lint
npm run lint

# Test auth endpoints
curl -X GET http://localhost:3000/api/calls/history?businessId=xxx
curl -X GET -H "Authorization: Bearer <token>" http://localhost:3000/api/calls/history?businessId=xxx
```

### Manual checks:
1. ✅ Build succeeds without syntax errors
2. ✅ `/api/calls/history` requires auth
3. ✅ `/api/calls/recording` requires auth
4. ✅ Appointment booking includes title field
5. ⏳ Webhook signature verification works

### Sample payloads:
- **Auth**: `Authorization: Bearer <jwt_token>`
- **Webhook**: Check Telnyx/Retell documentation for signature format













