# PATHS Phase 6: Content Pages Design Spec

**Date:** 2026-03-23
**Status:** Draft
**Depends on:** Phase 2 (Content System), Phase 3 (AI — tutor, quiz), Phase 4 (Enrollments), Phase 5 (Billing)
**Working directory:** `C:/Projects/LIMITLESS/limitless-paths/`

---

## 1. Scope

Phase 6 builds the public-facing content pages — the core user experience for browsing, reading, learning, and interacting with AI features.

**New pages:**
1. Article listing (`/articles`) — browse articles by content pillar, with tier badges
2. Article reader (`/articles/[slug]`) — full article with left sidebar (TOC, AI tutor, related)
3. Course catalog (`/courses`) — browse courses with enrollment status
4. Course detail (`/courses/[slug]`) — course overview with modules, enroll button, progress
5. Lesson viewer (`/courses/[slug]/lessons/[lessonSlug]`) — lesson content with course sidebar

**New components:**
6. AI Tutor panel — slide-out chat drawer from the right
7. Locked content banner — fade + inline upgrade prompt
8. Quiz block renderer — interactive QuizQuestion display with answer reveal

**Deferred to Phase 7:** Account page, billing page, profile settings, admin dashboard enhancements, full responsive audit.

---

## 2. Article Listing Page (`/articles`)

**Route:** `src/app/(frontend)/articles/page.tsx`

### Layout

List view with content pillar filter pills at top. Each list item shows:
- Thumbnail (featured image, left side)
- Content pillar label (e.g., "NUTRITION")
- Tier badge (FREE / REGULAR / PREMIUM / ENTERPRISE)
- Title
- Excerpt (1-2 lines)
- Author name
- Right-aligned estimated read time (calculated client-side: word count / 200 WPM, rounded up to nearest minute. If `content` is null for locked articles, omit read time.)

### Data Fetching

Server component. Queries the `articles` collection:
- Filter: `editorialStatus: 'published'`
- The `canReadContent` access function handles tier filtering — users see all published articles at their access level
- Sort: `publishedAt` descending (newest first)
- Pagination: 12 per page

### Pillar Filter

Content pillar filter pills fetched from `content-pillars` collection (where `isActive: true`). Filter is applied as a query parameter (`?pillar=nutrition`). "All" is the default (no filter). Clicking a pillar pill re-fetches with the filter.

### Tier Badges

Each article card shows its `accessLevel` as a small badge:
- `free` — no badge (implicit)
- `regular` — "REGULAR" in subtle text
- `premium` — "PREMIUM" in gold/accent color
- `enterprise` — "ENTERPRISE" in accent color

Locked articles (where `computeLockedStatus` returns `locked: true`) show normally in the listing — the lock is only visible when you try to read the full article.

---

## 3. Article Reader Page (`/articles/[slug]`)

**Route:** `src/app/(frontend)/articles/[slug]/page.tsx`

### Layout: Left Sidebar + Content

Two-column layout:
- **Left sidebar** (fixed width ~240px, sticky on scroll, collapses to hamburger on mobile):
  - **Table of Contents** — auto-generated from H2/H3 headings in the Lexical content. Scrollspy highlights the current section. Clicking a heading scrolls to it.
  - **AI Tutor button** — opens the tutor slide-out panel. Shows "Ask about this article" with an icon.
  - **Related content** — linked courses from `article.relatedCourses` (if any), plus other published articles in the same content pillar.

- **Main content** (flex, fills remaining width):
  - Pillar label + tier badge
  - Title (H1)
  - Author name, published date, read time
  - Featured image
  - Article body (Lexical rich text rendered via existing `RichText` component)
  - Related articles section at bottom

### Table of Contents Generation

Client-side. After the article renders, scan the DOM for `h2` and `h3` elements within the content area. Build a TOC structure and render it in the sidebar. Use `IntersectionObserver` for scrollspy (highlight the current section as the user scrolls).

