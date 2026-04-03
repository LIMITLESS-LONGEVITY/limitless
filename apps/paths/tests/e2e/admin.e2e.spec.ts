import { test, expect, Page } from '@playwright/test'
import { login } from '../helpers/login'
import { seedTestUser, cleanupTestUsers } from '../helpers/seedUser'
import { seedPillars, seedTiers } from '../helpers/seedContent'
import { TEST_ADMIN } from '../fixtures/test-data'

test.describe('Admin Panel', () => {
  let page: Page
  let adminUser: any
  let _tenantId: number
  let _pillarId: number

  test.beforeAll(async ({ browser }) => {
    // Seed data: admin user (which creates a tenant), pillars, tiers
    adminUser = await seedTestUser(TEST_ADMIN)
    _pillarId = await seedPillars()
    await seedTiers()

    // Extract tenant ID from seeded admin user
    if (adminUser.tenants && adminUser.tenants.length > 0) {
      const tenantEntry = adminUser.tenants[0]
      _tenantId = typeof tenantEntry.tenant === 'object' ? tenantEntry.tenant.id : tenantEntry.tenant
    }

    // Create browser context and login
    const context = await browser.newContext()
    page = await context.newPage()
    await login({ page, user: TEST_ADMIN })
  })

  test.afterAll(async () => {
    await cleanupTestUsers([TEST_ADMIN.email])
    if (page) {
      await page.context().close()
    }
  })

  test('admin can login and see dashboard', async () => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    // Verify dashboard heading is visible
    const dashboardHeading = page.locator('span[title="Dashboard"]').first()
    await expect(dashboardHeading).toBeVisible()

    // Verify collections sidebar shows key collections
    const sidebar = page.locator('nav')
    await expect(sidebar.getByText('Articles')).toBeVisible()
    await expect(sidebar.getByText('Courses')).toBeVisible()
    await expect(sidebar.getByText('Users')).toBeVisible()
  })

  test('admin can navigate to Articles collection', async () => {
    await page.goto('/admin/collections/articles')
    await page.waitForLoadState('networkidle')

    // Verify list view loads with Articles heading
    const heading = page.locator('h1', { hasText: 'Articles' }).first()
    await expect(heading).toBeVisible()
  })

  test('admin can create an article', async () => {
    test.setTimeout(60000)

    await page.goto('/admin/collections/articles/create')
    await page.waitForLoadState('networkidle')

    // Fill in title
    const titleField = page.locator('#field-title')
    await titleField.waitFor({ state: 'visible' })
    await titleField.fill('E2E Test: Admin Created Article')

    // Fill in slug
    const slugField = page.locator('#field-slug')
    await slugField.fill('e2e-admin-created-article')

    // Select pillar from relationship dropdown
    const pillarField = page.locator('#field-pillar')
    await pillarField.scrollIntoViewIfNeeded()
    // Payload relationship fields use a custom React Select component
    // Click the field area to open the dropdown
    const _pillarContainer = page.locator('.field-type.relationship', { has: page.locator('#field-pillar') })
    // Try clicking on the relationship field's value container to open it
    await pillarField.click()
    // Wait for options to load and select the first one
    const pillarOption = page.locator('.rs__option').first()
    await pillarOption.waitFor({ state: 'visible', timeout: 10000 })
    await pillarOption.click()

    // Select author from relationship dropdown
    const authorField = page.locator('#field-author')
    await authorField.scrollIntoViewIfNeeded()
    await authorField.click()
    const authorOption = page.locator('.rs__option').first()
    await authorOption.waitFor({ state: 'visible', timeout: 10000 })
    await authorOption.click()

    // Select tenant (multi-tenant plugin adds this field)
    // The tenant field may be named 'tenant' or 'assignedTenant'
    const tenantField = page.locator('#field-tenant').or(page.locator('#field-assignedTenant'))
    if (await tenantField.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tenantField.scrollIntoViewIfNeeded()
      await tenantField.click()
      const tenantOption = page.locator('.rs__option').first()
      await tenantOption.waitFor({ state: 'visible', timeout: 10000 })
      await tenantOption.click()
    }

    // Select access level — it defaults to 'free', but let's verify it's set
    const accessLevelField = page.locator('#field-accessLevel')
    await accessLevelField.scrollIntoViewIfNeeded()
    // The select field should already have 'free' as default — verify it
    await expect(accessLevelField).toHaveValue('free')

    // Editorial status defaults to 'draft' — leave as is

    // Click Save (submit button)
    const saveButton = page.locator('button[type="submit"]', { hasText: /save/i }).first()
    await saveButton.scrollIntoViewIfNeeded()
    await saveButton.click()

    // Wait for save to complete — should redirect to edit page with ID in URL
    await page.waitForURL(/\/admin\/collections\/articles\/\d+/, { timeout: 15000 })
    await page.waitForLoadState('networkidle')

    // Verify no error toast/message
    const errorToast = page.locator('.toast-error, .Toastify__toast--error, [class*="error"]').first()
    const hasError = await errorToast.isVisible({ timeout: 2000 }).catch(() => false)
    expect(hasError).toBe(false)

    // Verify we're on the edit page (title field still has our value)
    await expect(page.locator('#field-title')).toHaveValue('E2E Test: Admin Created Article')
  })

  test('admin can publish an article', async () => {
    test.setTimeout(60000)

    // We should still be on the article edit page from the previous test
    // If not, navigate to the articles list and find our article
    const currentUrl = page.url()
    if (!currentUrl.includes('/admin/collections/articles/')) {
      await page.goto('/admin/collections/articles')
      await page.waitForLoadState('networkidle')
      // Click on our test article
      const articleLink = page.getByText('E2E Test: Admin Created Article').first()
      await articleLink.click()
      await page.waitForLoadState('networkidle')
    }

    // Change editorial status to Published
    const statusField = page.locator('#field-editorialStatus')
    await statusField.scrollIntoViewIfNeeded()
    await statusField.selectOption('published')

    // Click Save
    const saveButton = page.locator('button[type="submit"]', { hasText: /save/i }).first()
    await saveButton.scrollIntoViewIfNeeded()
    await saveButton.click()

    // Wait for save to complete
    await page.waitForLoadState('networkidle')

    // Wait a moment for the save response
    await page.waitForTimeout(2000)

    // Verify the status field now shows 'published'
    await expect(page.locator('#field-editorialStatus')).toHaveValue('published')
  })

  test('admin can see all collections', async () => {
    const collections = [
      { path: '/admin/collections/articles', name: 'Articles' },
      { path: '/admin/collections/courses', name: 'Courses' },
      { path: '/admin/collections/users', name: 'Users' },
      { path: '/admin/collections/membership-tiers', name: 'Membership Tiers' },
      { path: '/admin/collections/content-pillars', name: 'Content Pillars' },
    ]

    for (const collection of collections) {
      await page.goto(collection.path)
      await page.waitForLoadState('networkidle')

      // Verify the list view loads (h1 heading with collection name)
      const heading = page.locator('h1').first()
      await expect(heading).toBeVisible({ timeout: 10000 })

      // Verify no error screen (check that we're not on a 404 or error page)
      const errorIndicator = page.locator('text=Not Found').or(page.locator('text=Error'))
      const hasError = await errorIndicator.isVisible({ timeout: 1000 }).catch(() => false)
      expect(hasError).toBe(false)
    }
  })
})
