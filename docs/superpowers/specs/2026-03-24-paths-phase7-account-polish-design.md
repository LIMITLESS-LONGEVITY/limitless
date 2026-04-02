# PATHS Phase 7: Account & Polish Design Spec

**Date:** 2026-03-24
**Status:** Draft
**Depends on:** Phase 5 (Billing — Stripe endpoints), Phase 6 (Content Pages — sidebars, components)
**Working directory:** `C:/Projects/LIMITLESS/limitless-paths/`

---

## 1. Scope

Phase 7 adds user-facing account management and mobile responsiveness:

1. **Account pages** — profile settings, billing management, enrolled courses
2. **MobileSidebar component** — reusable drawer for article TOC and course outline on mobile
3. **Responsive fixes** — sidebar collapse, list view stacking, account nav adaptation

**Admin dashboard:** Phase 7 uses Payload's built-in admin panel as-is. No custom dashboard widgets — the architecture supports adding them later (Payload 3.x custom admin views), but they are not in scope.

**Deferred to post-launch:** Custom admin dashboard widgets (stats, analytics), SEO fine-tuning, performance optimization.

---

## 2. Account Layout

**Route:** `src/app/(frontend)/account/layout.tsx`

A shared layout wrapping all account sub-pages. Auth required — redirect to `/admin` (login) if not authenticated.

**Desktop:** Left nav sidebar (~200px) with links to Profile, Billing, My Courses. Active link highlighted. Content area to the right.

**Mobile (< 1024px):** Nav collapses to horizontal tabs at the top of the page.

**Sub-routes:**

| Route | Page |
|-------|------|
| `/account` | Redirects to `/account/profile` |
| `/account/profile` | Profile settings form |
| `/account/billing` | Subscription status + Stripe portal |
| `/account/courses` | Enrolled courses with progress |

All account pages use `force-dynamic` (require auth context from cookies).

---

## 3. Profile Page

**Route:** `src/app/(frontend)/account/profile/page.tsx`

A form to edit user profile:

| Field | Source | Editable | Method |
|-------|--------|----------|--------|
| First name | `user.firstName` | Yes | `PATCH /api/users/:id` |
| Last name | `user.lastName` | Yes | `PATCH /api/users/:id` |
| Email | `user.email` | Read-only display | — |
| Avatar | `user.avatar` | Yes (upload) | `PATCH /api/users/:id` with media relationship |

