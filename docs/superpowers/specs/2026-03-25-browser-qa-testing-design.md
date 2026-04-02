# Browser-Based QA Testing Design — PATHS Platform

**Date:** 2026-03-25
**Status:** Approved
**Methodology:** Agile Testing (Q2 Acceptance + Q3 UAT/Exploratory)
**Target:** Live production site (`https://paths.limitless-longevity.health`)

---

## Problem Statement

Three bugs shipped to production undetected (video embed not rendering, quiz not showing correct answer feedback, AI tutor showing generic error). The root cause: no browser-based acceptance testing against the live deployed platform. Existing automated tests (91 integration + 7 E2E) cover Q1 (unit/integration) well but do not verify the actual rendered UI as real users experience it.

## Objective

Establish a comprehensive browser-based QA process that tests the full content lifecycle — from contributor creating content through to a free user consuming it — using Agile Testing Quadrant 2 (acceptance tests) and Quadrant 3 (exploratory/UAT as different personas).

---

## Test Architecture & Tooling

### MCP Servers

| Tool | Role | Package |
|------|------|---------|
| **Playwright MCP** | Primary test driver — navigate, click, type, screenshot, read DOM | `@playwright/mcp` |
| **Chrome DevTools MCP** | Debug complement — console logs, network inspection, performance | `chrome-devtools-mcp` |

**Installation:**
```bash
claude mcp add playwright -- npx @playwright/mcp@latest
claude mcp add chrome-devtools -- npx chrome-devtools-mcp@latest
```

### Test Execution Model

- Tests run against **live production site** (`https://paths.limitless-longevity.health` / `https://paths-api.limitless-longevity.health`)
- Each workflow logs in via the Payload admin panel (`/admin`) or frontend auth
- Screenshots captured at key checkpoints and on all failures
- Results documented in a structured test report

### Viewports

| Name | Resolution | Purpose |
|------|-----------|---------|
| Desktop | 1440x900 | Primary testing viewport |
| Mobile | 375x812 | iPhone 13 equivalent, responsive verification |

### Out of Scope

