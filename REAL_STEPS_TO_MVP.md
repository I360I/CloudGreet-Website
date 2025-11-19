# REAL STEPS TO GET MVP DONE
**Date:** January 19, 2025  
**Goal:** Working MVP in 3-5 Days  
**Current Status:** 65% Complete

---

## STEP 1: Fix Intermittent 401 Errors (2-4 hours)
**Why:** 10% of API calls fail - dashboard is unreliable

### Actions:
1. **Investigate why some calendar calls fail**
   - Check if token is being sent for all requests
   - Add logging to see token retrieval timing
   - Check if there's a race condition

2. **Fix token retrieval**
   - Ensure `fetchWithAuth` always has token before making request
   - Add retry logic for 401 errors (retry once with fresh token)
   - Cache token to avoid multiple `get-token` API calls

3. **Test all API endpoints**
   - Verify 100% success rate
   - Test with different date ranges
   - Test rapid requests

**Files to Fix:**
- `lib/auth/fetch-with-auth.ts` - Add retry logic
- `lib/auth/token-manager.ts` - Add token caching
- `app/api/dashboard/calendar/route.ts` - Verify auth check

---

## STEP 2: Fix WebSocket Connection (2-3 hours)
**Why:** Real-time updates don't work - users won't see live data

### Actions:
1. **Fix syntax error** (already fixed in code, but verify)
   - `app/contexts/RealtimeProvider.tsx` line 31 - already correct

2. **Check CSP headers**
   - Verify `next.config.js` allows WebSocket connections
   - Add `wss://*.supabase.co` to CSP if missing

3. **Verify Supabase Realtime is enabled**
   - Check Supabase dashboard → Realtime settings
   - Ensure Realtime is enabled for tables: `calls`, `appointments`, `conversation_history`

4. **Add error handling**
   - Gracefully handle WebSocket failures
   - Add fallback to polling if WebSocket fails
   - Show connection status to user

**Files to Fix:**
- `next.config.js` - Verify CSP allows WebSocket
- `app/contexts/RealtimeProvider.tsx` - Add error handling
- Test WebSocket connection

---

## STEP 3: Verify Data Flow (1-2 hours)
**Why:** Need to confirm APIs return real data, not empty responses

### Actions:
1. **Add API response logging**
   - Log response sizes in API endpoints
   - Log actual data returned

2. **Test with real data**
   - Create test appointment in database
   - Verify it appears in dashboard
   - Create test call record
   - Verify it appears in dashboard

3. **Check database queries**
   - Verify queries return data
   - Check for RLS (Row Level Security) blocking data
   - Verify `business_id` filtering works

**Files to Check:**
- `app/api/dashboard/real-metrics/route.ts` - Add logging
- `app/api/dashboard/calendar/route.ts` - Add logging
- Test with database queries

---

## STEP 4: Test Onboarding Flow (2-3 hours)
**Why:** Users need to complete onboarding to use the product

### Actions:
1. **Test registration → onboarding redirect**
   - Register new user
   - Verify redirect to `/onboarding`
   - Check if onboarding state is loaded

2. **Test all onboarding steps**
   - Step 1: Business info - verify saves
   - Step 2: Services - verify saves
   - Step 3: Calendar - verify connects
   - Step 4: Phone - verify assigns number
   - Step 5: Review - verify all data present

3. **Test onboarding completion**
   - Click "Complete Setup"
   - Verify redirect to dashboard
   - Verify all data saved in database
   - Verify business is active

**Files to Test:**
- `app/onboarding/page.tsx` - Test all steps
- `app/api/onboarding/complete/route.ts` - Verify completion
- Database - Verify all records created

---

## STEP 5: Test Interactive Features (3-4 hours)
**Why:** Core features must work for users to use the product

### Actions:
1. **Test "Create Appointment" button**
   - Click button → modal opens
   - Fill form → submit
   - Verify appointment created
   - Verify appears in calendar

