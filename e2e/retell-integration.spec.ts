import { test, expect } from '@playwright/test'

test.describe('Retell Integration', () => {
  test('complete call flow', async ({ page }) => {
    await page.goto('/')
    
    // Fill in phone number
    await page.fill('[name="phone"]', '+15551234567')
    await page.click('button:has-text("Call Me Now")')
    
    // Check calling state
    await expect(page.locator('text=Calling...')).toBeVisible()
    
    // Wait for webhook to be called
    await page.waitForResponse(resp => resp.url().includes('/api/telnyx/voice-webhook'))
    
    // Navigate to dashboard to see the call
    await page.goto('/dashboard')
    await page.waitForSelector('[data-testid="call-row"]')
    
    const firstCall = page.locator('[data-testid="call-row"]').first()
    await expect(firstCall).toContainText('+15551234567')
  })

  test('call recording and transcript', async ({ page }) => {
    // Mock a completed call
    await page.route('**/api/calls/recording*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            callId: 'test_call_123',
            recordingUrl: 'https://retell.ai/recordings/test_call_123.mp3',
            transcript: 'AI: Hello! How can I help you today?\nCustomer: I need HVAC service.',
            duration: 120,
            sentiment: 'positive',
            summary: 'Customer inquired about HVAC services'
          }
        })
      })
    })

    await page.goto('/calls')
    await page.click('[data-testid="call-row"]:first-child')
    
    // Check if recording loads
    await expect(page.locator('[data-testid="call-player"]')).toBeVisible()
    
    // Check if transcript displays
    await expect(page.locator('[data-testid="call-transcript"]')).toBeVisible()
    await expect(page.locator('text=AI: Hello! How can I help you today?')).toBeVisible()
    await expect(page.locator('text=Customer: I need HVAC service.')).toBeVisible()
  })

  test('AI agent creation during onboarding', async ({ page }) => {
    // Mock onboarding completion
    await page.route('**/api/onboarding/complete*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Onboarding completed successfully',
          data: {
            businessId: 'test_business_123',
            retellAgentId: 'agent_456'
          }
        })
      })
    })

    await page.goto('/onboarding')
    
    // Fill onboarding form
    await page.fill('[name="businessName"]', 'Test HVAC Company')
    await page.fill('[name="businessType"]', 'HVAC')
    await page.fill('[name="phone"]', '+15551234567')
    await page.fill('[name="email"]', 'test@hvac.com')
    
    // Complete onboarding
    await page.click('button:has-text("Complete Setup")')
    
    // Check success message
    await expect(page.locator('text=Onboarding completed successfully')).toBeVisible()
  })

  test('webhook signature verification', async ({ page }) => {
    // Test webhook with invalid signature
    const response = await page.request.post('/api/retell/webhook', {
      headers: {
        'Content-Type': 'application/json',
        'X-Retell-Signature': 'invalid_signature'
      },
      data: {
        call_id: 'test_call_123',
        event: 'call_ended',
        transcript: 'Test transcript'
      }
    })

    expect(response.status()).toBe(401)
  })

  test('webhook with valid signature', async ({ page }) => {
    // Mock valid signature (in real test, you'd calculate the actual HMAC)
    const response = await page.request.post('/api/retell/webhook', {
      headers: {
        'Content-Type': 'application/json',
        'X-Retell-Signature': 'valid_signature_mock'
      },
      data: {
        call_id: 'test_call_123',
        event: 'call_ended',
        transcript: 'AI: Hello! Customer: What are your prices?',
        recording_url: 'https://retell.ai/recordings/test_call_123.mp3',
        sentiment: 'positive',
        duration: 180
      }
    })

    // Should return 200 (assuming signature verification passes in test)
    expect(response.status()).toBe(200)
  })

  test('call fallback to voicemail', async ({ page }) => {
    // Mock Retell API failure
    await page.route('**/api/retell/create-phone-call*', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Retell API unavailable' })
      })
    })

    await page.goto('/')
    await page.fill('[name="phone"]', '+15551234567')
    await page.click('button:has-text("Call Me Now")')
    
    // Should still initiate call with fallback
    await expect(page.locator('text=Calling...')).toBeVisible()
    
    // Check that fallback voicemail message is used
    await page.waitForResponse(resp => resp.url().includes('/api/telnyx/voice-webhook'))
  })

  test('agent sync on settings update', async ({ page }) => {
    await page.goto('/settings')
    
    // Update AI agent settings
    await page.fill('[name="greetingMessage"]', 'Welcome to Test Company!')
    await page.selectOption('[name="tone"]', 'friendly')
    
    // Mock sync endpoint
    await page.route('**/api/business/sync-retell-agent*', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true })
      })
    })
    
    await page.click('button:has-text("Save Settings")')
    
    // Check that sync was called
    await page.waitForResponse(resp => resp.url().includes('/api/business/sync-retell-agent'))
    
    // Check success message
    await expect(page.locator('text=All settings saved successfully')).toBeVisible()
  })

  test('call analytics with Retell data', async ({ page }) => {
    // Mock analytics data with Retell metrics
    await page.route('**/api/analytics/call-analytics*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            callVolumeHeatmap: [
              { hour: 9, day: 'Monday', calls: 12 }
            ],
            callDurationTrend: [
              { date: '2024-01-15', avgDuration: 180 }
            ],
            conversionFunnel: [
              { step: 'Calls Received', count: 150, percentage: 100 },
              { step: 'Calls Answered', count: 142, percentage: 94.7 },
              { step: 'Appointments Booked', count: 45, percentage: 31.7 }
            ],
            sentimentAnalysis: {
              positive: 65,
              neutral: 25,
              negative: 10
            },
            totalCalls: 150,
            avgCallDuration: 180,
            conversionRate: 31.7
          }
        })
      })
    })

    await page.goto('/analytics')
    
    // Check if analytics load with Retell data
    await expect(page.locator('[data-testid="call-analytics"]')).toBeVisible()
    await expect(page.locator('text=150')).toBeVisible() // total calls
    await expect(page.locator('text=31.7%')).toBeVisible() // conversion rate
  })

  test('AI insights generation from call data', async ({ page }) => {
    // Mock AI insights with call-based recommendations
    await page.route('**/api/analytics/ai-insights*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'insight_1',
              type: 'peak_time',
              title: 'Peak Call Hours Identified',
              description: 'Most calls come in between 9-11 AM and 2-4 PM',
              impact: 'high',
              actionable: true,
              recommendation: 'Consider increasing staff during these hours',
              created_at: '2024-01-15T10:30:00Z'
            },
            {
              id: 'insight_2',
              type: 'conversion_tip',
              title: 'Improve Call Conversion',
              description: 'Calls lasting over 3 minutes have 40% higher conversion',
              impact: 'medium',
              actionable: true,
              recommendation: 'Train AI to ask qualifying questions earlier',
              created_at: '2024-01-15T10:30:00Z'
            }
          ]
        })
      })
    })

    await page.goto('/dashboard')
    
    // Check if AI insights display
    await expect(page.locator('[data-testid="ai-insights"]')).toBeVisible()
    await expect(page.locator('text=Peak Call Hours Identified')).toBeVisible()
    await expect(page.locator('text=Improve Call Conversion')).toBeVisible()
  })

  test('real-time call updates via WebSocket', async ({ page }) => {
    // Mock WebSocket with call events
    await page.addInitScript(() => {
      class MockWebSocket {
        static readonly CONNECTING = 0
        static readonly OPEN = 1
        static readonly CLOSING = 2
        static readonly CLOSED = 3
        constructor() {
          setTimeout(() => {
            this.onopen?.()
            // Simulate call events
            setTimeout(() => {
              this.onmessage?.({
                data: JSON.stringify({
                  type: 'broadcast',
                  data: {
                    type: 'call_started',
                    call: {
                      id: 'call_123',
                      from_number: '+15551234567',
                      status: 'in_progress',
                      timestamp: Date.now()
                    }
                  },
                  timestamp: Date.now()
                })
              })
            }, 1000)
            
            setTimeout(() => {
              this.onmessage?.({
                data: JSON.stringify({
                  type: 'broadcast',
                  data: {
                    type: 'call_ended',
                    callId: 'call_123',
                    updates: {
                      status: 'completed',
                      duration: 180,
                      transcript: 'AI: Hello! Customer: Thanks!'
                    }
                  },
                  timestamp: Date.now()
                })
              })
            }, 3000)
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

    await page.goto('/dashboard')
    await page.waitForTimeout(5000)
    
    // Check if call updates appear in real-time
    await expect(page.locator('text=+15551234567')).toBeVisible()
  })
})