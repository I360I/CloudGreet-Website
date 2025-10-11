# 🚨 CRITICAL: Fix All API Authentication

## Problem
Many business-critical APIs are still using old header-based authentication (`x-user-id`, `x-business-id`) instead of JWT tokens. This breaks real client functionality.

## APIs That Need JWT Authentication Fix:

### ✅ Already Fixed:
- `/api/dashboard/data` - Working with JWT
- `/api/ai-agent/test` - Working with JWT  
- `/api/auth/register` - Working with JWT

### ❌ Still Broken (Need JWT Fix):
1. **`/api/appointments/list`** - CRITICAL for booking appointments (money-making)
2. **`/api/calls/history`** - CRITICAL for call tracking
3. **`/api/business/profile`** - CRITICAL for business management
4. **`/api/billing/per-booking`** - CRITICAL for revenue tracking
5. **`/api/calendar/connect`** - CRITICAL for scheduling
6. **`/api/leads/scoring`** - CRITICAL for lead management
7. **`/api/automation/follow-up`** - CRITICAL for customer follow-up
8. **`/api/ai-agent/update`** - CRITICAL for AI customization
9. **`/api/ai-agent/analytics`** - CRITICAL for AI performance
10. **`/api/ai-intelligence/predictive`** - CRITICAL for AI insights
11. **`/api/market-intelligence/competitors`** - Business intelligence
12. **`/api/promo/apply`** - Promotional features

## Impact on Real Client Use:
- ❌ **Cannot book appointments** (no revenue generation)
- ❌ **Cannot track calls** (no call management)
- ❌ **Cannot manage business profile** (no customization)
- ❌ **Cannot process billing** (no payment processing)
- ❌ **Cannot connect calendar** (no scheduling integration)

## Solution:
Each API needs the same JWT authentication pattern:

```typescript
// Replace this:
const userId = request.headers.get('x-user-id')
const businessId = request.headers.get('x-business-id')

// With this:
const authHeader = request.headers.get('authorization')
const token = authHeader.replace('Bearer ', '')
const decoded = jwt.verify(token, jwtSecret) as any
const userId = decoded.userId
const businessId = decoded.businessId
```

## Priority Order:
1. **Appointments** (revenue generation)
2. **Calls** (core functionality) 
3. **Business Profile** (customization)
4. **Billing** (payment processing)
5. **Calendar** (scheduling)

**Without these fixes, the platform is NOT ready for real client use.**



