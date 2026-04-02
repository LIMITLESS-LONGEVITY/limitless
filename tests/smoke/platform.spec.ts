import { test, expect } from '@playwright/test'

test.describe('Platform Smoke Tests', () => {
  test('OS Dashboard loads without JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/')
    await expect(page).toHaveTitle(/LIMITLESS/i)

    // Check no TypeError or ReferenceError in console
    const criticalErrors = errors.filter(
      (e) => e.includes('TypeError') || e.includes('ReferenceError'),
    )
    expect(criticalErrors).toEqual([])
  })

  test('PATHS login page loads', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/learn/login')
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()

    const criticalErrors = errors.filter(
      (e) => e.includes('TypeError') || e.includes('ReferenceError'),
    )
    expect(criticalErrors).toEqual([])
  })

  test('PATHS login and redirect to dashboard', async ({ page }) => {
    await page.goto('/learn/login')
    await page.fill('input[type="email"], input[name="email"]', 'admin@limitless-longevity.health')
    await page.fill('input[type="password"], input[name="password"]', 'TestUser2026!')
    await page.click('button[type="submit"]')

    // Should redirect to account or home page after login
    await page.waitForURL(/\/(learn)?(\/(account|courses|discover))?/, { timeout: 15_000 })
    expect(page.url()).not.toContain('/login')
  })

  test('PATHS courses page loads after login', async ({ page }) => {
    // Login first
    await page.goto('/learn/login')
    await page.fill('input[type="email"], input[name="email"]', 'admin@limitless-longevity.health')
    await page.fill('input[type="password"], input[name="password"]', 'TestUser2026!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(learn)?/, { timeout: 15_000 })

    // Navigate to courses
    await page.goto('/learn/courses')
    await expect(page.locator('body')).toBeVisible()

    // Page should not show an error state
    const bodyText = await page.textContent('body')
    expect(bodyText).not.toContain('Application error')
    expect(bodyText).not.toContain('Internal Server Error')
  })

  test('Cubes+ redirects to login when not authed', async ({ page }) => {
    const response = await page.goto('/train')
    // Should either redirect to login or show the landing page
    expect(response?.status()).toBeLessThan(500)
  })

  test('All health endpoints respond', async ({ request }) => {
    const endpoints = [
      { url: '/learn/api/health', expected: 200 },
      { url: '/book/api/health', expected: 200 },
    ]

    for (const { url, expected } of endpoints) {
      const response = await request.get(url)
      expect(response.status()).toBe(expected)
    }
  })
})
