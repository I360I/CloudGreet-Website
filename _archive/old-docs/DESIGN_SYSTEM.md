# CloudGreet Design System

## Purpose
This document defines the complete design system for CloudGreet to ensure consistency across all pages and components.

## Core Principles
1. **Consistency**: Same elements look and behave the same everywhere
2. **Responsiveness**: All elements scale properly on mobile/tablet/desktop
3. **Accessibility**: WCAG 2.1 AA compliance
4. **Dark Theme**: Primary theme is dark with glassmorphism effects

---

## 1. Color Palette

### Backgrounds
- **Primary Background**: `bg-gradient-to-br from-slate-900 via-black to-slate-900`
- **Card Background**: `bg-black/40 backdrop-blur-xl` or `bg-white/5 backdrop-blur-xl`
- **Footer Background**: `bg-black/40 backdrop-blur-xl border-t border-gray-800/50`
- **Nav Background**: `bg-black/20 backdrop-blur-md border-b border-gray-800/50`

### Text Colors
- **Primary Text**: `text-white`
- **Secondary Text**: `text-gray-300`
- **Tertiary Text**: `text-gray-400`
- **Accent Text**: `text-purple-400`, `text-blue-400`, `text-green-400` (context-dependent)

### Borders
- **Default Border**: `border border-white/10`
- **Hover Border**: `border-white/20` or `border-white/30`
- **Focus Border**: `border-white/30` or `border-purple-400`
- **Error Border**: `border-red-500/50`

---

## 2. Border Radius

### Standard Sizes
- **Small (inputs, badges)**: `rounded-lg` (8px)
- **Medium (cards, buttons)**: `rounded-xl` (12px) - **PRIMARY STANDARD**
- **Large (modals, containers)**: `rounded-2xl` (16px)
- **Extra Large (hero sections)**: `rounded-3xl` (24px)
- **Full Circle**: `rounded-full`

### Usage Rules
- **Buttons**: `rounded-lg` or `rounded-xl` (use `rounded-lg` for primary consistency)
- **Input Fields**: `rounded-lg` (consistent with buttons)
- **Cards**: `rounded-xl` or `rounded-2xl`
- **Modals**: `rounded-2xl` or `rounded-3xl`
- **Badges/Pills**: `rounded-full` or `rounded-lg`

**MIGRATION**: Standardize all inputs/buttons to `rounded-lg`, cards to `rounded-xl`, modals to `rounded-2xl`

---

## 3. Shadows

### Standard Sizes
- **Small (inputs, badges)**: `shadow-sm` or no shadow
- **Medium (buttons, cards)**: `shadow-lg` - **PRIMARY STANDARD**
- **Large (modals, elevated cards)**: `shadow-xl` or `shadow-2xl`

### Usage Rules
- **Buttons**: `shadow-lg` (consistent)
- **Cards**: `shadow-lg` or `shadow-xl`
- **Modals**: `shadow-2xl`
- **Hover States**: Can use `shadow-xl` for elevation

**MIGRATION**: Standardize buttons to `shadow-lg`, cards to `shadow-lg` or `shadow-xl`, modals to `shadow-2xl`

---

## 4. Typography

### Heading Scale
- **H1 (Hero)**: `text-6xl md:text-7xl lg:text-8xl font-bold`
- **H1 (Page)**: `text-5xl md:text-6xl font-bold`
- **H2 (Section)**: `text-4xl md:text-5xl font-bold`
- **H3 (Subsection)**: `text-2xl md:text-3xl font-bold`
- **H4 (Card Title)**: `text-xl md:text-2xl font-semibold`
- **H5 (Small Title)**: `text-lg md:text-xl font-semibold`

### Body Text
- **Large**: `text-lg md:text-xl`
- **Base**: `text-base md:text-lg`
- **Small**: `text-sm md:text-base`
- **Extra Small**: `text-xs md:text-sm`

### Font Weights
- **Bold**: `font-bold` (headings)
- **Semibold**: `font-semibold` (subheadings, emphasis)
- **Medium**: `font-medium` (buttons, labels)
- **Regular**: Default (body text)

**MIGRATION**: Ensure all text sizes are responsive with `md:` breakpoints

---

## 5. Spacing Scale

### Padding (Buttons)
- **Small**: `px-4 py-2` (secondary buttons)
- **Medium**: `px-5 py-2` (nav buttons)
- **Standard**: `px-6 py-3` - **PRIMARY STANDARD**
- **Large**: `px-8 py-4` (hero CTAs - use sparingly)

### Padding (Cards/Containers)
- **Small**: `p-4` or `p-6`
- **Medium**: `p-6 md:p-8` - **PRIMARY STANDARD**
- **Large**: `p-8 md:p-10` or `p-10 md:p-12`

### Margins
- **Section Spacing**: `py-24` (consistent across all sections)
- **Element Spacing**: `mb-6`, `mb-8`, `mb-12` (use `mb-12 md:mb-16` for section headers)
- **Gap (Grids)**: `gap-4`, `gap-6`, `gap-8` (use `gap-6 md:gap-8` for responsive)

**MIGRATION**: Standardize buttons to `px-6 py-3`, cards to `p-6 md:p-8`, sections to `py-24`

---

## 6. Button Styles

### Primary Button
```tsx
className="bg-white/15 backdrop-blur-xl text-white px-6 py-3 rounded-lg text-base font-medium border border-white/30 hover:bg-white/25 hover:border-white/50 transition-all duration-300 shadow-lg"
```

