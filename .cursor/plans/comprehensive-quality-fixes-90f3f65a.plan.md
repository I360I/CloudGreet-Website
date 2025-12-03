<!-- 90f3f65a-e2f5-4de2-b53f-960d0bc22c17 652d488b-dcb3-4718-93a1-3a2bf6e1445c -->
# Verified Codebase Audit and Fix Plan

## CRITICAL BLOCKERS - 100% VERIFIED BROKEN

### 1. Contact Form Missing Import - CONFIRMED BROKEN

- **File**: `app/contact/page.tsx`
- **Line**: 12
- **Issue**: Uses `useToast()` hook but import statement is completely missing
- **Evidence**: 
- Line 12: `const { showSuccess, showError } = useToast()`
- No import found in file (checked lines 1-8)
- File imports: React, motion, icons, Link, logger - but NOT useToast
- **Impact**: Page will crash with "useToast is not defined" error when form is submitted
- **Fix**: Add `import { useToast } from '@/app/contexts/ToastContext'` after line 7
- **Time**: 2 minutes
- **Priority**: P0 - Blocks all contact form submissions

### 2. Pricing Page localStorage Usage - CONFIRMED BROKEN

- **File**: `app/pricing/page.tsx`
- **Lines**: 48-66
- **Issue**: Uses `localStorage.getItem('token')` and `localStorage.getItem('user')` to get business ID
- **Evidence**:
- Line 48: `const token = localStorage.getItem('token')`
- Line 51: `const user = localStorage.getItem('user')`
- Line 55: `setBusinessId(userData.business_id || userData.id)`
- **Impact**: 
- Won't work if user isn't logged in (no token in localStorage)
- Breaks on page refresh if token expires
- Not SSR-safe
- Security risk (tokens in localStorage instead of httpOnly cookies)
- Page shows "Please Log In" even if user is authenticated via cookies
- **Fix**: Replace with `fetchWithAuth('/api/business/profile')` to get business ID from API
- **Time**: 15 minutes
- **Priority**: P0 - Blocks pricing page functionality

## USER-REPORTED ISSUES - NEEDS VERIFICATION

### 3. Hero Animation Glitch - NEEDS TESTING

- **Files**: `app/components/Hero.tsx`, `app/landing/page.tsx`
- **User Report**: "Hero animation resets every time you scroll making it glitch out"
- **Code Analysis**:
- Hero component is memoized with `React.memo()` (Hero.tsx:18)
- Hero uses `animate` prop, not `whileInView` (Hero.tsx:42) - should only animate once on mount
- WaveBackground has protection: `if (canvas._initialized) return` (WaveBackground.jsx:275)
- Parent component re-renders on scroll due to `isNavVisible` state (landing/page.tsx:120-140)
- **Possible Root Cause**: If Hero re-mounts when parent re-renders, animation would restart despite memo
- **Fix Options**:

1. Add stable `key` prop to Hero to prevent re-mounting
2. Use `useMemo` to memoize Hero component in parent
3. Move Hero outside of re-rendering parent scope

- **Time**: 20 minutes
- **Priority**: P1 - User-reported, affects UX
- **Status**: CANNOT VERIFY WITHOUT TESTING - Code looks correct but user reports issue

### 4. Test Call Page Design/Functionality - NEEDS VERIFICATION

- **File**: `app/test-agent-simple/page.tsx`
- **User Report**: "Test call design and functionality is broken"
- **Code Analysis**:
- API endpoint exists: `app/api/test/realtime-call/route.ts`
- API requires auth (line 14)
- API requires business phone_number (line 41-45)
- Page uses `fetchWithAuth` correctly (line 74)
- Page has error handling (lines 91-100)
- **Potential Issues**:
- Design may not match landing page (user opinion - needs visual comparison)
- May fail if business doesn't have phone_number configured
- May show confusing error messages
- **Fix**: Test end-to-end, improve error messages, verify design matches landing page
- **Time**: 30 minutes
- **Priority**: P1 - User-reported
- **Status**: CODE EXISTS - Needs end-to-end testing

### 5. Landing Page Orb - NEEDS VERIFICATION

- **File**: `app/landing/page.tsx:276`
- **User Report**: "Orb not loading" or design issues
- **Code Analysis**:
- RingOrb is imported (line 13): `import RingOrb from '@/app/components/RingOrb'`
- RingOrb is used (line 276): `<RingOrb size={320} isClickable={true} onClick={...} />`
- Component has onClick handler (lines 279-328)
- **Potential Issues**:
- Component may not render (runtime error)
- Component may be hidden by CSS
- Component may show loading state indefinitely
- Design may not match user expectations
- **Fix**: Check browser console for errors, verify component renders, check CSS
- **Time**: 15 minutes
- **Priority**: P1 - User-reported
- **Status**: CODE EXISTS - Needs visual verification