2. **Test "Open full calendar" button**
   - Click button → modal opens
   - Test month/week/day views
   - Test navigation
   - Test day clicks → details show

3. **Test appointment management**
   - Edit appointment → verify updates
   - Delete appointment → verify removed
   - View appointment details → verify shows

4. **Test calendar interactions**
   - Click day → sidebar shows
   - Click appointment → details modal
   - Test all calendar views

**Files to Test:**
- `app/components/appointments/CreateAppointmentModal.tsx`
- `app/components/FullCalendarModal.tsx`
- `app/components/calendar/*` - All calendar views
- `app/api/appointments/*` - All appointment APIs

---

## STEP 6: Test Full User Journey (4-6 hours)
**Why:** Need to verify complete flow works end-to-end

### Actions:
1. **Test: Register → Onboarding → Dashboard → Create Appointment**
   - Register new account
   - Complete onboarding
   - View dashboard
   - Create appointment
   - Verify appointment appears
   - Edit appointment
   - Delete appointment

2. **Test: Login → Dashboard → View Metrics**
   - Login with existing account
   - View dashboard
   - Check metrics display
   - Verify charts show data
   - Test timeframe filters

3. **Test multi-tenant isolation**
   - Create 2 different accounts
   - Create appointments in each
   - Verify they can't see each other's data
   - Verify business personalization works

4. **Test data persistence**
   - Create data
   - Refresh page
   - Verify data still there
   - Logout and login
   - Verify data persists

**Files to Test:**
- All user-facing pages
- All API endpoints
- Database - Verify isolation

---

## STEP 7: Fix Bugs Found (2-4 hours)
**Why:** Fix any issues discovered during testing

### Actions:
1. **Document all bugs found**
   - List each bug
   - Prioritize (critical, high, medium, low)
   - Assign fixes

2. **Fix critical bugs first**
   - Anything blocking core functionality
   - Anything causing data loss
   - Anything breaking user experience

3. **Fix high-priority bugs**
   - UI/UX issues
   - Performance issues
   - Error handling issues

**Process:**
- Test → Find bug → Fix → Re-test → Repeat

---

## STEP 8: Final Verification & Deploy (2-4 hours)
**Why:** Ensure everything works before handoff

### Actions:
1. **Final end-to-end test**
   - Test complete user journey one more time
   - Verify all features work
   - Check for regressions

2. **Performance check**
   - Test page load times
   - Test API response times
   - Check for memory leaks

3. **Deploy to production**
   - Push to main branch
   - Wait for Vercel deployment
   - Test in production

4. **Production verification**
   - Test registration in production
   - Test dashboard in production
   - Verify all features work

---

## EXECUTION ORDER

### Day 1 (6-9 hours):
1. ✅ Fix 401 errors (2-4 hours)
2. ✅ Fix WebSocket (2-3 hours)
3. ✅ Verify data flow (1-2 hours)

### Day 2 (9-13 hours):
4. ✅ Test onboarding (2-3 hours)
5. ✅ Test interactive features (3-4 hours)
6. ✅ Test full journey (4-6 hours)

### Day 3 (4-8 hours):
7. ✅ Fix bugs found (2-4 hours)
8. ✅ Final verification & deploy (2-4 hours)

---

## SUCCESS CRITERIA

**MVP is "Done" when ALL of these are true:**

- ✅ 100% API success rate (0 failures)
- ✅ WebSocket connects successfully
- ✅ Data flows correctly (verified with real data)
- ✅ Onboarding works end-to-end
- ✅ Can create/edit/delete appointments
- ✅ Calendar views work
- ✅ Dashboard shows real data
- ✅ Multi-tenant isolation verified
- ✅ Full user journey works
- ✅ No critical bugs
- ✅ Deployed to production
- ✅ Tested in production

---

## STARTING NOW

**I'm starting with Step 1: Fix 401 Errors**

This is the most critical blocker. Once fixed, we can move to the next steps.

