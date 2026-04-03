# Cubes+ Domain Model Redesign: v2 from First Principles

**Author:** Domain Model Architect  
**Date:** 2026-03-31  
**Status:** Draft — Pending Owner Review  
**Target stack:** Next.js + Prisma + PostgreSQL

---

## 1. Design Principles

These are the non-negotiable rules governing every modeling decision in v2.

### P1: Atoms do not contain atoms
A Cube is the atomic unit of the system. It represents a single training activity segment. Cubes cannot nest other cubes. This reverses the v1 self-referencing `cube_nesting` table, which created conceptual confusion ("if a cube contains cubes, what is a cube?") and implementation complexity (recursive fetching, cycle detection, ambiguous duration calculation). If a coach needs to group multiple exercises into a reusable block, that is a Routine — not a nested cube.

### P2: Every FK must be enforceable
No polymorphic `entity_type + entity_id` string columns. Every foreign key relationship must be a real database FK with referential integrity. The v1 `likes`, `assignments`, and `notifications` tables all used the polymorphic antipattern. This made it impossible for the database to prevent orphaned references and required application-level validation for every query. The small cost of additional tables is worth the guaranteed integrity.

### P3: Composition is ordered, allows duplicates, and is position-explicit
When a cube appears in a routine, or a routine appears in a program, the junction row carries a `position` integer and a surrogate primary key. The same cube can appear at position 1 and position 8 of the same routine (e.g., a warm-up cube reused as active recovery between sets). The v1 `routine_cubes` table used a composite PK of `(routine_id, cube_id, position)` which is correct in principle but the surrogate key approach is cleaner for Prisma.

### P4: Published content is immutable; edits create new versions
When a cube is published and used in 50 routines, editing it must not silently alter those 50 routines. Published cubes are frozen. To edit, the system creates a new draft version linked to the original. Routines referencing the old version continue to work. The coach can then update individual routines to point to the new version — or not. This is the only safe approach for a B2B platform where multiple tenants reference shared content.

### P5: Tenancy is row-level, not schema-level
Multi-tenancy for B2B (gyms, sports centers) uses a `tenantId` column on all content entities, not separate PostgreSQL schemas. A `NULL` tenantId means global/platform content. Row-level security via Prisma middleware or PostgreSQL RLS enforces isolation. This keeps the schema simple, allows cross-tenant sharing via explicit grants, and avoids the operational complexity of managing hundreds of schemas.

### P6: The user model is external
Cubes+ does not own user authentication. Users authenticate via the LIMITLESS SSO (Payload cookie). Cubes+ maintains a local `Coach` profile table that is synced on first login and enriched with Cubes-specific fields (role, expertise, permissions). The `Coach` table references the external user by their SSO email as the identity anchor.

### P7: Name things for what they are, not what they were called in v1
"Super-Routine" is a bad name. It sounds like a marketing term, not a domain concept. In the fitness and coaching world, the standard hierarchy is Exercise/Activity -> Session/Workout -> Program/Plan. The v2 model will use domain-appropriate names.

---

## 2. Entity Hierarchy

### The question: how many tiers?

**v1 had 3 tiers:** Cube -> Routine -> Super-Routine, plus cube nesting (effectively 3.5 tiers).

**Options considered:**

| Option | Tiers | Mapping |
|--------|-------|---------|
| A | 2 | Exercise -> Program |
| B | 3 | Exercise -> Session -> Program |
| C | 4 | Exercise -> Block -> Session -> Program |

### Decision: 3 tiers — Exercise -> Session -> Program

**Why not 2 tiers?** A 2-tier model forces coaches to put everything into a flat "program." Real-world training has a natural session boundary — a single workout on a single day. Coaches think in sessions ("Monday's session is warm-up, circuit, cooldown"). Removing this intermediate level forces programs to use some other mechanism (tags, day markers) to delineate sessions, which is worse than having an explicit entity.

**Why not 4 tiers?** A "Block" tier (grouping exercises within a session, e.g., "the superset block" or "the warm-up block") is the role that **phases** play. Warm-up, Main, Cooldown are structural sections within a session. Making them a separate entity tier would over-complicate the builder UI and the data model for a distinction that is better handled as a phase attribute on the exercise-session junction. The v1 categories (Warm-up, Main Part, Cool-down) were on the right track — they just need to be on the junction row, not on the cube itself (more on this below).

### The v2 hierarchy

```
Exercise (atomic building block — formerly "Cube")
  └─► Session (a single training session — formerly "Routine")
       └─► Program (a multi-session training plan — formerly "Super-Routine")
```

### Why rename?

| v1 Name | v2 Name | Reason |
|---------|---------|--------|
| Cube | Exercise | "Cube" is a brand/UI concept (the visual block on the canvas). The domain entity is an exercise. The UI can still render them as "cubes" — the visual metaphor is preserved in the frontend, not the database. |
| Routine | Session | "Routine" is ambiguous — it could mean a daily routine, a weekly routine, a complete program. "Session" is unambiguous: one workout, one day. |
| Super-Routine | Program | "Program" is the universal term for a multi-session training plan in the fitness industry. Periodized programs, 12-week programs, etc. |

The UI branding layer can still call them "Cubes" in the interface. The data model calls them what they are.

---

## 3. Complete Entity Definitions

### 3.1 Taxonomy Entities

#### Domain
The top-level classification for exercises, sessions, and programs. Examples: Movement, Dance, Cardio, Strength, Mental Wellness, Flexibility.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | |
| name | String(100) | unique | |
| description | Text | nullable | Replaces `creator_notes` — clearer name |
| status | Enum(draft, active, archived) | not null, default draft | Expanded from active/inactive |
| tenantId | UUID | nullable FK -> Tenant | NULL = platform-global |
| createdBy | UUID | FK -> Coach | |
| createdAt | DateTime | not null | |
| updatedAt | DateTime | not null | |
| deletedAt | DateTime | nullable | Soft delete |

#### Phase
Replaces v1 "Category." Renamed because these are structural phases of a training session, not taxonomic categories. The system ships with three default phases: Warm-up, Main, Cooldown. Coaches can add custom phases (e.g., "Active Recovery," "Skills Drill," "Mobility").

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | |
| name | String(100) | unique per tenant | |
| sortOrder | Int | not null | For display ordering |
| isDefault | Boolean | not null, default false | System-provided phases |
| tenantId | UUID | nullable FK -> Tenant | |
| createdBy | UUID | nullable FK -> Coach | NULL for system defaults |
| createdAt | DateTime | not null | |
| updatedAt | DateTime | not null | |

Phases are NOT soft-deleted. If a phase needs to be removed, it is archived (the exercises referencing it retain the association).

#### DifficultyLevel
Unchanged from v1 in purpose — an ordered label set managed by admins. Applied to all three content tiers.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | |
| label | String(100) | unique per tenant | e.g., "Beginner", "Intermediate", "Advanced", "Elite" |
| sortOrder | Int | not null | |
| tenantId | UUID | nullable FK -> Tenant | |
| createdBy | UUID | FK -> Coach | |
| createdAt | DateTime | not null | |
| updatedAt | DateTime | not null | |

**v1 had two difficulty systems:** numeric (1-10 integer) on cubes, alphanumeric (lookup table) on routines/super-routines. **v2 unifies on one system:** the DifficultyLevel lookup table, used on all three tiers. A numeric scale is just a DifficultyLevel set with labels "1" through "10" if that is what the coach wants.

### 3.2 Content Entities

#### Exercise (formerly Cube)

