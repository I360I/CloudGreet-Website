# STEP 3: Data Flow Verification - Testing Guide

## Quick Test (No Script Needed)

### Option 1: Use Dashboard to Create Test Data
1. **Login to dashboard**
2. **Click "Create Appointment" button**
3. **Fill out form:**
   - Customer Name: "Test Customer"
   - Phone: "+1234567890"
   - Email: "test@example.com"
   - Service: Select any service
   - Date: Tomorrow
   - Time: 10:00 AM
   - Address: "123 Test St"
4. **Submit form**
5. **Verify:**
   - Appointment appears in calendar
   - Metrics update (appointments count increases)
   - No errors in console

### Option 2: Use API Directly (Browser Console)
```javascript
// In browser console on dashboard page
fetch('/api/appointments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    customer_name: 'Test Customer',
    customer_phone: '+1234567890',
    customer_email: 'test@example.com',
    service_type: 'Test Service',
    scheduled_date: new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0],
    start_time: new Date(Date.now() + 24*60*60*1000).toISOString(),
    end_time: new Date(Date.now() + 24*60*60*1000 + 60*60*1000).toISOString(),
    status: 'scheduled',
    estimated_value: 100,
    address: '123 Test St'
  })
})
.then(r => r.json())
.then(console.log)
```

## Verification Checklist

### ✅ API Responses
- [ ] `/api/dashboard/real-metrics` returns 200
- [ ] Response contains `metrics` object
- [ ] `totalAppointments` > 0 (after creating test data)
- [ ] Response size > 0 bytes
- [ ] No errors in Network tab

### ✅ Calendar API
- [ ] `/api/dashboard/calendar` returns 200
- [ ] Response contains appointments array
- [ ] Appointments array length > 0 (after creating test data)
- [ ] Response size > 0 bytes
- [ ] No errors in Network tab

### ✅ Dashboard Display
- [ ] Metrics cards show numbers (not all zeros)
- [ ] Calendar widget shows appointments
- [ ] Charts display data
- [ ] No loading spinners stuck
- [ ] No error messages

### ✅ Database Queries
- [ ] Check browser console for any query errors
- [ ] Check Supabase dashboard → Logs for query execution
- [ ] Verify `business_id` is being used in queries
- [ ] Verify data is actually in database (Supabase dashboard → Table Editor)

## Common Issues & Fixes

### Issue: All metrics show 0
**Fix:** Create test data using one of the methods above

### Issue: API returns 401
**Fix:** 
- Check if logged in
- Check if token is valid
- Try refreshing page

### Issue: API returns empty arrays
**Fix:**
- Verify test data was created
- Check `business_id` matches logged-in business
- Check RLS policies in Supabase

### Issue: Dashboard shows loading forever
**Fix:**
- Check browser console for errors
- Check Network tab for failed requests
- Verify API endpoints are accessible

## Success Criteria

✅ **Data Flow Verified When:**
- Test appointment created successfully
- API returns appointment data
- Dashboard displays appointment
- Metrics update correctly
- No errors in console or network tab

