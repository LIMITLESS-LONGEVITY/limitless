# Browser QA Testing Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute comprehensive browser-based acceptance testing against the live PATHS platform, verifying the full content lifecycle from contributor creation through free user consumption.

**Architecture:** Sequential workflow execution using Playwright MCP as the primary browser driver and Chrome DevTools MCP for failure debugging. Each workflow logs in as a different persona and performs role-specific actions against `https://paths.limitless-longevity.health`.

**Tech Stack:** Playwright MCP (`@playwright/mcp`), Chrome DevTools MCP (`chrome-devtools-mcp`), Chromium browser

**Spec:** `docs/superpowers/specs/2026-03-25-browser-qa-testing-design.md`

**Credentials:** `limitless-paths/tests/fixtures/test-data.ts` (admin: `TestAdmin2026!`, all others: `TestUser2026!`)

---

## Pre-Execution Setup

### Task 0: Install MCP Servers & Prepare Infrastructure

**Files:**
- Modify: `.gitignore` (add screenshot directory)
- Create: `limitless-paths/tests/browser-qa/screenshots/` (directory)

- [ ] **Step 1: Install Playwright MCP server**

```bash
claude mcp add playwright -- npx @playwright/mcp@latest
```

Expected: MCP server added successfully.

- [ ] **Step 2: Install Chrome DevTools MCP server**

```bash
claude mcp add chrome-devtools -- npx chrome-devtools-mcp@latest
```

Expected: MCP server added successfully.

- [ ] **Step 3: Create screenshot output directory**

```bash
mkdir -p limitless-paths/tests/browser-qa/screenshots
```

- [ ] **Step 4: Add screenshot directory to .gitignore**

Append to `limitless-paths/.gitignore`:
```
# Browser QA screenshots (ephemeral test artifacts)
tests/browser-qa/screenshots/
```

- [ ] **Step 5: Verify MCP tools are available**

Use Playwright MCP's `browser_navigate` tool to open `https://paths.limitless-longevity.health`. Verify the page loads and take a screenshot.

Expected: PATHS homepage loads. Screenshot saved as `W0-01-homepage-loads.png`.

- [ ] **Step 6: Commit setup**

```bash
cd limitless-paths
git add .gitignore
git commit -m "Add browser QA screenshot directory to gitignore"
```

---

## Workflow 1: Admin Setup & Verification

### Task 1: Admin Login & Platform Health Check

**Purpose:** Verify the platform foundation is healthy before testing content flows.
**Persona:** Admin (`test-admin@limitless.test` / `TestAdmin2026!`)
**Target:** `https://paths.limitless-longevity.health/admin`

- [ ] **Step 1: Navigate to admin login**

Use `browser_navigate` to go to `https://paths.limitless-longevity.health/admin/login`.

Expected: Login form visible with email and password fields.

- [ ] **Step 2: Login as admin**

Use `browser_click` on the email field (`#field-email`), then `browser_type` to enter `test-admin@limitless.test`.
Use `browser_click` on the password field (`#field-password`), then `browser_type` to enter `TestAdmin2026!`.
Use `browser_click` on the submit button (`button[type="submit"]`).

Expected: Redirect to `/admin` dashboard. User menu shows "Test Admin".

**Note:** If `test-admin@limitless.test` doesn't work, the production email may differ. Use `browser_snapshot` to read the error message, then try common alternatives or query the DB via Render MCP logs.

- [ ] **Step 3: Screenshot — admin login success**

Use `browser_take_screenshot`. Save as `W1-01-admin-login.png`.

- [ ] **Step 4: Verify collections in sidebar (1.2)**

Use `browser_snapshot` to read the admin sidebar. Verify all 18 collections are listed:
Articles, Courses, Modules, Lessons, Users, Media, Pillars, Tiers, Tenants, Enrollments, Lesson Progress, Content Chunks, AI Usage Logs, Pages, Posts, Categories, Redirects, Search.

Record which collections are visible and any that are missing.

- [ ] **Step 5: Navigate to Users collection (1.3)**

Use `browser_click` on "Users" in the sidebar. Use `browser_snapshot` to read the user list.