The atomic building block. One exercise = one training activity segment with a defined duration, instructions, and media.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | |
| name | String(255) | not null | |
| description | Text | nullable | Replaces `exercise_list` + `instructions` — single rich text field |
| durationSeconds | Int | not null | **Changed from minutes to seconds** — allows "30 second sprint" or "90 second plank" precision |
| difficultyLevelId | UUID | nullable FK -> DifficultyLevel | Unified system |
| creatorNotes | Text | nullable | Internal notes, not shown to clients |
| status | Enum(draft, published, archived) | not null, default draft | Replaces active/inactive |
| version | Int | not null, default 1 | Auto-incremented on publish |
| parentExerciseId | UUID | nullable FK -> Exercise | Points to the original if this is a new version |
| allDomains | Boolean | not null, default false | |
| tenantId | UUID | nullable FK -> Tenant | |
| createdBy | UUID | FK -> Coach | |
| createdAt | DateTime | not null | |
| updatedAt | DateTime | not null | |
| publishedAt | DateTime | nullable | Set when status transitions to published |
| deletedAt | DateTime | nullable | |

**What changed from v1:**
- `duration_minutes` -> `durationSeconds` — minute granularity was too coarse for exercises like "20-second plank" or "45-second sprint interval"
- `exercise_list` + `instructions` merged into `description` — the distinction was artificial; both were free text
- `difficulty_level` (integer) -> `difficultyLevelId` (FK) — unified system
- `category_id` removed — phase is now on the junction row (see SessionExercise), not on the exercise itself. The same exercise can be a warm-up in one session and active recovery in another.
- `version` + `parentExerciseId` added — versioning support
- `status` expanded to draft/published/archived
- Cube nesting (self-referencing) **removed entirely** per P1

#### ExerciseDomain (junction)

| Field | Type | Constraints |
|-------|------|-------------|
| exerciseId | UUID | PK, FK -> Exercise |
| domainId | UUID | PK, FK -> Domain |

#### ExerciseMedia

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | |
| exerciseId | UUID | FK -> Exercise, not null | |
| mediaType | Enum(image, video, youtube) | not null | **Merged** image/video (Cloudinary) and YouTube into one table with a type discriminator |
| url | Text | not null | Cloudinary URL or YouTube URL |
| publicId | String(255) | nullable | Cloudinary public_id — NULL for YouTube |
| title | String(255) | nullable | Optional label |
| position | Int | not null | Display order |

**v1 had two tables** (`cube_media` + `cube_youtube_links`). v2 merges them — the distinction between a Cloudinary video and a YouTube video is a `mediaType` enum value, not a separate table.

#### Session (formerly Routine)

A single training session — the result of dragging exercises onto the builder canvas.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | |
| name | String(255) | not null | |
| description | Text | nullable | Replaces `instructions` |
| durationSeconds | Int | not null, default 0 | Calculated: sum of exercise durations + rest periods |
| difficultyLevelId | UUID | nullable FK -> DifficultyLevel | |
| creatorNotes | Text | nullable | |
| status | Enum(draft, published, archived) | not null, default draft | |
| version | Int | not null, default 1 | |
| parentSessionId | UUID | nullable FK -> Session | |
| allDomains | Boolean | not null, default false | |
| tenantId | UUID | nullable FK -> Tenant | |
| createdBy | UUID | FK -> Coach | |
| createdAt | DateTime | not null | |
| updatedAt | DateTime | not null | |
| publishedAt | DateTime | nullable | |
| deletedAt | DateTime | nullable | |

#### SessionExercise (junction — ordered, allows duplicates)

This is the core composition table. Each row is one exercise slot within a session.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | **Surrogate key** — allows duplicate exercise at different positions |
| sessionId | UUID | FK -> Session, not null | |
| exerciseId | UUID | FK -> Exercise, not null | |
| position | Int | not null | Order within the session |
| phaseId | UUID | nullable FK -> Phase | **Phase lives HERE, not on the exercise.** The same exercise can be warm-up in one session and main in another. |
| restAfterSeconds | Int | nullable | Rest period AFTER this exercise, before the next one |
| overrideDurationSeconds | Int | nullable | Coach can override the exercise's default duration for this specific slot |
| sets | Int | nullable | Number of sets (if applicable) |
| reps | String(50) | nullable | Rep scheme — string to support "8-12" or "AMRAP" |
| notes | Text | nullable | Slot-specific coaching cues |

**Key design decisions:**
- **Phase on the junction, not the exercise.** v1 put category on the cube, which meant a cube was permanently "a warm-up cube." In reality, a dynamic stretch exercise might be warm-up in a flexibility session but active recovery in a strength session. The phase is contextual to the session.
- **Rest periods are explicit.** v1 had no rest model — duration was just a sum of exercise durations, which was always wrong (no real session is back-to-back exercises with zero rest). The `restAfterSeconds` field on the junction row models the rest period between exercises.
- **Override duration.** A coach might use a "plank" exercise (default 60s) but want it held for 90s in a specific session. The override lets them customize without creating a new exercise.
- **Sets and reps.** v1 had no per-slot training parameters. A coach couldn't say "this exercise, 3 sets of 12 reps." These lived in the `exercise_list` free text. v2 makes them first-class fields on the junction.
- **Surrogate PK.** v1 used `(routine_id, cube_id, position)` as a composite PK. This works but is awkward in Prisma and when referencing specific slots from other tables (e.g., client progress tracking).

#### SessionDomain (junction)

| Field | Type | Constraints |
|-------|------|-------------|
| sessionId | UUID | PK, FK -> Session |
| domainId | UUID | PK, FK -> Domain |

#### Program (formerly Super-Routine)

A multi-session training plan. A 4-week strength program, a 12-week periodization plan, a 5-day bootcamp.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | |
| name | String(255) | not null | |
| description | Text | nullable | |
| durationSeconds | Int | not null, default 0 | Calculated from session durations |
| difficultyLevelId | UUID | nullable FK -> DifficultyLevel | |
| creatorNotes | Text | nullable | |
| status | Enum(draft, published, archived) | not null, default draft | |
| version | Int | not null, default 1 | |
| parentProgramId | UUID | nullable FK -> Program | |
| allDomains | Boolean | not null, default false | |
| tenantId | UUID | nullable FK -> Tenant | |
| createdBy | UUID | FK -> Coach | |
| createdAt | DateTime | not null | |
| updatedAt | DateTime | not null | |
| publishedAt | DateTime | nullable | |
| deletedAt | DateTime | nullable | |

#### ProgramSession (junction — ordered, allows duplicates)

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Surrogate key |
| programId | UUID | FK -> Program, not null | |
| sessionId | UUID | FK -> Session, not null | |
| position | Int | not null | Order within the program |
| dayLabel | String(100) | nullable | "Day 1", "Monday", "Week 2 Day 3" — free text label |
| notes | Text | nullable | Program-level notes for this session occurrence |

**`dayLabel`** is a simple text field, not a date. Programs are templates, not calendar-bound schedules. When a program is assigned to a client, the assignment system maps day labels to actual dates.

#### ProgramDomain (junction)

| Field | Type | Constraints |
|-------|------|-------------|
| programId | UUID | PK, FK -> Program |
| domainId | UUID | PK, FK -> Domain |

### 3.3 Identity and Multi-Tenancy

#### Tenant

Represents a gym, sports center, or coaching organization.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | |
| name | String(255) | not null | |
| slug | String(100) | unique, not null | URL-safe identifier |
| logoUrl | String(500) | nullable | |
| plan | Enum(free, pro, enterprise) | not null, default free | Subscription tier |
| status | Enum(active, suspended, cancelled) | not null, default active | |
| createdAt | DateTime | not null | |
| updatedAt | DateTime | not null | |

