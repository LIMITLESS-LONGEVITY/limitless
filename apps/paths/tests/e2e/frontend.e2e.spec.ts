import { test, expect, Page, BrowserContext } from '@playwright/test'
import { seedTestUser, cleanupTestUsers } from '../helpers/seedUser'
import { seedPillars, seedTiers, seedArticle } from '../helpers/seedContent'
import { TEST_ADMIN, TEST_USER, TEST_ARTICLE, TEST_PREMIUM_ARTICLE } from '../fixtures/test-data'
import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

test.describe('Frontend Pages', () => {
  let adminUser: any
  let _regularUser: any
  let premiumUser: any
  let tenantId: number
  let pillarId: number
  let tiers: { freeId: number; premiumId: number }

  // Browser contexts
  let authedContext: BrowserContext
  let authedPage: Page
  let premiumContext: BrowserContext
  let premiumPage: Page

  const PREMIUM_USER = {
    email: 'test-premium-user@limitless.test',
    password: 'TestPremium2026!',
    firstName: 'Premium',
    lastName: 'Reader',
    role: 'user' as const,
  }

  test.beforeAll(async ({ browser }) => {
    // Seed supporting data
    adminUser = await seedTestUser(TEST_ADMIN)
    pillarId = await seedPillars()
    tiers = await seedTiers()

    // Extract tenant ID from admin user
    if (adminUser.tenants && adminUser.tenants.length > 0) {
      const tenantEntry = adminUser.tenants[0]
      tenantId = typeof tenantEntry.tenant === 'object' ? tenantEntry.tenant.id : tenantEntry.tenant
    }

    // Seed regular user (free tier)
    _regularUser = await seedTestUser(TEST_USER)

    // Seed premium user and assign premium tier
    premiumUser = await seedTestUser(PREMIUM_USER)
    const payload = await getPayload({ config })
    await payload.update({
      collection: 'users',
      id: premiumUser.id,
      data: { tier: tiers.premiumId } as any,
      overrideAccess: true,
    })

    // Seed published free article
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

    // Seed published premium article
    await seedArticle({
      title: TEST_PREMIUM_ARTICLE.title,
      slug: TEST_PREMIUM_ARTICLE.slug,
      excerpt: TEST_PREMIUM_ARTICLE.excerpt,
      accessLevel: TEST_PREMIUM_ARTICLE.accessLevel,
      editorialStatus: 'published',
      authorId: adminUser.id,
      tenantId,
      pillarId,
      content: TEST_PREMIUM_ARTICLE.content,
    })

    // Create authenticated context for regular user via Payload login API
    authedContext = await browser.newContext()
    authedPage = await authedContext.newPage()
    const loginRes = await authedPage.request.post('http://localhost:3000/api/users/login', {
      data: { email: TEST_USER.email, password: TEST_USER.password },
    })
    // Extract and set cookies from the login response
    const cookies = loginRes.headers()['set-cookie']
    if (cookies) {
      const cookieEntries = Array.isArray(cookies) ? cookies : [cookies]
      for (const cookieStr of cookieEntries) {
        const [nameValue] = cookieStr.split(';')
        const [name, ...valueParts] = nameValue.split('=')
        await authedContext.addCookies([{
          name: name.trim(),
          value: valueParts.join('=').trim(),
          domain: 'localhost',
          path: '/',
        }])
      }
    }

    // Create premium user context
    premiumContext = await browser.newContext()
    premiumPage = await premiumContext.newPage()
    const premLoginRes = await premiumPage.request.post('http://localhost:3000/api/users/login', {
      data: { email: PREMIUM_USER.email, password: PREMIUM_USER.password },
    })
    const premCookies = premLoginRes.headers()['set-cookie']
    if (premCookies) {
      const cookieEntries = Array.isArray(premCookies) ? premCookies : [premCookies]
      for (const cookieStr of cookieEntries) {
        const [nameValue] = cookieStr.split(';')
        const [name, ...valueParts] = nameValue.split('=')
        await premiumContext.addCookies([{
          name: name.trim(),
          value: valueParts.join('=').trim(),
          domain: 'localhost',
          path: '/',
        }])
      }
    }
  })

  test.afterAll(async () => {
    await cleanupTestUsers([TEST_ADMIN.email, TEST_USER.email, PREMIUM_USER.email])
    if (authedContext) await authedContext.close()
    if (premiumContext) await premiumContext.close()
  })

  test('homepage loads with content', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    try {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Verify the page is not blank — check for nav/header elements
      const header = page.locator('header').first()
      await expect(header).toBeVisible({ timeout: 10000 })

      // Check that body has meaningful content (not a blank screen)
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.length).toBeGreaterThan(50)
    } finally {
      await context.close()
    }
  })

  test('articles listing shows published articles', async () => {
    await authedPage.goto('/articles')
    await authedPage.waitForLoadState('networkidle')

    // Verify the Articles heading
    const heading = authedPage.locator('h1', { hasText: 'Articles' })
    await expect(heading).toBeVisible({ timeout: 10000 })

    // Verify our seeded free article title appears
    const articleTitle = authedPage.getByText(TEST_ARTICLE.title)
    await expect(articleTitle).toBeVisible({ timeout: 10000 })
  })

  test('article reader shows title, content, and sidebar', async () => {
    await authedPage.goto(`/articles/${TEST_ARTICLE.slug}`)
    await authedPage.waitForLoadState('networkidle')

    // Verify article title
    const title = authedPage.locator('h1', { hasText: TEST_ARTICLE.title })
    await expect(title).toBeVisible({ timeout: 10000 })

    // Verify content text is visible (from the seeded Lexical content)
    const sectionText = authedPage.getByText('This is the first section content for testing.')
    await expect(sectionText).toBeVisible()

    // Verify sidebar exists (ArticleSidebar component uses aside or nav in sidebar)
    const sidebar = authedPage.locator('aside').or(authedPage.locator('[class*="sidebar" i]')).first()
    await expect(sidebar).toBeVisible()
  })

  test('courses listing page loads', async () => {
    await authedPage.goto('/courses')
    await authedPage.waitForLoadState('networkidle')

    // Verify the Courses heading
    const heading = authedPage.locator('h1', { hasText: 'Courses' })
    await expect(heading).toBeVisible({ timeout: 10000 })
  })

  test('search page shows search input', async () => {
    await authedPage.goto('/search')
    await authedPage.waitForLoadState('networkidle')

    // Verify the Search heading
    const heading = authedPage.locator('h1', { hasText: 'Search' })
    await expect(heading).toBeVisible({ timeout: 10000 })

    // Verify search input is visible
    const searchInput = authedPage.locator('#search').or(authedPage.locator('input[placeholder*="Search"]'))
    await expect(searchInput).toBeVisible()
  })

  test('locked content shows upgrade banner for anonymous user', async ({ browser }) => {
    // Use a fresh context with no cookies (anonymous)
    const anonContext = await browser.newContext()
    const anonPage = await anonContext.newPage()

    try {
      await anonPage.goto(`/articles/${TEST_PREMIUM_ARTICLE.slug}`)
      await anonPage.waitForLoadState('networkidle')

      // Verify the article title is visible
      const title = anonPage.locator('h1', { hasText: TEST_PREMIUM_ARTICLE.title })
      await expect(title).toBeVisible({ timeout: 10000 })

      // Verify upgrade banner is visible (LockedContentBanner shows "Upgrade" link and "Premium content" text)
      const upgradeBanner = anonPage.getByText('Upgrade').or(anonPage.getByText('Premium content'))
      await expect(upgradeBanner.first()).toBeVisible({ timeout: 10000 })
    } finally {
      await anonContext.close()
    }
  })

  test('premium user sees full content without upgrade banner', async () => {
    await premiumPage.goto(`/articles/${TEST_PREMIUM_ARTICLE.slug}`)
    await premiumPage.waitForLoadState('networkidle')

    // Verify article title
    const title = premiumPage.locator('h1', { hasText: TEST_PREMIUM_ARTICLE.title })
    await expect(title).toBeVisible({ timeout: 10000 })

    // Verify the full content is visible (not locked)
    const premiumContent = premiumPage.getByText('This premium content should be locked for free users.')
    await expect(premiumContent).toBeVisible({ timeout: 10000 })

    // Verify no upgrade banner
    const upgradeLink = premiumPage.locator('a', { hasText: 'Upgrade' })
    await expect(upgradeLink).not.toBeVisible({ timeout: 3000 })
  })
})
