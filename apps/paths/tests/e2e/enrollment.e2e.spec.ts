import { test, expect, Page, BrowserContext } from '@playwright/test'
import { seedTestUser, cleanupTestUsers } from '../helpers/seedUser'
import { seedPillars, seedTiers, seedCourse } from '../helpers/seedContent'
import { TEST_ADMIN, TEST_COURSE } from '../fixtures/test-data'
import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

test.describe('Enrollment Flow', () => {
  let adminUser: any
  let regularUser: any
  let tenantId: number
  let pillarId: number
  let tiers: { freeId: number; premiumId: number }
  let _courseData: { courseId: number; moduleId: number; lessonIds: number[] }

  let userContext: BrowserContext
  let userPage: Page

  const ENROLL_USER = {
    email: 'test-enroll-user@limitless.test',
    password: 'TestEnroll2026!',
    firstName: 'Enroll',
    lastName: 'Tester',
    role: 'user' as const,
  }

  test.beforeAll(async ({ browser }) => {
    // Seed supporting data
    adminUser = await seedTestUser(TEST_ADMIN)
    pillarId = await seedPillars()
    tiers = await seedTiers()

    // Extract tenant ID
    if (adminUser.tenants && adminUser.tenants.length > 0) {
      const tenantEntry = adminUser.tenants[0]
      tenantId = typeof tenantEntry.tenant === 'object' ? tenantEntry.tenant.id : tenantEntry.tenant
    }

    // Seed regular user with premium tier (so they can access free courses)
    regularUser = await seedTestUser(ENROLL_USER)
    const payload = await getPayload({ config })
    await payload.update({
      collection: 'users',
      id: regularUser.id,
      data: { tier: tiers.premiumId } as any,
      overrideAccess: true,
    })

    // Seed a published course with module + 2 lessons
    _courseData = await seedCourse({
      title: TEST_COURSE.title,
      slug: TEST_COURSE.slug,
      accessLevel: TEST_COURSE.accessLevel,
      tenantId,
      pillarId,
      instructorId: adminUser.id,
    })

    // Create authenticated context for the regular user
    userContext = await browser.newContext()
    userPage = await userContext.newPage()
    const loginRes = await userPage.request.post('http://localhost:3000/api/users/login', {
      data: { email: ENROLL_USER.email, password: ENROLL_USER.password },
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
    // Clean up enrollments for this user
    try {
      const payload = await getPayload({ config })
      await payload.delete({
        collection: 'enrollments',
        where: { user: { equals: regularUser.id } },
        overrideAccess: true,
      })
    } catch {}

    await cleanupTestUsers([TEST_ADMIN.email, ENROLL_USER.email])
    if (userContext) await userContext.close()
  })

  test('user enrolls in a course', async () => {
    test.setTimeout(60000)

    await userPage.goto(`/courses/${TEST_COURSE.slug}`)
    await userPage.waitForLoadState('networkidle')

    // Verify course title
    const title = userPage.locator('h1', { hasText: TEST_COURSE.title })
    await expect(title).toBeVisible({ timeout: 10000 })

    // Click the Enroll button
    const enrollButton = userPage.locator('button', { hasText: /Enroll/i })
    await expect(enrollButton).toBeVisible({ timeout: 10000 })
    await enrollButton.click()

    // Wait for page reload (EnrollButton does window.location.reload() on success)
    await userPage.waitForLoadState('networkidle')

    // After enrollment, the button should change to "Continue Learning"
    const continueButton = userPage.getByText('Continue Learning')
    await expect(continueButton).toBeVisible({ timeout: 15000 })
  })

  test('enrolled course appears in My Courses', async () => {
    await userPage.goto('/account/courses')
    await userPage.waitForLoadState('networkidle')

    // Verify the course title appears in the enrolled courses list
    const courseTitle = userPage.getByText(TEST_COURSE.title)
    await expect(courseTitle).toBeVisible({ timeout: 10000 })

    // Verify there is a progress indicator (the enrollment status badge or progress bar)
    const progressIndicator = userPage.locator('[class*="bg-amber-500"]').or(
      userPage.getByText(/active/i),
    )
    await expect(progressIndicator.first()).toBeVisible({ timeout: 10000 })
  })
})