#### Coach (the local user profile)

Cubes+ does not own authentication. It maintains a local profile for each SSO user who accesses the platform.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | |
| externalUserId | String(255) | unique, not null | The `sub` claim from the LIMITLESS SSO JWT — the identity anchor |
| email | String(255) | unique, not null | Synced from SSO |
| fullName | String(255) | not null | Synced from SSO |
| avatarUrl | String(500) | nullable | |
| shortDescription | Text | nullable | |
| phone | String(50) | nullable | Made nullable — not every SSO user has phone on file |
| address | Text | nullable | |
| domainsOfExpertise | String[] | not null, default [] | Array of domain name strings |
| role | Enum(admin, head_coach, senior_coach, junior_coach) | not null, default junior_coach | |
| canCreateExercises | Boolean | not null, default false | Replaces `can_create_cubes` |
| tenantId | UUID | nullable FK -> Tenant | The coach's primary tenant. NULL = platform-level (LIMITLESS internal) |
| lastLoginAt | DateTime | nullable | |
| createdAt | DateTime | not null | |
| updatedAt | DateTime | not null | |
| deletedAt | DateTime | nullable | |

**Removed from v1:**
- `password_hash`, `google_id`, `auth_provider` — authentication is external
- `age`, `sex` — not relevant for coach profiles; if needed for clients, that lives in Digital Twin
- `organisation` — replaced by the Tenant relationship

#### CoachTenant (junction — for coaches who belong to multiple tenants)

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| coachId | UUID | PK, FK -> Coach | |
| tenantId | UUID | PK, FK -> Tenant | |
| role | Enum(admin, head_coach, senior_coach, junior_coach) | not null | Role is per-tenant, not global |
| canCreateExercises | Boolean | not null, default false | Per-tenant permission |
| joinedAt | DateTime | not null | |

**Design note:** The `Coach.role` and `Coach.canCreateExercises` fields represent the coach's role in their primary tenant (or platform-level role for LIMITLESS internal coaches). `CoachTenant` allows a coach to have different roles in different organizations. For v1 migration this is a future extension — all existing coaches will have one tenant (or NULL for LIMITLESS).

### 3.4 Social Entities (Likes — de-polymorphed)

Three separate tables. One per content entity. Real FKs. No ambiguity.

#### ExerciseLike

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| exerciseId | UUID | FK -> Exercise, not null |
| coachId | UUID | FK -> Coach, not null |
| createdAt | DateTime | not null |

Unique constraint: `(exerciseId, coachId)`

#### SessionLike

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| sessionId | UUID | FK -> Session, not null |
| coachId | UUID | FK -> Coach, not null |
| createdAt | DateTime | not null |

Unique constraint: `(sessionId, coachId)`

#### ProgramLike

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| programId | UUID | FK -> Program, not null |
| coachId | UUID | FK -> Coach, not null |
| createdAt | DateTime | not null |

Unique constraint: `(programId, coachId)`

**Why three tables instead of one with nullable FKs?** Three tables is the cleanest solution because:
- Each table has a non-nullable FK — the database enforces that every like points to a real entity
- Querying "all likes for exercise X" is a simple indexed query on one table, not a filtered scan
- Adding a new likeable entity type means adding one table, not altering an existing one
- The alternative (one table with `exerciseId?`, `sessionId?`, `programId?`) requires a CHECK constraint to enforce exactly one is non-null — this works but is uglier than three clean tables

### 3.5 Workflow Entities

#### Assignment (de-polymorphed)

v1 had one assignment table with `entity_type + entity_id`. v2 has two: one for sessions, one for programs. Exercises are not assignable — you assign a session or a program, not a single exercise.

#### SessionAssignment

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | |
| sessionId | UUID | FK -> Session, not null | |
| assignedBy | UUID | FK -> Coach, not null | |
| assignedTo | UUID | FK -> Coach, not null | |
| status | Enum(pending, accepted, declined, in_progress, completed) | not null, default pending | Added `in_progress` |
| dueDate | DateTime | nullable | |
| notes | Text | nullable | Assigner's notes |
| responseNotes | Text | nullable | Assignee's acceptance/decline notes |
| completionNotes | Text | nullable | Assignee's completion notes |
| respondedAt | DateTime | nullable | When accepted/declined |
| completedAt | DateTime | nullable | |
| createdAt | DateTime | not null | |
| updatedAt | DateTime | not null | |

#### ProgramAssignment

Identical structure to SessionAssignment, with `programId` FK -> Program instead of `sessionId`.

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| programId | UUID | FK -> Program, not null |
| assignedBy | UUID | FK -> Coach, not null |
| assignedTo | UUID | FK -> Coach, not null |
| status | Enum(pending, accepted, declined, in_progress, completed) | not null, default pending |
| dueDate | DateTime | nullable |
| notes | Text | nullable |
| responseNotes | Text | nullable |
| completionNotes | Text | nullable |
| respondedAt | DateTime | nullable |
| completedAt | DateTime | nullable |
| createdAt | DateTime | not null |
| updatedAt | DateTime | not null |

### 3.6 Notification Entity

Notifications are inherently polymorphic — they can reference any entity type and carry any message. However, we can improve on v1's untyped approach.

#### Notification

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | |
| coachId | UUID | FK -> Coach, not null | Recipient |
| type | Enum(exercise_updated, session_updated, program_updated, assignment_created, assignment_status_changed, like_received, system) | not null | Typed enum instead of free text message |
| message | Text | not null | Human-readable message |
| exerciseId | UUID | nullable FK -> Exercise | |
| sessionId | UUID | nullable FK -> Session | |
| programId | UUID | nullable FK -> Program | |
| sessionAssignmentId | UUID | nullable FK -> SessionAssignment | |
| programAssignmentId | UUID | nullable FK -> ProgramAssignment | |
| actorId | UUID | nullable FK -> Coach | The coach who triggered this notification |
| isRead | Boolean | not null, default false | |
| readAt | DateTime | nullable | |
| createdAt | DateTime | not null | |

**Why nullable FKs here but not for likes?** Notifications are fundamentally different from likes. A like is always 1:1 with an entity. A notification can reference multiple entities (e.g., "Coach X updated Exercise Y which is used in your Session Z") or no entity (system announcements). The nullable-FKs-with-typed-enum approach gives us referential integrity on the FKs that ARE populated, while allowing the notification to reference whichever entity is relevant.

### 3.7 Messaging Entities

Messaging is carried over from v1 with minimal changes. This is a secondary feature.

#### Conversation

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| isGroup | Boolean | not null, default false |
| title | String(255) | nullable |
| tenantId | UUID | nullable FK -> Tenant |
| createdAt | DateTime | not null |
| updatedAt | DateTime | not null |

#### ConversationParticipant

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| conversationId | UUID | FK -> Conversation, not null |
| coachId | UUID | FK -> Coach, not null |
| lastReadAt | DateTime | nullable |
| joinedAt | DateTime | not null |

Unique constraint: `(conversationId, coachId)`

#### Message

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUID | PK |
| conversationId | UUID | FK -> Conversation, not null |
| senderId | UUID | FK -> Coach, not null |
| content | Text | not null |
| createdAt | DateTime | not null |
| updatedAt | DateTime | not null |
| deletedAt | DateTime | nullable |

---

## 4. Composition Rules

### What can contain what?

