import { test, expect } from '@playwright/test'
import { login } from '../helpers/login'
import { seedTestUser, cleanupTestUsers } from '../helpers/seedUser'
import { seedPillars, seedTiers, seedArticle } from '../helpers/seedContent'
import { TEST_ADMIN, TEST_CONTRIBUTOR } from '../fixtures/test-data'

test.describe('Contributor Experience & Permissions', () => {
  let adminUser: any
  let contributorUser: any
  let tenantId: number
  let pillarId: number

  test.beforeAll(async () => {
    // Seed admin and contributor users + supporting data
    adminUser = await seedTestUser(TEST_ADMIN)
    contributorUser = await seedTestUser(TEST_CONTRIBUTOR)

    pillarId = await seedPillars()
    await seedTiers()

    // Extract tenant ID
    if (contributorUser.tenants && contributorUser.tenants.length > 0) {
      const tenantEntry = contributorUser.tenants[0]
      tenantId =
        typeof tenantEntry.tenant === 'object'
          ? tenantEntry.tenant.id
          : tenantEntry.tenant
    }

    // Seed a published article owned by admin
    await seedArticle({
      title: 'Admin Published Article',
      slug: 'admin-published-article',
      excerpt: 'Published by admin for contributor visibility test.',
      accessLevel: 'free',
      editorialStatus: 'published',
      authorId: adminUser.id as number,
      tenantId,
      pillarId,
    })

    // Seed a draft article owned by admin (contributor should NOT see this)
    await seedArticle({
      title: 'Admin Draft Article',
      slug: 'admin-draft-article',
      excerpt: 'Draft by admin — should be hidden from contributors.',
      accessLevel: 'free',
      editorialStatus: 'draft',
      authorId: adminUser.id as number,
      tenantId,
      pillarId,
    })

    // Seed a draft article owned by contributor (contributor should see this)
    await seedArticle({
      title: 'Contributor Own Draft',
      slug: 'contributor-own-draft',
      excerpt: 'Draft by contributor — should be visible to them.',
      accessLevel: 'free',
      editorialStatus: 'draft',
      authorId: contributorUser.id as number,
      tenantId,
      pillarId,
    })
  })

  test.afterAll(async () => {
    await cleanupTestUsers([TEST_ADMIN.email, TEST_CONTRIBUTOR.email])
  })

  test('contributor can login to admin panel', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      await login({ page, user: TEST_CONTRIBUTOR })

      // Dashboard should be visible
      const dashboardHeading = page.locator('span[title="Dashboard"]').first()
      await expect(dashboardHeading).toBeVisible()
    } finally {
      await context.close()
    }
  })

  test('contributor can see Articles collection', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      await login({ page, user: TEST_CONTRIBUTOR })

      await page.goto('/admin/collections/articles')
      await page.waitForLoadState('networkidle')

      // Verify the articles list view loads
      const heading = page.locator('h1', { hasText: 'Articles' }).first()
      await expect(heading).toBeVisible({ timeout: 10000 })

      // Contributor's own draft should be visible
      await expect(
        page.getByText('Contributor Own Draft').first(),
      ).toBeVisible({ timeout: 10000 })
    } finally {
      await context.close()
    }
  })

  test('contributor cannot see other users\' drafts', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      await login({ page, user: TEST_CONTRIBUTOR })

      await page.goto('/admin/collections/articles')
      await page.waitForLoadState('networkidle')

      // Wait for the list to fully load
      await page.waitForTimeout(2000)

      // Admin's draft article should NOT be visible to the contributor
      const adminDraft = page.getByText('Admin Draft Article')
      const isVisible = await adminDraft
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)
      expect(isVisible).toBe(false)
    } finally {
      await context.close()
    }
  })

  test('contributor can create a new article', async ({ browser }) => {
    test.setTimeout(60000)

    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      await login({ page, user: TEST_CONTRIBUTOR })

      await page.goto('/admin/collections/articles/create')
      await page.waitForLoadState('networkidle')

      // Fill in title
      const titleField = page.locator('#field-title')
      await titleField.waitFor({ state: 'visible' })
      await titleField.fill('Contributor New Article')

      // Fill in slug
      const slugField = page.locator('#field-slug')
      await slugField.fill('contributor-new-article')

      // Select pillar
      const pillarField = page.locator('#field-pillar')
      await pillarField.scrollIntoViewIfNeeded()
      await pillarField.click()
      const pillarOption = page.locator('.rs__option').first()
      await pillarOption.waitFor({ state: 'visible', timeout: 10000 })
      await pillarOption.click()

      // Select author (self)
      const authorField = page.locator('#field-author')
      await authorField.scrollIntoViewIfNeeded()
      await authorField.click()
      const authorOption = page.locator('.rs__option').first()
      await authorOption.waitFor({ state: 'visible', timeout: 10000 })
      await authorOption.click()

      // Select tenant
      const tenantField = page
        .locator('#field-tenant')
        .or(page.locator('#field-assignedTenant'))
      if (await tenantField.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tenantField.scrollIntoViewIfNeeded()
        await tenantField.click()
        const tenantOption = page.locator('.rs__option').first()
        await tenantOption.waitFor({ state: 'visible', timeout: 10000 })
        await tenantOption.click()
      }

      // Save
      const saveButton = page
        .locator('button[type="submit"]', { hasText: /save/i })
        .first()
      await saveButton.scrollIntoViewIfNeeded()
      await saveButton.click()

      // Wait for redirect to edit page — indicates successful save
      await page.waitForURL(/\/admin\/collections\/articles\/\d+/, {
        timeout: 15000,
      })
      await page.waitForLoadState('networkidle')

      // Verify title was saved
      await expect(page.locator('#field-title')).toHaveValue(
        'Contributor New Article',
      )
    } finally {
      await context.close()
    }
  })

  test('contributor cannot access Users collection', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      await login({ page, user: TEST_CONTRIBUTOR })

      await page.goto('/admin/collections/users')
      await page.waitForLoadState('networkidle')

      // Contributor should be denied access — either redirected away,
      // shown an "Unauthorized" / "Not Found" message, or the page
      // does not show the Users list heading
      const usersHeading = page
        .locator('h1', { hasText: 'Users' })
        .first()
      const hasUsersHeading = await usersHeading
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      // Check for unauthorized/forbidden indicators
      const unauthorizedText = page
        .getByText(/unauthorized|forbidden|not allowed|access denied/i)
        .first()
      const hasUnauthorized = await unauthorizedText
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      // Check if we were redirected away from the users page
      const currentUrl = page.url()
      const wasRedirected = !currentUrl.includes('/collections/users')

      // Access should be denied: either no heading, unauthorized message, or redirect
      const accessDenied = !hasUsersHeading || hasUnauthorized || wasRedirected
      expect(accessDenied).toBe(true)
    } finally {
      await context.close()
    }
  })
})
