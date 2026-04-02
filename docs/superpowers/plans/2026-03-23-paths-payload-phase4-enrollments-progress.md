# PATHS Payload CMS — Phase 4: Enrollments & Progress Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build course enrollment and lesson progress tracking — users can enroll in courses, track lesson completion, and auto-complete courses at 100%. Enrolled users bypass tier checks on articles linked from their courses.

**Architecture:** Two new collections (Enrollments, LessonProgress) with hooks that auto-calculate course completion percentage. A self-enrollment endpoint enforces business rules (tier check, duplicate prevention). The existing `computeLockedStatus` hook is extended with a course reference bypass for enrolled users.

**Tech Stack:** Payload CMS 3.x, TypeScript, PostgreSQL, Vitest

**Spec:** `docs/superpowers/specs/2026-03-23-paths-phase4-enrollments-progress-design.md`

**Depends on:** Phase 2 (Content System — Articles, Courses, Modules, Lessons)

**Working directory:** `C:/Projects/LIMITLESS/limitless-paths/`

---

## File Structure

New and modified files for this phase:

```
src/
├── access/
│   └── canAccessOwnOrStaff.ts          # New: users see own records, staff see all
├── collections/
│   ├── Enrollments/
│   │   ├── index.ts                    # New: enrollments collection config
│   │   └── hooks/
│   │       ├── preventDuplicateEnrollment.ts  # New: compound unique enforcement
│   │       └── restrictUserUpdates.ts         # New: users can only cancel
│   └── LessonProgress/
│       ├── index.ts                    # New: lesson-progress collection config
│       └── hooks/
│           └── setCompletedAt.ts       # New: auto-set completedAt on completion
├── hooks/
│   ├── updateEnrollmentProgress.ts     # New: recalculate course completion %
│   └── computeLockedStatus.ts          # Modified: add course reference bypass
├── endpoints/
│   └── enrollments/
│       └── enroll.ts                   # New: POST /api/enrollments/enroll
└── payload.config.ts                   # Modified: register collections + endpoint
tests/
└── int/
    ├── enrollments.int.spec.ts         # New: enrollment CRUD + duplicate prevention
    ├── lesson-progress.int.spec.ts     # New: progress tracking + completion calc
    └── course-reference-bypass.int.spec.ts  # New: locked content bypass tests
```

---

## Task 1: Build Shared Access Function (canAccessOwnOrStaff)

**Files:**
- Create: `src/access/canAccessOwnOrStaff.ts`

- [ ] **Step 1: Create the access function**

`src/access/canAccessOwnOrStaff.ts`:
```ts
import type { Access } from 'payload'

/**
 * Access pattern for user-owned records (Enrollments, LessonProgress).
 * - Staff (admin/publisher/editor/contributor): read/update all records
 * - Regular users: only their own records (filtered by `user` relationship field)
 * - Anonymous: no access
 */
export const canAccessOwnOrStaff: Access = ({ req: { user } }) => {
  if (!user) return false
  const role = user.role as string
  if (['admin', 'publisher', 'editor', 'contributor'].includes(role)) return true
  return { user: { equals: user.id } }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/access/canAccessOwnOrStaff.ts
git commit -m "Add canAccessOwnOrStaff access function for user-owned collections"
```

---

## Task 2: Build Enrollments Collection

**Files:**
- Create: `src/collections/Enrollments/index.ts`
- Create: `src/collections/Enrollments/hooks/preventDuplicateEnrollment.ts`
- Create: `src/collections/Enrollments/hooks/restrictUserUpdates.ts`
- Create: `tests/int/enrollments.int.spec.ts`
- Modify: `src/payload.config.ts`

- [ ] **Step 1: Write enrollment tests**