| Container | Contains | Cardinality | Duplicates? | Ordered? |
|-----------|----------|-------------|-------------|----------|
| Session | Exercises | 1:N via SessionExercise | Yes — same exercise can appear multiple times | Yes — explicit `position` |
| Program | Sessions | 1:N via ProgramSession | Yes — same session can appear on multiple days | Yes — explicit `position` |

### What CANNOT contain what?

| Rule | Enforcement |
|------|-------------|
| Exercises cannot contain exercises | No self-referencing table exists. Structurally impossible. |
| Programs cannot contain programs | No self-referencing table exists. Structurally impossible. |
| Sessions cannot contain sessions | No table exists for this. |
| Exercises cannot directly be in programs | No ExerciseProgram junction exists. Exercises compose into sessions; sessions compose into programs. |

### Composition constraints

| Constraint | v1 Behavior | v2 Behavior |
|------------|-------------|-------------|
| Can the same exercise appear multiple times in a session? | Yes (position in composite PK) | Yes (surrogate PK on junction row) |
| Can the same session appear multiple times in a program? | Yes | Yes (different `dayLabel` values) |
| Can a session appear in multiple programs? | Implicitly yes (FK from junction) | Yes — explicitly supported and encouraged. Sessions are reusable templates. |
| Can an exercise appear in multiple sessions? | Yes | Yes |
| Can a published session reference a draft exercise? | No rule in v1 | **No.** Publishing a session validates that all referenced exercises are published. |
| Can a published program reference a draft session? | No rule in v1 | **No.** Same validation. |
| Minimum exercises per session? | No constraint | **1.** A session with zero exercises is a draft placeholder. Publishing requires at least 1. |
| Maximum exercises per session? | No limit | **No hard limit.** UI may paginate at 50+ for performance. |
| Minimum sessions per program? | No constraint | **2.** A program with 1 session is just a session. Publishing requires at least 2. |

### Deletion rules

| Rule | Behavior |
|------|----------|
| Delete a draft exercise | Hard delete (after soft-delete 7-day retention). No cascade issues — draft exercises should not be in published sessions. |
| Delete a published exercise | **Blocked** if referenced by any session (draft or published). Coach must remove it from all sessions first, or archive it. |
| Archive a published exercise | Allowed. Existing session references remain valid. The exercise is hidden from the repository browser but still renders in sessions. |
| Delete a session | Same rules — blocked if referenced by programs. |
| Delete a program | Allowed — programs are top-level. Soft delete with 7-day retention. |

### Duration calculation

```
session.durationSeconds = SUM(
  for each SessionExercise in session:
    (exercise.overrideDurationSeconds ?? exercise.durationSeconds) * (exercise.sets ?? 1)
    + (exercise.restAfterSeconds ?? 0)
)

program.durationSeconds = SUM(session.durationSeconds for each ProgramSession)
```

Duration is **calculated on write** (stored denormalized) and **recalculated** whenever a session's exercise list changes or when a program's session list changes. This avoids expensive recursive queries on read.

---

## 5. Multi-Tenancy Model

### Tenant scoping

Every content entity (Exercise, Session, Program, Domain, Phase, DifficultyLevel) has a nullable `tenantId`:

| `tenantId` value | Meaning |
|------------------|---------|
| NULL | Platform-global content. Visible to all tenants. Created by LIMITLESS internal coaches. |
| UUID of tenant | Tenant-private content. Visible only to coaches in that tenant. |

### Content visibility rules

A coach at Gym A sees:
1. All platform-global content (`tenantId IS NULL`)
2. All content from their own tenant (`tenantId = Gym A's ID`)
3. Content explicitly shared with them (see sharing model below)

A coach at Gym A does NOT see:
1. Content from Gym B (unless explicitly shared)

### Cross-tenant sharing

For the B2B use case where Coach at Gym A wants to share a program with Coach at Gym B:

#### ContentShare

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | |
| exerciseId | UUID | nullable FK -> Exercise | Exactly one of these three is non-null |
| sessionId | UUID | nullable FK -> Session | |
| programId | UUID | nullable FK -> Program | |
| sharedBy | UUID | FK -> Coach, not null | |
| sharedWithTenantId | UUID | nullable FK -> Tenant | Share with an entire tenant |
| sharedWithCoachId | UUID | nullable FK -> Coach | Share with a specific coach |
| permission | Enum(view, duplicate) | not null, default view | Can the recipient only view, or also duplicate? |
| createdAt | DateTime | not null | |
| expiresAt | DateTime | nullable | Optional expiry for time-limited shares |

**This is a v2+ feature.** For the initial launch, cross-tenant sharing does not exist. The table is defined in the schema for forward compatibility but the application code does not need to implement it in Phase 1.

### Tenant administration

| Action | Who can do it |
|--------|--------------|
| Create a tenant | Platform admin (LIMITLESS) |
| Invite coaches to a tenant | Tenant admin |
| Set coach role within tenant | Tenant admin |
| Create platform-global content | Platform admin / LIMITLESS coaches |
| Create tenant-scoped content | Any coach in the tenant (per role permissions) |

---

## 6. B2C Extension Points

When Cubes+ extends to client-facing routine delivery, these entities are added:

#### Client

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | |
| externalUserId | String(255) | unique, not null | SSO identity |
| email | String(255) | unique, not null | |
| fullName | String(255) | not null | |
| avatarUrl | String(500) | nullable | |
| tenantId | UUID | nullable FK -> Tenant | Which gym/organization they belong to |
| digitalTwinId | String(255) | nullable | Reference to Digital Twin API for health context |
| createdAt | DateTime | not null | |
| updatedAt | DateTime | not null | |

#### ClientProgramAssignment

A coach assigns a program to a client with a start date.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | |
| clientId | UUID | FK -> Client, not null | |
| programId | UUID | FK -> Program, not null | |
| assignedBy | UUID | FK -> Coach, not null | |
| startDate | Date | not null | Calendar anchor for day labels |
| status | Enum(assigned, active, paused, completed, abandoned) | not null, default assigned | |
| notes | Text | nullable | |
| createdAt | DateTime | not null | |
| updatedAt | DateTime | not null | |

#### ClientSessionProgress

Tracks a client's progress through individual sessions in an assigned program.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | |
| clientProgramAssignmentId | UUID | FK -> ClientProgramAssignment, not null | |
| programSessionId | UUID | FK -> ProgramSession, not null | Which session in the program |
| scheduledDate | Date | nullable | Derived from startDate + dayLabel |
| completedAt | DateTime | nullable | |
| status | Enum(upcoming, in_progress, completed, skipped) | not null, default upcoming | |
| rating | Int | nullable | 1-5 post-session rating |
| feedback | Text | nullable | Client's free-text feedback |
| createdAt | DateTime | not null | |
| updatedAt | DateTime | not null | |

#### ClientExerciseLog

Per-exercise completion within a session.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | |
| clientSessionProgressId | UUID | FK -> ClientSessionProgress, not null | |
| sessionExerciseId | UUID | FK -> SessionExercise, not null | Which specific exercise slot |
| completed | Boolean | not null, default false | |
| actualSets | Int | nullable | What the client actually did |
| actualReps | String(50) | nullable | |
| actualDurationSeconds | Int | nullable | |
| weight | Decimal | nullable | If applicable |
| notes | Text | nullable | |
| completedAt | DateTime | nullable | |

**These B2C tables are NOT part of the v2 initial launch.** They are designed now so the core schema does not need structural changes when B2C is added. The key design decision: client progress references `SessionExercise` (the junction row) and `ProgramSession` (the junction row), not the Exercise or Session directly. This means progress is tied to a specific slot in a specific program — if the coach rearranges the program, existing progress records remain valid.