This is a client component (`ArticleSidebar`) that reads the rendered DOM — no server-side extraction needed.

### Locked Content Handling

If `computeLockedStatus` returns `locked: true` for the article:
- The `content` field is `null` (hidden by the afterRead hook)
- The `excerpt` field is still available
- Display: title, metadata, featured image, then the excerpt text followed by a fade gradient and the inline upgrade banner

The `LockedContentBanner` component renders:
- A CSS gradient fade over the last lines of the excerpt
- A horizontal banner with lock icon, tier name, upgrade message, and CTA button
- The CTA links to `/account/billing` (Phase 7) or a pricing page

### SEO

The SEO plugin already adds meta fields to articles. Use `generateMeta()` utility (exists at `src/utilities/generateMeta.ts`) to populate `<head>` metadata. The `generateStaticParams` function returns empty arrays per CLAUDE.md hard constraint (production DB may have no schema yet).

---

## 4. Course Catalog Page (`/courses`)

**Route:** `src/app/(frontend)/courses/page.tsx`

### Layout

Same list view pattern as articles:
- Thumbnail (featured image)
- Pillar label + tier badge
- Title
- Description excerpt (first ~150 chars of the description richtext, extracted as plain text)
- Instructor name
- Estimated duration (e.g., "4h 30m")
- Module/lesson count (e.g., "3 modules, 12 lessons")
- Enrollment status badge for logged-in users ("Enrolled", "25% complete", or nothing)

### Data Fetching

Server component. Queries `courses` collection:
- Filter: `editorialStatus: 'published'`
- Access control handled by `canReadContent`
- Sort: `publishedAt` descending (newest first)
- Pagination: 12 per page

For logged-in users, also fetch their enrollments to show enrollment status badges.

### Pillar Filter

Same content pillar filter pills as articles page.

---

## 5. Course Detail Page (`/courses/[slug]`)

**Route:** `src/app/(frontend)/courses/[slug]/page.tsx`

### Layout

Single-column course overview (no sidebar — the sidebar appears when viewing lessons).

**Sections:**
1. **Hero area** — Featured image, title, pillar, tier badge, instructor, estimated duration
2. **Description** — Course description (richtext)
3. **Enrollment CTA** — Depends on state:
   - Not logged in → "Sign in to enroll"
   - Not enrolled, has tier → "Enroll in this course" (calls `POST /api/enrollments/enroll`)
   - Not enrolled, lacks tier → "Upgrade to [tier] to access this course" (links to billing)
   - Enrolled → "Continue learning" (links to next incomplete lesson) + progress bar
   - Completed → "Completed" badge + option to revisit
4. **Module breakdown** — Accordion or list of modules, each showing its lessons with:
   - Lesson title, type icon (text/video/audio), estimated duration
   - For enrolled users: completion checkmark or "in progress" indicator
   - Clicking a lesson navigates to the lesson viewer

### Locked Course Handling

If the course is locked (`locked: true` from `computeLockedStatus`):
- Show hero, title, description (the `description` richtext is not nulled — only `content` on articles is nulled by the hook, and courses use `description` not `content`)
- Show the module/lesson list (titles only, not content)
- Show the upgrade banner instead of the enroll button

---

## 6. Lesson Viewer Page (`/courses/[slug]/lessons/[lessonSlug]`)

**Route:** `src/app/(frontend)/courses/[slug]/lessons/[lessonSlug]/page.tsx`

### Layout: Left Sidebar + Content (Course Player)

Two-column layout matching the article reader pattern but with course-specific sidebar content:

**Left sidebar** (fixed ~240px, sticky):
- **Course title** (linked back to course detail)
- **Module/lesson outline** — full course structure:
  - Module names as section headers
  - Lessons listed under each module with:
    - Checkmark (completed), bullet (current), circle (not started)
    - Lesson title (clickable to navigate)
    - Current lesson highlighted in accent color
