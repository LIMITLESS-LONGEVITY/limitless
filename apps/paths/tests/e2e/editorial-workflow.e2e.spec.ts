import { test, expect } from '@playwright/test'
import { login } from '../helpers/login'
import { seedAllTestUsers, cleanupTestUsers } from '../helpers/seedUser'
import { seedPillars, seedTiers } from '../helpers/seedContent'
import {
  TEST_ADMIN,
  TEST_CONTRIBUTOR,
  TEST_EDITOR,
  TEST_PUBLISHER,
} from '../fixtures/test-data'

test.describe('Editorial Workflow: Draft → Published Lifecycle', () => {
  let _adminUser: any
  let contributorUser: any
  let _editorUser: any
  let _publisherUser: any
  let _tenantId: number
  let _pillarId: number

  const articleTitle = 'E2E Editorial: Circadian Rhythm Optimization'
  const articleSlug = 'e2e-editorial-circadian-rhythm'

  test.beforeAll(async () => {
    // Seed all 4 roles + supporting data
    const users = await seedAllTestUsers([
      TEST_ADMIN,
      TEST_CONTRIBUTOR,
      TEST_EDITOR,
      TEST_PUBLISHER,
    ])
    _adminUser = users.get('admin')
    contributorUser = users.get('contributor')
    _editorUser = users.get('editor')
    _publisherUser = users.get('publisher')

    _pillarId = await seedPillars()
    await seedTiers()

    // Extract tenant ID from any seeded user
    if (contributorUser.tenants && contributorUser.tenants.length > 0) {
      const tenantEntry = contributorUser.tenants[0]
      _tenantId =
        typeof tenantEntry.tenant === 'object'
          ? tenantEntry.tenant.id
          : tenantEntry.tenant
    }
  })

  test.afterAll(async () => {
    await cleanupTestUsers([
      TEST_ADMIN.email,
      TEST_CONTRIBUTOR.email,
      TEST_EDITOR.email,
      TEST_PUBLISHER.email,
    ])
  })

  test('contributor creates a draft article', async ({ browser }) => {
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
      await titleField.fill(articleTitle)

      // Fill in slug
      const slugField = page.locator('#field-slug')
      await slugField.fill(articleSlug)

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

      // Verify status defaults to 'draft'
      const statusField = page.locator('#field-editorialStatus')
      await statusField.scrollIntoViewIfNeeded()
      await expect(statusField).toHaveValue('draft')

      // Save
      const saveButton = page
        .locator('button[type="submit"]', { hasText: /save/i })
        .first()
      await saveButton.scrollIntoViewIfNeeded()
      await saveButton.click()

      // Wait for redirect to edit page
      await page.waitForURL(/\/admin\/collections\/articles\/\d+/, {
        timeout: 15000,
      })
      await page.waitForLoadState('networkidle')

      // Verify title was saved
      await expect(page.locator('#field-title')).toHaveValue(articleTitle)

      // Verify contributor can see the article in the list
      await page.goto('/admin/collections/articles')
      await page.waitForLoadState('networkidle')
      await expect(page.getByText(articleTitle).first()).toBeVisible({
        timeout: 10000,
      })
    } finally {
      await context.close()
    }
  })

  test('contributor submits article for review', async ({ browser }) => {
    test.setTimeout(60000)

    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      await login({ page, user: TEST_CONTRIBUTOR })

      // Navigate to articles list and find our article
      await page.goto('/admin/collections/articles')
      await page.waitForLoadState('networkidle')

      const articleLink = page.getByText(articleTitle).first()
      await articleLink.click()
      await page.waitForLoadState('networkidle')

      // Change status from draft to in_review
      const statusField = page.locator('#field-editorialStatus')
      await statusField.scrollIntoViewIfNeeded()
      await statusField.selectOption('in_review')

      // Save
      const saveButton = page
        .locator('button[type="submit"]', { hasText: /save/i })
        .first()
      await saveButton.scrollIntoViewIfNeeded()
      await saveButton.click()

      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      // Verify status saved as in_review
      await expect(page.locator('#field-editorialStatus')).toHaveValue(
        'in_review',
      )
    } finally {
      await context.close()
    }
  })

  test('contributor cannot publish directly', async ({ browser }) => {
    test.setTimeout(60000)

    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      await login({ page, user: TEST_CONTRIBUTOR })

      // Navigate to articles list and find our article
      await page.goto('/admin/collections/articles')
      await page.waitForLoadState('networkidle')

      const articleLink = page.getByText(articleTitle).first()
      await articleLink.click()
      await page.waitForLoadState('networkidle')

      // Try to change status to published
      const statusField = page.locator('#field-editorialStatus')
      await statusField.scrollIntoViewIfNeeded()
      await statusField.selectOption('published')

      // Save
      const saveButton = page
        .locator('button[type="submit"]', { hasText: /save/i })
        .first()
      await saveButton.scrollIntoViewIfNeeded()
      await saveButton.click()

      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      // Verify the save was blocked — either an error toast appears
      // or the status reverts back to a non-published value
      const errorToast = page
        .locator(
          '.toast-error, .Toastify__toast--error, [class*="toast"][class*="error"]',
        )
        .first()
      const hasError = await errorToast
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      const currentStatus = await page
        .locator('#field-editorialStatus')
        .inputValue()

      // Either an error toast appeared, or the status did not become 'published'
      const publishBlocked = hasError || currentStatus !== 'published'
      expect(publishBlocked).toBe(true)
    } finally {
      await context.close()
    }
  })

  test('editor approves the article', async ({ browser }) => {
    test.setTimeout(60000)

    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      await login({ page, user: TEST_EDITOR })

      // Navigate to articles list and find the article
      await page.goto('/admin/collections/articles')
      await page.waitForLoadState('networkidle')

      const articleLink = page.getByText(articleTitle).first()
      await expect(articleLink).toBeVisible({ timeout: 10000 })
      await articleLink.click()
      await page.waitForLoadState('networkidle')

      // Change status from in_review to approved
      const statusField = page.locator('#field-editorialStatus')
      await statusField.scrollIntoViewIfNeeded()
      await statusField.selectOption('approved')

      // Save
      const saveButton = page
        .locator('button[type="submit"]', { hasText: /save/i })
        .first()
      await saveButton.scrollIntoViewIfNeeded()
      await saveButton.click()

      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      // Verify status saved as approved
      await expect(page.locator('#field-editorialStatus')).toHaveValue(
        'approved',
      )
    } finally {
      await context.close()
    }
  })

  test('publisher publishes the article', async ({ browser }) => {
    test.setTimeout(60000)

    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      await login({ page, user: TEST_PUBLISHER })

      // Navigate to articles list and find the article
      await page.goto('/admin/collections/articles')
      await page.waitForLoadState('networkidle')

      const articleLink = page.getByText(articleTitle).first()
      await expect(articleLink).toBeVisible({ timeout: 10000 })
      await articleLink.click()
      await page.waitForLoadState('networkidle')

      // Change status from approved to published
      const statusField = page.locator('#field-editorialStatus')
      await statusField.scrollIntoViewIfNeeded()
      await statusField.selectOption('published')

      // Save
      const saveButton = page
        .locator('button[type="submit"]', { hasText: /save/i })
        .first()
      await saveButton.scrollIntoViewIfNeeded()
      await saveButton.click()

      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      // Verify status saved as published
      await expect(page.locator('#field-editorialStatus')).toHaveValue(
        'published',
      )
    } finally {
      await context.close()
    }
  })

  test('published article appears on frontend', async ({ browser }) => {
    test.setTimeout(30000)

    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      // Navigate to the frontend articles listing page
      await page.goto('/articles')
      await page.waitForLoadState('networkidle')

      // Verify the published article title appears in the listing
      await expect(page.getByText(articleTitle).first()).toBeVisible({
        timeout: 15000,
      })
    } finally {
      await context.close()
    }
  })
})