Expected: 5 test accounts visible with correct roles (admin, publisher, editor, contributor, user). Record the actual email addresses used in production — they may differ from test fixtures.

- [ ] **Step 6: Screenshot — users list**

Use `browser_take_screenshot`. Save as `W1-03-users-list.png`.

- [ ] **Step 7: Navigate to Tiers collection (1.4)**

Use `browser_click` on "Tiers" in the sidebar. Use `browser_snapshot` to verify.

Expected: 4 tiers present (free, regular, premium, enterprise).

- [ ] **Step 8: Navigate to Pillars collection (1.5)**

Use `browser_click` on "Pillars" in the sidebar. Use `browser_snapshot` to verify.

Expected: 6 pillars present (Nutrition, Movement, Sleep, Mental Health, Diagnostics, Longevity Science).

- [ ] **Step 9: Navigate to AI Config global (1.6)**

Use `browser_navigate` to `https://paths.limitless-longevity.health/admin/globals/ai-config`.
Use `browser_snapshot` to read the config.

Expected: AI features enabled (`enabled: true`). Rate limits configured.

- [ ] **Step 10: Screenshot — AI config**

Use `browser_take_screenshot`. Save as `W1-06-ai-config.png`.

- [ ] **Step 11: Create free-tier test user (1.7)**

Use `browser_navigate` to `https://paths.limitless-longevity.health/admin/collections/users/create`.

Fill the form:
- Email: `qa-free-user@limitless.test`
- Password: `TestQA2026!`
- First Name: `QA`
- Last Name: `FreeUser`
- Role: `user`
- Tenant: Select the default "LIMITLESS" tenant
- Tier: Select "free" tier

Use `browser_click` on the save button.

Expected: User created successfully. Confirmation message shown.

- [ ] **Step 12: Screenshot — user created**

Use `browser_take_screenshot`. Save as `W1-07-free-user-created.png`.

- [ ] **Step 13: Record results**

Document all results from this workflow:
- Login: PASS/FAIL
- Collections count: X/18 visible
- Users: list actual emails found
- Tiers: X/4 found
- Pillars: X/6 found
- AI Config: enabled/disabled
- User creation: PASS/FAIL

---

## Workflow 2: Contributor — Content Creation

### Task 2: Contributor Login & Article Creation with All Block Types

**Purpose:** Test the full content authoring experience including all Lexical block types.
**Persona:** Contributor (email discovered in Task 1 / `TestUser2026!`)
**Target:** `https://paths.limitless-longevity.health/admin`

- [ ] **Step 1: Logout from admin**

Use `browser_navigate` to `https://paths.limitless-longevity.health/admin/logout`.

Expected: Redirected to login page.

- [ ] **Step 2: Login as contributor (2.1)**

Navigate to `/admin/login`. Login with contributor credentials (email from Task 1 Step 5, password `TestUser2026!`).

Expected: Dashboard loads. Sidebar shows limited collections (contributor sees own content only).

- [ ] **Step 3: Screenshot — contributor dashboard**

Use `browser_take_screenshot`. Save as `W2-01-contributor-login.png`.

- [ ] **Step 4: Create new article (2.2)**

Use `browser_navigate` to `https://paths.limitless-longevity.health/admin/collections/articles/create`.

Expected: Article creation form loads with all fields.

- [ ] **Step 5: Fill article metadata (2.7, 2.8)**

Use `browser_snapshot` to identify the form fields, then fill:
- Title: `QA Test: Browser Verification Article`
- Slug: should auto-generate from title
- Excerpt: `This article tests all Lexical block types for browser QA verification.`
- Access Level: Select `free`
- Pillar: Select any available pillar (e.g., "Nutrition")
- Tenant: Select default "LIMITLESS" tenant

- [ ] **Step 6: Add heading + paragraph text in Lexical editor (2.3)**

Use `browser_snapshot` to find the Lexical rich text editor. Click into it.
Type a heading (use toolbar or keyboard shortcut): `Introduction to Browser QA Testing`
Press Enter, type paragraph text: `This article contains multiple content block types to verify rendering on the frontend.`

- [ ] **Step 7: Add Video Embed block (2.4)**

