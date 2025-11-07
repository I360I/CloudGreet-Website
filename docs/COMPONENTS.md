# Component Documentation

## AdvancedCallAnalytics

**Purpose**: Display call volume heatmaps and analytics

**Props**:
- `businessId: string` - Business identifier

**Usage**:
```tsx
<AdvancedCallAnalytics businessId={business.id} />
```

**Features**:
- Interactive 24x7 heatmap showing call volume by hour and day
- Call duration trends over time
- Conversion funnel visualization
- Sentiment analysis breakdown
- Timeframe selector (7d, 30d, 90d)

**Performance**:
- Lazy loaded with React.lazy()
- Memoized with React.memo()
- SWR caching (2 minutes)
- Responsive design with mobile optimization

**Dependencies**:
- `@tanstack/react-query` for data fetching
- `recharts` for chart rendering
- `framer-motion` for animations

## CallPlayer

**Purpose**: Play call recordings with transcripts

**Props**:
- `callId: string` - Call identifier
- `businessId: string` - Business identifier

**Usage**:
```tsx
<CallPlayer callId={call.id} businessId={business.id} />
```

**Features**:
- Audio waveform visualization
- Interactive transcript with speaker identification
- Playback controls (play, pause, seek, speed)
- Download recording option
- Sentiment highlighting in transcript
- Keyboard shortcuts support

**Performance**:
- Audio streaming for large files
- Lazy loading of transcript
- Memoized waveform calculations
- Error boundary for audio failures

## AIInsights

**Purpose**: Display AI-generated insights and recommendations

**Props**:
- `businessId: string` - Business identifier

**Usage**:
```tsx
<AIInsights businessId={business.id} />
```

**Features**:
- Real-time insight generation
- Categorized insights (performance, revenue, optimization)
- Impact level indicators (high, medium, low)
- Actionable recommendations
- Insight history and trends
- Export insights functionality

**Insight Types**:
- `peak_time`: Optimal call times
- `conversion_tip`: Lead conversion suggestions
- `revenue_opportunity`: Revenue optimization
- `performance_trend`: Performance analysis

## CallQualityMetrics

**Purpose**: Display call quality statistics

**Props**:
- `businessId: string` - Business identifier

**Usage**:
```tsx
<CallQualityMetrics businessId={business.id} />
```

**Features**:
- Average call duration tracking
- Response time metrics
- Audio quality scores
- Drop rate monitoring
- Customer satisfaction ratings
- Quality trends over time
- Comparison with industry benchmarks

## LeadScoring

**Purpose**: Display scored leads with priority levels

**Props**:
- `businessId: string` - Business identifier
- `limit?: number` - Number of leads to display (default: 50)

**Usage**:
```tsx
<LeadScoring businessId={business.id} limit={100} />
```

**Features**:
- AI-powered lead scoring (0-100)
- Priority level assignment (high, medium, low)
- Lead source tracking
- Contact information display
- Lead status management
- Bulk actions (export, assign, follow-up)
- Real-time score updates

## BusinessHoursSettings

**Purpose**: Manage business hours configuration

**Props**:
- `businessId: string` - Business identifier
- `onSave?: (hours: BusinessHours) => void` - Callback after saving

**Usage**:
```tsx
<BusinessHoursSettings 
  businessId={business.id} 
  onSave={(hours) => console.log('Hours updated:', hours)} 
/>
```

**Features**:
- Day-by-day hour configuration
- Holiday management
- Time zone support
- After-hours policy settings
- Emergency contact configuration
- Bulk day operations
- Validation and error handling

## ROICalculator

**Purpose**: Calculate and display ROI metrics

**Props**:
- `businessId: string` - Business identifier
- `timeframe?: Timeframe` - Calculation period (default: '30d')

**Usage**:
```tsx
<ROICalculator businessId={business.id} timeframe="90d" />
```

**Features**:
- Real-time ROI calculations
- Revenue vs. cost breakdown
- Conversion rate tracking
- ROI trend visualization
- Exportable reports
- Comparison with previous periods
- Goal setting and tracking

## CallOrb

**Purpose**: Interactive call-to-action orb for landing page

**Props**:
- `onCall: (phone: string) => Promise<void>` - Callback when call is initiated

**Usage**:
```tsx
<CallOrb 
  onCall={async (phoneNumber) => {
    const response = await fetch('/api/telnyx/initiate-call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber, businessId: 'demo' })
    })
    if (!response.ok) throw new Error('Call failed')
  }}
/>
```

**Features**:
- Animated wave ring visualization
- Phone number input validation
- Loading states during call initiation
- Error handling and display
- Responsive design
- Accessibility support (ARIA labels, keyboard navigation)

## ErrorBoundary

**Purpose**: Catch and handle React errors gracefully

**Props**:
- `children: ReactNode` - Child components
- `fallback?: ReactNode` - Custom fallback UI
- `onError?: (error: Error, errorInfo: React.ErrorInfo) => void` - Error callback

**Usage**:
```tsx
<ErrorBoundary 
  fallback={<div>Something went wrong</div>}
  onError={(error, errorInfo) => console.log('Error caught:', error)}
>
  <MyComponent />
</ErrorBoundary>
```

**Features**:
- Automatic error catching
- Error logging to monitoring service
- Retry functionality
- Custom fallback UI support
- Error reporting to external services
- Development vs. production error handling

## Loading Components

### Skeleton Components
- `CardSkeleton`: Loading state for card components
- `ChartSkeleton`: Loading state for charts
- `HeatmapSkeleton`: Loading state for heatmaps
- `CallPlayerSkeleton`: Loading state for call player
- `InsightsSkeleton`: Loading state for insights
- `TableSkeleton`: Loading state for tables

### Loading Indicators
- `ProgressIndicator`: Progress bar with percentage
- `LoadingSpinner`: Rotating spinner
- `LoadingDots`: Animated dots
- `LoadingBar`: Horizontal progress bar
- `LoadingPulse`: Pulsing animation
- `LoadingSkeleton`: Skeleton screen
- `LoadingOverlay`: Full-screen loading overlay
- `LoadingButton`: Button with loading state

## Design System

### Colors
- Primary: `purple-600` (#9333ea)
- Secondary: `blue-600` (#2563eb)
- Success: `green-600` (#16a34a)
- Warning: `yellow-600` (#ca8a04)
- Error: `red-600` (#dc2626)
- Background: `gray-900` (#111827)
- Surface: `white/5` (rgba(255, 255, 255, 0.05))

### Spacing
- Consistent 8px scale
- `space-1` (4px) to `space-32` (128px)
- Component-specific spacing tokens

### Typography
- Headings: `font-bold` with responsive sizing
- Body: `font-normal` with proper line height
- Code: `font-mono` with syntax highlighting
- Accessibility: Minimum 16px font size

### Animations
- `framer-motion` for complex animations
- CSS transitions for simple state changes
- Consistent timing functions
- Reduced motion support

### Safe Classes
All components use a curated set of Tailwind classes to ensure consistency and prevent style conflicts.

### Variants
Components support multiple variants for different use cases:
- Size variants: `sm`, `md`, `lg`
- Color variants: `primary`, `secondary`, `success`, `warning`, `error`
- State variants: `default`, `hover`, `active`, `disabled`