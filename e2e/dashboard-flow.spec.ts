import { test, expect } from '@playwright/test'

test.describe('Dashboard Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock login - in real tests you'd use actual login
    await page.goto('/login')
    await page.fill('[data-testid="email"]', 'test@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL(/.*dashboard/)
  })

  test('should display dashboard with real data', async ({ page }) => {
    // Check dashboard loads
    await expect(page.locator('[data-testid="dashboard-title"]')).toBeVisible()
    
    // Check for key metrics
    await expect(page.locator('[data-testid="total-calls"]')).toBeVisible()
    await expect(page.locator('[data-testid="active-calls"]')).toBeVisible()
    await expect(page.locator('[data-testid="appointments-today"]')).toBeVisible()
    
    // Check for recent activity
    await expect(page.locator('[data-testid="recent-calls"]')).toBeVisible()
    await expect(page.locator('[data-testid="recent-appointments"]')).toBeVisible()
  })

  test('should navigate to calls page', async ({ page }) => {
    await page.click('[data-testid="calls-nav"]')
    await expect(page).toHaveURL(/.*calls/)
    await expect(page.locator('[data-testid="calls-title"]')).toBeVisible()
  })

  test('should navigate to appointments page', async ({ page }) => {
    await page.click('[data-testid="appointments-nav"]')
    await expect(page).toHaveURL(/.*appointments/)
    await expect(page.locator('[data-testid="appointments-title"]')).toBeVisible()
  })

  test('should navigate to settings page', async ({ page }) => {
    await page.click('[data-testid="settings-nav"]')
    await expect(page).toHaveURL(/.*settings/)
    await expect(page.locator('[data-testid="settings-title"]')).toBeVisible()
  })

  test('should display loading states', async ({ page }) => {
    // Check that loading indicators appear
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible()
    
    // Wait for data to load
    await expect(page.locator('[data-testid="total-calls"]')).toBeVisible({ timeout: 10000 })
  })
})


