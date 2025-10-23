import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should allow user to register and login', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/register-simple')
    
    // Fill registration form
    await page.fill('[data-testid="firstName"]', 'John')
    await page.fill('[data-testid="lastName"]', 'Doe')
    await page.fill('[data-testid="email"]', 'john.doe@example.com')
    await page.fill('[data-testid="password"]', 'SecurePassword123!')
    await page.fill('[data-testid="businessName"]', 'John\'s Business')
    await page.fill('[data-testid="phoneNumber"]', '+1234567890')
    
    // Submit registration
    await page.click('[data-testid="register-button"]')
    
    // Should redirect to login or dashboard
    await expect(page).toHaveURL(/.*(login|dashboard)/)
  })

  test('should allow user to login with valid credentials', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login')
    
    // Fill login form
    await page.fill('[data-testid="email"]', 'test@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    
    // Submit login
    await page.click('[data-testid="login-button"]')
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/)
  })

  test('should show error for invalid login credentials', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login')
    
    // Fill login form with invalid credentials
    await page.fill('[data-testid="email"]', 'invalid@example.com')
    await page.fill('[data-testid="password"]', 'wrongpassword')
    
    // Submit login
    await page.click('[data-testid="login-button"]')
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
  })

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    // Try to access dashboard without login
    await page.goto('/dashboard')
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/)
  })
})