- **Progress bar** at bottom — shows overall completion percentage

**Main content**:
- Module + lesson breadcrumb label (e.g., "MODULE 1 / LESSON 3")
- Lesson title
- Estimated duration + lesson type
- Video embed (if lesson type is video/mixed) — renders the `videoEmbed` group
- Lesson body — Lexical richtext via `RichText` component (includes inline QuizQuestion blocks)
- AI Tutor button (opens slide-out panel, scoped to this lesson)
- Navigation footer: "Previous" / "Mark Complete & Next" buttons

### Progress Tracking

When user clicks "Mark Complete & Next":
1. Frontend calls the Payload REST API (`PATCH /api/lesson-progress/:id` with `{ status: 'completed' }`) — not the Local API, which is server-side only
2. The `updateEnrollmentProgress` hook automatically recalculates course completion
3. Frontend navigates to the next lesson in order
4. Sidebar updates to show the checkmark

If no `LessonProgress` record exists for this lesson + enrollment, the frontend creates one via `POST /api/lesson-progress` (with `status: 'in_progress'`, `lastAccessedAt: now`) on first access. The REST API respects the `canAccessOwnOrStaff` access function — users can only create/update their own records.

### Access Control

The lesson viewer requires:
1. User is authenticated
2. User is enrolled in the parent course (active enrollment exists)
3. If not enrolled, redirect to the course detail page

---

## 7. AI Tutor Panel

**Component:** `src/components/TutorPanel/`

### Behavior

A slide-out drawer that opens from the right edge of the screen:
- Width: ~400px on desktop, full-width on mobile
- Overlay dims the background content slightly
- Close button + click-outside to dismiss
- Persists within the page session (closing and reopening retains chat history)
- Resets when navigating to a different article/lesson

### Chat Interface

- Header: "AI Tutor" + context label (article/lesson title)
- Message list: alternating user/assistant bubbles
- Input area: text input + send button
- Streaming: assistant messages appear token-by-token
- Tier gate: if user lacks access to AI tutor (free tier), show upgrade prompt instead of chat

### API Integration

Calls `POST /api/ai/tutor` with:
- `message`: user's input
- `conversationHistory`: array of previous messages (maintained in React state)
- `contextType`: `'articles'` or `'lessons'`
- `contextId`: current document's ID

Handles SSE streaming response — reads `data: {text}` chunks and appends to the current assistant message. Stops on `data: [DONE]`.

### Error States

- Rate limited (429) → "You've reached your daily tutor limit. Upgrade for more."
- AI disabled (503) → "AI features are temporarily unavailable."
- Network error → "Something went wrong. Try again."

---

## 8. Locked Content Banner

**Component:** `src/components/LockedContentBanner/`

A reusable component for displaying the paywall on locked articles:

- **Fade overlay** — CSS gradient from transparent to background color, overlaying the last ~80px of the excerpt text
- **Banner** — horizontal flexbox:
  - Left: lock icon + "This is [Tier] content" + "Upgrade your plan to continue reading"
  - Right: "Upgrade" button (links to billing/pricing)
- Accent-colored border (gold/amber)
- Used on article reader page and course detail page

---

## 9. Quiz Block Renderer

**Component:** `src/components/QuizBlock/`

Renders `QuizQuestion` Lexical blocks inline in article/lesson content:

- Question text displayed prominently
- 4 option buttons (A/B/C/D style)
- User clicks an option → reveals correct/incorrect:
  - Correct: option turns green, shows explanation
  - Incorrect: selected option turns red, correct option turns green, shows explanation
- `correctAnswer` and `explanation` are in the API response but hidden until user interacts (frontend responsibility, per spec)
- No backend call needed — quiz data is embedded in the Lexical content

---

## 10. File Structure