In the Lexical editor, use the block inserter (typically a `+` button or `/` command):
- Insert a "Video Embed" block
- Set Platform: `YouTube`
- Set URL: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- Set Caption: `Test video embed`

Use `browser_snapshot` to verify the block was inserted.

- [ ] **Step 8: Screenshot — video embed block added**

Use `browser_take_screenshot`. Save as `W2-04-video-embed-added.png`.

- [ ] **Step 9: Add Quiz Question block (2.5)**

Insert a "Quiz Question" block:
- Question: `What is the primary purpose of browser QA testing?`
- Option A: `To check code syntax`
- Option B: `To verify the UI renders correctly for end users`
- Option C: `To measure server performance`
- Option D: `To validate database schemas`
- Correct Answer: `1` (0-based index, option B)
- Explanation: `Browser QA testing verifies that the actual rendered UI works as expected for real users, catching visual and interaction bugs that automated tests miss.`

Use `browser_snapshot` to verify the block was inserted.

- [ ] **Step 10: Screenshot — quiz block added**

Use `browser_take_screenshot`. Save as `W2-05-quiz-added.png`.

- [ ] **Step 11: Add Callout block (2.6)**

Insert a "Callout" block (may be labeled "Banner" in Payload):
- Style: `info` or `warning`
- Text: `Important: Always run browser QA tests after deploying frontend changes.`

Use `browser_snapshot` to verify.

- [ ] **Step 12: Save as draft (2.9)**

Use `browser_snapshot` to find the save/publish button. Ensure editorial status is set to `draft`.
Click the save button.

Expected: Article saves successfully. Success toast/message appears. URL updates to include the article ID.

- [ ] **Step 13: Screenshot — article saved as draft**

Use `browser_take_screenshot`. Save as `W2-09-saved-draft.png`.

- [ ] **Step 14: Submit for review (2.10)**

Change the editorial status field from `draft` to `in_review`.
Click save.

Expected: Status updates to `in_review`. No errors.

- [ ] **Step 15: Verify contributor cannot publish (2.11)**

Use `browser_snapshot` to read the editorial status dropdown options.

Expected: Options should include `draft` and `in_review` only. `approved` and `published` should NOT be available to a contributor.

- [ ] **Step 16: Screenshot — submitted for review**

Use `browser_take_screenshot`. Save as `W2-10-submitted-review.png`.

- [ ] **Step 17: Record the article ID/slug**

Note the article's ID and slug from the URL and form. This is needed for subsequent workflows.

- [ ] **Step 18: Record results**

Document all results from this workflow.

---

## Workflow 3: Editor — Review & Approval

### Task 3: Editor Reviews and Approves the Article

**Purpose:** Test editorial review workflow.
**Persona:** Editor (email from Task 1 / `TestUser2026!`)

- [ ] **Step 1: Logout and login as editor (3.1)**

Navigate to `/admin/logout`, then `/admin/login`. Login with editor credentials.

Expected: Dashboard loads.

- [ ] **Step 2: Screenshot — editor login**

Use `browser_take_screenshot`. Save as `W3-01-editor-login.png`.

- [ ] **Step 3: Find submitted article (3.2)**

Navigate to Articles collection. Use `browser_snapshot` to find the article created in Workflow 2 (`QA Test: Browser Verification Article`) with status `in_review`.

Expected: Article visible in the list.

- [ ] **Step 4: Open and review content (3.3)**

Click on the article. Use `browser_snapshot` to verify all blocks are present in the editor:
- Heading + paragraph text
- Video Embed block (YouTube)
- Quiz Question block
- Callout/Banner block

- [ ] **Step 5: Screenshot — editor reviewing content**

Use `browser_take_screenshot`. Save as `W3-03-editor-review.png`.

- [ ] **Step 6: Approve article (3.4)**

Change editorial status from `in_review` to `approved`. Click save.

Expected: Status changes to `approved`. No errors.

- [ ] **Step 7: Verify editor cannot publish (3.5)**

Use `browser_snapshot` to read the editorial status dropdown options.

Expected: `published` should NOT be available to an editor.

- [ ] **Step 8: Screenshot — article approved**