### Digital Twin integration point

When a coach views a client's profile or designs a program for them, the application fetches health context from the Digital Twin API:

```
GET /api/twin/{clientDigitalTwinId}/context
```

This returns biomarkers, wearable data, and health flags that inform training decisions. This is a runtime API call, not a data model concern — Cubes+ never stores health data locally.

---

## 7. Status Workflow

### The state machine

```
draft ──publish──► published ──archive──► archived
  ▲                    │                      │
  │                    │ new-version           │ restore
  │                    ▼                      │
  │               draft (v2)                  │
  │                                           │
  └───────────── restore ◄────────────────────┘
```

| Transition | Who | What happens |
|------------|-----|-------------|
| draft -> published | Creator or admin | Validation runs (all referenced children must be published). `publishedAt` set. `version` incremented if this is a re-publish. |
| published -> archived | Creator or admin | Entity hidden from repository browsers. Still referenced by parents. No deletion of junction rows. |
| archived -> draft | Creator or admin | Entity becomes editable again. If it was referenced by published parents, a **new version** is created as draft — the original stays archived. |
| published -> draft (new version) | Creator | Creates a NEW row with `parentExerciseId/parentSessionId/parentProgramId` pointing to the original. The original remains published and unchanged. |

### The immutability rule (P4)

When a published exercise is "edited," the system:
1. Creates a new Exercise row with `status: draft`, `version: original.version + 1`, `parentExerciseId: original.id`
2. The original remains `status: published`, untouched
3. The coach edits the new draft
4. When the new draft is published, the system shows the coach a list of sessions referencing the old version and offers to update them (one by one or bulk)
5. Sessions that are not updated continue to reference the old version — they work fine

This is how the problem of "editing a cube used in 50 routines" is solved: you don't edit it. You create a new version. Routines opt-in to the new version.

---

## 8. Prisma Schema Sketch

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ──────────────────────────────────────────────────

enum ContentStatus {
  draft
  published
  archived
}

enum CoachRole {
  admin
  head_coach
  senior_coach
  junior_coach
}

enum TenantPlan {
  free
  pro
  enterprise
}

enum TenantStatus {
  active
  suspended
  cancelled
}

enum AssignmentStatus {
  pending
  accepted
  declined
  in_progress
  completed
}

enum NotificationType {
  exercise_updated
  session_updated
  program_updated
  assignment_created
  assignment_status_changed
  like_received
  system
}

enum SharePermission {
  view
  duplicate
}

enum MediaType {
  image
  video
  youtube
}

// ─── Tenant ─────────────────────────────────────────────────

model Tenant {
  id        String       @id @default(uuid())
  name      String       @db.VarChar(255)
  slug      String       @unique @db.VarChar(100)
  logoUrl   String?      @map("logo_url") @db.VarChar(500)
  plan      TenantPlan   @default(free)
  status    TenantStatus @default(active)
  createdAt DateTime     @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime     @updatedAt @map("updated_at") @db.Timestamptz

  coaches           Coach[]
  coachTenants      CoachTenant[]
  domains           Domain[]
  phases            Phase[]
  difficultyLevels  DifficultyLevel[]
  exercises         Exercise[]
  sessions          Session[]
  programs          Program[]
  conversations     Conversation[]
  contentShares     ContentShare[]

  @@map("tenants")
}

// ─── Coach (local user profile) ─────────────────────────────

model Coach {
  id                  String    @id @default(uuid())
  externalUserId      String    @unique @map("external_user_id") @db.VarChar(255)
  email               String    @unique @db.VarChar(255)
  fullName            String    @map("full_name") @db.VarChar(255)
  avatarUrl           String?   @map("avatar_url") @db.VarChar(500)
  shortDescription    String?   @map("short_description")
  phone               String?   @db.VarChar(50)
  address             String?
  domainsOfExpertise  String[]  @default([]) @map("domains_of_expertise")
  role                CoachRole @default(junior_coach)
  canCreateExercises  Boolean   @default(false) @map("can_create_exercises")
  tenantId            String?   @map("tenant_id")
  lastLoginAt         DateTime? @map("last_login_at") @db.Timestamptz
  createdAt           DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt           DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  deletedAt           DateTime? @map("deleted_at") @db.Timestamptz

  tenant              Tenant?   @relation(fields: [tenantId], references: [id])
  coachTenants        CoachTenant[]

  createdExercises    Exercise[]
  createdSessions     Session[]
  createdPrograms     Program[]
  createdDomains      Domain[]
  createdPhases       Phase[]
  createdDiffLevels   DifficultyLevel[]

  exerciseLikes       ExerciseLike[]
  sessionLikes        SessionLike[]
  programLikes        ProgramLike[]

  sessionAssignedBy   SessionAssignment[]  @relation("SessionAssigner")
  sessionAssignedTo   SessionAssignment[]  @relation("SessionAssignee")
  programAssignedBy   ProgramAssignment[]  @relation("ProgramAssigner")
  programAssignedTo   ProgramAssignment[]  @relation("ProgramAssignee")

  notifications       Notification[]       @relation("NotificationRecipient")
  actedNotifications  Notification[]       @relation("NotificationActor")

  sentMessages        Message[]
  conversationParts   ConversationParticipant[]

  contentSharesBy     ContentShare[]

  @@index([tenantId])
  @@map("coaches")
}

model CoachTenant {
  coachId            String    @map("coach_id")
  tenantId           String    @map("tenant_id")
  role               CoachRole
  canCreateExercises Boolean   @default(false) @map("can_create_exercises")
  joinedAt           DateTime  @default(now()) @map("joined_at") @db.Timestamptz

  coach  Coach  @relation(fields: [coachId], references: [id])
  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@id([coachId, tenantId])
  @@map("coach_tenants")
}

// ─── Taxonomy ───────────────────────────────────────────────

model Domain {
  id          String        @id @default(uuid())
  name        String        @db.VarChar(100)
  description String?
  status      ContentStatus @default(draft)
  tenantId    String?       @map("tenant_id")
  createdBy   String        @map("created_by")
  createdAt   DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime      @updatedAt @map("updated_at") @db.Timestamptz
  deletedAt   DateTime?     @map("deleted_at") @db.Timestamptz

  tenant  Tenant? @relation(fields: [tenantId], references: [id])
  creator Coach   @relation(fields: [createdBy], references: [id])

  exerciseDomains ExerciseDomain[]
  sessionDomains  SessionDomain[]
  programDomains  ProgramDomain[]

  @@unique([name, tenantId])
  @@map("domains")
}

model Phase {
  id        String   @id @default(uuid())
  name      String   @db.VarChar(100)
  sortOrder Int      @map("sort_order")
  isDefault Boolean  @default(false) @map("is_default")
  tenantId  String?  @map("tenant_id")
  createdBy String?  @map("created_by")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz

  tenant  Tenant? @relation(fields: [tenantId], references: [id])
  creator Coach?  @relation(fields: [createdBy], references: [id])

  sessionExercises SessionExercise[]

  @@unique([name, tenantId])
  @@map("phases")
}

model DifficultyLevel {
  id        String   @id @default(uuid())
  label     String   @db.VarChar(100)
  sortOrder Int      @map("sort_order")
  tenantId  String?  @map("tenant_id")
  createdBy String   @map("created_by")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz

  tenant  Tenant? @relation(fields: [tenantId], references: [id])
  creator Coach   @relation(fields: [createdBy], references: [id])

  exercises Exercise[]
  sessions  Session[]
  programs  Program[]

  @@unique([label, tenantId])
  @@map("difficulty_levels")
}