`tests/int/enrollments.int.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  preventDuplicateEnrollment,
} from '@/collections/Enrollments/hooks/preventDuplicateEnrollment'
import {
  restrictUserUpdates,
  ALLOWED_USER_STATUS_TRANSITIONS,
} from '@/collections/Enrollments/hooks/restrictUserUpdates'

describe('Enrollment hooks', () => {
  describe('preventDuplicateEnrollment', () => {
    it('exports a beforeChange hook function', () => {
      expect(typeof preventDuplicateEnrollment).toBe('function')
    })
  })

  describe('restrictUserUpdates', () => {
    it('exports ALLOWED_USER_STATUS_TRANSITIONS', () => {
      expect(ALLOWED_USER_STATUS_TRANSITIONS).toContain('cancelled')
    })

    it('exports a beforeChange hook function', () => {
      expect(typeof restrictUserUpdates).toBe('function')
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run tests/int/enrollments.int.spec.ts
```

Expected: FAIL (modules not found)

- [ ] **Step 3: Create preventDuplicateEnrollment hook**

`src/collections/Enrollments/hooks/preventDuplicateEnrollment.ts`:
```ts
import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Enforces compound uniqueness: one enrollment per user per course.
 * Payload doesn't support compound unique constraints via field config,
 * so this hook checks before creation.
 */
export const preventDuplicateEnrollment: CollectionBeforeChangeHook = async ({
  data,
  req,
  operation,
}) => {
  if (operation !== 'create') return data

  const userId = data.user as string
  const courseId = data.course as string

  if (!userId || !courseId) return data

  const existing = await req.payload.find({
    collection: 'enrollments',
    where: {
      and: [
        { user: { equals: userId } },
        { course: { equals: courseId } },
      ],
    },
    limit: 1,
    req,
  })

  if (existing.totalDocs > 0) {
    throw new Error('User is already enrolled in this course')
  }

  // Auto-set enrolledAt on creation
  if (!data.enrolledAt) {
    data.enrolledAt = new Date().toISOString()
  }

  return data
}
```

- [ ] **Step 4: Create restrictUserUpdates hook**

`src/collections/Enrollments/hooks/restrictUserUpdates.ts`:
```ts
import type { CollectionBeforeChangeHook } from 'payload'

/**
 * For non-staff users, only allow changing enrollment status to 'cancelled'.
 * Prevents users from manipulating completionPercentage, completedAt, or paymentStatus.
 */

export const ALLOWED_USER_STATUS_TRANSITIONS = ['cancelled'] as const

const STAFF_ROLES = ['admin', 'publisher', 'editor', 'contributor']

export const restrictUserUpdates: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  req,
  operation,
}) => {
  if (operation !== 'update') return data

  const userRole = (req.user as any)?.role as string | undefined
  if (!userRole) return data

  // Staff can update anything
  if (STAFF_ROLES.includes(userRole)) return data

  // Non-staff: only allow status change to 'cancelled'
  const newStatus = data.status as string | undefined
  const oldStatus = originalDoc?.status as string | undefined

  if (newStatus && newStatus !== oldStatus) {
    if (!ALLOWED_USER_STATUS_TRANSITIONS.includes(newStatus as any)) {
      throw new Error(`You can only cancel your enrollment. Status "${newStatus}" is not allowed.`)
    }
  }

  // Prevent non-staff from modifying protected fields
  delete data.completionPercentage
  delete data.completedAt
  delete data.paymentStatus

  return data
}
```

- [ ] **Step 5: Create the Enrollments collection**