Use `browser_take_screenshot`. Save as `W3-04-approved.png`.

- [ ] **Step 9: Record results**

Document all results from this workflow.

---

## Workflow 4: Publisher — Publishing

### Task 4: Publisher Publishes Article to Frontend

**Purpose:** Test publishing workflow and verify content goes live.
**Persona:** Publisher (email from Task 1 / `TestUser2026!`)

- [ ] **Step 1: Logout and login as publisher (4.1)**

Navigate to `/admin/logout`, then `/admin/login`. Login with publisher credentials.

Expected: Dashboard loads.

- [ ] **Step 2: Screenshot — publisher login**

Use `browser_take_screenshot`. Save as `W4-01-publisher-login.png`.

- [ ] **Step 3: Find approved article (4.2)**

Navigate to Articles collection. Find `QA Test: Browser Verification Article` with status `approved`.

- [ ] **Step 4: Publish article (4.3)**

Open the article. Change editorial status from `approved` to `published`. Click save.

Expected: Status changes to `published`. `publishedAt` date is set.

- [ ] **Step 5: Screenshot — article published**

Use `browser_take_screenshot`. Save as `W4-03-published.png`.

- [ ] **Step 6: Navigate to frontend articles listing (4.4)**

Use `browser_navigate` to `https://paths.limitless-longevity.health/articles`.
Use `browser_snapshot` to read the page.

Expected: `QA Test: Browser Verification Article` appears in the articles listing.

- [ ] **Step 7: Screenshot — article in listing**

Use `browser_take_screenshot`. Save as `W4-04-articles-listing.png`.

- [ ] **Step 8: Open published article on frontend (4.5)**

Click on the article link (or navigate directly via slug).
Use `browser_snapshot` to verify the article page loads.

Expected: Article page renders with correct title, pillar badge, author name, and date.

- [ ] **Step 9: Screenshot — article frontend page**

Use `browser_take_screenshot`. Save as `W4-05-article-frontend.png`.

- [ ] **Step 10: Record results**

Document all results from this workflow.

---

## Workflow 5: Frontend Content Verification

### Task 5: Verify All Content Blocks Render Correctly

**Purpose:** Verify all content blocks render correctly on the live frontend — the exact gap that caused our bugs.
**Persona:** Publisher (still logged in from Workflow 4), then test on mobile viewport
**Target:** The article published in Workflow 4, still open in the browser

- [ ] **Step 1: Verify article header (5.1)**

Use `browser_snapshot` to read the article header area.

Expected: Title ("QA Test: Browser Verification Article"), pillar badge (e.g., "Nutrition"), author name, published date all render.

- [ ] **Step 2: Verify heading + paragraph (5.2)**

Use `browser_snapshot` to verify text content renders:
- Heading: "Introduction to Browser QA Testing"
- Paragraph: "This article contains multiple content block types..."

- [ ] **Step 3: Verify Video Embed renders (5.3) — CRITICAL**

Use `browser_snapshot` to check for an iframe element with YouTube embed URL.
Use `browser_take_screenshot` to visually confirm the video embed.

Expected: YouTube iframe visible in 16:9 aspect ratio container. The iframe `src` should contain `youtube.com/embed/dQw4w9WgXcQ`.

Save as `W5-03-video-embed.png`.

**If FAIL:** Switch to Chrome DevTools MCP. Use `get_console_logs` to check for errors. Use `get_network_requests` to check if the iframe request was blocked.

- [ ] **Step 4: Verify Quiz — select wrong answer (5.4) — CRITICAL**

Use `browser_snapshot` to find the quiz block. Identify the options.
Click on a WRONG answer (e.g., option A "To check code syntax", index 0 — correct answer is index 1).

Expected:
- Selected wrong answer: red border, red X icon
- Correct answer (option B): green border, green checkmark
- Other options: dimmed/faded
- Explanation text appears below

Use `browser_take_screenshot`. Save as `W5-04-quiz-wrong-answer.png`.

**If FAIL:** Use Chrome DevTools MCP to check console for JavaScript errors. Check if `correctAnswer` prop value matches expected index.

- [ ] **Step 5: Verify Quiz — select correct answer (5.5) — CRITICAL**

