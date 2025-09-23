import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('should load landing page successfully', async ({ page }) => {
    await page.goto('/landing')
    
    // Check if page loads without errors
    await expect(page).toHaveTitle(/CloudGreet/)
    
    // Check for main heading
    await expect(page.getByRole('heading', { name: /Never Miss a Call Again/i })).toBeVisible()
  })

  test('should display hero section content', async ({ page }) => {
    await page.goto('/landing')
    
    // Check hero content
    await expect(page.getByText(/CloudGreet answers, qualifies, and books jobs/)).toBeVisible()
    await expect(page.getByText(/Simple pricing: \$200\/mo \+ \$50 per booking/)).toBeVisible()
  })

  test('should have working call-to-action button', async ({ page }) => {
    await page.goto('/landing')
    
    // Check CTA button
    const ctaButton = page.getByRole('link', { name: /Test for Free/i })
    await expect(ctaButton).toBeVisible()
    
    // Check if button links to correct page
    await expect(ctaButton).toHaveAttribute('href', '/start')
  })

  test('should display pricing section', async ({ page }) => {
    await page.goto('/landing')
    
    // Scroll to pricing section
    await page.getByRole('link', { name: /Pricing/i }).click()
    
    // Check pricing content
    await expect(page.getByText(/Simple, Transparent Pricing/)).toBeVisible()
    await expect(page.getByText(/\$200/)).toBeVisible()
    await expect(page.getByText(/\$50 per booking/)).toBeVisible()
  })

  test('should display features section', async ({ page }) => {
    await page.goto('/landing')
    
    // Check features
    await expect(page.getByText(/24\/7 AI Call Answering/)).toBeVisible()
    await expect(page.getByText(/Intelligent Lead Qualification/)).toBeVisible()
    await expect(page.getByText(/Calendar Booking & SMS Confirmations/)).toBeVisible()
  })

  test('should have working navigation', async ({ page }) => {
    await page.goto('/landing')
    
    // Check navigation links
    const navLinks = [
      { text: 'How it Works', href: '#how-it-works' },
      { text: 'Pricing', href: '#pricing' },
      { text: 'ROI Calculator', href: '#roi-calculator' }
    ]
    
    for (const link of navLinks) {
      const navLink = page.getByRole('link', { name: link.text })
      await expect(navLink).toBeVisible()
      await expect(navLink).toHaveAttribute('href', link.href)
    }
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/landing')
    
    // Check if content is still visible on mobile
    await expect(page.getByRole('heading', { name: /Never Miss a Call Again/i })).toBeVisible()
    await expect(page.getByText(/CloudGreet answers, qualifies, and books jobs/)).toBeVisible()
  })

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/landing')
    
    // Check meta description
    const metaDescription = page.locator('meta[name="description"]')
    await expect(metaDescription).toHaveAttribute('content', /Professional AI receptionist/)
    
    // Check Open Graph tags
    const ogTitle = page.locator('meta[property="og:title"]')
    await expect(ogTitle).toHaveAttribute('content', /CloudGreet/)
  })

  test('should load without JavaScript errors', async ({ page }) => {
    const errors: string[] = []
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    page.on('pageerror', error => {
      errors.push(error.message)
    })
    
    await page.goto('/landing')
    await page.waitForLoadState('networkidle')
    
    // Check for JavaScript errors
    expect(errors).toHaveLength(0)
  })

  test('should have proper accessibility', async ({ page }) => {
    await page.goto('/landing')
    
    // Check for proper heading structure
    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toBeVisible()
    
    // Check for alt text on images
    const images = page.locator('img')
    const imageCount = await images.count()
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i)
      const alt = await img.getAttribute('alt')
      expect(alt).toBeTruthy()
    }
  })
})