### Secondary Button
```tsx
className="bg-white/10 backdrop-blur-xl text-white px-6 py-3 rounded-lg text-base font-medium border border-white/20 hover:bg-white/20 hover:border-white/40 transition-all duration-300 shadow-lg"
```

### Gradient Button (CTAs)
```tsx
className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold px-6 py-3 rounded-lg transition-all shadow-lg"
```

### Icon Spacing
- Use `gap-2` for icon + text (not `mr-2` or `ml-2`)
- Example: `<div className="flex items-center gap-2">`

**MIGRATION**: All buttons should use `px-6 py-3`, `rounded-lg`, `shadow-lg`, and `gap-2` for icons

---

## 7. Input Field Styles

### Standard Input
```tsx
className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/20 transition-all"
```

### Input Variations
- **With backdrop**: `bg-white/5 backdrop-blur-xl`
- **Without backdrop**: `bg-white/10`
- **Border**: `border border-white/10`
- **Focus**: `focus:border-white/30 focus:ring-2 focus:ring-white/20`
- **Error**: `border-red-500/50 focus:ring-red-500/20`

**MIGRATION**: All inputs should use `rounded-lg`, consistent padding `px-4 py-3`, and consistent focus states

---

## 8. Card Styles

### Standard Card
```tsx
className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 md:p-8 shadow-lg"
```

### Card Variations
- **Elevated**: `shadow-xl`
- **Hover**: `hover:border-white/20 hover:shadow-xl transition-all`
- **Glassmorphism**: `backdrop-blur-xl` with transparent background

**MIGRATION**: All cards should use `rounded-xl`, `p-6 md:p-8`, and `shadow-lg` or `shadow-xl`

---

## 9. Modal Styles

### Standard Modal
```tsx
className="bg-black/40 backdrop-blur-xl rounded-2xl p-6 md:p-8 border border-white/10 shadow-2xl"
```

**MIGRATION**: All modals should use `rounded-2xl`, `shadow-2xl`, and consistent padding

---

## 10. Navigation

### Standard Nav
```tsx
className="border-b border-gray-800/50 backdrop-blur-md bg-black/20 sticky top-0 z-50"
```

### Nav Links
- **Default**: `text-gray-300 hover:text-white transition-colors duration-300 font-medium`
- **Active**: `text-white`

---

## 11. Footer

### Standard Footer
```tsx
className="bg-black/40 backdrop-blur-xl border-t border-gray-800/50 text-white py-8 mt-auto"
```

### Footer Headings
- Use `text-base font-semibold` (not `text-md` - invalid class)
- Consistent spacing: `mb-4`

---

## 12. Component-Specific Rules

### Icons
- **Size**: `w-4 h-4` (small), `w-5 h-5` (medium), `w-6 h-6` (large)
- **Spacing**: Use `gap-2` or `gap-3` with flex, not margins

### Badges/Pills
- **Border Radius**: `rounded-full` or `rounded-lg`
- **Padding**: `px-3 py-1` or `px-4 py-2`

### Loading States
- **Spinner**: Consistent size and color
- **Skeleton**: Match content shape

---

## 13. Responsive Breakpoints

### Standard Breakpoints
- **Mobile**: Default (no prefix)
- **Tablet**: `md:` (768px+)
- **Desktop**: `lg:` (1024px+)

### Responsive Patterns
- **Text**: Always include `md:` variant
- **Padding**: Use `p-6 md:p-8` pattern
- **Grids**: Use `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- **Spacing**: Use `mb-6 md:mb-8` or `mb-12 md:mb-16`

---

## 14. Animation Standards

### Transitions
- **Default**: `transition-all duration-300`
- **Fast**: `transition-all duration-200`
- **Slow**: `transition-all duration-500`

### Hover Effects
- **Scale**: `hover:scale-105` (buttons)
- **Opacity**: `hover:opacity-80` (links)
- **Background**: `hover:bg-white/25` (buttons)

---

## 15. Migration Checklist

### High Priority (User-Facing)
- [ ] Landing page (DONE)
- [ ] Footer component (DONE)
- [ ] Hero component (DONE)
- [ ] Login page
- [ ] Register page (partial)
- [ ] Dashboard page
- [ ] Features page
- [ ] Demo page
- [ ] Pricing page

### Medium Priority (Admin/Internal)
- [ ] Admin pages (all)
- [ ] Onboarding flow
- [ ] Account pages
- [ ] Settings pages

### Low Priority (Components)
- [ ] UI component library
- [ ] Modal components
- [ ] Form components
- [ ] Card components

---

## 16. Validation Rules

Before marking a file as "complete":
1. ✅ All border radius matches standard
2. ✅ All shadows match standard
3. ✅ All button padding matches standard
4. ✅ All text sizes are responsive
5. ✅ All spacing is consistent
6. ✅ All colors match palette
7. ✅ Icons use gap instead of margin
8. ✅ Hover states are consistent
9. ✅ Focus states are accessible
10. ✅ Mobile responsiveness verified

---

## 17. Quick Reference

### Most Common Patterns

**Button**: `px-6 py-3 rounded-lg shadow-lg gap-2`
**Input**: `px-4 py-3 rounded-lg border border-white/10`
**Card**: `rounded-xl p-6 md:p-8 shadow-lg`
**Modal**: `rounded-2xl shadow-2xl`
**Section**: `py-24`
**Text**: Always include `md:` responsive variant

---

*Last Updated: 2024*
*Version: 1.0*

