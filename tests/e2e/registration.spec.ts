import { test, expect } from '@playwright/test'

test.describe('User Registration', () => {
  test('should complete registration flow successfully', async ({ page }) => {
    await page.goto('/register')
    
    // Fill out registration form
    await page.fill('input[name="businessName"]', 'Test HVAC Services')
    await page.selectOption('select[name="businessType"]', 'HVAC')
    await page.fill('input[name="firstName"]', 'John')
    await page.fill('input[name="lastName"]', 'Doe')
    await page.fill('input[name="email"]', 'john@testhvac.com')
    await page.fill('input[name="password"]', 'password123')
    await page.fill('input[name="phone"]', '5551234567')
    await page.fill('input[name="address"]', '123 Test St, Test City, TC 12345')
    
    // Add services
    await page.fill('input[name="services"]', 'HVAC Repair, Installation, Maintenance')
    
    // Add service areas
    await page.fill('input[name="serviceAreas"]', 'Downtown, Suburbs')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Check for success message or redirect
    await expect(page.getByText(/Registration successful/)).toBeVisible()
  })

  test('should show validation errors for invalid input', async ({ page }) => {
    await page.goto('/register')
    
    // Submit form with invalid data
    await page.fill('input[name="email"]', 'invalid-email')
    await page.fill('input[name="password"]', '123') // Too short
    await page.click('button[type="submit"]')
    
    // Check for validation errors
    await expect(page.getByText(/Invalid email/)).toBeVisible()
    await expect(page.getByText(/Password must be at least 8 characters/)).toBeVisible()
  })

  test('should show validation errors for missing required fields', async ({ page }) => {
    await page.goto('/register')
    
    // Submit form with missing fields
    await page.click('button[type="submit"]')
    
    // Check for validation errors
    await expect(page.getByText(/Business name is required/)).toBeVisible()
    await expect(page.getByText(/First name is required/)).toBeVisible()
    await expect(page.getByText(/Last name is required/)).toBeVisible()
    await expect(page.getByText(/Email is required/)).toBeVisible()
    await expect(page.getByText(/Password is required/)).toBeVisible()
  })

  test('should handle server errors gracefully', async ({ page }) => {
    // Mock server error
    await page.route('**/api/auth/register', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error'
        })
      })
    })
    
    await page.goto('/register')
    
    // Fill out form
    await page.fill('input[name="businessName"]', 'Test HVAC Services')
    await page.selectOption('select[name="businessType"]', 'HVAC')
    await page.fill('input[name="firstName"]', 'John')
    await page.fill('input[name="lastName"]', 'Doe')
    await page.fill('input[name="email"]', 'john@testhvac.com')
    await page.fill('input[name="password"]', 'password123')
    await page.fill('input[name="phone"]', '5551234567')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Check for error message
    await expect(page.getByText(/Internal server error/)).toBeVisible()
  })

  test('should redirect to dashboard after successful registration', async ({ page }) => {
    await page.goto('/register')
    
    // Fill out and submit form
    await page.fill('input[name="businessName"]', 'Test HVAC Services')
    await page.selectOption('select[name="businessType"]', 'HVAC')
    await page.fill('input[name="firstName"]', 'John')
    await page.fill('input[name="lastName"]', 'Doe')
    await page.fill('input[name="email"]', 'john@testhvac.com')
    await page.fill('input[name="password"]', 'password123')
    await page.fill('input[name="phone"]', '5551234567')
    await page.fill('input[name="address"]', '123 Test St, Test City, TC 12345')
    
    await page.click('button[type="submit"]')
    
    // Check for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/)
  })
})