- Email verification (test email addresses don't exist)
- Stripe payment completion (test up to checkout page only)
- Performance/security audits (Q4 — future phase)
- Cross-browser testing (Chromium only; Firefox/WebKit can be added later)

---

## Test Accounts

### Existing Accounts (on production)

| Role | Email | Password | Tier |
|------|-------|----------|------|
| Admin | `test-admin@limitless.test` | See `tests/fixtures/test-data.ts` | N/A (staff) |
| Publisher | `test-publisher@limitless.test` | See `tests/fixtures/test-data.ts` | N/A (staff) |
| Editor | `test-editor@limitless.test` | See `tests/fixtures/test-data.ts` | N/A (staff) |
| Contributor | `test-contributor@limitless.test` | See `tests/fixtures/test-data.ts` | N/A (staff) |
| User | `test-user@limitless.test` | See `tests/fixtures/test-data.ts` | free |

**Notes:**
- Production email addresses may differ from these test fixture values. Verify via admin panel or DB query during Workflow 1. Passwords confirmed by user.
- Credentials sourced from `tests/fixtures/test-data.ts` — do not inline passwords in this spec.

### Accounts to Create During Testing

| Role | Purpose |
|------|---------|
| Free-tier user | Created in Workflow 1 for consumer experience testing |

---

## Test Workflows

Tests are structured as **7 sequential workflows** mirroring the content lifecycle. Each workflow builds on the previous one's output.

### Execution Order

```
Workflow 1 (Admin Setup) → verifies platform health, creates test user
    ↓
Workflow 2 (Contributor) → creates article with all block types, submits for review
    ↓
Workflow 3 (Editor) → reviews and approves the article
    ↓
Workflow 4 (Publisher) → publishes the article to frontend
    ↓
Workflow 5 (Content Verification) → verifies all blocks render correctly
    ↓
Workflow 6 (Free User) → tests consumer experience + access controls
    ↓
Workflow 7 (Regression) → verifies fixed bugs + edge cases
```

---

### Workflow 1: Admin Setup & Verification

**Persona:** Admin
**Purpose:** Verify platform foundation is healthy before testing content flows.

| # | Test Case | Acceptance Criteria |
|---|-----------|-------------------|
| 1.1 | Login to admin panel | Admin dashboard loads, user menu shows admin name |
| 1.2 | Verify collections visible | All 18 collections accessible in sidebar |
| 1.3 | Verify existing users | All 5 test accounts exist with correct roles |
| 1.4 | Verify tiers exist | 4 tiers present (free, regular, premium, enterprise) |
| 1.5 | Verify pillars exist | 6 content pillars present |
| 1.6 | Verify AI config | AI features enabled, rate limits configured |
| 1.7 | Create a test free-tier user account via admin panel (Users collection) | New user created with free tier + default tenant |

---

### Workflow 2: Contributor — Content Creation

**Persona:** Contributor
**Purpose:** Test the full content authoring experience including all Lexical block types.

| # | Test Case | Acceptance Criteria |
|---|-----------|-------------------|
| 2.1 | Login to admin panel as contributor | Dashboard loads, limited sidebar (only own content) |
| 2.2 | Create new article with rich content | Article form opens, all fields accessible |
| 2.3 | Add heading + paragraph text | Lexical editor accepts text input |
| 2.4 | Add Video Embed block (YouTube) | Block inserted, platform/URL fields filled, preview or placeholder visible |
| 2.5 | Add Quiz Question block | Block inserted with question, 4 options, correctAnswer index, explanation |
| 2.6 | Add Callout block | Block inserted with text content |
| 2.7 | Set article metadata | Pillar, access level (free), excerpt, featured image (if media exists) |
| 2.8 | Set tenant field | Default tenant selected (required by multi-tenant plugin) |
| 2.9 | Save as draft | Article saves successfully, status = draft |
| 2.10 | Submit for review (draft → in_review) | Editorial status changes to in_review |
| 2.11 | Verify contributor cannot publish directly | No option to set status to published/approved |

---

### Workflow 3: Editor — Review & Approval

**Persona:** Editor
**Purpose:** Test editorial review workflow.

| # | Test Case | Acceptance Criteria |
|---|-----------|-------------------|
| 3.1 | Login to admin panel as editor | Dashboard loads |
| 3.2 | Find the contributor's submitted article | Article visible in articles list with status in_review |
| 3.3 | Open and review content | All blocks visible (text, video embed, quiz, callout) |
| 3.4 | Approve article (in_review → approved) | Status changes to approved |
| 3.5 | Verify editor cannot publish | No option to set status to published |

---

### Workflow 4: Publisher — Publishing

**Persona:** Publisher
**Purpose:** Test publishing workflow and verify content goes live.

| # | Test Case | Acceptance Criteria |
|---|-----------|-------------------|
| 4.1 | Login to admin panel as publisher | Dashboard loads |
| 4.2 | Find the approved article | Article visible with status approved |
| 4.3 | Publish article (approved → published) | Status changes to published, publishedAt date set |
| 4.4 | Navigate to frontend articles listing | Published article appears in the list |
| 4.5 | Open the published article on frontend | Article page loads with correct title, metadata |

---

### Workflow 5: Publisher — Frontend Content Verification

**Persona:** Publisher (still logged in) then unauthenticated
**Purpose:** Verify all content blocks render correctly on the live frontend.

| # | Test Case | Acceptance Criteria |
|---|-----------|-------------------|
| 5.1 | Verify article header | Title, pillar badge, author name, date all render |
| 5.2 | Verify heading + paragraph text | Text content renders correctly |
| 5.3 | **Verify Video Embed renders** | YouTube iframe visible, 16:9 aspect ratio, video loads |
| 5.4 | **Verify Quiz — select wrong answer** | Red highlight on selected, green on correct, X icon on wrong, checkmark on correct, explanation shown |
| 5.5 | **Verify Quiz — select correct answer** | Green highlight + checkmark on selected, others dimmed, explanation shown |
| 5.6 | Verify Callout block renders | Callout styled with border/background |
| 5.7 | Verify article sidebar | Table of contents, related content, AI Tutor button present |
| 5.8 | Test on mobile viewport (375px) | All content blocks render correctly, no overflow, responsive layout |
| 5.9 | Also verify existing TEST ARTICLE | Video embed + quiz work on the pre-existing article |

---

### Workflow 6: Free User — Consumer Experience

**Persona:** Free-tier test user created in Workflow 1.7 (or unauthenticated)
**Purpose:** Test the experience of an actual end user.

| # | Test Case | Acceptance Criteria |
|---|-----------|-------------------|
| 6.1 | Browse articles listing (unauthenticated) | Published free articles visible, premium articles show tier badge |
| 6.2 | Open free article | Full content renders (not locked) |
| 6.3 | **Verify Video Embed as consumer** | Video iframe loads and is playable |
| 6.4 | **Verify Quiz as consumer** | Can select answer, correct/incorrect feedback works |
| 6.5 | **Test AI Tutor (unauthenticated)** | Opens panel, submitting question shows "Please sign in to use the AI Tutor" (not "Something went wrong") |
| 6.6 | Login as free-tier user | Login succeeds, redirected appropriately |
| 6.7 | **Test AI Tutor (authenticated, free tier)** | Opens panel, submitting question shows "AI Tutor is not available on your current plan" (429 with limit=0) |
| 6.8 | Attempt to access premium article | Content locked, LockedContentBanner shown with upgrade prompt |
| 6.9 | Verify account page | Account profile loads with user info |
| 6.10 | Test Stripe upgrade flow | "Upgrade" button navigates to Stripe checkout page (do not complete payment) |
| 6.11 | Mobile viewport (375px) | Articles listing + article page + tutor panel render correctly |

---

### Workflow 7: Regression & Cross-Cutting

**Purpose:** Verify the 3 recently fixed bugs + edge cases.

| # | Test Case | Acceptance Criteria |
|---|-----------|-------------------|
| 7.1 | Video embed with YouTube Shorts URL | Embed renders correctly (new regex) |
| 7.2 | Video embed with standard YouTube URL | Embed renders correctly |
| 7.3 | Quiz correctAnswer=0 (first option correct) | First option highlights green when selected |
| 7.4 | Quiz correctAnswer=3 (last option correct) | Last option highlights green when selected |
| 7.5 | AI Tutor 401 handling | Unauthenticated → "Please sign in" message |
| 7.6 | AI Tutor 429/limit=0 handling | Free tier → "not available on your current plan" message |
| 7.7 | Navigation: Home → Articles → Article → Back | No broken routes, back button works |
| 7.8 | Admin panel: logout and session expiry | Redirect to login, no stale state |

---

## Screenshot Protocol

Screenshots are captured at these points:
- **Every workflow login** — confirms correct user/role
- **Content creation milestones** — article form filled, each block added, save confirmation
- **Every frontend content verification** — video embed, quiz (before + after answer), AI tutor messages
- **Every failure** — with browser URL, viewport size, and timestamp
- **Mobile viewport checks** — all responsive tests

**Naming convention:** `W{workflow}-{step}-{description}.png`
**Location:** `tests/browser-qa/screenshots/` (add to `.gitignore` — screenshots are ephemeral test artifacts)

---

## Test Report Format

After execution, a structured report is written to `tests/browser-qa/report.md`:

```markdown
# Browser QA Test Report — {date}

## Summary
- Total: X tests | Passed: X | Failed: X | Skipped: X
- Environment: Production (paths.limitless-longevity.health)
- Browser: Chromium (Playwright MCP)
- Viewports: 1440x900 (desktop), 375x812 (mobile)

## Workflow Results
### Workflow N: {Name}
| # | Test | Status | Notes | Screenshot |
|---|------|--------|-------|------------|
| N.X | Test case | PASS/FAIL | — | WN-XX-desc.png |

## Failures (if any)
### [WN-XX] Failure title
- **Steps to reproduce:** ...
- **Expected:** ...
- **Actual:** ...
- **Screenshot:** WN-XX-failure.png
- **Console errors:** (from Chrome DevTools MCP)
- **Recommended fix:** ...

## Regression Status
| Bug | Fixed In | Regression Test | Status |
|-----|----------|----------------|--------|
| Description | commit | WN-XX | PASS/FAIL |
```

---

## Failure Protocol

When a test fails:
1. Capture screenshot
2. Switch to Chrome DevTools MCP — inspect console errors and network requests
3. Document the failure with full context in the report
4. **Continue with remaining tests** (don't stop on first failure)
5. At the end, summarize all failures with severity:
   - **Blocker:** Core functionality broken, prevents user from completing primary task
   - **Major:** Feature broken but workaround exists
   - **Minor:** Cosmetic or edge case issue

---

## Cleanup Protocol

After all tests complete:
- The article created in Workflow 2 is **left published** (useful as reference content)
- The free-tier test user created in Workflow 1.7 is **left active** (useful for future testing)
- No production data is deleted

---

## Agile Testing Context

### Quadrant Coverage

| Quadrant | Coverage | How |
|----------|----------|-----|
| Q1 (Tech, supporting team) | Existing — 91 integration tests, CI/CD | Vitest + Playwright automated |
| **Q2 (Business, supporting team)** | **This spec** — acceptance tests with explicit criteria | Browser MCP, role-based workflows |
| **Q3 (Business, critiquing product)** | **This spec** — exploratory UAT as different personas | Browser MCP, charter-based |
| Q4 (Tech, critiquing product) | Future phase | Performance, security audits |

### Regression Prevention

Every bug fixed should have a corresponding regression test case added to Workflow 7. This ensures the same class of bugs cannot ship again.

### Reusability

This testing protocol is designed to be **repeatable after every deploy**. The workflows can be re-executed with the same accounts and acceptance criteria to verify production health.
