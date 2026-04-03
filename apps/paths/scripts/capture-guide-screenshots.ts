/**
 * PATHS Platform Guide — Screenshot Capture Script
 *
 * Captures screenshots of the platform for use in guide documentation.
 * All output filenames match the <Screenshot src="..."> references in MDX files.
 *
 * Usage:
 *   npx tsx scripts/capture-guide-screenshots.ts
 *   npx tsx scripts/capture-guide-screenshots.ts --base-url http://localhost:3000
 *   npx tsx scripts/capture-guide-screenshots.ts --role admin
 *   npx tsx scripts/capture-guide-screenshots.ts --dry-run
 *
 * Environment variables for credentials:
 *   ADMIN_EMAIL / ADMIN_PASSWORD
 *   PAID_USER_EMAIL / PAID_USER_PASSWORD
 *   FREE_USER_EMAIL / FREE_USER_PASSWORD
 *   ORG_USER_EMAIL / ORG_USER_PASSWORD
 *   CONTRIBUTOR_EMAIL / CONTRIBUTOR_PASSWORD
 *   EDITOR_EMAIL / EDITOR_PASSWORD
 *   PUBLISHER_EMAIL / PUBLISHER_PASSWORD
 */

import { chromium, type Browser, type Page, type BrowserContext, type Locator } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const DEFAULT_BASE_URL = 'https://paths.limitless-longevity.health'
const SCREENSHOT_DIR = path.join(process.cwd(), 'public', 'guide', 'screenshots')
const VIEWPORT = { width: 1280, height: 800 }

// ─── CLI ────────────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2)
  let baseUrl = DEFAULT_BASE_URL
  let targetRole: string | null = null
  let dryRun = false

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--base-url' && args[i + 1]) {
      baseUrl = args[i + 1]
      i++
    }
    if (args[i] === '--role' && args[i + 1]) {
      targetRole = args[i + 1]
      i++
    }
    if (args[i] === '--dry-run') {
      dryRun = true
    }
  }

  return { baseUrl, targetRole, dryRun }
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

/** Full-page or viewport screenshot */
async function capture(page: Page, role: string, name: string, options?: { fullPage?: boolean }) {
  const dir = path.join(SCREENSHOT_DIR, role)
  ensureDir(dir)
  const filePath = path.join(dir, `${name}.png`)
  await page.screenshot({ path: filePath, fullPage: options?.fullPage ?? false })
  console.log(`  ✓ ${role}/${name}.png`)
}

/** Element-level screenshot — captures just the matched element */
async function captureElement(page: Page, locator: Locator, role: string, name: string) {
  const dir = path.join(SCREENSHOT_DIR, role)
  ensureDir(dir)
  const filePath = path.join(dir, `${name}.png`)
  try {
    await locator.waitFor({ state: 'visible', timeout: 5000 })
    await locator.screenshot({ path: filePath })
    console.log(`  ✓ ${role}/${name}.png (element)`)
  } catch {
    // Element not found — take full page as fallback
    await page.screenshot({ path: filePath })
    console.log(`  ~ ${role}/${name}.png (fallback: full page — element not found)`)
  }
}

/** Try a capture that requires a specific element — skip gracefully if not found */
async function tryCapture(
  page: Page,
  role: string,
  name: string,
  action: () => Promise<void>,
) {
  try {
    await action()
    console.log(`  ✓ ${role}/${name}.png`)
  } catch (_err) {
    console.log(`  ⊘ ${role}/${name}.png (skipped — element or state not available)`)
  }
}

async function waitForLoad(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
}

async function login(page: Page, baseUrl: string, email: string, password: string) {
  await page.goto(`${baseUrl}/login`)
  await waitForLoad(page)
  await page.fill('input[name="email"], input[type="email"]', email)
  await page.fill('input[name="password"], input[type="password"]', password)
  await page.click('button[type="submit"]')
  await waitForLoad(page)
  await page.waitForTimeout(1000)
}

