import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should allow user to register with valid data', async ({ page }) => {
    await page.route('**/api/auth/register-simple', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          data: {
            token: 'test-token',
            user: { id: 'user-1', email: 'john.doe@example.com', first_name: 'John', last_name: 'Doe', name: 'John Doe', business_id: 'biz-1' },
            business: { id: 'biz-1', business_name: 'John\'s Business', business_type: 'HVAC' }
          }
        })
      })
    })

    await page.goto('/register-simple')

    await page.getByLabel('First Name *').fill('John')
    await page.getByLabel('Last Name *').fill('Doe')
    await page.getByLabel('Business Name *').fill('John\'s Business')
    await page.getByLabel('Email *').fill('john.doe@example.com')
    await page.getByLabel('Password *').fill('SecurePassword123!')
    await page.getByLabel('Phone Number *').fill('+1234567890')
    await page.getByLabel('Business Address *').fill('123 Market St, San Francisco, CA')
    await page.getByLabel('I agree to the Terms of Service and Privacy Policy').check()

    await page.getByRole('button', { name: 'Create Account' }).click()

    await expect(page.getByText('Account created successfully!')).toBeVisible()
  })

  test('should allow user to login with valid credentials', async ({ page }) => {
    await page.route('**/api/auth/login-simple', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          data: {
            token: 'login-token',
            user: { id: 'user-1', email: 'test@example.com' },
            business: { id: 'biz-1' }
          }
        })
      })
    })

    await page.goto('/login')

    await page.getByLabel('Email').fill('test@example.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Sign In' }).click()

    await page.waitForURL('**/dashboard')
  })

  test('should show error for invalid login credentials', async ({ page }) => {
    await page.route('**/api/auth/login-simple', async (route) => {
      await route.fulfill({
        status: 401,
        body: JSON.stringify({
          success: false,
          message: 'Invalid credentials'
        })
      })
    })

    await page.goto('/login')

    await page.getByLabel('Email').fill('invalid@example.com')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: 'Sign In' }).click()

    await expect(page.getByText('Invalid credentials')).toBeVisible()
  })

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/.*login/)
  })
})
