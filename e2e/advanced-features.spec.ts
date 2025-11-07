import { test, expect } from '@playwright/test'

test.describe('Advanced Call Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', 'test@cloudgreet.com')
    await page.fill('[name="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('displays call volume heatmap', async ({ page }) => {
    await page.waitForSelector('[aria-label="Call volume heatmap"]')
    const heatmap = page.locator('[role="grid"]')
    await expect(heatmap).toBeVisible()
    
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    for (const day of days) {
      await expect(page.locator(`text=${day}`)).toBeVisible()
    }
  })

  test('timeframe selector works', async ({ page }) => {
    await page.click('button[aria-label="Select 7d timeframe"]')
    await page.waitForResponse(resp => resp.url().includes('timeframe=7d'))
    const button = page.locator('button[aria-selected="true"]')
    await expect(button).toHaveText('7 Days')
  })

  test('shows error state gracefully', async ({ page }) => {
    await page.route('**/api/analytics/call-analytics*', route =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server error' }) })
    )
    await page.reload()
    await expect(page.locator('text=Unable to Load Analytics')).toBeVisible()
    await expect(page.locator('button:has-text("Try Again")')).toBeVisible()
  })

  test('conversion funnel displays correctly', async ({ page }) => {
    await page.waitForSelector('[data-testid="conversion-funnel"]')
    const funnel = page.locator('[data-testid="conversion-funnel"]')
    await expect(funnel).toBeVisible()
    
    // Check for funnel steps
    await expect(page.locator('text=Calls Received')).toBeVisible()
    await expect(page.locator('text=Calls Answered')).toBeVisible()
    await expect(page.locator('text=Appointments Booked')).toBeVisible()
  })

  test('sentiment analysis shows breakdown', async ({ page }) => {
    await page.waitForSelector('[data-testid="sentiment-analysis"]')
    const sentiment = page.locator('[data-testid="sentiment-analysis"]')
    await expect(sentiment).toBeVisible()
    
    // Check for sentiment categories
    await expect(page.locator('text=Positive')).toBeVisible()
    await expect(page.locator('text=Neutral')).toBeVisible()
    await expect(page.locator('text=Negative')).toBeVisible()
  })
})

test.describe('Call Player', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', 'test@cloudgreet.com')
    await page.fill('[name="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('plays call recording', async ({ page }) => {
    await page.goto('/calls')
    await page.click('[data-testid="call-row"]:first-child')
    await expect(page.locator('[data-testid="call-player"]')).toBeVisible()
    await page.click('[aria-label="Play recording"]')
    const audio = page.locator('audio')
    const isPaused = await audio.evaluate(el => (el as HTMLAudioElement).paused)
    expect(isPaused).toBe(false)
  })

  test('displays transcript with speaker identification', async ({ page }) => {
    await page.goto('/calls')
    await page.click('[data-testid="call-row"]:first-child')
    await page.waitForSelector('[data-testid="call-transcript"]')
    
    const transcript = page.locator('[data-testid="call-transcript"]')
    await expect(transcript).toBeVisible()
    
    // Check for speaker labels
    await expect(page.locator('text=AI:')).toBeVisible()
    await expect(page.locator('text=Customer:')).toBeVisible()
  })

  test('shows waveform visualization', async ({ page }) => {
    await page.goto('/calls')
    await page.click('[data-testid="call-row"]:first-child')
    await page.waitForSelector('[data-testid="waveform"]')
    
    const waveform = page.locator('[data-testid="waveform"]')
    await expect(waveform).toBeVisible()
  })

  test('allows seeking through recording', async ({ page }) => {
    await page.goto('/calls')
    await page.click('[data-testid="call-row"]:first-child')
    await page.waitForSelector('[data-testid="call-player"]')
    
    // Click on waveform to seek
    await page.click('[data-testid="waveform"]')
    
    // Verify seek happened (audio currentTime should change)
    const audio = page.locator('audio')
    const currentTime = await audio.evaluate(el => (el as HTMLAudioElement).currentTime)
    expect(currentTime).toBeGreaterThan(0)
  })
})