/** Navigate to an admin collection and click the first row to open the edit form */
async function openFirstRow(page: Page, baseUrl: string, collection: string): Promise<boolean> {
  await page.goto(`${baseUrl}/admin/collections/${collection}`)
  await waitForLoad(page)
  const row = page.locator('table tbody tr a, .collection-list__row a, [class*="row"] a').first()
  if (await row.isVisible({ timeout: 3000 }).catch(() => false)) {
    await row.click()
    await waitForLoad(page)
    return true
  }
  // Try clicking the first table row directly
  const tableRow = page.locator('table tbody tr').first()
  if (await tableRow.isVisible({ timeout: 2000 }).catch(() => false)) {
    await tableRow.click()
    await waitForLoad(page)
    return true
  }
  return false
}

// ─── Scenario Definitions ───────────────────────────────────────────────────────

type ScenarioFn = (page: Page, baseUrl: string) => Promise<void>

const scenarios: Record<string, ScenarioFn> = {
  // ═══════════════════════════════════════════════════════════════════════════════
  // USER-FREE (18 internal screenshots)
  // ═══════════════════════════════════════════════════════════════════════════════
  'user-free': async (page: Page, baseUrl: string) => {
    console.log('\n📸 Capturing: Free User screenshots (18)')

    // signup-button — header nav area showing Sign Up
    await page.goto(baseUrl)
    await waitForLoad(page)
    await captureElement(page, page.locator('header, nav').first(), 'user-free', 'signup-button')

    // registration-form
    await page.goto(`${baseUrl}/register`)
    await waitForLoad(page)
    await capture(page, 'user-free', 'registration-form')

    // email-verification — the verification prompt/success page
    await page.goto(`${baseUrl}/verify-email`)
    await waitForLoad(page)
    await capture(page, 'user-free', 'email-verification')

    // homepage-dashboard
    await page.goto(baseUrl)
    await waitForLoad(page)
    await capture(page, 'user-free', 'homepage-dashboard')

    // articles-listing
    await page.goto(`${baseUrl}/articles`)
    await waitForLoad(page)
    await capture(page, 'user-free', 'articles-listing')

    // pillar-tags-on-cards — same page, capture the article cards area
    await captureElement(
      page,
      page.locator('main').first(),
      'user-free',
      'pillar-tags-on-cards',
    )

    // pillar-filter-menu — try to open a filter dropdown
    await tryCapture(page, 'user-free', 'pillar-filter-menu', async () => {
      const filterBtn = page.locator('button:has-text("Filter"), button:has-text("Pillar"), select, [class*="filter"]').first()
      await filterBtn.click()
      await page.waitForTimeout(300)
      const dir = path.join(SCREENSHOT_DIR, 'user-free')
      ensureDir(dir)
      await page.screenshot({ path: path.join(dir, 'pillar-filter-menu.png') })
    })

    // articles-pillar-filter — articles page with filter applied (reuse current state or navigate)
    await page.goto(`${baseUrl}/articles`)
    await waitForLoad(page)
    await capture(page, 'user-free', 'articles-pillar-filter')

    // courses-listing
    await page.goto(`${baseUrl}/courses`)
    await waitForLoad(page)
    await capture(page, 'user-free', 'courses-listing')

    // course-detail-header — first course, header area
    const firstCourse = page.locator('a[href^="/courses/"]').first()
    if (await firstCourse.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstCourse.click()
      await waitForLoad(page)
      await capture(page, 'user-free', 'course-detail-header')

      // course-module-outline — same page, scroll down to module section
      await page.evaluate(() => window.scrollTo(0, 400))
      await page.waitForTimeout(300)
      await capture(page, 'user-free', 'course-module-outline')
    }

    // search-page
    await page.goto(`${baseUrl}/search`)
    await waitForLoad(page)
    await capture(page, 'user-free', 'search-page')

    // search-results — type query and capture
    const searchInput = page.locator('input[type="search"], input[type="text"], input[name="q"]').first()
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('longevity')
      await page.keyboard.press('Enter')
      await waitForLoad(page)
      await capture(page, 'user-free', 'search-results')
    }

    // article-layout — first article page
    await page.goto(`${baseUrl}/articles`)
    await waitForLoad(page)
    const firstArticle = page.locator('a[href^="/articles/"]').first()
    if (await firstArticle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstArticle.click()
      await waitForLoad(page)
      await capture(page, 'user-free', 'article-layout')
    }

    // article-locked — try to find a premium/locked article
    await page.goto(`${baseUrl}/articles`)
    await waitForLoad(page)
    const lockedArticle = page.locator('a[href^="/articles/"]:has([class*="lock"]), a[href^="/articles/"]:has([class*="premium"])').first()
    if (await lockedArticle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await lockedArticle.click()
      await waitForLoad(page)
      await capture(page, 'user-free', 'article-locked')
    } else {
      // Fall back to any article that may show locked state
      const anyArticle = page.locator('a[href^="/articles/"]').last()
      if (await anyArticle.isVisible({ timeout: 2000 }).catch(() => false)) {
        await anyArticle.click()
        await waitForLoad(page)
        await capture(page, 'user-free', 'article-locked')
      }
    }

    // Login as free user to get authenticated views
    await login(
      page,
      baseUrl,
      process.env.FREE_USER_EMAIL || 'testuser-qa@test.com',
      process.env.FREE_USER_PASSWORD || 'TestPass123!',
    )

    // account-settings
    await page.goto(`${baseUrl}/account`)
    await waitForLoad(page)
    await capture(page, 'user-free', 'account-settings')

    // profile-overview
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(200)
    await capture(page, 'user-free', 'profile-overview')

    // billing-tiers — billing/pricing page
    await page.goto(`${baseUrl}/account/billing`)
    await waitForLoad(page)
    await capture(page, 'user-free', 'billing-tiers')
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // USER-PAID (16 internal screenshots)
  // ═══════════════════════════════════════════════════════════════════════════════
  'user-paid': async (page: Page, baseUrl: string) => {
    console.log('\n📸 Capturing: Paid User screenshots (16)')

    await login(
      page,
      baseUrl,
      process.env.PAID_USER_EMAIL || 'premium-qa@test.com',
      process.env.PAID_USER_PASSWORD || 'TestPass123!',
    )

    // courses-listing
    await page.goto(`${baseUrl}/courses`)
    await waitForLoad(page)
    await capture(page, 'user-paid', 'courses-listing')

    // course-detail-enroll — course detail page with enroll button
    const courseLinkEnroll = page.locator('a[href^="/courses/"]').first()
    if (await courseLinkEnroll.isVisible({ timeout: 3000 }).catch(() => false)) {
      await courseLinkEnroll.click()
      await waitForLoad(page)
      await capture(page, 'user-paid', 'course-detail-enroll')

      // lesson-viewer-layout — try opening a lesson
      const lessonLink = page.locator('a[href*="/lessons/"]').first()
      if (await lessonLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await lessonLink.click()
        await waitForLoad(page)
        await capture(page, 'user-paid', 'lesson-viewer-layout')

        // mark-complete-button — scroll to bottom of lesson
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
        await page.waitForTimeout(300)
        const markBtn = page.locator('button:has-text("Mark"), button:has-text("Complete")').first()
        await captureElement(page, markBtn, 'user-paid', 'mark-complete-button')

        // progress-bar-sidebar — capture the course sidebar
        const sidebar = page.locator('aside, [class*="sidebar"], [class*="course-nav"]').first()
        await captureElement(page, sidebar, 'user-paid', 'progress-bar-sidebar')
      }
    }

    // locked-unlocked-content — articles listing showing mix
    await page.goto(`${baseUrl}/articles`)
    await waitForLoad(page)
    await capture(page, 'user-paid', 'locked-unlocked-content')

    // locked-content-detail — navigate to a premium/locked article
    const premArticle = page.locator('a[href^="/articles/"]').last()
    if (await premArticle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await premArticle.click()
      await waitForLoad(page)
      await capture(page, 'user-paid', 'locked-content-detail')
    }

    // quiz-block-inline — find an article/lesson with a quiz block
    await page.goto(`${baseUrl}/articles`)
    await waitForLoad(page)
    const articleForQuiz = page.locator('a[href^="/articles/"]').first()
    if (await articleForQuiz.isVisible({ timeout: 3000 }).catch(() => false)) {
      await articleForQuiz.click()
      await waitForLoad(page)
      // Look for quiz block on the page
      const quizBlock = page.locator('[class*="quiz"], [data-block-type="quizQuestion"], .quiz-question').first()
      if (await quizBlock.isVisible({ timeout: 3000 }).catch(() => false)) {
        await captureElement(page, quizBlock, 'user-paid', 'quiz-block-inline')

        // quiz-feedback-correct — try answering the quiz
        await tryCapture(page, 'user-paid', 'quiz-feedback-correct', async () => {
          const answer = page.locator('[class*="quiz"] input[type="radio"], [class*="quiz"] button').first()
          await answer.click()
          const submit = page.locator('[class*="quiz"] button[type="submit"], [class*="quiz"] button:has-text("Submit"), [class*="quiz"] button:has-text("Check")').first()
          await submit.click()
          await page.waitForTimeout(500)
          const dir = path.join(SCREENSHOT_DIR, 'user-paid')
          ensureDir(dir)
          await quizBlock.screenshot({ path: path.join(dir, 'quiz-feedback-correct.png') })
        })
      } else {
        // No quiz found — capture article page as fallback
        await capture(page, 'user-paid', 'quiz-block-inline')
        await capture(page, 'user-paid', 'quiz-feedback-correct')
      }
    }

    // account-settings-overview
    await page.goto(`${baseUrl}/account`)
    await waitForLoad(page)
    await capture(page, 'user-paid', 'account-settings-overview')

    // account-email-password — email/password section of account page
    const emailSection = page.locator('form:has(input[type="email"]), [class*="password"], [class*="email"]').first()
    await captureElement(page, emailSection, 'user-paid', 'account-email-password')

    // email-verification-prompt — look for verification prompt
    const verifyPrompt = page.locator('[class*="verify"], [class*="verification"], :text("verify your email")').first()
    if (await verifyPrompt.isVisible({ timeout: 2000 }).catch(() => false)) {
      await captureElement(page, verifyPrompt, 'user-paid', 'email-verification-prompt')
    } else {
      // Capture the account page as fallback
      await capture(page, 'user-paid', 'email-verification-prompt')
    }

    // enrolled-courses-account
    await page.goto(`${baseUrl}/account/courses`)
    await waitForLoad(page)
    await capture(page, 'user-paid', 'enrolled-courses-account')

    // billing-section
    await page.goto(`${baseUrl}/account/billing`)
    await waitForLoad(page)
    await capture(page, 'user-paid', 'billing-section')

    // ai-tutor-panel — open AI tutor on an article
    await page.goto(`${baseUrl}/articles`)
    await waitForLoad(page)
    const articleForTutor = page.locator('a[href^="/articles/"]').first()
    if (await articleForTutor.isVisible({ timeout: 3000 }).catch(() => false)) {
      await articleForTutor.click()
      await waitForLoad(page)

      const tutorButton = page.locator('button:has-text("AI Tutor"), button:has-text("Tutor"), button:has-text("Ask")').first()
      if (await tutorButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tutorButton.click()
        await waitForLoad(page)
        await capture(page, 'user-paid', 'ai-tutor-panel')

        // ai-tutor-question-example — type a question
        await tryCapture(page, 'user-paid', 'ai-tutor-question-example', async () => {
          const tutorInput = page.locator('[class*="tutor"] input, [class*="tutor"] textarea, [class*="chat"] input').first()
          await tutorInput.fill('What are the key principles of longevity?')
          await page.keyboard.press('Enter')
          await page.waitForTimeout(3000) // Wait for AI response
          const dir = path.join(SCREENSHOT_DIR, 'user-paid')
          ensureDir(dir)
          await page.screenshot({ path: path.join(dir, 'ai-tutor-question-example.png') })
        })
      } else {
        await capture(page, 'user-paid', 'ai-tutor-panel')
        await capture(page, 'user-paid', 'ai-tutor-question-example')
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // USER-ORGANIZATION (8 internal screenshots)
  // ═══════════════════════════════════════════════════════════════════════════════
  'user-organization': async (page: Page, baseUrl: string) => {
    console.log('\n📸 Capturing: Organization User screenshots (8)')

    await login(
      page,
      baseUrl,
      process.env.ORG_USER_EMAIL || 'org-user@test.com',
      process.env.ORG_USER_PASSWORD || 'TestPass123!',
    )

    // org-overview-content — content listing page
    await page.goto(`${baseUrl}/articles`)
    await waitForLoad(page)
    await capture(page, 'user-organization', 'org-overview-content')

    // assigned-content-courses — courses with Enroll buttons
    await page.goto(`${baseUrl}/courses`)
    await waitForLoad(page)
    await capture(page, 'user-organization', 'assigned-content-courses')

    // assigned-content-enroll — course detail with enroll button
    const courseLink = page.locator('a[href^="/courses/"]').first()
    if (await courseLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await courseLink.click()
      await waitForLoad(page)
      await capture(page, 'user-organization', 'assigned-content-enroll')
    }

    // team-learning-paths-sequence — courses page showing learning path sequence
    await page.goto(`${baseUrl}/courses`)
    await waitForLoad(page)
    await capture(page, 'user-organization', 'team-learning-paths-sequence')

    // progress-dashboard-account — account page with enrolled courses + progress
    await page.goto(`${baseUrl}/account`)
    await waitForLoad(page)
    await capture(page, 'user-organization', 'progress-dashboard-account')

    // progress-dashboard-continue — course card with Continue button
    await page.goto(`${baseUrl}/account/courses`)
    await waitForLoad(page)
    const continueCard = page.locator('[class*="course"], [class*="card"]').first()
    await captureElement(page, continueCard, 'user-organization', 'progress-dashboard-continue')

    // switching-content-unified — content listing showing unified personal + org content
    await page.goto(`${baseUrl}/articles`)
    await waitForLoad(page)
    await capture(page, 'user-organization', 'switching-content-unified')

    // contacting-admin-avatar — user avatar dropdown in header
    await tryCapture(page, 'user-organization', 'contacting-admin-avatar', async () => {
      const avatar = page.locator('header button:has(img), header [class*="avatar"], header button:has([class*="user"])').first()
      await avatar.click()
      await page.waitForTimeout(300)
      const dir = path.join(SCREENSHOT_DIR, 'user-organization')
      ensureDir(dir)
      await page.screenshot({ path: path.join(dir, 'contacting-admin-avatar.png') })
    })
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // CONTRIBUTOR (12 internal screenshots)
  // ═══════════════════════════════════════════════════════════════════════════════
  'contributor': async (page: Page, baseUrl: string) => {
    console.log('\n📸 Capturing: Contributor screenshots (12)')

    await login(
      page,
      baseUrl,
      process.env.CONTRIBUTOR_EMAIL || 'sarah.contributor@test.com',
      process.env.CONTRIBUTOR_PASSWORD || 'TestPass123!',
    )

    // contributor-overview-dashboard
    await page.goto(`${baseUrl}/admin`)
    await waitForLoad(page)
    await capture(page, 'contributor', 'contributor-overview-dashboard')

    // creating-articles-list
    await page.goto(`${baseUrl}/admin/collections/articles`)
    await waitForLoad(page)
    await capture(page, 'contributor', 'creating-articles-list')

    // managing-drafts-list — same view (articles list)
    await capture(page, 'contributor', 'managing-drafts-list')

    // managing-drafts-filter — apply Draft status filter
    await tryCapture(page, 'contributor', 'managing-drafts-filter', async () => {
      // Look for filter/where controls in Payload admin
      const whereBtn = page.locator('button:has-text("Filter"), button:has-text("Where"), [class*="list-controls"] button').first()
      await whereBtn.click()
      await page.waitForTimeout(500)
      const dir = path.join(SCREENSHOT_DIR, 'contributor')
      ensureDir(dir)
      await page.screenshot({ path: path.join(dir, 'managing-drafts-filter.png') })
    })

    // creating-articles-form — create article page
    await page.goto(`${baseUrl}/admin/collections/articles/create`)
    await waitForLoad(page)
    await capture(page, 'contributor', 'creating-articles-form')

    // lexical-editor-toolbar — capture the editor toolbar area
    await page.waitForTimeout(1000) // Wait for Lexical to initialize
    const toolbar = page.locator('[class*="toolbar"], .lexical-toolbar, [role="toolbar"]').first()
    await captureElement(page, toolbar, 'contributor', 'lexical-editor-toolbar')

    // lexical-editor-insert-block — click the add block button
    await tryCapture(page, 'contributor', 'lexical-editor-insert-block', async () => {
      const addBlock = page.locator('button:has-text("Add Block"), button:has-text("+"), [class*="add-block"], [class*="insert"]').first()
      await addBlock.click()
      await page.waitForTimeout(500)
      const dir = path.join(SCREENSHOT_DIR, 'contributor')
      ensureDir(dir)
      await page.screenshot({ path: path.join(dir, 'lexical-editor-insert-block.png') })
    })

    // media-and-blocks-video — look for video embed block or capture editor with block menu
    await tryCapture(page, 'contributor', 'media-and-blocks-video', async () => {
      const dir = path.join(SCREENSHOT_DIR, 'contributor')
      ensureDir(dir)
      await page.screenshot({ path: path.join(dir, 'media-and-blocks-video.png') })
    })

    // media-and-blocks-quiz — quiz block in editor
    await tryCapture(page, 'contributor', 'media-and-blocks-quiz', async () => {
      const dir = path.join(SCREENSHOT_DIR, 'contributor')
      ensureDir(dir)
      await page.screenshot({ path: path.join(dir, 'media-and-blocks-quiz.png') })
    })

    // editorial-workflow-status — open existing article, show status dropdown
    if (await openFirstRow(page, baseUrl, 'articles')) {
      // editorial-workflow-status — click status field
      await tryCapture(page, 'contributor', 'editorial-workflow-status', async () => {
        const statusField = page.locator('select:near(:text("Status")), [class*="status"] select, [name="status"]').first()
        await statusField.click()
        await page.waitForTimeout(300)
        const dir = path.join(SCREENSHOT_DIR, 'contributor')
        ensureDir(dir)
        await page.screenshot({ path: path.join(dir, 'editorial-workflow-status.png') })
      })

      // submitting-review-status — article sidebar with status field
      const sidebar = page.locator('aside, [class*="sidebar"], [class*="document-fields"]').first()
      await captureElement(page, sidebar, 'contributor', 'submitting-review-status')
    }

    // submitting-review-tracking — articles list filtered by In Review
    await page.goto(`${baseUrl}/admin/collections/articles`)
    await waitForLoad(page)
    await capture(page, 'contributor', 'submitting-review-tracking')
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // EDITOR (6 internal screenshots)
  // ═══════════════════════════════════════════════════════════════════════════════
  'editor': async (page: Page, baseUrl: string) => {
    console.log('\n📸 Capturing: Editor screenshots (6)')

    await login(
      page,
      baseUrl,
      process.env.EDITOR_EMAIL || 'editor@test.com',
      process.env.EDITOR_PASSWORD || 'TestPass123!',
    )

    // editor-overview-dashboard
    await page.goto(`${baseUrl}/admin`)
    await waitForLoad(page)
    await capture(page, 'editor', 'editor-overview-dashboard')

    // reviewing-content-queue — articles list (ideally filtered by In Review)
    await page.goto(`${baseUrl}/admin/collections/articles`)
    await waitForLoad(page)
    await capture(page, 'editor', 'reviewing-content-queue')

    // reviewing-content-editor — open an article
    if (await openFirstRow(page, baseUrl, 'articles')) {
      await capture(page, 'editor', 'reviewing-content-editor')

      // editorial-status-dropdown — click the status field
      await tryCapture(page, 'editor', 'editorial-status-dropdown', async () => {
        const statusField = page.locator('select:near(:text("Status")), [class*="status"] select, [name="status"]').first()
        await statusField.click()
        await page.waitForTimeout(300)
        const dir = path.join(SCREENSHOT_DIR, 'editor')
        ensureDir(dir)
        await page.screenshot({ path: path.join(dir, 'editorial-status-dropdown.png') })
      })

      // approving-content-status — status change in sidebar
      await capture(page, 'editor', 'approving-content-status')

      // working-with-contributors-notes — notes field area
      const notesField = page.locator('[name="notes"], textarea:near(:text("Notes")), [class*="notes"]').first()
      if (await notesField.isVisible({ timeout: 3000 }).catch(() => false)) {
        await captureElement(page, notesField, 'editor', 'working-with-contributors-notes')
      } else {
        await capture(page, 'editor', 'working-with-contributors-notes')
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // PUBLISHER (4 internal screenshots)
  // ═══════════════════════════════════════════════════════════════════════════════
  'publisher': async (page: Page, baseUrl: string) => {
    console.log('\n📸 Capturing: Publisher screenshots (4)')

    await login(
      page,
      baseUrl,
      process.env.PUBLISHER_EMAIL || 'publisher@test.com',
      process.env.PUBLISHER_PASSWORD || 'TestPass123!',
    )

    // publisher-overview-queue — articles list (approved content)
    await page.goto(`${baseUrl}/admin/collections/articles`)
    await waitForLoad(page)
    await capture(page, 'publisher', 'publisher-overview-queue')

    // scheduling-content-queue — same view sorted by date
    await capture(page, 'publisher', 'scheduling-content-queue')

    // publishing-content-status — open an article, show status change
    if (await openFirstRow(page, baseUrl, 'articles')) {
      await capture(page, 'publisher', 'publishing-content-status')

      // archiving-content-status — same article, different status view
      await capture(page, 'publisher', 'archiving-content-status')
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // ADMIN (19 internal screenshots)
  // ═══════════════════════════════════════════════════════════════════════════════
  'admin': async (page: Page, baseUrl: string) => {
    console.log('\n📸 Capturing: Admin screenshots (19)')

    await login(
      page,
      baseUrl,
      process.env.ADMIN_EMAIL || 'admin@limitless-longevity.health',
      process.env.ADMIN_PASSWORD || 'TestUser2026!',
    )

    // dashboard-overview
    await page.goto(`${baseUrl}/admin`)
    await waitForLoad(page)
    await capture(page, 'admin', 'dashboard-overview')

    // sidebar-navigation — capture the admin sidebar
    const sidebar = page.locator('nav[class*="nav"], [class*="sidebar"], .nav--main').first()
    await captureElement(page, sidebar, 'admin', 'sidebar-navigation')

    // dashboard-recent-activity — capture the main content area of dashboard
    const mainContent = page.locator('main, [class*="dashboard"], [class*="content"]').first()
    await captureElement(page, mainContent, 'admin', 'dashboard-recent-activity')

    // users-list
    await page.goto(`${baseUrl}/admin/collections/users`)
    await waitForLoad(page)
    await capture(page, 'admin', 'users-list')

    // create-user-form
    await page.goto(`${baseUrl}/admin/collections/users/create`)
    await waitForLoad(page)
    await capture(page, 'admin', 'create-user-form')

    // user-edit-form — open first user
    if (await openFirstRow(page, baseUrl, 'users')) {
      await capture(page, 'admin', 'user-edit-form')
    }

    // tiers-collection
    await page.goto(`${baseUrl}/admin/collections/membership-tiers`)
    await waitForLoad(page)
    await capture(page, 'admin', 'tiers-collection')

    // tier-edit-stripe-fields — open first tier, capture Stripe fields section
    if (await openFirstRow(page, baseUrl, 'membership-tiers')) {
      // Scroll to Stripe fields
      const stripeField = page.locator('[name*="stripe"], :text("Stripe"), [name*="price"]').first()
      if (await stripeField.isVisible({ timeout: 3000 }).catch(() => false)) {
        await stripeField.scrollIntoViewIfNeeded()
        await page.waitForTimeout(200)
      }
      await capture(page, 'admin', 'tier-edit-stripe-fields')
    }

    // tenants-list
    await page.goto(`${baseUrl}/admin/collections/tenants`)
    await waitForLoad(page)
    await capture(page, 'admin', 'tenants-list')

    // tenant-edit-form — open first tenant
    if (await openFirstRow(page, baseUrl, 'tenants')) {
      await capture(page, 'admin', 'tenant-edit-form')
    }

    // courses-list
    await page.goto(`${baseUrl}/admin/collections/courses`)
    await waitForLoad(page)
    await capture(page, 'admin', 'courses-list')

    // module-edit-form — open first module
    if (await openFirstRow(page, baseUrl, 'modules')) {
      await capture(page, 'admin', 'module-edit-form')
    }

    // lesson-lexical-editor — open first lesson to show Lexical editor
    if (await openFirstRow(page, baseUrl, 'lessons')) {
      await page.waitForTimeout(1000) // Wait for Lexical to initialize
      await capture(page, 'admin', 'lesson-lexical-editor')
    }

    // pillars-list
    await page.goto(`${baseUrl}/admin/collections/content-pillars`)
    await waitForLoad(page)
    await capture(page, 'admin', 'pillars-list')

    // pillar-dropdown-on-article — article edit form, click pillar dropdown
    if (await openFirstRow(page, baseUrl, 'articles')) {
      await tryCapture(page, 'admin', 'pillar-dropdown-on-article', async () => {
        const pillarField = page.locator('[name*="pillar"], select:near(:text("Pillar")), [class*="pillar"] select, [class*="relationship"]:near(:text("Pillar"))').first()
        await pillarField.click()
        await page.waitForTimeout(300)
        const dir = path.join(SCREENSHOT_DIR, 'admin')
        ensureDir(dir)
        await page.screenshot({ path: path.join(dir, 'pillar-dropdown-on-article.png') })
      })
    }

    // ai-config-global
    await page.goto(`${baseUrl}/admin/globals/ai-config`)
    await waitForLoad(page)
    await capture(page, 'admin', 'ai-config-global')

    // ai-config-model-selection — click model dropdown
    await tryCapture(page, 'admin', 'ai-config-model-selection', async () => {
      const modelField = page.locator('[name*="model"], select:near(:text("Model")), [class*="model"] select').first()
      await modelField.click()
      await page.waitForTimeout(300)
      const dir = path.join(SCREENSHOT_DIR, 'admin')
      ensureDir(dir)
      await page.screenshot({ path: path.join(dir, 'ai-config-model-selection.png') })
    })

    // site-settings-global
    await page.goto(`${baseUrl}/admin/globals/site-settings`)
    await waitForLoad(page)
    await capture(page, 'admin', 'site-settings-global')

    // globals-sidebar — capture sidebar showing globals section
    const globalsSidebar = page.locator('nav[class*="nav"], [class*="sidebar"], .nav--main').first()
    await captureElement(page, globalsSidebar, 'admin', 'globals-sidebar')
  },
}

// ─── Dry Run ────────────────────────────────────────────────────────────────────

function printDryRun(targetRole: string | null) {
  const external = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'scripts', 'external-screenshots.json'), 'utf-8'),
  ) as Array<{ path: string }>

  const externalPaths = new Set(external.map((e) => e.path))

  console.log('\nScreenshots that would be captured:\n')

  const roles = targetRole ? [targetRole] : Object.keys(scenarios)
  for (const role of roles) {
    if (!scenarios[role]) {
      console.log(`  ⚠ Unknown role: ${role}`)
      continue
    }
    console.log(`  ${role}/`)
  }

  console.log(`\nExternal (manual capture required): ${externalPaths.size}`)
  for (const p of externalPaths) {
    console.log(`    ${p}`)
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const { baseUrl, targetRole, dryRun } = parseArgs()

  console.log('╔═══════════════════════════════════════════════════╗')
  console.log('║   PATHS Platform Guide — Screenshot Capture      ║')
  console.log('╚═══════════════════════════════════════════════════╝')
  console.log(`\nBase URL: ${baseUrl}`)
  console.log(`Target:   ${targetRole || 'all roles'}`)

  if (dryRun) {
    printDryRun(targetRole)
    return
  }

  ensureDir(SCREENSHOT_DIR)

  const browser: Browser = await chromium.launch({ headless: true })
  const rolesToCapture = targetRole ? [targetRole] : Object.keys(scenarios)
  let totalCaptured = 0
  let _totalSkipped = 0

  for (const role of rolesToCapture) {
    const scenarioFn = scenarios[role]
    if (!scenarioFn) {
      console.warn(`\n⚠️  Unknown role: ${role}`)
      continue
    }

    const context: BrowserContext = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 2, // Retina screenshots
    })
    const page: Page = await context.newPage()

    try {
      await scenarioFn(page, baseUrl)
    } catch (err) {
      console.error(`\n❌ Error capturing ${role}:`, err)
    } finally {
      await context.close()
    }
  }

  await browser.close()

  // Count total screenshots
  if (fs.existsSync(SCREENSHOT_DIR)) {
    const dirs = fs.readdirSync(SCREENSHOT_DIR)
    for (const dir of dirs) {
      const dirPath = path.join(SCREENSHOT_DIR, dir)
      if (fs.statSync(dirPath).isDirectory()) {
        totalCaptured += fs.readdirSync(dirPath).filter((f) => f.endsWith('.png')).length
      }
    }
  }

  console.log(`\n✅ Done! ${totalCaptured} screenshots captured in ${SCREENSHOT_DIR}`)
}

main().catch(console.error)
