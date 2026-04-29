# STEP 3: Verify Data Flow

## Goal
Verify that APIs return real data, database queries work, and data displays correctly in the dashboard.

## Actions Taken

### 1. Created Test Data Script
- **File:** `scripts/create-test-data.js`
- **Purpose:** Creates test appointments and calls in the database
- **Usage:** `node scripts/create-test-data.js`
- **Requirements:** 
  - `NEXT_PUBLIC_SUPABASE_URL` environment variable
  - `SUPABASE_SERVICE_ROLE_KEY` environment variable

### 2. API Response Logging
- ✅ Already added to `app/api/dashboard/calendar/route.ts`
- ✅ Already added to `app/api/dashboard/real-metrics/route.ts`
- Logs response sizes and data counts for debugging

### 3. Database Query Verification
- Need to verify queries return data
- Need to check for RLS (Row Level Security) issues
- Need to verify `business_id` filtering works

## Testing Steps

### Step 1: Create Test Data
```bash
# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run script
node scripts/create-test-data.js
```

### Step 2: Verify API Responses
1. Open dashboard in browser
2. Open browser DevTools → Network tab
3. Check API responses:
   - `/api/dashboard/real-metrics?timeframe=7d`
   - `/api/dashboard/calendar?view=agenda&startDate=...&endDate=...`
4. Verify:
   - Response status is 200
   - Response contains actual data (not empty arrays)
   - Response size > 0
   - Data structure is correct

### Step 3: Verify Dashboard Display
1. Check dashboard metrics cards:
   - Should show test data counts
   - Should not show "0" for everything
2. Check calendar widget:
   - Should show test appointments
   - Should be clickable/interactive
3. Check charts:
   - Should display data (not empty)
   - Should update when timeframe changes

### Step 4: Verify Database Queries
1. Check Supabase logs for query execution
2. Verify queries use correct `business_id` filter
3. Verify RLS policies allow data access
4. Check for any query errors

## Expected Results

- ✅ Test data created successfully
- ✅ API responses contain real data
- ✅ Dashboard displays test data
- ✅ No empty responses
- ✅ Data structure is correct
- ✅ Queries execute successfully

## Next Steps

After verifying data flow:
- **STEP 4:** Test Onboarding Flow (2-3 hours)
- **STEP 5:** Test Interactive Features (3-4 hours)
- **STEP 6:** Test Full User Journey (4-6 hours)

