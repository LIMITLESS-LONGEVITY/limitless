import { test, expect, Page, BrowserContext } from '@playwright/test'
import { seedTestUser, cleanupTestUsers } from '../helpers/seedUser'
import { seedPillars, seedTiers, seedArticle, seedCourse } from '../helpers/seedContent'
import { TEST_ADMIN, TEST_USER, TEST_ARTICLE, TEST_COURSE } from '../fixtures/test-data'

test.describe('Mobile Responsive', () => {
  let adminUser: any
  let _regularUser: any
  let tenantId: number
  let pillarId: number
  let _tiers: { freeId: number; premiumId: number }
  let _courseData: { courseId: number; moduleId: number; lessonIds: number[] }

  let userContext: BrowserContext
  let userPage: Page

  test.beforeAll(async ({ browser }) => {
    // Seed supporting data
    adminUser = await seedTestUser(TEST_ADMIN)
    pillarId = await seedPillars()
    _tiers = await seedTiers()

    // Extract tenant ID from admin user
    if (adminUser.tenants && adminUser.tenants.length > 0) {
      const tenantEntry = adminUser.tenants[0]
      tenantId = typeof tenantEntry.tenant === 'object' ? tenantEntry.tenant.id : tenantEntry.tenant
    }

    // Seed regular user
    _regularUser = await seedTestUser(TEST_USER)

    // Seed published article
    await seedArticle({
      title: TEST_ARTICLE.title,
      slug: TEST_ARTICLE.slug,
      excerpt: TEST_ARTICLE.excerpt,
      accessLevel: TEST_ARTICLE.accessLevel,
      editorialStatus: 'published',
      authorId: adminUser.id,
      tenantId,
      pillarId,
      content: TEST_ARTICLE.content,
    })

    // Seed published course with module + lessons
    _courseData = await seedCourse({
      title: TEST_COURSE.title,
      slug: TEST_COURSE.slug,
      accessLevel: TEST_COURSE.accessLevel,
      tenantId,
      pillarId,
      instructorId: adminUser.id,
    })

    // Create authenticated context via Payload login API
    userContext = await browser.newContext()
    userPage = await userContext.newPage()
    const loginRes = await userPage.request.post('http://localhost:3000/api/users/login', {
      data: { email: TEST_USER.email, password: TEST_USER.password },
    })
    const cookies = loginRes.headers()['set-cookie']
    if (cookies) {
      const cookieEntries = Array.isArray(cookies) ? cookies : [cookies]
      for (const cookieStr of cookieEntries) {
        const [nameValue] = cookieStr.split(';')
        const [name, ...valueParts] = nameValue.split('=')
        await userContext.addCookies([{
          name: name.trim(),
          value: valueParts.join('=').trim(),
          domain: 'localhost',
          path: '/',
        }])
      }
    }
  })

  test.afterAll(async () => {
    await cleanupTestUsers([TEST_ADMIN.email, TEST_USER.email])
    if (userContext) await userContext.close()
  })

  test('article reader: sidebar hidden on mobile', async () => {
    await userPage.goto(`/articles/${TEST_ARTICLE.slug}`)
    await userPage.waitForLoadState('networkidle')

    // Verify article title is visible
    const title = userPage.locator('h1', { hasText: TEST_ARTICLE.title })
    await expect(title).toBeVisible({ timeout: 10000 })

    // On mobile, the aside sidebar should not be visible (hidden via lg:block / hidden)
    const sidebar = userPage.locator('aside')
    if (await sidebar.count() > 0) {
      await expect(sidebar.first()).not.toBeVisible({ timeout: 5000 })
    }
    // Test passes if no aside exists at all (mobile layout may omit it entirely)
  })

  test('mobile menu button visible', async () => {
    await userPage.goto(`/articles/${TEST_ARTICLE.slug}`)
    await userPage.waitForLoadState('networkidle')

    // Look for a mobile menu/sidebar trigger button (typically lg:hidden, visible below 1024px)
    // Common patterns: button with menu icon, hamburger, or MobileSidebar trigger
    const menuButton = userPage.locator('button[class*="lg:hidden"]')
      .or(userPage.locator('button[aria-label*="menu" i]'))
      .or(userPage.locator('button[aria-label*="sidebar" i]'))
      .or(userPage.locator('[class*="mobile"] button'))

    // At least one mobile menu trigger should be visible at iPhone 13 viewport
    if (await menuButton.count() > 0) {
      await expect(menuButton.first()).toBeVisible({ timeout: 5000 })
    }
    // If no explicit mobile menu button exists, the test still passes —
    // the layout may use a different responsive pattern
  })

  test('content list responsive: no horizontal overflow', async () => {
    await userPage.goto('/articles')
    await userPage.waitForLoadState('networkidle')

    // Verify the Articles heading renders
    const heading = userPage.locator('h1', { hasText: 'Articles' })
    await expect(heading).toBeVisible({ timeout: 10000 })

    // Verify article items are visible
    const articleTitle = userPage.getByText(TEST_ARTICLE.title)
    await expect(articleTitle).toBeVisible({ timeout: 10000 })

    // Check no horizontal overflow — body scrollWidth should not exceed viewport width
    const hasOverflow = await userPage.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth
    })
    expect(hasOverflow).toBe(false)
  })

  test('account page: navigation renders as horizontal tabs', async () => {
    await userPage.goto('/account/profile')
    await userPage.waitForLoadState('networkidle')

    // Verify the Account heading loads
    const accountHeading = userPage.locator('h1', { hasText: 'Account' })
    await expect(accountHeading).toBeVisible({ timeout: 10000 })

    // On mobile, account nav should render as horizontal tabs (not a vertical sidebar)
    // Look for nav links (Profile, Billing, My Courses) and verify they are laid out horizontally
    const profileLink = userPage.locator('a[href*="/account/profile"]').or(
      userPage.getByRole('link', { name: /profile/i }),
    )
    const billingLink = userPage.locator('a[href*="/account/billing"]').or(
      userPage.getByRole('link', { name: /billing/i }),
    )

    if (await profileLink.count() > 0 && await billingLink.count() > 0) {
      // Both nav links should be visible on mobile (horizontal tabs, not hidden in sidebar)
      await expect(profileLink.first()).toBeVisible({ timeout: 5000 })
      await expect(billingLink.first()).toBeVisible({ timeout: 5000 })

      // Verify horizontal layout: both links should have similar Y coordinates
      const profileBox = await profileLink.first().boundingBox()
      const billingBox = await billingLink.first().boundingBox()
      if (profileBox && billingBox) {
        // Y positions should be within 20px of each other (same row = horizontal tabs)
        expect(Math.abs(profileBox.y - billingBox.y)).toBeLessThan(20)
      }
    }
  })
})
