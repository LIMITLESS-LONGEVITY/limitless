# PATHS Phase 4: Enrollments & Progress Tracking Design Spec

**Date:** 2026-03-23
**Status:** Draft
**Depends on:** Phase 2 (Content System), Phase 3 (AI Integration — for AIUsage pattern reference)
**Working directory:** `C:/Projects/LIMITLESS/limitless-paths/`

---

## 1. Scope

Phase 4 adds course enrollment and lesson progress tracking:

1. **Enrollments collection** — links users to courses with status and completion tracking
2. **LessonProgress collection** — tracks per-lesson progress within an enrollment
3. **Progress calculation hook** — auto-calculates course completion from lesson progress
4. **Course Reference Bypass** — enrolled users can access tier-gated articles linked from their courses
5. **Self-enrollment endpoint** — users can enroll themselves in accessible courses

**Deferred to Phase 5:** Stripe billing integration, subscription management, payment processing. The `paymentStatus` field on Enrollments is included as a placeholder (default `free`).

**Deferred to Phase 6:** Frontend pages (course player, lesson viewer, progress dashboard).

---

## 2. Enrollments Collection

**Slug:** `enrollments`.

Links a user to a course. One enrollment per user per course.

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| `user` | relationship → users | yes | — | Who enrolled |
| `course` | relationship → courses | yes | — | Which course |
| `enrolledAt` | date | yes | — | Auto-set on creation |
| `status` | select | yes | `active` | `active`, `completed`, `cancelled`, `expired` |
| `completedAt` | date | no | — | Auto-set when completionPercentage reaches 100% |
| `completionPercentage` | number | yes | `0` | 0-100, auto-calculated from lesson progress |
| `paymentStatus` | select | yes | `free` | `free`, `paid`, `pending`, `refunded` — placeholder for Phase 5 billing |

### Unique Constraint

Compound unique on `user` + `course`. Payload does not natively support compound unique constraints via field config, so this is enforced via a `beforeChange` hook that checks for existing enrollments.

### Access Control

| Operation | Rule |
|-----------|------|
| `create` | Authenticated users (self-enrollment via endpoint enforces additional checks) |
| `read` | Users read their own enrollments. Staff (contributor+) read all. |
| `update` | Users can update their own enrollments (restricted to `status: cancelled` via a `beforeChange` hook that rejects other field changes from non-staff). Staff update all. |
| `delete` | Admin only |

The `read` access function returns a Where query: `{ user: { equals: req.user.id } }` for regular users, `true` for staff.

### Hooks

- **`beforeChange` (create):** Auto-set `enrolledAt` to current timestamp. Check for duplicate enrollment (same user + course) and reject if exists.
- **`beforeChange` (update):** For non-staff users, only allow changing `status` to `cancelled`. Reject any other field modifications (prevents users from manipulating `completionPercentage`, `completedAt`, or `paymentStatus`).

---

## 3. LessonProgress Collection

**Slug:** `lesson-progress` (kebab-case, matching migration spec convention).

Tracks per-lesson progress within an enrollment.

| Field | Type | Required | Default | Purpose |
|-------|------|----------|---------|---------|
| `user` | relationship → users | yes | — | Who |
| `lesson` | relationship → lessons | yes | — | Which lesson |
| `enrollment` | relationship → enrollments | yes | — | Parent enrollment |
| `status` | select | yes | `not_started` | `not_started`, `in_progress`, `completed` |
| `completedAt` | date | no | — | Auto-set when status changes to `completed` |
| `videoWatchTime` | number | no | `0` | Seconds watched (populated by frontend later) |
| `videoTotalDuration` | number | no | `0` | Total video length in seconds |
| `lastAccessedAt` | date | no | — | Updated on each access |

### Access Control

| Operation | Rule |
|-----------|------|
| `create` | Authenticated users (created programmatically on first lesson access) |
| `read` | Users read their own progress. Staff read all. |
| `update` | Users update their own progress. Staff update all. |
| `delete` | Admin only |