This requires a quiz with a fresh state. If the existing TEST ARTICLE has a quiz, navigate to it instead. Otherwise, reload the page to reset quiz state (quizzes are client-side state).

Navigate to the article, find a quiz block, and click the CORRECT answer.

Expected:
- Selected option: green border, green checkmark
- Other options: dimmed/faded
- No red highlights anywhere
- Explanation text appears below

Use `browser_take_screenshot`. Save as `W5-05-quiz-correct-answer.png`.

- [ ] **Step 6: Verify Callout/Banner block (5.6)**

Use `browser_snapshot` to find the callout block.

Expected: Styled with border/background, text reads "Important: Always run browser QA tests..."

- [ ] **Step 7: Verify article sidebar (5.7)**

Use `browser_snapshot` to check the left sidebar.

Expected: Table of contents (headings), related content links, AI Tutor button present.

- [ ] **Step 8: Screenshot — full article with all blocks**

Use `browser_take_screenshot` (full page if possible). Save as `W5-07-full-article.png`.

- [ ] **Step 9: Test mobile viewport (5.8)**

Use `browser_evaluate` to run: `window.innerWidth` to confirm desktop, then resize viewport to 375x812.

Alternatively, use Playwright MCP's viewport setting if available, or navigate in a new context with mobile dimensions.

Use `browser_snapshot` and `browser_take_screenshot` at mobile width.

Expected: All content blocks render correctly. No horizontal overflow. Responsive layout — sidebar collapses, video embed scales down, quiz buttons are touch-friendly.

Save as `W5-08-mobile-article.png`.

- [ ] **Step 10: Verify existing TEST ARTICLE (5.9)**

Use `browser_navigate` to find and open the pre-existing "TEST ARTICLE" on the frontend.
Use `browser_snapshot` to verify its video embed and quiz blocks render.

Expected: Video embed displays, quiz interaction works.

Use `browser_take_screenshot`. Save as `W5-09-test-article.png`.

- [ ] **Step 11: Record results**

Document all results. Flag any block that didn't render correctly with severity.

---

## Workflow 6: Free User — Consumer Experience

### Task 6: Free User Experience & Access Controls

**Purpose:** Test the experience of an actual end user — the person whose bugs we're fixing.
**Persona:** Unauthenticated first, then `qa-free-user@limitless.test` / `TestQA2026!`

- [ ] **Step 1: Open a new browser context (unauthenticated)**

Use `browser_navigate` to `https://paths.limitless-longevity.health/articles` in a fresh context (or clear cookies/logout first).

- [ ] **Step 2: Browse articles listing unauthenticated (6.1)**

Use `browser_snapshot` to read the articles listing.

Expected: Published free articles visible. Premium articles show a tier badge. Article from Workflow 4 should be listed.

Use `browser_take_screenshot`. Save as `W6-01-articles-unauthenticated.png`.

- [ ] **Step 3: Open free article (6.2)**

Click on the QA Test article (or the existing TEST ARTICLE). Use `browser_snapshot` to verify full content renders.

Expected: Full article content visible (not locked). All blocks render.

- [ ] **Step 4: Verify Video Embed as consumer (6.3)**

Use `browser_snapshot` to verify YouTube iframe is present and loaded.

Expected: Video iframe loads and displays.

- [ ] **Step 5: Verify Quiz as consumer (6.4)**

Click a quiz answer. Verify correct/incorrect feedback works.

Expected: Same feedback behavior as in Workflow 5.

- [ ] **Step 6: Test AI Tutor unauthenticated (6.5) — CRITICAL**

Use `browser_snapshot` to find the AI Tutor button in the sidebar. Click it to open the tutor panel.

Type a question: `What is this article about?`
Click send.

Expected: Error message reads **"Please sign in to use the AI Tutor."** — NOT "Something went wrong. Try again."

Use `browser_take_screenshot`. Save as `W6-05-tutor-unauthenticated.png`.

**If FAIL:** This is a BLOCKER. Use Chrome DevTools MCP to check network request to `/api/ai/tutor` — verify response status is 401. Check console for errors.

- [ ] **Step 7: Login as free-tier user (6.6)**