// ─── Exercise (formerly Cube) ───────────────────────────────

model Exercise {
  id                String        @id @default(uuid())
  name              String        @db.VarChar(255)
  description       String?
  durationSeconds   Int           @map("duration_seconds")
  difficultyLevelId String?       @map("difficulty_level_id")
  creatorNotes      String?       @map("creator_notes")
  status            ContentStatus @default(draft)
  version           Int           @default(1)
  parentExerciseId  String?       @map("parent_exercise_id")
  allDomains        Boolean       @default(false) @map("all_domains")
  tenantId          String?       @map("tenant_id")
  createdBy         String        @map("created_by")
  createdAt         DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt         DateTime      @updatedAt @map("updated_at") @db.Timestamptz
  publishedAt       DateTime?     @map("published_at") @db.Timestamptz
  deletedAt         DateTime?     @map("deleted_at") @db.Timestamptz

  difficultyLevel DifficultyLevel? @relation(fields: [difficultyLevelId], references: [id])
  parentExercise  Exercise?        @relation("ExerciseVersions", fields: [parentExerciseId], references: [id])
  versions        Exercise[]       @relation("ExerciseVersions")
  tenant          Tenant?          @relation(fields: [tenantId], references: [id])
  creator         Coach            @relation(fields: [createdBy], references: [id])

  domains         ExerciseDomain[]
  media           ExerciseMedia[]
  sessionExercises SessionExercise[]
  likes           ExerciseLike[]
  notifications   Notification[]   @relation("NotificationExercise")
  contentShares   ContentShare[]   @relation("SharedExercise")

  @@index([status, deletedAt])
  @@index([createdBy])
  @@index([tenantId])
  @@index([parentExerciseId])
  @@map("exercises")
}

model ExerciseDomain {
  exerciseId String @map("exercise_id")
  domainId   String @map("domain_id")

  exercise Exercise @relation(fields: [exerciseId], references: [id])
  domain   Domain   @relation(fields: [domainId], references: [id])

  @@id([exerciseId, domainId])
  @@map("exercise_domains")
}

model ExerciseMedia {
  id         String    @id @default(uuid())
  exerciseId String    @map("exercise_id")
  mediaType  MediaType @map("media_type")
  url        String
  publicId   String?   @map("public_id") @db.VarChar(255)
  title      String?   @db.VarChar(255)
  position   Int

  exercise Exercise @relation(fields: [exerciseId], references: [id], onDelete: Cascade)

  @@index([exerciseId])
  @@map("exercise_media")
}

// ─── Session (formerly Routine) ─────────────────────────────

model Session {
  id                String        @id @default(uuid())
  name              String        @db.VarChar(255)
  description       String?
  durationSeconds   Int           @default(0) @map("duration_seconds")
  difficultyLevelId String?       @map("difficulty_level_id")
  creatorNotes      String?       @map("creator_notes")
  status            ContentStatus @default(draft)
  version           Int           @default(1)
  parentSessionId   String?       @map("parent_session_id")
  allDomains        Boolean       @default(false) @map("all_domains")
  tenantId          String?       @map("tenant_id")
  createdBy         String        @map("created_by")
  createdAt         DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt         DateTime      @updatedAt @map("updated_at") @db.Timestamptz
  publishedAt       DateTime?     @map("published_at") @db.Timestamptz
  deletedAt         DateTime?     @map("deleted_at") @db.Timestamptz

  difficultyLevel DifficultyLevel? @relation(fields: [difficultyLevelId], references: [id])
  parentSession   Session?         @relation("SessionVersions", fields: [parentSessionId], references: [id])
  versions        Session[]        @relation("SessionVersions")
  tenant          Tenant?          @relation(fields: [tenantId], references: [id])
  creator         Coach            @relation(fields: [createdBy], references: [id])

  domains          SessionDomain[]
  sessionExercises SessionExercise[]
  programSessions  ProgramSession[]
  likes            SessionLike[]
  assignments      SessionAssignment[]
  notifications    Notification[]    @relation("NotificationSession")
  contentShares    ContentShare[]    @relation("SharedSession")

  @@index([status, deletedAt])
  @@index([createdBy])
  @@index([tenantId])
  @@index([parentSessionId])
  @@map("sessions")
}

model SessionDomain {
  sessionId String @map("session_id")
  domainId  String @map("domain_id")

  session Session @relation(fields: [sessionId], references: [id])
  domain  Domain  @relation(fields: [domainId], references: [id])

  @@id([sessionId, domainId])
  @@map("session_domains")
}

model SessionExercise {
  id                      String  @id @default(uuid())
  sessionId               String  @map("session_id")
  exerciseId              String  @map("exercise_id")
  position                Int
  phaseId                 String? @map("phase_id")
  restAfterSeconds        Int?    @map("rest_after_seconds")
  overrideDurationSeconds Int?    @map("override_duration_seconds")
  sets                    Int?
  reps                    String? @db.VarChar(50)
  notes                   String?

  session  Session  @relation(fields: [sessionId], references: [id])
  exercise Exercise @relation(fields: [exerciseId], references: [id])
  phase    Phase?   @relation(fields: [phaseId], references: [id])

  @@index([sessionId, position])
  @@map("session_exercises")
}

// ─── Program (formerly Super-Routine) ───────────────────────

model Program {
  id                String        @id @default(uuid())
  name              String        @db.VarChar(255)
  description       String?
  durationSeconds   Int           @default(0) @map("duration_seconds")
  difficultyLevelId String?       @map("difficulty_level_id")
  creatorNotes      String?       @map("creator_notes")
  status            ContentStatus @default(draft)
  version           Int           @default(1)
  parentProgramId   String?       @map("parent_program_id")
  allDomains        Boolean       @default(false) @map("all_domains")
  tenantId          String?       @map("tenant_id")
  createdBy         String        @map("created_by")
  createdAt         DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt         DateTime      @updatedAt @map("updated_at") @db.Timestamptz
  publishedAt       DateTime?     @map("published_at") @db.Timestamptz
  deletedAt         DateTime?     @map("deleted_at") @db.Timestamptz

  difficultyLevel DifficultyLevel? @relation(fields: [difficultyLevelId], references: [id])
  parentProgram   Program?         @relation("ProgramVersions", fields: [parentProgramId], references: [id])
  versions        Program[]        @relation("ProgramVersions")
  tenant          Tenant?          @relation(fields: [tenantId], references: [id])
  creator         Coach            @relation(fields: [createdBy], references: [id])

  domains          ProgramDomain[]
  programSessions  ProgramSession[]
  likes            ProgramLike[]
  assignments      ProgramAssignment[]
  notifications    Notification[]    @relation("NotificationProgram")
  contentShares    ContentShare[]    @relation("SharedProgram")

  @@index([status, deletedAt])
  @@index([createdBy])
  @@index([tenantId])
  @@index([parentProgramId])
  @@map("programs")
}

model ProgramDomain {
  programId String @map("program_id")
  domainId  String @map("domain_id")

  program Program @relation(fields: [programId], references: [id])
  domain  Domain  @relation(fields: [domainId], references: [id])

  @@id([programId, domainId])
  @@map("program_domains")
}

model ProgramSession {
  id        String  @id @default(uuid())
  programId String  @map("program_id")
  sessionId String  @map("session_id")
  position  Int
  dayLabel  String? @map("day_label") @db.VarChar(100)
  notes     String?

  program Program @relation(fields: [programId], references: [id])
  session Session @relation(fields: [sessionId], references: [id])

  @@index([programId, position])
  @@map("program_sessions")
}