### Hooks

- **`beforeChange` (update):** When `status` changes to `completed`, auto-set `completedAt` to current timestamp.
- **`afterChange`:** When `status` changes (specifically to `completed`), trigger `updateEnrollmentProgress` to recalculate the parent enrollment's completion percentage.

---

## 4. Progress Calculation Hook

**`updateEnrollmentProgress`** — triggered by LessonProgress `afterChange`.

### Logic

1. Only runs when `status` field has changed (compare `originalDoc.status` to `data.status`). This avoids recalculating on every `lastAccessedAt` update.
2. Fetch the parent enrollment from `doc.enrollment`.
3. From the enrollment's course, fetch all modules, then all lessons across those modules to get total lesson count.
4. Count LessonProgress records with `status: 'completed'` for this enrollment.
5. Calculate `completionPercentage = Math.round((completedLessons / totalLessons) * 100)`.
6. Update the enrollment's `completionPercentage`.
7. If `completionPercentage === 100`: set enrollment `status` to `completed` and `completedAt` to now.

### Edge Cases

- **Course with no lessons:** `completionPercentage` stays at 0 (guard against division by zero).
- **Lesson added after enrollment:** Percentage naturally decreases since total lesson count increases.
- **Performance:** The hook traverses Course → Modules → Lessons. For courses with many lessons, this could be slow. Acceptable for now — optimize with a cached lesson count on Course if needed later.

### Transaction Safety

All nested Payload operations (`findByID`, `find`, `update`) pass `req` per CLAUDE.md hard constraint.

---

## 5. Course Reference Bypass

**Deferred from Phase 2:** Articles linked from courses via `relatedCourses` skip the tier check for enrolled users.

### Implementation

Modify the existing `computeLockedStatus` afterRead hook in `src/hooks/computeLockedStatus.ts`:

Before returning `locked: true` for an article:
1. Check if the article has any values in its `relatedCourses` field. **Important:** This is `article.relatedCourses` (the Articles collection's relationship to Courses), not `course.relatedArticles` (the inverse). The relationship is navigated from the article side.
2. If yes, check if the requesting user has an active enrollment in any of those courses.
3. If enrolled in at least one related course → return `locked: false` (bypass tier check).

This is a small addition to the existing hook — approximately 10-15 lines of code. The enrollment check uses `req.payload.find()` with `overrideAccess: false` and passes `req` for transaction safety. This works because the Enrollments collection's read access allows users to read their own enrollments via the `{ user: { equals: req.user.id } }` Where query.

### Duplicate guard clarification

Both the `preventDuplicateEnrollment` hook on the collection and the enrollment endpoint (Section 6, Step 3) check for duplicates. The hook is the authoritative safety net — it prevents duplicates regardless of how the enrollment is created (API, admin panel, seed scripts). The endpoint provides a user-friendly error message. Neither is redundant.

---

## 6. Self-Enrollment Endpoint

**`POST /api/enrollments/enroll`**

### Request
```typescript
{
  courseId: string
}
```

### Response
```typescript
// Success (201)
{
  enrollment: { id, user, course, status, enrolledAt, completionPercentage }
}

// Already enrolled (409)
{ error: 'Already enrolled in this course' }

// Course not accessible (403)
{ error: 'You do not have access to this course' }
```

### Flow

1. Authenticate — reject anonymous users (401)
2. Fetch the course with `overrideAccess: true` (we need the course data regardless of access level)
3. Verify the course is published (`editorialStatus === 'published'`) — reject if not (404)
4. Verify the user's effective access level includes the course's `accessLevel` — use `getEffectiveAccessLevels(tierLevel, orgLevel)` and check if `course.accessLevel` is in the result. Reject if not (403: "Upgrade your plan to access this course")
5. Check for existing enrollment (same user + course) — reject if exists (409)
6. Create enrollment with `status: 'active'`, `enrolledAt: now`, `paymentStatus: 'free'`
7. Return the enrollment

**Note:** Step 2 uses `overrideAccess: true` because `canReadContent` allows users to see published courses at their tier level (for browsing/listing), but we need the full course document to check its `accessLevel` against the user's tier. The tier check in Step 4 is the real access gate.

### Why a dedicated endpoint instead of direct collection create

The enrollment endpoint enforces business logic that the collection's access control alone cannot:
- Verifies the course is published and accessible to the user's tier
- Prevents duplicate enrollments with a clear error message
- Sets `enrolledAt` automatically
- In Phase 5, this endpoint will integrate with Stripe for paid courses

---

## 7. File Structure

```
src/
├── collections/
│   ├── Enrollments/
│   │   ├── index.ts                    # Collection config
│   │   └── hooks/
│   │       └── preventDuplicateEnrollment.ts
│   └── LessonProgress/
│       ├── index.ts                    # Collection config
│       └── hooks/
│           └── setCompletedAt.ts       # Auto-set completedAt on completion
├── hooks/
│   ├── updateEnrollmentProgress.ts     # Recalculate course completion %
│   └── computeLockedStatus.ts          # Modified: add course reference bypass
├── access/
│   └── canAccessOwnOrStaff.ts          # Users access own records, staff access all
├── endpoints/
│   └── enrollments/
│       └── enroll.ts                   # POST /api/enrollments/enroll
└── payload.config.ts                   # Modified: register collections + endpoint
tests/
└── int/
    ├── enrollments.int.spec.ts         # Enrollment CRUD + duplicate prevention
    ├── lesson-progress.int.spec.ts     # Progress tracking + completion calculation
    └── course-reference-bypass.int.spec.ts  # Locked content bypass for enrolled users
```

---

## 8. Access Pattern: Own Records + Staff

Both Enrollments and LessonProgress use the same access pattern: users see their own records, staff see all. This is a new reusable access function:

```typescript
// src/access/canAccessOwnOrStaff.ts
export const canAccessOwnOrStaff: Access = ({ req: { user } }) => {
  if (!user) return false
  const role = user.role as string
  if (['admin', 'publisher', 'editor', 'contributor'].includes(role)) return true
  return { user: { equals: user.id } }
}
```

This is similar to the existing `isAdminOrSelf` but broader — it covers all staff roles, not just admin, and filters by a `user` relationship field rather than the document ID.

---

## 9. Dependencies

### No new npm packages

Everything needed is already in the stack:
- Payload CMS collections, hooks, endpoints
- PostgreSQL for storage
- Existing access control patterns

### Existing infrastructure used

- `isStaffRole` from `src/ai/rateLimiter.ts` — could be extracted to a shared utility, but for now the access function can inline the staff role check
- `computeLockedStatus` from `src/hooks/` — modified to add enrollment bypass
- `canReadContent` from `src/access/` — used by the enrollment endpoint to verify course access

---

## 10. Key Design Decisions

1. **Compound unique enforced via hook, not DB constraint** — Payload doesn't support compound unique via field config. The `preventDuplicateEnrollment` hook checks before creation.
2. **Auto-complete at 100%** — When the last lesson is completed, enrollment status automatically transitions to `completed`. A ceremony/certificate UX can be layered on in Phase 6.
3. **`paymentStatus` included as placeholder** — Default `free`, no Stripe logic. Avoids a migration in Phase 5.
4. **Video tracking fields included** — `videoWatchTime` and `videoTotalDuration` defined now, populated by frontend later.
5. **Modules/Lessons keep `authenticated` read access** — Content gating happens at the Course level. No need to tighten Module/Lesson access per enrollment.
6. **Course Reference Bypass modifies existing hook** — Not a new hook, just an extension of `computeLockedStatus` to check enrollment status before locking.
7. **Progress recalculation only on status change** — The hook compares `originalDoc.status` to avoid unnecessary recalculation on `lastAccessedAt` updates.