**Password change:** A separate form section with current password, new password, confirm password. The implementer should verify whether Payload 3.x accepts `password` on `PATCH /api/users/:id` for authenticated users, or whether `POST /api/users/change-password` (Payload's dedicated endpoint) is required. Use whichever endpoint works — test before committing.

**Implementation:** Client component with `react-hook-form` (already in the project). Fetches current user data on mount via `GET /api/users/me`, submits changes via `PATCH /api/users/:id`.

**Success/error feedback:** Toast or inline message after save. No need for a toast library — a simple state-driven inline message is sufficient.

---

## 4. Billing Page

**Route:** `src/app/(frontend)/account/billing/page.tsx`

Displays subscription status and provides access to Stripe Customer Portal.

### For users with an active subscription:

- Current tier name and badge (e.g., "Premium")
- Billing interval (Monthly/Yearly)
- Next renewal date (`currentPeriodEnd`)
- If `cancelAtPeriodEnd` is true: warning banner "Your subscription will end on [date]"
- "Manage Subscription" button → calls `POST /api/billing/portal`, redirects to Stripe Customer Portal

### For users without a subscription:

- Current tier display (Free)
- Tier selection cards showing available tiers:
  - Tier name, access level, monthly and yearly prices, feature list
  - "Subscribe" button → calls `POST /api/billing/checkout` with `tierId` and `interval`
  - Redirects to Stripe Checkout

### Data fetching:

Server component fetches:
- Current user (with tier populated)
- User's active subscription from `subscriptions` collection (if any)
- All active membership tiers from `membership-tiers` collection (for the tier cards)

The `?success=true` and `?cancelled=true` query params (from Stripe Checkout redirect) display appropriate success/cancellation messages.

---

## 5. My Courses Page

**Route:** `src/app/(frontend)/account/courses/page.tsx`

Lists all courses the user is enrolled in.

Each enrollment shows:
- Course title and thumbnail (from populated course relationship)
- Enrollment date
- Progress bar with completion percentage
- Status badge: Active (amber), Completed (green), Cancelled (gray)
- "Continue Learning" link → next incomplete lesson (same logic as course detail page)
- Completed courses show completion date and a "Revisit" link

### Data fetching:

Server component fetches:
- User's enrollments from `enrollments` collection (with course populated at depth 1 — only need title and thumbnail, not the full module/lesson tree)
- Use `overrideAccess: true` for the query (server-side, after auth check — same pattern as course detail page)
- Sorted by `enrolledAt` descending (most recent first)

Empty state: "You haven't enrolled in any courses yet." with a link to `/courses`.

---

## 6. MobileSidebar Component

**Component:** `src/components/MobileSidebar/index.tsx`

A reusable slide-out drawer for mobile screens. Used by:
- `ArticleSidebar` — TOC, AI tutor button, related content
- `CourseSidebar` — course outline, progress bar

### Behavior:

- A hamburger/menu button rendered only on mobile (`lg:hidden`), positioned fixed at the bottom-right or top-left
- Opens a drawer from the left (matching desktop sidebar position)
- Semi-transparent overlay behind the drawer
- Close on: close button click, overlay click, link click within the drawer (auto-close on navigation)
- Accepts `children` — the existing sidebar content is passed in

### Integration with existing sidebars:

The `ArticleSidebar` and `CourseSidebar` components are modified to:
1. Keep their existing desktop rendering (`hidden lg:block`)
2. On mobile, render a `MobileSidebar` wrapper with a trigger button (`lg:hidden`)
3. The sidebar content is the same — just wrapped differently on mobile

This is a wrapper pattern, not a rewrite. Both `ArticleSidebar` and `CourseSidebar` require targeted modifications — adding a `MobileSidebar` wrapper and trigger button for mobile rendering — but their internal content logic (TOC, scrollspy, course outline, progress bar) stays unchanged.

---

## 7. Responsive Fixes

### Article reader (`/articles/[slug]`)
- Desktop: two-column flex (sidebar + content) — already working
- Mobile: sidebar hidden, MobileSidebar trigger button visible, content full-width

### Lesson viewer (`/courses/[slug]/lessons/[lessonSlug]`)
- Desktop: two-column flex (course sidebar + content) — already working
- Mobile: sidebar hidden, MobileSidebar trigger button visible, content full-width

### Content lists (`/articles`, `/courses`)
- Desktop: list items with thumbnail + text — already working
- Mobile: thumbnail hidden on small screens (< 640px), text takes full width. Handled with `hidden sm:block` on the thumbnail container.

### Account layout
- Desktop: left nav sidebar + content
- Mobile (< 1024px): horizontal tabs at top + content below

### Tutor panel
- Already full-width on mobile (handled in Phase 6, `max-w-[400px]` with implied full-width below that)

---

## 8. File Structure

```
src/
├── app/(frontend)/
│   └── account/
│       ├── layout.tsx              # Account layout with nav (auth required)
│       ├── page.tsx                # Redirect to /account/profile
│       ├── profile/
│       │   └── page.tsx            # Profile settings form
│       ├── billing/
│       │   └── page.tsx            # Subscription status + tier selection
│       └── courses/
│           └── page.tsx            # Enrolled courses with progress
├── components/
│   ├── MobileSidebar/
│   │   └── index.tsx               # Reusable mobile drawer
│   ├── ArticleSidebar/
│   │   └── index.tsx               # Modified: wrap with MobileSidebar on mobile
│   └── CourseSidebar/
│       └── index.tsx               # Modified: wrap with MobileSidebar on mobile
```

---

## 9. Dependencies

### No new npm packages

Everything needed exists:
- `react-hook-form` — already installed, used for profile form
- Tailwind responsive classes for all responsive fixes
- Lucide React for icons
- shadcn/ui components for form inputs

### Existing infrastructure used

- `POST /api/billing/portal` — Stripe Customer Portal redirect
- `POST /api/billing/checkout` — Stripe Checkout session creation
- `PATCH /api/users/:id` — profile updates (Payload REST API)
- `GET /api/users/me` — current user data
- Payload `auth({ headers })` — server-side auth check

---

## 10. Key Design Decisions

1. **Separate routes, not tabs** — `/account/profile`, `/account/billing`, `/account/courses` are bookmarkable, back-button friendly.
2. **Stripe portal for subscription management** — no custom billing UI. Stripe handles cancellation, plan changes, payment methods.
3. **Tier selection cards on billing page** — only shown when user has no active subscription. Users with subscriptions manage via Stripe portal.
4. **MobileSidebar as wrapper** — existing sidebar components stay unchanged. The mobile drawer wraps them with a trigger button on small screens.
5. **No custom admin dashboard** — Payload's built-in admin is sufficient for launch. Architecture supports custom views later.
6. **Inline feedback, no toast library** — simple state-driven success/error messages. No new dependency.
7. **Auth redirect to `/admin`** — Payload's built-in login page. No custom login UI in Phase 7 scope.
