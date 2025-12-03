# STEP 5: Test Interactive Features

## Goal
Verify all interactive features work: modals, buttons, calendar interactions, appointment CRUD operations.

## Test Scenarios

### Scenario 1: Create Appointment Modal
**Steps:**
1. Go to dashboard
2. Click "Create Appointment" button (in Control Center or main dashboard)
3. **Expected:** Modal opens with appointment form

**Verification:**
- ✅ Modal opens smoothly
- ✅ Form fields are visible and editable
- ✅ Date picker works
- ✅ Time picker works
- ✅ Service dropdown works
- ✅ All fields validate correctly

**Form Fields to Test:**
- Customer Name (required)
- Customer Phone (required, format validation)
- Customer Email (optional, email validation)
- Service Type (required, dropdown)
- Date (required, date picker)
- Start Time (required, time picker)
- End Time (required, time picker)
- Address (optional)
- Notes (optional)
- Estimated Value (optional, number)

---

### Scenario 2: Create Appointment Submission
**Steps:**
1. Fill out appointment form
2. Click "Create Appointment" or "Save"
3. **Expected:** Appointment created, modal closes, calendar updates

**Verification:**
- ✅ Form validation works (required fields)
- ✅ API call succeeds (`POST /api/appointments/create`)
- ✅ Success message displays
- ✅ Modal closes
- ✅ Calendar widget updates (new appointment appears)
- ✅ Metrics update (appointment count increases)
- ✅ No errors in console

---

### Scenario 3: Full Calendar Modal
**Steps:**
1. Go to dashboard
2. Click "Open full calendar" button (in Week Calendar Widget)
3. **Expected:** Full calendar modal opens

**Verification:**
- ✅ Modal opens
- ✅ Calendar displays correctly
- ✅ Can switch between views (Month, Week, Day, Agenda)
- ✅ Appointments are visible
- ✅ Can click on appointments
- ✅ Can click on days
- ✅ Navigation works (prev/next month/week/day)

---

### Scenario 4: Calendar View Switching
**Steps:**
1. In full calendar modal
2. Click view buttons: Month, Week, Day, Agenda
3. **Expected:** Calendar switches views correctly

**Verification:**
- ✅ Month view displays correctly
- ✅ Week view displays correctly
- ✅ Day view displays correctly
- ✅ Agenda view displays correctly
- ✅ Appointments appear in all views
- ✅ Navigation works in all views

---

### Scenario 5: Edit Appointment
**Steps:**
1. Click on an appointment (in calendar or list)
2. Click "Edit" button
3. **Expected:** Edit modal opens with appointment data pre-filled

**Verification:**
- ✅ Edit modal opens
- ✅ All fields are pre-filled with current data
- ✅ Can modify any field
- ✅ Click "Save" updates appointment
- ✅ API call succeeds (`PUT /api/appointments/[id]`)
- ✅ Calendar updates with changes
- ✅ Success message displays

---

### Scenario 6: Delete Appointment
**Steps:**
1. Click on an appointment
2. Click "Delete" button
3. Confirm deletion
4. **Expected:** Appointment deleted, removed from calendar

**Verification:**
- ✅ Confirmation dialog appears
- ✅ Can cancel deletion
- ✅ Confirming deletion removes appointment
- ✅ API call succeeds (`DELETE /api/appointments/[id]`)
- ✅ Calendar updates (appointment removed)
- ✅ Metrics update (appointment count decreases)
- ✅ Success message displays

---

### Scenario 7: View Appointment Details
**Steps:**
1. Click on an appointment
2. **Expected:** Appointment details modal/sidebar opens

**Verification:**
- ✅ Details modal opens
- ✅ All appointment information displays:
  - Customer name, phone, email
  - Service type
  - Date and time
  - Address
  - Notes
  - Status
  - Estimated value
- ✅ Can edit from details view
- ✅ Can delete from details view

---