test.describe('AI Insights', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', 'test@cloudgreet.com')
    await page.fill('[name="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('displays AI-generated insights', async ({ page }) => {
    await page.waitForSelector('[data-testid="ai-insights"]')
    const insights = page.locator('[data-testid="ai-insights"]')
    await expect(insights).toBeVisible()
    
    // Check for insight cards
    await expect(page.locator('[data-testid="insight-card"]')).toBeVisible()
  })

  test('shows insight impact levels', async ({ page }) => {
    await page.waitForSelector('[data-testid="ai-insights"]')
    
    // Check for impact indicators
    const highImpact = page.locator('[data-testid="insight-impact-high"]')
    const mediumImpact = page.locator('[data-testid="insight-impact-medium"]')
    const lowImpact = page.locator('[data-testid="insight-impact-low"]')
    
    // At least one should be visible
    const hasImpact = await highImpact.count() > 0 || 
                     await mediumImpact.count() > 0 || 
                     await lowImpact.count() > 0
    expect(hasImpact).toBe(true)
  })

  test('allows exporting insights', async ({ page }) => {
    await page.waitForSelector('[data-testid="ai-insights"]')
    
    // Click export button
    await page.click('[aria-label="Export insights"]')
    
    // Should trigger download or show export options
    await expect(page.locator('text=Export')).toBeVisible()
  })
})

test.describe('Dashboard Real-time Updates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', 'test@cloudgreet.com')
    await page.fill('[name="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('receives real-time call updates', async ({ page }) => {
    // Mock WebSocket connection
    await page.addInitScript(() => {
      class MockWebSocket {
        static readonly CONNECTING = 0
        static readonly OPEN = 1
        static readonly CLOSING = 2
        static readonly CLOSED = 3
        constructor() {
          setTimeout(() => {
            this.onopen?.()
            // Simulate new call data
            setTimeout(() => {
              this.onmessage?.({
                data: JSON.stringify({
                  type: 'broadcast',
                  data: {
                    type: 'new_call',
                    call: {
                      id: 'test_call_123',
                      from_number: '+1234567890',
                      status: 'in_progress',
                      timestamp: Date.now()
                    }
                  },
                  timestamp: Date.now()
                })
              })
            }, 1000)
          }, 100)
        }
        onopen = null
        onmessage = null
        onclose = null
        onerror = null
        send() {}
        close() {}
      }
    })

    await page.reload()
    
    // Wait for WebSocket connection
    await page.waitForTimeout(2000)
    
    // Check if new call appears in real-time
    await expect(page.locator('text=+1234567890')).toBeVisible()
  })

  test('updates metrics in real-time', async ({ page }) => {
    // Mock WebSocket with metrics update
    await page.addInitScript(() => {
      class MockWebSocket {
        static readonly CONNECTING = 0
        static readonly OPEN = 1
        static readonly CLOSING = 2
        static readonly CLOSED = 3
        constructor() {
          setTimeout(() => {
            this.onopen?.()
            setTimeout(() => {
              this.onmessage?.({
                data: JSON.stringify({
                  type: 'broadcast',
                  data: {
                    type: 'metrics',
                    metrics: {
                      activeCalls: 5,
                      callsToday: 25,
                      appointmentsToday: 8,
                      revenueToday: 2500
                    }
                  },
                  timestamp: Date.now()
                })
              })
            }, 1000)
          }, 100)
        }
        onopen = null
        onmessage = null
        onclose = null
        onerror = null
        send() {}
        close() {}
      }
    })

    await page.reload()
    await page.waitForTimeout(2000)
    
    // Check if metrics updated
    await expect(page.locator('text=5')).toBeVisible() // activeCalls
    await expect(page.locator('text=25')).toBeVisible() // callsToday
  })
})

test.describe('Mobile Responsiveness', () => {
  test('dashboard works on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/login')
    await page.fill('[name="email"]', 'test@cloudgreet.com')
    await page.fill('[name="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    
    // Check if dashboard loads on mobile
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible()
    
    // Check if navigation works
    await page.click('[aria-label="Open navigation menu"]')
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible()
  })

  test('call player works on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/login')
    await page.fill('[name="email"]', 'test@cloudgreet.com')
    await page.fill('[name="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    
    await page.goto('/calls')
    await page.click('[data-testid="call-row"]:first-child')
    
    // Check if call player is mobile-friendly
    await expect(page.locator('[data-testid="call-player"]')).toBeVisible()
    
    // Check if controls are accessible
    await expect(page.locator('[aria-label="Play recording"]')).toBeVisible()
  })
})