`src/collections/Enrollments/index.ts`:
```ts
import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../access/isAdmin'
import { canAccessOwnOrStaff } from '../../access/canAccessOwnOrStaff'
import { authenticated } from '../../access/authenticated'
import { preventDuplicateEnrollment } from './hooks/preventDuplicateEnrollment'
import { restrictUserUpdates } from './hooks/restrictUserUpdates'

export const Enrollments: CollectionConfig = {
  slug: 'enrollments',
  admin: {
    useAsTitle: 'course',
    defaultColumns: ['user', 'course', 'status', 'completionPercentage', 'enrolledAt'],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      required: true,
    },
    {
      name: 'enrolledAt',
      type: 'date',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Expired', value: 'expired' },
      ],
    },
    { name: 'completedAt', type: 'date' },
    {
      name: 'completionPercentage',
      type: 'number',
      defaultValue: 0,
      required: true,
      admin: { description: '0-100, auto-calculated from lesson progress' },
    },
    {
      name: 'paymentStatus',
      type: 'select',
      required: true,
      defaultValue: 'free',
      options: [
        { label: 'Free', value: 'free' },
        { label: 'Paid', value: 'paid' },
        { label: 'Pending', value: 'pending' },
        { label: 'Refunded', value: 'refunded' },
      ],
      admin: { description: 'Placeholder for Phase 5 billing integration' },
    },
  ],
  hooks: {
    beforeChange: [preventDuplicateEnrollment, restrictUserUpdates],
  },
  access: {
    create: authenticated,
    read: canAccessOwnOrStaff,
    update: canAccessOwnOrStaff,
    delete: isAdmin,
  },
}
```

- [ ] **Step 6: Register Enrollments in payload.config.ts**

Add import:
```ts
import { Enrollments } from './collections/Enrollments'
```

Add `Enrollments` to the `collections` array.

- [ ] **Step 7: Run tests to verify they pass**

```bash
pnpm vitest run tests/int/enrollments.int.spec.ts
```

Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add src/collections/Enrollments/ src/access/canAccessOwnOrStaff.ts tests/int/enrollments.int.spec.ts src/payload.config.ts
git commit -m "Add Enrollments collection with duplicate prevention and user update restrictions"
```

---

## Task 3: Build LessonProgress Collection

**Files:**
- Create: `src/collections/LessonProgress/index.ts`
- Create: `src/collections/LessonProgress/hooks/setCompletedAt.ts`
- Modify: `src/payload.config.ts`

- [ ] **Step 1: Create the setCompletedAt hook**

`src/collections/LessonProgress/hooks/setCompletedAt.ts`:
```ts
import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Auto-set completedAt when lesson progress status changes to 'completed'.
 */
export const setCompletedAt: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  operation,
}) => {
  if (operation !== 'update') return data

  const newStatus = data.status as string | undefined
  const oldStatus = originalDoc?.status as string | undefined

  if (newStatus === 'completed' && oldStatus !== 'completed') {
    data.completedAt = new Date().toISOString()
  }

  // Update lastAccessedAt on every access
  data.lastAccessedAt = new Date().toISOString()

  return data
}
```

- [ ] **Step 2: Create the LessonProgress collection**

`src/collections/LessonProgress/index.ts`:
```ts
import type { CollectionConfig } from 'payload'
import { isAdmin } from '../../access/isAdmin'
import { canAccessOwnOrStaff } from '../../access/canAccessOwnOrStaff'
import { authenticated } from '../../access/authenticated'
import { setCompletedAt } from './hooks/setCompletedAt'
import { updateEnrollmentProgress } from '../../hooks/updateEnrollmentProgress'

export const LessonProgress: CollectionConfig = {
  slug: 'lesson-progress',
  admin: {
    useAsTitle: 'lesson',
    defaultColumns: ['user', 'lesson', 'status', 'completedAt', 'lastAccessedAt'],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'lesson',
      type: 'relationship',
      relationTo: 'lessons',
      required: true,
    },
    {
      name: 'enrollment',
      type: 'relationship',
      relationTo: 'enrollments',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'not_started',
      options: [
        { label: 'Not Started', value: 'not_started' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Completed', value: 'completed' },
      ],
    },
    { name: 'completedAt', type: 'date' },
    {
      name: 'videoWatchTime',
      type: 'number',
      defaultValue: 0,
      admin: { description: 'Seconds watched (populated by frontend)' },
    },
    {
      name: 'videoTotalDuration',
      type: 'number',
      defaultValue: 0,
      admin: { description: 'Total video length in seconds' },
    },
    { name: 'lastAccessedAt', type: 'date' },
  ],
  hooks: {
    beforeChange: [setCompletedAt],
    afterChange: [updateEnrollmentProgress],
  },
  access: {
    create: authenticated,
    read: canAccessOwnOrStaff,
    update: canAccessOwnOrStaff,
    delete: isAdmin,
  },
}
```

- [ ] **Step 3: Create a stub for updateEnrollmentProgress** (full implementation in Task 4)

`src/hooks/updateEnrollmentProgress.ts`:
```ts
import type { CollectionAfterChangeHook } from 'payload'