Navigate to the login page or use the site's login flow.
Login with `qa-free-user@limitless.test` / `TestQA2026!`.

Expected: Login succeeds.

Use `browser_take_screenshot`. Save as `W6-06-free-user-login.png`.

- [ ] **Step 8: Test AI Tutor authenticated, free tier (6.7) — CRITICAL**

Navigate back to a free article. Open the AI Tutor panel.
Type a question: `Explain the key points of this article.`
Click send.

Expected: Error message reads **"AI Tutor is not available on your current plan. Upgrade for access."** — NOT "Something went wrong" or "Daily tutor limit reached".

Use `browser_take_screenshot`. Save as `W6-07-tutor-free-tier.png`.

**If FAIL:** Use Chrome DevTools MCP to check network response. Verify `/api/ai/tutor` returns 429 with `{ "limit": 0 }` in body.

- [ ] **Step 9: Access premium article (6.8)**

Navigate to `/articles` listing. Find a premium article (if one exists). Open it.

Expected: Content is locked. `LockedContentBanner` shown with upgrade prompt. Article excerpt may be visible but full content is hidden.

Use `browser_take_screenshot`. Save as `W6-08-premium-locked.png`.

**Note:** If no premium article exists, skip this test and note it as SKIPPED.

- [ ] **Step 10: Verify account page (6.9)**

Navigate to `https://paths.limitless-longevity.health/account`.
Use `browser_snapshot` to verify.

Expected: Account profile loads with user info (QA FreeUser, email, tier: free).

Use `browser_take_screenshot`. Save as `W6-09-account-page.png`.

- [ ] **Step 11: Test Stripe upgrade flow (6.10)**

Navigate to `https://paths.limitless-longevity.health/account/billing` (or find the upgrade button).
Click "Upgrade" or equivalent.

Expected: Navigates to Stripe checkout page. **DO NOT complete payment.**

Use `browser_take_screenshot`. Save as `W6-10-stripe-checkout.png`.

**Note:** If Stripe is not configured in production or upgrade button is absent, note as SKIPPED.

- [ ] **Step 12: Mobile viewport test (6.11)**

Resize to 375x812. Navigate to `/articles`, then open the QA Test article.
Open the AI Tutor panel.

Use `browser_take_screenshot` at each step.

Expected: Articles listing responsive. Article page responsive. Tutor panel renders correctly on mobile (full width, not cut off).

Save as `W6-11-mobile-articles.png`, `W6-11-mobile-article.png`, `W6-11-mobile-tutor.png`.

- [ ] **Step 13: Record results**

Document all results. AI Tutor tests (6.5, 6.7) are critical regression tests for the bug we just fixed.

---

## Workflow 7: Regression & Cross-Cutting

### Task 7: Verify Fixed Bugs & Edge Cases

**Purpose:** Verify the 3 recently fixed bugs don't recur + test edge cases.
**Persona:** Various (as needed per test)

- [ ] **Step 1: Video embed — YouTube Shorts URL (7.1)**

This requires an article with a YouTube Shorts embed. If the QA Test article uses a standard URL, test this by checking the RichText converter logic:

Use `browser_navigate` to the QA Test article. Use `browser_evaluate` to run JavaScript that creates a test:

```javascript
// Verify the regex handles Shorts URLs
const shortsRegex = /(?:v=|youtu\.be\/|\/embed\/|\/shorts\/)([a-zA-Z0-9_-]+)/;
const result = shortsRegex.exec('https://www.youtube.com/shorts/dQw4w9WgXcQ');
JSON.stringify({ match: result ? result[1] : null });
```

Expected: Returns `{"match":"dQw4w9WgXcQ"}`.

- [ ] **Step 2: Video embed — standard YouTube URL (7.2)**

Verify the QA Test article's video embed is visible (already tested in W5, but confirm here as explicit regression test).

Use `browser_snapshot` on the article page. Look for iframe with `youtube.com/embed/`.

Expected: Video embed renders in 16:9 container.

- [ ] **Step 3: Quiz correctAnswer=0 (7.3)**

The QA Test article's quiz has correctAnswer=1. To test correctAnswer=0, use `browser_evaluate` to check the QuizBlock component behavior:

