# Full User Journey Test Checklist

## Complete New User Journey

### ✅ Registration
- [ ] Go to `/register-simple`
- [ ] Fill out form
- [ ] Submit
- [ ] Verify redirect to `/onboarding`

### ✅ Onboarding
- [ ] Complete Step 1: Business Info
- [ ] Complete Step 2: Services
- [ ] Complete Step 3: Calendar (or skip)
- [ ] Complete Step 4: Phone
- [ ] Complete Step 5: Review & Complete
- [ ] Verify redirect to `/dashboard`

### ✅ Dashboard
- [ ] Dashboard loads
- [ ] Metrics display
- [ ] Calendar widget displays
- [ ] Charts display
- [ ] No errors

### ✅ Create Appointment
- [ ] Click "Create Appointment"
- [ ] Fill out form
- [ ] Submit
- [ ] Verify appointment created
- [ ] Verify appears in calendar

### ✅ View Appointment
- [ ] Click on appointment
- [ ] Verify details display

### ✅ Edit Appointment
- [ ] Click "Edit"
- [ ] Modify fields
- [ ] Save
- [ ] Verify changes visible

### ✅ Delete Appointment
- [ ] Click "Delete"
- [ ] Confirm
- [ ] Verify removed from calendar

### ✅ Logout & Login
- [ ] Logout
- [ ] Login
- [ ] Verify dashboard loads
- [ ] Verify data persists

---

## Returning User Journey

### ✅ Login
- [ ] Go to `/login`
- [ ] Enter credentials
- [ ] Submit
- [ ] Verify redirect to `/dashboard` (NOT onboarding)

### ✅ Dashboard
- [ ] Dashboard loads
- [ ] Previous data displays
- [ ] Metrics show correct numbers
- [ ] Calendar shows appointments

### ✅ Create New Appointment
- [ ] Create appointment
- [ ] Verify appears in calendar

### ✅ Refresh Page
- [ ] Refresh browser
- [ ] Verify all data still there

### ✅ Close & Reopen Browser
- [ ] Close browser
- [ ] Reopen and login
- [ ] Verify all data persists

---

## Multi-Tenant Isolation

### ✅ Create User 1
- [ ] Register: `user1@test.com`
- [ ] Complete onboarding
- [ ] Create appointment: "User 1 Appointment"

### ✅ Create User 2
- [ ] Register: `user2@test.com`
- [ ] Complete onboarding
- [ ] Create appointment: "User 2 Appointment"

### ✅ Verify Isolation
- [ ] Login as User 1
- [ ] Verify only sees "User 1 Appointment"
- [ ] Login as User 2
- [ ] Verify only sees "User 2 Appointment"

### ✅ Verify Personalization
- [ ] User 1 sees business-specific content
- [ ] User 2 sees business-specific content

---

## Data Persistence

### ✅ Create Data
- [ ] Create 3 appointments
- [ ] Update business settings

### ✅ Refresh Page
- [ ] Refresh browser
- [ ] Verify all data still there

### ✅ Logout & Login
- [ ] Logout
- [ ] Login
- [ ] Verify all data still there

### ✅ Close Browser
- [ ] Close browser
- [ ] Reopen and login
- [ ] Verify all data still there

### ✅ Check Database
- [ ] Verify data in Supabase
- [ ] Verify matches UI

---

## Error Recovery

### ✅ Network Error
- [ ] Disconnect internet
- [ ] Try to create appointment
- [ ] Verify error message
- [ ] Reconnect
- [ ] Retry
- [ ] Verify succeeds

### ✅ API Error
- [ ] Trigger API error
- [ ] Verify error message
- [ ] Fix error
- [ ] Retry
- [ ] Verify succeeds

---

## Performance

### ✅ Initial Load
- [ ] Login to dashboard
- [ ] Verify loads within 3 seconds

### ✅ Loading States
- [ ] Verify loading spinners display
- [ ] Verify disappear when data loads

### ✅ Interactions
- [ ] Click buttons
- [ ] Open modals
- [ ] Verify responsive, no lag

---

## Success = All Checkboxes Checked ✅

