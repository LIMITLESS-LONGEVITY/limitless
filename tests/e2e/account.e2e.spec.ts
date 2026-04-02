import { test, expect, Page, BrowserContext } from '@playwright/test'
import { seedTestUser, cleanupTestUsers } from '../helpers/seedUser'
import { seedTiers } from '../helpers/seedContent'
import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

test.describe('Account Pages', () => {
  let regularUser: any
  let tiers: { freeId: number; premiumId: number }

  let userContext: BrowserContext
  let userPage: Page

  const ACCOUNT_USER = {
    email: 'test-account-user@limitless.test',
    password: 'TestAccount2026!',
    firstName: 'Account',
    lastName: 'Tester',
    role: 'user' as const,
  }

  test.beforeAll(async ({ browser }) => {
    // Seed tiers and user
    tiers = await seedTiers()
    regularUser = await seedTestUser(ACCOUNT_USER)

    // Assign premium tier to the user
    const payload = await getPayload({ config })
    await payload.update({
      collection: 'users',
      id: regularUser.id,
      data: { tier: tiers.premiumId } as any,
      overrideAccess: true,
    })

    // Create authenticated context via Payload login API
    userContext = await browser.newContext()
    userPage = await userContext.newPage()
    const loginRes = await userPage.request.post('http://localhost:3000/api/users/login', {
      data: { email: ACCOUNT_USER.email, password: ACCOUNT_USER.password },
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
    await cleanupTestUsers([ACCOUNT_USER.email])
    if (userContext) await userContext.close()
  })

  test('profile page loads with user info', async () => {
    await userPage.goto('/account/profile')
    await userPage.waitForLoadState('networkidle')

    // Verify the Account heading from the layout
    const accountHeading = userPage.locator('h1', { hasText: 'Account' })
    await expect(accountHeading).toBeVisible({ timeout: 10000 })

    // Verify the Profile sub-heading
    const profileHeading = userPage.locator('h2', { hasText: 'Profile' })
    await expect(profileHeading).toBeVisible({ timeout: 10000 })

    // Verify user's email is displayed
    const emailText = userPage.getByText(ACCOUNT_USER.email)
    await expect(emailText).toBeVisible({ timeout: 10000 })

    // Verify first name input has the correct value
    const firstNameInput = userPage.locator('#firstName')
    await expect(firstNameInput).toHaveValue(ACCOUNT_USER.firstName)
  })

  test('billing page loads with current tier', async () => {
    await userPage.goto('/account/billing')
    await userPage.waitForLoadState('networkidle')

    // Verify the Account heading from the layout
    const accountHeading = userPage.locator('h1', { hasText: 'Account' })
    await expect(accountHeading).toBeVisible({ timeout: 10000 })

    // Verify the current tier is displayed (Premium)
    const tierDisplay = userPage.getByText('Premium')
    await expect(tierDisplay.first()).toBeVisible({ timeout: 10000 })
  })

  test('my courses page loads', async () => {
    await userPage.goto('/account/courses')
    await userPage.waitForLoadState('networkidle')

    // Verify the Account heading from the layout
    const accountHeading = userPage.locator('h1', { hasText: 'Account' })
    await expect(accountHeading).toBeVisible({ timeout: 10000 })

    // Page should render — either shows enrolled courses or empty state
    // The empty state shows "You haven't enrolled in any courses yet." or "Browse Courses" link
    const content = userPage.getByText("haven't enrolled").or(
      userPage.locator('h2', { hasText: 'My Courses' }),
    )
    await expect(content.first()).toBeVisible({ timeout: 10000 })
  })
})