/**
 * Recalculate course completion percentage when lesson progress changes.
 * Stub — full implementation in Task 4.
 */
export const updateEnrollmentProgress: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
}) => {
  // Only recalculate when status actually changed
  if (doc.status === previousDoc?.status) return doc
  // Full implementation in Task 4
  return doc
}
```

- [ ] **Step 4: Register LessonProgress in payload.config.ts**

Add import:
```ts
import { LessonProgress } from './collections/LessonProgress'
```

Add `LessonProgress` to the `collections` array.

- [ ] **Step 5: Commit**

```bash
git add src/collections/LessonProgress/ src/hooks/updateEnrollmentProgress.ts src/payload.config.ts
git commit -m "Add LessonProgress collection with completedAt hook and progress stub"
```

---

## Task 4: Implement Progress Calculation Hook

**Files:**
- Modify: `src/hooks/updateEnrollmentProgress.ts` (replace stub)
- Create: `tests/int/lesson-progress.int.spec.ts`

- [ ] **Step 1: Write progress calculation tests**

`tests/int/lesson-progress.int.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { calculateCompletionPercentage } from '@/hooks/updateEnrollmentProgress'

describe('Progress calculation', () => {
  describe('calculateCompletionPercentage', () => {
    it('returns 0 when no lessons completed', () => {
      expect(calculateCompletionPercentage(0, 10)).toBe(0)
    })

    it('returns 50 when half completed', () => {
      expect(calculateCompletionPercentage(5, 10)).toBe(50)
    })

    it('returns 100 when all completed', () => {
      expect(calculateCompletionPercentage(10, 10)).toBe(100)
    })

    it('returns 0 when total is 0 (no lessons)', () => {
      expect(calculateCompletionPercentage(0, 0)).toBe(0)
    })

    it('rounds to nearest integer', () => {
      expect(calculateCompletionPercentage(1, 3)).toBe(33)
      expect(calculateCompletionPercentage(2, 3)).toBe(67)
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run tests/int/lesson-progress.int.spec.ts
```

Expected: FAIL (module not found or function not exported)

- [ ] **Step 3: Implement the full progress calculation hook**

Replace the stub in `src/hooks/updateEnrollmentProgress.ts`:
```ts
import type { CollectionAfterChangeHook } from 'payload'

/**
 * Calculate completion percentage from completed/total counts.
 * Exported for testing.
 */
export function calculateCompletionPercentage(completed: number, total: number): number {
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}

/**
 * Recalculate course completion percentage when lesson progress changes.
 *
 * Flow:
 * 1. Only runs when status field has changed
 * 2. Fetches the parent enrollment
 * 3. Traverses Course → Modules → Lessons to get total lesson count
 * 4. Counts completed LessonProgress records for this enrollment
 * 5. Updates enrollment's completionPercentage
 * 6. If 100%, auto-completes the enrollment
 *
 * All nested Payload operations pass `req` for transaction safety.
 */
export const updateEnrollmentProgress: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
}) => {
  // Only recalculate when status actually changed
  if (doc.status === previousDoc?.status) return doc

  const enrollmentId = typeof doc.enrollment === 'string' ? doc.enrollment : doc.enrollment?.id
  if (!enrollmentId) return doc

  try {
    // 1. Fetch the enrollment to get the course
    const enrollment = await req.payload.findByID({
      collection: 'enrollments',
      id: enrollmentId,
      req,
      depth: 0,
    })

    const courseId = typeof enrollment.course === 'string' ? enrollment.course : (enrollment.course as any)?.id
    if (!courseId) return doc

    // 2. Fetch the course to get its modules
    const course = await req.payload.findByID({
      collection: 'courses',
      id: courseId,
      req,
      depth: 1, // Populate modules
    })

    // 3. Collect all lesson IDs from all modules
    const moduleIds = Array.isArray(course.modules) ? course.modules : []
    let totalLessons = 0

    for (const mod of moduleIds) {
      const moduleDoc = typeof mod === 'object' ? mod : await req.payload.findByID({
        collection: 'modules',
        id: mod as string,
        req,
        depth: 0,
      })
      const lessons = Array.isArray((moduleDoc as any)?.lessons) ? (moduleDoc as any).lessons : []
      totalLessons += lessons.length
    }

    // 4. Count completed lesson progress records for this enrollment
    const completedProgress = await req.payload.find({
      collection: 'lesson-progress',
      where: {
        and: [
          { enrollment: { equals: enrollmentId } },
          { status: { equals: 'completed' } },
        ],
      },
      limit: 0, // We only need totalDocs
      req,
    })

    const completedLessons = completedProgress.totalDocs

    // 5. Calculate and update
    const percentage = calculateCompletionPercentage(completedLessons, totalLessons)

    const updateData: Record<string, any> = {
      completionPercentage: percentage,
    }

    // 6. Auto-complete if 100%
    if (percentage === 100 && enrollment.status === 'active') {
      updateData.status = 'completed'
      updateData.completedAt = new Date().toISOString()
    }

    await req.payload.update({
      collection: 'enrollments',
      id: enrollmentId,
      data: updateData,
      req,
    })
  } catch (err) {
    console.error('[updateEnrollmentProgress] Error:', (err as Error).message)
  }

  return doc
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run tests/int/lesson-progress.int.spec.ts
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/updateEnrollmentProgress.ts tests/int/lesson-progress.int.spec.ts
git commit -m "Implement progress calculation hook with auto-completion at 100%"
```

---

## Task 5: Add Course Reference Bypass to computeLockedStatus

**Files:**
- Modify: `src/hooks/computeLockedStatus.ts`
- Create: `tests/int/course-reference-bypass.int.spec.ts`

- [ ] **Step 1: Write bypass tests**

`tests/int/course-reference-bypass.int.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { shouldBypassForEnrollment } from '@/hooks/computeLockedStatus'

describe('Course reference bypass', () => {
  it('returns false when article has no relatedCourses', () => {
    expect(shouldBypassForEnrollment([], ['course-1'])).toBe(false)
  })

  it('returns false when relatedCourses is undefined', () => {
    expect(shouldBypassForEnrollment(undefined, ['course-1'])).toBe(false)
  })

  it('returns true when user is enrolled in a related course', () => {
    expect(shouldBypassForEnrollment(['course-1', 'course-2'], ['course-1'])).toBe(true)
  })

  it('returns false when user is not enrolled in any related course', () => {
    expect(shouldBypassForEnrollment(['course-1', 'course-2'], ['course-3'])).toBe(false)
  })

  it('handles mixed string and object IDs', () => {
    const relatedCourses = [{ id: 'course-1' }, 'course-2']
    expect(shouldBypassForEnrollment(relatedCourses, ['course-2'])).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run tests/int/course-reference-bypass.int.spec.ts
```

Expected: FAIL (function not exported)

- [ ] **Step 3: Modify computeLockedStatus to add bypass**

Update `src/hooks/computeLockedStatus.ts`:
```ts
import type { CollectionAfterReadHook } from 'payload'
import { getEffectiveAccessLevels } from '../utilities/accessLevels'

/**
 * Check if an article's relatedCourses overlap with the user's enrolled course IDs.
 * Exported for testing.
 */
export function shouldBypassForEnrollment(
  relatedCourses: any[] | undefined | null,
  enrolledCourseIds: string[],
): boolean {
  if (!relatedCourses || !Array.isArray(relatedCourses) || relatedCourses.length === 0) {
    return false
  }
  return relatedCourses.some((course) => {
    const courseId = typeof course === 'string' ? course : course?.id
    return courseId && enrolledCourseIds.includes(courseId)
  })
}

/**
 * Shared afterRead hook for content collections (Articles, Courses).
 * Computes whether the content is locked for the requesting user.
 *
 * Adds virtual fields to API response:
 * - `locked: boolean` — whether the user lacks access
 * - For locked content: `content` is replaced with a teaser (excerpt only)
 *
 * This is a virtual field pattern — `locked` is not a database column.
 *
 * Course Reference Bypass: Articles linked from courses via `relatedCourses`
 * skip the tier check for users enrolled in those courses.
 */
export const computeLockedStatus: CollectionAfterReadHook = async ({ doc, req }) => {
  const user = req.user

  // Admin bypass — never locked
  if (user?.role && ['admin', 'publisher', 'editor'].includes(user.role as string)) {
    return { ...doc, locked: false }
  }

  const tierLevel = (user as any)?.tier?.accessLevel as string | undefined
  const orgLevel = (user as any)?.tenant?.contentAccessLevel as string | undefined
  const effectiveLevels = getEffectiveAccessLevels(tierLevel ?? null, orgLevel ?? null)

  const contentLevel = doc.accessLevel as string
  const locked = !effectiveLevels.includes(contentLevel as any)

  if (locked && user) {
    // Course Reference Bypass: check if user is enrolled in a related course
    const relatedCourses = doc.relatedCourses as any[] | undefined
    if (relatedCourses && relatedCourses.length > 0) {
      try {
        const enrollments = await req.payload.find({
          collection: 'enrollments',
          where: {
            and: [
              { user: { equals: user.id } },
              { status: { equals: 'active' } },
            ],
          },
          limit: 100,
          depth: 0,
          req,
          overrideAccess: false,
        })

        const enrolledCourseIds = enrollments.docs.map((e: any) =>
          typeof e.course === 'string' ? e.course : e.course?.id,
        ).filter(Boolean) as string[]

        if (shouldBypassForEnrollment(relatedCourses, enrolledCourseIds)) {
          return { ...doc, locked: false }
        }
      } catch {
        // If enrollment check fails, fall through to locked
      }
    }
  }

  if (locked) {
    return {
      ...doc,
      locked: true,
      content: null,
    }
  }

  return { ...doc, locked: false }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run tests/int/course-reference-bypass.int.spec.ts
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/computeLockedStatus.ts tests/int/course-reference-bypass.int.spec.ts
git commit -m "Add course reference bypass: enrolled users access tier-gated articles linked from their courses"
```

---

## Task 6: Build Self-Enrollment Endpoint

**Files:**
- Create: `src/endpoints/enrollments/enroll.ts`
- Modify: `src/payload.config.ts` (register endpoint)

- [ ] **Step 1: Create the enrollment endpoint**

`src/endpoints/enrollments/enroll.ts`:
```ts
import type { Endpoint } from 'payload'
import { getEffectiveAccessLevels } from '../../utilities/accessLevels'

export const enrollEndpoint: Endpoint = {
  path: '/enrollments/enroll',
  method: 'post',
  handler: async (req) => {
    // 1. Authenticate
    if (!req.user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    // 2. Parse request body
    const body = await req.json?.() as { courseId?: string } | undefined

    if (!body?.courseId) {
      return Response.json({ error: 'Missing required field: courseId' }, { status: 400 })
    }

    // 3. Fetch the course (overrideAccess: true to get full doc for access check)
    let course: any
    try {
      course = await req.payload.findByID({
        collection: 'courses',
        id: body.courseId,
        req,
        overrideAccess: true,
        depth: 0,
      })
    } catch {
      return Response.json({ error: 'Course not found' }, { status: 404 })
    }

    // 4. Verify course is published
    if (course.editorialStatus !== 'published') {
      return Response.json({ error: 'Course not found' }, { status: 404 })
    }

    // 5. Verify user has access to this course's tier
    const tierLevel = (req.user as any)?.tier?.accessLevel as string | undefined
    const orgLevel = (req.user as any)?.tenant?.contentAccessLevel as string | undefined
    const effectiveLevels = getEffectiveAccessLevels(tierLevel ?? null, orgLevel ?? null)

    if (!effectiveLevels.includes(course.accessLevel as any)) {
      return Response.json(
        { error: 'Upgrade your plan to access this course' },
        { status: 403 },
      )
    }

    // 6. Check for existing enrollment
    const existing = await req.payload.find({
      collection: 'enrollments',
      where: {
        and: [
          { user: { equals: req.user.id } },
          { course: { equals: body.courseId } },
        ],
      },
      limit: 1,
      req,
    })

    if (existing.totalDocs > 0) {
      return Response.json(
        { error: 'Already enrolled in this course', enrollment: existing.docs[0] },
        { status: 409 },
      )
    }

    // 7. Create enrollment
    try {
      const enrollment = await req.payload.create({
        collection: 'enrollments',
        data: {
          user: req.user.id,
          course: body.courseId,
          enrolledAt: new Date().toISOString(),
          status: 'active',
          paymentStatus: 'free',
          completionPercentage: 0,
        },
        req,
      })

      return Response.json({ enrollment }, { status: 201 })
    } catch (err) {
      return Response.json(
        { error: 'Failed to create enrollment' },
        { status: 500 },
      )
    }
  },
}
```

- [ ] **Step 2: Register the endpoint in payload.config.ts**

Add import:
```ts
import { enrollEndpoint } from './endpoints/enrollments/enroll'
```

Add `enrollEndpoint` to the `endpoints` array.

- [ ] **Step 3: Commit**

```bash
git add src/endpoints/enrollments/enroll.ts src/payload.config.ts
git commit -m "Add self-enrollment endpoint with tier check and duplicate prevention"
```

---

## Task 7: Full Test Suite, Migration, and Build Verification

**Files:** No new files — verification only.

- [ ] **Step 1: Run all unit tests**

```bash
pnpm vitest run
```

Expected: All unit tests pass (editorial-workflow, access-control, ai-*, enrollments, lesson-progress, course-reference-bypass).

- [ ] **Step 2: Generate types and import map**

```bash
pnpm generate:types
pnpm generate:importmap
```

- [ ] **Step 3: Create database migration**

```bash
docker compose up -d
# Wait for DB to be ready
pnpm payload migrate
pnpm payload migrate:create
```

- [ ] **Step 4: Run production build**

```bash
pnpm build
```

Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit generated files**

```bash
git add src/migrations/ src/payload-types.ts src/app/\(payload\)/admin/importMap.js
git commit -m "Add Phase 4 migration, regenerate types and import map"
```

- [ ] **Step 6: Stop containers**

```bash
docker compose down
```

---

## Phase 4 Milestone Checklist

After completing all 7 tasks, verify:

- [ ] `canAccessOwnOrStaff` access function works for user-owned records
- [ ] Enrollments collection with duplicate prevention (one per user per course)
- [ ] Enrollments restrict user updates to cancellation only
- [ ] LessonProgress collection with auto-set `completedAt`
- [ ] Progress calculation hook recalculates `completionPercentage` on status change
- [ ] Auto-completion: enrollment status → `completed` when all lessons done
- [ ] Course reference bypass: enrolled users access tier-gated linked articles
- [ ] Self-enrollment endpoint enforces tier check and duplicate prevention
- [ ] All nested Payload operations pass `req` (transaction safety)
- [ ] All `findByID` calls use appropriate `overrideAccess` setting
- [ ] All unit tests passing
- [ ] Database migration created
- [ ] Production build succeeds

**Deferred to Phase 5:**
- Stripe billing integration (wire up `paymentStatus`)
- Subscription management and tier upgrades
- Payment webhooks

**Deferred to Phase 6:**
- Frontend: course player, lesson viewer, progress dashboard
- Enrollment UI, completion ceremony

**Next:** Phase 5 plan (Billing — Stripe integration, subscriptions, payment processing)