### Scenario 8: Day Details Sidebar
**Steps:**
1. Click on a day in calendar
2. **Expected:** Day details sidebar opens

**Verification:**
- ✅ Sidebar opens
- ✅ Shows all appointments for that day
- ✅ Can click appointments to view details
- ✅ Can create new appointment for that day
- ✅ Sidebar closes when clicking outside

---

### Scenario 9: Calendar Day Click
**Steps:**
1. Click on a day in calendar (month/week view)
2. **Expected:** Day details or appointment creation

**Verification:**
- ✅ Day click triggers correct action
- ✅ If day has appointments, shows details
- ✅ If day is empty, can create appointment
- ✅ Date is pre-filled in create form

---

### Scenario 10: Timeframe Filter
**Steps:**
1. On dashboard
2. Change timeframe filter (7d, 30d, 90d, custom)
3. **Expected:** Metrics and charts update

**Verification:**
- ✅ Metrics update for selected timeframe
- ✅ Charts update for selected timeframe
- ✅ Calendar data updates
- ✅ API calls use correct date range
- ✅ Loading states display during update

---

### Scenario 11: Dashboard Refresh
**Steps:**
1. On dashboard
2. Click refresh button (if exists) or wait for auto-refresh
3. **Expected:** Data refreshes

**Verification:**
- ✅ Manual refresh works
- ✅ Auto-refresh works (if enabled)
- ✅ Data updates correctly
- ✅ No duplicate data
- ✅ Loading states display

---

### Scenario 12: Modal Interactions
**Test all modals:**
- Create Appointment Modal
- Edit Appointment Modal
- Appointment Details Modal
- Full Calendar Modal
- Day Details Sidebar

**Verification for each:**
- ✅ Opens smoothly with animation
- ✅ Closes when clicking outside (if applicable)
- ✅ Closes when pressing ESC key
- ✅ Closes when clicking X button
- ✅ Focus trap works (keyboard navigation)
- ✅ Scrollable if content is long
- ✅ Responsive on mobile

---

## API Endpoints to Test

### 1. Create Appointment
- **Endpoint:** `/api/appointments/create`
- **Method:** POST
- **Expected:** 200 OK, returns appointment data
- **Verify:** Appointment created in database

### 2. Get Appointment
- **Endpoint:** `/api/appointments/[id]`
- **Method:** GET
- **Expected:** 200 OK, returns appointment data
- **Verify:** Returns correct appointment

### 3. Update Appointment
- **Endpoint:** `/api/appointments/[id]`
- **Method:** PUT
- **Expected:** 200 OK, returns updated appointment
- **Verify:** Appointment updated in database

### 4. Delete Appointment
- **Endpoint:** `/api/appointments/[id]`
- **Method:** DELETE
- **Expected:** 200 OK
- **Verify:** Appointment deleted from database

### 5. Calendar Data
- **Endpoint:** `/api/dashboard/calendar`
- **Method:** GET
- **Expected:** 200 OK, returns appointments
- **Verify:** Returns appointments for date range

---

## Common Issues & Fixes

### Issue: Modal doesn't open
**Fix:** Check button onClick handler, verify state management

### Issue: Form doesn't submit
**Fix:** Check form validation, verify API endpoint

### Issue: Calendar doesn't update after create/edit/delete
**Fix:** Check optimistic updates, verify data refresh

### Issue: Date/Time picker doesn't work
**Fix:** Check component implementation, verify date format

### Issue: Appointment doesn't appear in calendar
**Fix:** Check date format, verify calendar query

---

## Success Criteria

✅ **Interactive Features Verified When:**
- All modals open and close correctly
- All forms submit successfully
- Calendar displays appointments correctly
- Can create, edit, delete appointments
- All buttons work
- All interactions are smooth
- No errors in console
- No broken functionality

---

## Next Steps

After verifying interactive features:
- **STEP 6:** Test Full User Journey (4-6 hours)

