# Comprehensive UI Quality Fix Plan - Entire Website

**Date**: 2025-01-19  
**Status**: 🔄 IN PROGRESS

## Standards Applied Everywhere

### Text Sizes
- **H1**: `text-4xl md:text-5xl lg:text-6xl` (48-60px max)
- **H2**: `text-3xl md:text-4xl lg:text-5xl` (36-48px max)
- **H3**: `text-xl md:text-2xl lg:text-3xl` (24-36px max)
- **H4**: `text-lg md:text-xl lg:text-2xl` (18-30px max)
- **Stats/Numbers**: `text-2xl md:text-3xl lg:text-4xl` (24-36px max)
- **Body**: `text-base md:text-lg` (16-18px)

### Buttons
- **Standard**: `px-4 py-2` (height: 40-48px)
- **Large**: `px-5 py-2.5` (height: 44-52px)
- **Text**: `text-sm` (14px) or `text-base` (16px)
- **Icons**: `w-4 h-4` (16px)

### Spacing
- **Section Padding**: `py-12 md:py-16 lg:py-20` (48-80px max)
- **Margins**: `mb-4`, `mb-6`, `mb-8`, `mb-12` (standardized)
- **Gaps**: `gap-4 md:gap-6` (16-24px max)

### Line Heights
- **Headings**: `leading-tight` or `leading-snug`
- **Body**: `leading-snug` or `leading-normal`

### Border Radius
- **Cards**: `rounded-xl` (12px) or `rounded-2xl` (16px) max
- **Buttons**: `rounded-lg` (8px)
- **Inputs**: `rounded-lg` (8px)

### Card Padding
- **Standard**: `p-4 md:p-6` (16-24px)

### Animations
- **All**: Use `whileInView` with `viewport={{ once: true }}` to prevent resets

## Pages to Fix

1. ✅ **Hero Component** - Fixed
2. 🔄 **Landing Page** - In progress
3. ⏳ **Features Page**
4. ⏳ **Demo Page**
5. ⏳ **Contact Page**
6. ⏳ **Login Page**
7. ⏳ **Register Page**
8. ⏳ **Dashboard** - Verify
9. ⏳ **Onboarding**
10. ⏳ **Admin Pages**
11. ⏳ **Other Pages**

## Progress

- [x] Hero component fixed
- [ ] Landing page sections fixed
- [ ] All other pages audited and fixed

