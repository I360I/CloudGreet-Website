<!-- fec4bcac-767a-4928-a099-5ccceffc4328 663117b0-8eee-46ef-8fa2-ac91a78dce5f -->
# Fix Critical Real Issues Plan

## Critical Problems Found

### 1. Authentication Function Mismatch (BREAKING)

**Problem**: `app/api/calls/history/route.ts` and `app/api/calls/recording/route.ts` import `verifyJWT` from `@/lib/auth-middleware` but:

- The file only exports `requireAuth` and `requireAdmin`
- They expect `verifyJWT(request)` to return `{ user: { id: string } }`
- But `requireAuth` returns `{ success, userId, businessId }`

**Fix**:

- Add `verifyJWT` function to `lib/auth-middleware.ts` that wraps `requireAuth` and returns the expected format
- OR update the two API endpoints to use `requireAuth` with correct property access

**Files**:

- `lib/auth-middleware.ts` - Add verifyJWT function
- `app/api/calls/history/route.ts` - Fix auth usage
- `app/api/calls/recording/route.ts` - Fix auth usage

### 2. Syntax Error (BREAKS BUILD)

**Problem**: `app/api/health/env/route.ts` line 158 has "consul for" instead of "for"

**Fix**: Change "consul for" to "for"

**File**: `app/api/health/env/route.ts`

### 3. Database Schema Mismatch (BREAKS APPOINTMENTS)

**Problem**: `app/api/retell/voice-webhook/route.ts` inserts into `appointments` table but:

- Schema requires `title TEXT NOT NULL` column
- Insert statement doesn't include `title`

**Fix**: Add `title` field to insert: `title: service` or `title: \`${service} - ${name}\``

**File**: `app/api/retell/voice-webhook/route.ts`

### 4. Missing Webhook Signature Verification (SECURITY)

**Problem**:

- `app/api/sms/webhook/route.ts` - No signature verification
- `app/api/retell/voice-webhook/route.ts` - No signature verification mentioned

**Fix**:

- Add signature verification using `lib/webhook-verification.ts` functions
- OR document that verification is intentionally skipped for development

**Files**:

- `app/api/sms/webhook/route.ts`
- `app/api/retell/voice-webhook/route.ts`

### 5. Missing Consents Table (WILL CRASH)

**Problem**: `app/api/sms/webhook/route.ts` inserts into `consents` table which may not exist

**Fix**:

- Verify table exists in schema
- Migration already created: `migrations/CREATE_CONSENTS_TABLE.sql`
- Ensure it's included in main schema file

**Files**:

- `ULTIMATE_COMPLETE_SUPABASE_SCHEMA.sql` - Verify consents table included
- `migrations/CREATE_CONSENTS_TABLE.sql` - Already exists

### 6. Auth Middleware Return Type Mismatch

**Problem**: Code expects `authResult.user.id` but `requireAuth` returns `userId` directly

**Fix**: Standardize on one format - either:

- Update endpoints to use `authResult.userId` 
- OR create wrapper that returns `{ user: { id } }` format

## Implementation Steps

1. Fix syntax error in health endpoint (blocking build)
2. Add `verifyJWT` function to auth-middleware OR fix endpoints to use `requireAuth`
3. Fix appointments insert to include `title` field
4. Add webhook signature verification (or document why skipped)
5. Verify consents table in schema
6. Test authentication flow end-to-end

## Testing

After fixes:

- Verify `/api/calls/history` returns 401 without auth
- Verify `/api/calls/recording` returns 401 without auth  
- Test appointment booking creates record with title
- Test webhook endpoints handle signature verification
- Verify no TypeScript/build errors

### To-dos

- [ ] Audit all environment variables - verify which are actually used vs documented, check Vercel config, create validation script
- [ ] Audit database schema - verify all 70+ referenced tables exist, check RLS policies, identify missing pieces
- [ ] Map all API routes - verify what exists vs documented, check auth/validation, identify missing endpoints
- [ ] Test complete client journey end-to-end - signup through first call to identify broken links
- [ ] Fix syntax errors - especially CallPlayer.tsx broken fetch URL and any other build-blocking issues
- [ ] Complete appointment booking - make Retell webhook call createCalendarEvent() after booking, add Stripe $50 fee
- [ ] Create missing API endpoints - /api/calls/recording, /api/calls/history, any others discovered
- [ ] Verify Retell AI integration - webhook config, call flow, recordings, transcripts
- [ ] Dashboard completeness - verify all components work, test call playback, appointment display, ROI metrics
- [ ] Database migrations - create missing tables/columns, add indexes, verify RLS policies
- [ ] Vercel configuration - verify env vars mapping, function timeouts, deployment build process
- [ ] Create honest status document - what actually works, what needs setup, known limitations, deployment checklist