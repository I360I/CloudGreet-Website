# 🔍 Database Audit Instructions

## How to Run the Audit

1. **Open Supabase SQL Editor**
   - Go to your Supabase dashboard
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

2. **Run the Audit Script**
   - Copy the entire contents of `migrations/AUDIT_DATABASE_SCHEMA.sql`
   - Paste into the SQL Editor
   - Click "Run" (or press Ctrl+Enter)

3. **Review Results**
   - The script runs 20 different checks
   - Look for any rows with ❌ or ⚠️ status
   - Each check shows what's wrong and what needs fixing

---

## What the Audit Checks

### ✅ Critical Checks:

1. **Table Existence** - Verifies all required tables exist
2. **Calls Table Schema** - Checks all required columns
3. **Missing Columns** - Identifies missing required columns
4. **Businesses Table** - Verifies core business table structure
5. **Missed Call Recoveries** - Checks recovery table structure
6. **Orphaned Records** - Finds calls without business_id
7. **Missing Data** - Finds calls with NULL required fields
8. **Indexes** - Verifies performance indexes exist
9. **Foreign Keys** - Checks referential integrity
10. **Data Types** - Verifies column types are correct
11. **Status Values** - Checks for invalid status values
12. **Duplicates** - Finds duplicate call_ids
13. **Null Business IDs** - Finds records missing business_id

---

## What to Look For

### ❌ **CRITICAL ISSUES** (Must Fix):
- Missing required tables
- Missing required columns
- Wrong data types
- Invalid status values
- Duplicate call_ids
- NULL business_ids in critical tables

### ⚠️ **WARNINGS** (Should Fix):
- Missing indexes (performance impact)
- Orphaned records (data integrity)
- Missing optional columns

### ✅ **GOOD** (Everything OK):
- All required tables exist
- All required columns present
- All indexes created
- No orphaned records
- Valid data types

---

## Common Issues & Fixes

### Issue: Missing `status` column in calls table
**Fix**: Run `migrations/ENSURE_CALLS_TABLE_SCHEMA.sql`

### Issue: Missing `missed_call_recoveries` table
**Fix**: Run `migrations/ADD_MISSED_CALL_RECOVERY_COLUMNS.sql`

### Issue: Orphaned calls (no business_id)
**Fix**: These are calls that came in before business was set up. They're OK to leave, or you can delete them.

### Issue: Missing indexes
**Fix**: Run the index creation statements from the audit results

### Issue: Invalid status values
**Fix**: Update the data to use valid statuses:
- Calls: 'initiated', 'answered', 'completed', 'missed', 'busy', 'failed'
- Recoveries: 'pending', 'sent', 'failed', 'cancelled'

---

## After Running the Audit

1. **Review all results** - Look for ❌ and ⚠️
2. **Fix critical issues first** - Missing tables/columns
3. **Fix warnings** - Missing indexes, orphaned records
4. **Re-run audit** - Verify everything is fixed
5. **Save results** - Take screenshots or export for reference

---

## Expected Results

If everything is correct, you should see:
- ✅ All required tables exist
- ✅ All required columns present
- ✅ All indexes created
- ✅ No orphaned records
- ✅ Valid data types
- ✅ No duplicates
- ✅ Valid status values

If you see any ❌ or ⚠️, fix those issues and re-run the audit.


