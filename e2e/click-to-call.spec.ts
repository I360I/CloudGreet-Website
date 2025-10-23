import { test, expect } from '@playwright/test'

test.describe('Click-to-Call Flow', () => {
  test('should initiate call with valid phone number', async ({ page }) => {
    await page.goto('/')
    
    // Fill call form
    await page.fill('[data-testid="phone-number"]', '+1234567890')
    await page.fill('[data-testid="business-name"]', 'Test Business')
    await page.fill('[data-testid="business-type"]', 'Service')
    
    // Submit call
    await page.click('[data-testid="call-button"]')
    
    // Should show success message
    await expect(page.locator('[data-testid="call-success"]')).toBeVisible()
  })

  test('should show error for invalid phone number', async ({ page }) => {
    await page.goto('/')
    
    // Fill call form with invalid phone
    await page.fill('[data-testid="phone-number"]', '123')
    await page.fill('[data-testid="business-name"]', 'Test Business')
    
    // Submit call
    await page.click('[data-testid="call-button"]')
    
    // Should show error message
    await expect(page.locator('[data-testid="call-error"]')).toBeVisible()
  })

  test('should show error for missing business name', async ({ page }) => {
    await page.goto('/')
    
    // Fill call form without business name
    await page.fill('[data-testid="phone-number"]', '+1234567890')
    
    // Submit call
    await page.click('[data-testid="call-button"]')
    
    // Should show error message
    await expect(page.locator('[data-testid="call-error"]')).toBeVisible()
  })

  test('should show loading state during call initiation', async ({ page }) => {
    await page.goto('/')
    
    // Fill call form
    await page.fill('[data-testid="phone-number"]', '+1234567890')
    await page.fill('[data-testid="business-name"]', 'Test Business')
    
    // Submit call
    await page.click('[data-testid="call-button"]')
    
    // Should show loading state
    await expect(page.locator('[data-testid="call-loading"]')).toBeVisible()
  })
})