```
src/
├── app/(frontend)/
│   ├── articles/
│   │   ├── page.tsx                    # Article listing
│   │   └── [slug]/
│   │       └── page.tsx                # Article reader
│   ├── courses/
│   │   ├── page.tsx                    # Course catalog
│   │   └── [slug]/
│   │       ├── page.tsx                # Course detail
│   │       └── lessons/
│   │           └── [lessonSlug]/
│   │               └── page.tsx        # Lesson viewer
├── components/
│   ├── ArticleSidebar/
│   │   └── index.tsx                   # Left sidebar: TOC, tutor button, related
│   ├── CourseSidebar/
│   │   └── index.tsx                   # Left sidebar: course outline + progress
│   ├── ContentList/
│   │   └── index.tsx                   # Reusable list view (articles + courses)
│   ├── ContentListItem/
│   │   └── index.tsx                   # Single list item (thumbnail + meta)
│   ├── PillarFilter/
│   │   └── index.tsx                   # Content pillar filter pills
│   ├── TierBadge/
│   │   └── index.tsx                   # FREE/REGULAR/PREMIUM badge
│   ├── LockedContentBanner/
│   │   └── index.tsx                   # Fade + inline upgrade banner
│   ├── TutorPanel/
│   │   └── index.tsx                   # Slide-out AI chat drawer
│   ├── QuizBlock/
│   │   └── index.tsx                   # Interactive quiz renderer
│   ├── EnrollButton/
│   │   └── index.tsx                   # Enroll/continue/upgrade CTA
│   ├── LessonNav/
│   │   └── index.tsx                   # Previous/Mark Complete & Next footer
│   └── VideoEmbed/
│       └── index.tsx                   # YouTube/Vimeo player component
```

---

## 11. Shared Patterns

### Data Fetching

All page routes are **server components** that fetch data via Payload Local API (`getPayload()` + `payload.find()`/`payload.findByID()`). Interactive elements (sidebar scrollspy, tutor panel, quiz blocks, enroll button) are **client components** imported into the server component pages.

### Authentication Context

Pages that need user context (enrollment status, progress, tier) use the existing `getMeUser()` utility or read the user from cookies. The course detail and lesson viewer pages need the authenticated user to check enrollment status.

### Mobile Responsiveness

- Sidebars (article + course) collapse to a hamburger/drawer on screens < 768px
- List views switch to single-column cards on mobile
- Tutor panel goes full-width on mobile
- This is handled with Tailwind responsive classes (existing approach in the codebase)

---

## 12. Dependencies

### No new npm packages

Everything needed exists:
- Tailwind CSS v4 for styling
- shadcn/ui components for buttons, inputs, cards
- Lucide React for icons
- Existing `RichText` component for Lexical content rendering
- Existing `Media` component for image rendering

### Existing infrastructure used

- `computeLockedStatus` afterRead hook — provides `locked` boolean on articles/courses
- `POST /api/ai/tutor` — streaming endpoint for tutor chat
- `POST /api/enrollments/enroll` — self-enrollment endpoint
- Payload Local API — data fetching in server components
- `generateMeta()` — SEO metadata generation

---

## 13. Key Design Decisions

1. **Left sidebar pattern** — consistent across article reader and lesson viewer. Auto-generated TOC for articles, course outline for lessons.
2. **List view for browse** — scannable, excerpt-focused, professional. Same pattern for articles and courses.
3. **Fade + inline banner for paywalls** — compact, non-intrusive. Shows the content exists and what tier unlocks it.
4. **Slide-out panel for AI tutor** — keeps content visible while chatting. Dismissable. Standard pattern (Notion AI, GitHub Copilot).
5. **Client-side TOC** — scans rendered DOM for headings rather than parsing Lexical JSON server-side. Simpler, works with any content structure.
6. **Server components for pages, client components for interactivity** — follows Next.js 15 best practices and existing codebase patterns.
7. **Quiz answer hiding is frontend-only** — `correctAnswer` is in the API response; the `QuizBlock` component hides it until user interaction. Acceptable for educational content (not security-sensitive).