Alternatively, check the existing TEST ARTICLE — if its quiz has correctAnswer=0, test it there.

Use `browser_snapshot` to find quiz blocks and their data. Select the first option if it's correct.

Expected: First option highlights green.

**Note:** If no quiz with correctAnswer=0 exists on the live site, note as SKIPPED with recommendation to create one.

- [ ] **Step 4: Quiz correctAnswer=3 (7.4)**

Same approach — if no quiz with correctAnswer=3 exists, note as SKIPPED.

- [ ] **Step 5: AI Tutor 401 handling (7.5)**

Already verified in W6 Step 6. Confirm result here as regression entry.

Expected: PASS (mirrors W6-05 result).

- [ ] **Step 6: AI Tutor 429/limit=0 handling (7.6)**

Already verified in W6 Step 8. Confirm result here as regression entry.

Expected: PASS (mirrors W6-07 result).

- [ ] **Step 7: Navigation flow (7.7)**

Test the navigation path: Home → Articles → Article → Back.

Use `browser_navigate` to `https://paths.limitless-longevity.health/`.
Click on Articles link in navigation.
Click on the QA Test article.
Use `browser_go_back`.

Expected: Returns to articles listing. No broken routes, no 404s, no stale content.

- [ ] **Step 8: Admin panel logout (7.8)**

Use `browser_navigate` to `https://paths.limitless-longevity.health/admin`.
If logged in, navigate to `/admin/logout`.

Expected: Redirected to login page. No stale dashboard state.

Use `browser_take_screenshot`. Save as `W7-08-logout.png`.

- [ ] **Step 9: Record results**

Document all regression test results.

---

## Task 8: Generate Test Report

**Files:**
- Create: `limitless-paths/tests/browser-qa/report.md`

- [ ] **Step 1: Compile all workflow results into report**

Create `limitless-paths/tests/browser-qa/report.md` with the following structure:

```markdown
# Browser QA Test Report — 2026-03-25

## Summary
- Total: ~45 tests | Passed: X | Failed: X | Skipped: X
- Environment: Production (paths.limitless-longevity.health)
- Browser: Chromium (Playwright MCP)
- Viewports: 1440x900 (desktop), 375x812 (mobile)
- MCP Servers: Playwright MCP + Chrome DevTools MCP

## Workflow Results

### Workflow 1: Admin Setup & Verification
| # | Test | Status | Notes | Screenshot |
|---|------|--------|-------|------------|
| 1.1 | Admin login | — | — | W1-01-admin-login.png |
[... fill from recorded results ...]

### Workflow 2: Contributor — Content Creation
[... fill from recorded results ...]

### Workflow 3: Editor — Review & Approval
[... fill from recorded results ...]

### Workflow 4: Publisher — Publishing
[... fill from recorded results ...]

### Workflow 5: Frontend Content Verification
[... fill from recorded results ...]

### Workflow 6: Free User — Consumer Experience
[... fill from recorded results ...]

### Workflow 7: Regression & Cross-Cutting
[... fill from recorded results ...]

## Failures
[... document any failures with full context ...]

## Regression Status
| Bug | Fixed In | Regression Test | Status |
|-----|----------|----------------|--------|
| Video embed not rendering | 62bc5504 | W5-03, W7-01, W7-02 | — |
| Quiz not showing correct answer | 62bc5504 | W5-04, W5-05, W7-03, W7-04 | — |
| AI Tutor "Something went wrong" | 62bc5504 | W6-05, W6-07, W7-05, W7-06 | — |

## Recommendations
[... any improvements discovered during testing ...]
```

- [ ] **Step 2: Review the report for completeness**

Verify every test case from the spec has a corresponding entry. Flag any gaps.

- [ ] **Step 3: Present report to user**

Output the complete report to the user for review. Highlight any failures with severity ratings:
- **Blocker:** Must fix before launch
- **Major:** Should fix soon
- **Minor:** Nice to have

- [ ] **Step 4: If failures found, create fix tasks**

For each failure, create a task with:
- What's broken
- Root cause (from Chrome DevTools MCP debugging)
- Recommended fix
- Files to modify