// ─── Likes (separate per entity type) ───────────────────────

model ExerciseLike {
  id         String   @id @default(uuid())
  exerciseId String   @map("exercise_id")
  coachId    String   @map("coach_id")
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz

  exercise Exercise @relation(fields: [exerciseId], references: [id])
  coach    Coach    @relation(fields: [coachId], references: [id])

  @@unique([exerciseId, coachId])
  @@index([exerciseId])
  @@map("exercise_likes")
}

model SessionLike {
  id        String   @id @default(uuid())
  sessionId String   @map("session_id")
  coachId   String   @map("coach_id")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  session Session @relation(fields: [sessionId], references: [id])
  coach   Coach   @relation(fields: [coachId], references: [id])

  @@unique([sessionId, coachId])
  @@index([sessionId])
  @@map("session_likes")
}

model ProgramLike {
  id        String   @id @default(uuid())
  programId String   @map("program_id")
  coachId   String   @map("coach_id")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  program Program @relation(fields: [programId], references: [id])
  coach   Coach   @relation(fields: [coachId], references: [id])

  @@unique([programId, coachId])
  @@index([programId])
  @@map("program_likes")
}

// ─── Assignments (separate per entity type) ─────────────────

model SessionAssignment {
  id              String           @id @default(uuid())
  sessionId       String           @map("session_id")
  assignedBy      String           @map("assigned_by")
  assignedTo      String           @map("assigned_to")
  status          AssignmentStatus @default(pending)
  dueDate         DateTime?        @map("due_date") @db.Timestamptz
  notes           String?
  responseNotes   String?          @map("response_notes")
  completionNotes String?          @map("completion_notes")
  respondedAt     DateTime?        @map("responded_at") @db.Timestamptz
  completedAt     DateTime?        @map("completed_at") @db.Timestamptz
  createdAt       DateTime         @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime         @updatedAt @map("updated_at") @db.Timestamptz

  session  Session @relation(fields: [sessionId], references: [id])
  assigner Coach   @relation("SessionAssigner", fields: [assignedBy], references: [id])
  assignee Coach   @relation("SessionAssignee", fields: [assignedTo], references: [id])

  notifications Notification[] @relation("NotificationSessionAssignment")

  @@index([assignedTo, status])
  @@index([assignedBy])
  @@map("session_assignments")
}

model ProgramAssignment {
  id              String           @id @default(uuid())
  programId       String           @map("program_id")
  assignedBy      String           @map("assigned_by")
  assignedTo      String           @map("assigned_to")
  status          AssignmentStatus @default(pending)
  dueDate         DateTime?        @map("due_date") @db.Timestamptz
  notes           String?
  responseNotes   String?          @map("response_notes")
  completionNotes String?          @map("completion_notes")
  respondedAt     DateTime?        @map("responded_at") @db.Timestamptz
  completedAt     DateTime?        @map("completed_at") @db.Timestamptz
  createdAt       DateTime         @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime         @updatedAt @map("updated_at") @db.Timestamptz

  program  Program @relation(fields: [programId], references: [id])
  assigner Coach   @relation("ProgramAssigner", fields: [assignedBy], references: [id])
  assignee Coach   @relation("ProgramAssignee", fields: [assignedTo], references: [id])

  notifications Notification[] @relation("NotificationProgramAssignment")

  @@index([assignedTo, status])
  @@index([assignedBy])
  @@map("program_assignments")
}

// ─── Notifications ──────────────────────────────────────────

model Notification {
  id                    String           @id @default(uuid())
  coachId               String           @map("coach_id")
  type                  NotificationType
  message               String
  exerciseId            String?          @map("exercise_id")
  sessionId             String?          @map("session_id")
  programId             String?          @map("program_id")
  sessionAssignmentId   String?          @map("session_assignment_id")
  programAssignmentId   String?          @map("program_assignment_id")
  actorId               String?          @map("actor_id")
  isRead                Boolean          @default(false) @map("is_read")
  readAt                DateTime?        @map("read_at") @db.Timestamptz
  createdAt             DateTime         @default(now()) @map("created_at") @db.Timestamptz

  coach               Coach              @relation("NotificationRecipient", fields: [coachId], references: [id])
  actor               Coach?             @relation("NotificationActor", fields: [actorId], references: [id])
  exercise            Exercise?          @relation("NotificationExercise", fields: [exerciseId], references: [id])
  session             Session?           @relation("NotificationSession", fields: [sessionId], references: [id])
  program             Program?           @relation("NotificationProgram", fields: [programId], references: [id])
  sessionAssignment   SessionAssignment? @relation("NotificationSessionAssignment", fields: [sessionAssignmentId], references: [id])
  programAssignment   ProgramAssignment? @relation("NotificationProgramAssignment", fields: [programAssignmentId], references: [id])

  @@index([coachId, isRead])
  @@index([coachId, createdAt])
  @@map("notifications")
}

// ─── Content Sharing (v2+ feature) ──────────────────────────

model ContentShare {
  id                 String          @id @default(uuid())
  exerciseId         String?         @map("exercise_id")
  sessionId          String?         @map("session_id")
  programId          String?         @map("program_id")
  sharedBy           String          @map("shared_by")
  sharedWithTenantId String?         @map("shared_with_tenant_id")
  sharedWithCoachId  String?         @map("shared_with_coach_id")
  permission         SharePermission @default(view)
  createdAt          DateTime        @default(now()) @map("created_at") @db.Timestamptz
  expiresAt          DateTime?       @map("expires_at") @db.Timestamptz

  exercise        Exercise? @relation("SharedExercise", fields: [exerciseId], references: [id])
  session         Session?  @relation("SharedSession", fields: [sessionId], references: [id])
  program         Program?  @relation("SharedProgram", fields: [programId], references: [id])
  sharer          Coach     @relation(fields: [sharedBy], references: [id])
  sharedWithTenant Tenant?  @relation(fields: [sharedWithTenantId], references: [id])

  @@map("content_shares")
}

// ─── Messaging ──────────────────────────────────────────────

model Conversation {
  id        String   @id @default(uuid())
  isGroup   Boolean  @default(false) @map("is_group")
  title     String?  @db.VarChar(255)
  tenantId  String?  @map("tenant_id")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz

  tenant       Tenant?                  @relation(fields: [tenantId], references: [id])
  participants ConversationParticipant[]
  messages     Message[]

  @@map("conversations")
}

model ConversationParticipant {
  id             String    @id @default(uuid())
  conversationId String    @map("conversation_id")
  coachId        String    @map("coach_id")
  lastReadAt     DateTime? @map("last_read_at") @db.Timestamptz
  joinedAt       DateTime  @default(now()) @map("joined_at") @db.Timestamptz

  conversation Conversation @relation(fields: [conversationId], references: [id])
  coach        Coach        @relation(fields: [coachId], references: [id])

  @@unique([conversationId, coachId])
  @@index([coachId])
  @@map("conversation_participants")
}