## CODE QUALITY ISSUES - VERIFIED

### 6. localStorage Usage in Production Code

- **Files**: 9 files in `app/` directory use localStorage
- **Count**: 23 instances across:
- `app/pricing/page.tsx` (3 instances - CONFIRMED BROKEN above)
- `app/admin/login/page.tsx` (3 instances)
- `app/components/OnboardingWizard.tsx` (3 instances)
- `app/login/page.tsx` (3 instances)
- `app/register-simple/page.tsx` (3 instances)
- `app/employee/dashboard/page.tsx` (1 instance)
- `app/start/page.tsx` (5 instances)
- Plus 2 disabled files
- **Impact**: Security risk, breaks on refresh, not SSR-safe
- **Fix**: Replace with httpOnly cookies for auth, context/API for user data
- **Time**: 2-3 hours
- **Priority**: P2 - Security and reliability issue

### 7. Console Statements

- **Status**: Only 1 console statement in active code (`app/components/AdvancedCallAnalytics.tsx.__disabled`)
- **Note**: Many console statements in `scripts/` directory - this is acceptable for scripts
- **Impact**: Minimal - only in disabled file
- **Fix**: Remove from disabled file or ignore
- **Time**: 1 minute
- **Priority**: P3 - Low impact

### 8. Alert/Confirm Statements

- **Status**: Only 3 matches, all in progress-related files using `confirm()` method name (not browser confirm)
- **Files**: 
- `app/api/progress/confirm/route.ts` - This is a method name, not browser confirm
- `app/contexts/ProgressContext.tsx` - Method call, not browser confirm
- `app/components/ProgressDemo.tsx` - Method call, not browser confirm
- **Impact**: None - these are not browser alerts
- **Fix**: None needed
- **Priority**: N/A - False positive

## ALREADY FIXED - VERIFIED

### 9. whileInView Animation Glitches

- **File**: `app/landing/page.tsx`
- **Status**: ALL 18 instances have `viewport={{ once: true }}`
- **Evidence**: Verified all 18 whileInView animations have the fix
- **Impact**: None - already fixed
- **Priority**: N/A

## MISSING API ENDPOINTS - FROM DOCUMENTATION

### 10. Missing Analytics Endpoints (From Reports)

- **Status**: Referenced in documentation but may not exist
- **Endpoints**:
- `/api/analytics/real-benchmarks` - Reported as 404
- `/api/analytics/real-conversion` - Reported as 404
- `/api/analytics/real-charts` - Reported as 404
- `/api/analytics/real-insights` - Reported as 404
- `/api/dashboard/real-dashboard` - Reported as 404
- `/api/analytics/real-time-viz` - Reported as 404
- **Note**: These may be deployment issues, not code issues
- **Fix**: Verify if files exist, check deployment, or remove references
- **Time**: 1-2 hours
- **Priority**: P2 - May affect dashboard functionality

## PRIORITY FIX ORDER

### Phase 1: Critical Blockers (30 minutes)

1. Fix contact form missing import (2 min)
2. Fix pricing page localStorage (15 min)
3. Test both fixes work (13 min)

### Phase 2: User-Reported Issues (1-2 hours)

4. Fix hero animation glitch (20 min) - if confirmed
5. Fix test call page (30 min) - if confirmed broken
6. Fix landing page orb (15 min) - if confirmed broken

### Phase 3: Code Quality (2-3 hours)

7. Replace localStorage usage (2-3 hours)
8. Remove console statements (1 min)
9. Verify/fix missing API endpoints (1-2 hours)

## TESTING REQUIREMENTS

After each fix:

- Test the specific functionality works
- Verify no regressions
- Check browser console for errors
- Test on mobile if applicable

Final verification:

- Complete user journey (signup → onboarding → payment → dashboard)
- All pages load without errors
- All forms work correctly
- No console errors in production
- Mobile responsive

## HONEST ASSESSMENT

**What's Actually Broken (Verified)**:

- Contact form import (100% confirmed)
- Pricing page localStorage (100% confirmed)

**What Needs Testing (User-Reported)**:

- Hero animation glitch
- Test call page
- Landing page orb

**What's Already Fixed**:

- whileInView animations

**What's Not Actually Broken**:

- Alert/confirm statements (false positive)
- Console statements (only in disabled file)

**Unknown Status**:

- Missing API endpoints (may be deployment issue)
- Design inconsistencies (needs visual audit)