model Message {
  id             String    @id @default(uuid())
  conversationId String    @map("conversation_id")
  senderId       String    @map("sender_id")
  content        String
  createdAt      DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt      DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  deletedAt      DateTime? @map("deleted_at") @db.Timestamptz

  conversation Conversation @relation(fields: [conversationId], references: [id])
  sender       Coach        @relation(fields: [senderId], references: [id])

  @@index([conversationId, createdAt])
  @@map("messages")
}
```

---

## 9. Migration Notes: v1 Data to v2

### Entity mapping

| v1 Table | v2 Table | Migration Strategy |
|----------|----------|-------------------|
| `users` | `coaches` | Copy all fields. Map `id` -> `id`, `email` -> `email`, `full_name` -> `fullName`. Generate `externalUserId` as the email (until SSO is live, email is the identity anchor). Drop `password_hash`, `google_id`, `auth_provider`, `age`, `sex`. Map `organisation` -> create a Tenant if non-null. Map `can_create_cubes` -> `canCreateExercises`. |
| `domains` | `domains` | Direct copy. Map `creator_notes` -> `description`. Map `status` (active/inactive) -> (published/draft). |
| `categories` | `phases` | Copy `name`. Assign `sortOrder` based on convention: Warm-up=1, Main Part=2, Cool-down=3, others=10+. Set `isDefault=true` for the standard three. |
| `difficulty_levels` | `difficulty_levels` | Direct copy. `label`, `sort_order` unchanged. |
| `cubes` | `exercises` | Copy all fields. `duration_minutes` * 60 -> `durationSeconds`. Merge `exercise_list` + `instructions` -> `description` (concatenate with separator). `difficulty_level` (integer) -> create corresponding DifficultyLevel rows if they do not exist, then FK. `category_id` -> **do not migrate to exercise** (phase moves to junction). Map `status` (active/inactive) -> (published/draft). Set `version=1`, `parentExerciseId=NULL`. |
| `cube_domains` | `exercise_domains` | Direct copy, renaming `cube_id` -> `exerciseId`. |
| `cube_media` + `cube_youtube_links` | `exercise_media` | Merge both into one table. Cube media rows get `mediaType` based on existing `media_type` column. YouTube link rows get `mediaType=youtube`. |
| `cube_nesting` | **Dropped.** | Self-referencing nesting is removed. For cubes that had nested children, two options: (a) flatten — children become standalone exercises, or (b) convert parent cube + children into a Session. **Recommended: option (a)** — any cube that was used as a child retains its identity as a standalone exercise. The parent-child relationship is lost. If coaches need the grouping, they create a Session. |
| `routines` | `sessions` | Direct copy with renames. `duration_minutes` * 60 -> `durationSeconds`. Map status. |
| `routine_domains` | `session_domains` | Direct copy. |
| `routine_cubes` | `session_exercises` | Copy `routine_id` -> `sessionId`, `cube_id` -> `exerciseId`, `position` -> `position`. Generate surrogate `id`. **Populate `phaseId`** from the cube's `category_id` in v1 — since v1 stored phase on the cube, migrate it to the junction row by looking up the cube's category. Set `restAfterSeconds`, `overrideDurationSeconds`, `sets`, `reps`, `notes` to NULL (no v1 data for these). |
| `super_routines` | `programs` | Direct copy with renames. |
| `super_routine_domains` | `program_domains` | Direct copy. |
| `super_routine_routines` | `program_sessions` | Copy `super_routine_id` -> `programId`, `routine_id` -> `sessionId`, `position` -> `position`. Generate surrogate `id`. Set `dayLabel` to `"Day {position}"`. |
| `likes` | `exercise_likes` / `session_likes` / `program_likes` | Split by `entity_type`. Route `entity_type='cube'` rows to `exercise_likes`, `entity_type='routine'` to `session_likes`, `entity_type='super_routine'` to `program_likes`. Discard any likes pointing to non-existent entities (the polymorphic antipattern's price). |
| `assignments` | `session_assignments` / `program_assignments` | Split by `entity_type`. Same approach as likes. Map `notes` -> `notes`, `completion_notes` -> `completionNotes`. `completed_at` -> `completedAt`. Add `responseNotes=NULL`, `respondedAt=NULL` (no v1 data). |
| `notifications` | `notifications` | Map `entity_type` + `entity_id` to the appropriate nullable FK. Set `type` based on `entity_type` + context. `user_id` -> `coachId`. |
| `conversations` | `conversations` | Direct copy. |
| `conversation_participants` | `conversation_participants` | `user_id` -> `coachId`. |
| `messages` | `messages` | `sender_id` -> `senderId`. |

### Migration execution plan

1. **Create Prisma schema** and run `prisma db push` against a fresh database
2. **Write a TypeScript migration script** that connects to both the old (SQLAlchemy-managed) and new (Prisma-managed) PostgreSQL databases
3. **Migrate in dependency order:** Tenants -> Coaches -> Domains -> Phases -> DifficultyLevels -> Exercises -> ExerciseDomains -> ExerciseMedia -> Sessions -> SessionDomains -> SessionExercises -> Programs -> ProgramDomains -> ProgramSessions -> Likes -> Assignments -> Notifications -> Conversations -> Participants -> Messages
4. **Preserve UUIDs** — all entity IDs are UUIDs in both systems, so they can be carried over directly. This preserves any external references.
5. **Validate** — run count comparisons and spot-check random entities
6. **Run recalculation** — trigger duration recalculation on all sessions and programs to ensure the `durationSeconds` values are correct with the new formula (which includes rest periods)

### What is lost in migration

| v1 Feature | v2 Status | Impact |
|------------|-----------|--------|
| Cube nesting relationships | Dropped | Parent-child relationships between cubes are lost. Children become standalone exercises. Low impact — cube nesting was rarely used and conceptually broken. |
| Numeric difficulty on cubes | Converted | Integer difficulty levels on cubes are converted to DifficultyLevel lookup rows. The display may change from "7" to "Level 7" unless the labels are set to pure numbers. |
| Separate exercise_list and instructions | Merged | Both fields are concatenated into `description`. Minor formatting adjustment may be needed. |

---

## 10. Summary of Design Decisions

| Question | Decision | Reasoning |
|----------|----------|-----------|
| How many tiers? | 3: Exercise -> Session -> Program | Sessions are the natural boundary of a single workout. 2 tiers loses this. 4 tiers over-engineers the phase distinction. |
| Should phases be structural? | Phases are on the junction row, not enforced | A session does not REQUIRE warm-up/main/cooldown. Some sessions are pure conditioning or pure skills. But phases ARE first-class entities assignable per-slot. |
| Self-referencing exercises? | Removed | Atoms do not contain atoms (P1). |
| Polymorphic entity references? | Eliminated | Separate tables for likes (3 tables), assignments (2 tables). Notifications use typed nullable FKs. |
| Duration model? | Seconds, with rest periods and overrides on junction rows | Minutes were too coarse. Rest periods are explicit. Override duration allows per-slot customization. |
| Status workflow? | draft -> published -> archived, with versioning | Published content is immutable. Edits create new versions. This is essential for B2B trust. |
| What happens when a published exercise is edited? | New version created | Original stays published. Sessions referencing old version are unaffected. Coach opts in to new version per-session. |
| Multi-tenancy? | Row-level `tenantId` with NULL = global | Simple, effective, no schema-per-tenant complexity. |
| Cross-tenant sharing? | ContentShare table (v2+ feature) | Designed in schema, not implemented in Phase 1. |
| B2C extension? | Client, ClientProgramAssignment, ClientSessionProgress, ClientExerciseLog | Designed as extension tables referencing junction rows. No core schema changes needed. |
| Naming? | Exercise/Session/Program | Industry-standard terms. "Cube" is a UI brand concept, not a data model name. |
| Difficulty system? | Unified DifficultyLevel lookup on all tiers | Eliminates the dual numeric/alphanumeric confusion from v1. |
| Media tables? | Single ExerciseMedia with mediaType enum | Eliminates the unnecessary split between image/video and YouTube link tables. |
