# Cubes+ v2 System Design Document

**Date:** 2026-03-31
**Status:** Authoritative — replaces all individual research reports
**Author:** Lead Architect (synthesized from 5 research reports)
**Stack:** Next.js 15 + Prisma + PostgreSQL (rebuild from scratch)

This document is the single source of truth for the Cubes+ v2 rebuild. It supersedes:
- Domain Model Redesign report
- PRD Gap Analysis report
- B2B/B2C Strategy report
- Builder UX Architecture report
- Integration Architecture report

---

## 1. Vision & Product Strategy

### What Cubes+ Is

Cubes+ is the **training routine builder** for the LIMITLESS Longevity OS. It enables coaches to create modular exercise blocks, compose them into training sessions, and assemble sessions into multi-week programs. Within the LIMITLESS ecosystem, Cubes+ occupies the **"Train" vertical** — the ACT phase of the Learn-Assess-Understand-Act loop.

Beyond LIMITLESS, Cubes+ aims to become the **go-to ecosystem for coaches, gyms, and sports centers worldwide** to develop training programs for themselves, their staff, and their clients — a **coaching knowledge platform** where value compounds as more professionals contribute.

### Why Cubes+ Exists

Every competitor in the coaching platform space (Trainerize, TrueCoach, TrainHeroic, PT Distinction, Everfit, My PT Hub) treats program creation as a solo, non-modular activity. Nobody has:

1. **Modular composition** — atomic building blocks that compose into sessions that compose into programs, with duplication and reuse at every level. Competitors work at the "workout" level only; there is no concept of reusable atomic exercise blocks that flow between sessions and programs.
2. **Health data integration** — training routines informed by biomarkers, wearable data (Oura, Garmin), and recovery metrics from a Digital Twin. Trainerize has basic step/calorie tracking but nothing at the biomarker or HRV/recovery level. Cubes+ consumes the LIMITLESS Digital Twin API, which already has Oura integration live and Garmin pending — wearable data is available to Cubes+ essentially for free via existing DT infrastructure.
3. **Collaborative knowledge ecosystem** — a GitHub-inspired "fork" model where coaches discover, copy, and improve each other's work with full attribution. When Coach A publishes a "HIIT Session for Beginners" to the community library, Coach B at a different gym can fork it (create their own copy), modify it for their clients, and publish their version. Coach A sees their work influenced 15 sessions across 8 organizations. No fitness platform enables this cross-pollination — competitors silo content per account.
4. **Integrated ecosystem** — the Learn-Assess-Understand-Act closed loop. A client takes a PATHS course on "Strength Training Principles" (Learn), gets blood work done through HUB (Assess), their Digital Twin shows biological age and biomarker status (Understand), and their coach builds a personalized training program in Cubes+ (Act). No competitor connects education, clinical diagnostics, and coaching delivery in a single platform.

This is the moat — but it is time-sensitive. Trainerize (acquired by ABC Fitness) may add wearable integrations. First-mover advantage matters. The infrastructure work already done on the Longevity OS (DT wearable integration, shared auth, API gateway) gives Cubes+ a head start that competitors cannot replicate without building an equivalent ecosystem.

### B2B Core + B2C Extension

Cubes+ is a **B2B platform with a B2C extension**:

- **B2B (core):** Organizations (gyms, studios, clinics, corporate wellness) subscribe. Coaches within organizations create, manage, and assign training content. Knowledge flows between coaches and, optionally, between organizations.
- **B2C (extension):** Clients/trainees receive assigned programs, log workouts, track progress, and provide feedback — all within the same Next.js app via separate route groups (`(coach)` and `(client)`).

### Target Market Segments

**Day-1 launch vertical: Parkour gyms in Europe.** The sport has matured from grassroots amateur to professional, with major players (FIG, RedBull) bringing money into the ecosystem. The infrastructure is lagging behind — large gyms with communities and competitive athletes need a professional platform for training program development and delivery. Several European Parkour gyms have already been contacted and will be early testers alongside the El Fuerte Marbella pilot.

| Segment | Priority | Rationale |
|---|---|---|
| **Parkour gyms (Europe)** | Day-1 launch | Perfect fit: mature sport, money arriving, infrastructure gap. Direct partnerships in progress. |
| **LIMITLESS El Fuerte Marbella** | Pilot (July 2026) | Internal pilot with full ecosystem integration (PATHS + HUB + DT + Cubes+) |
| **Longevity clinics** | High | Natural LIMITLESS ecosystem fit. Clinicians prescribe exercise parameters, coaches build programs. |
| **Physiotherapy / rehabilitation clinics** | High | Structured exercise programming is core to rehab. Integration with health data is a differentiator. |
| **Corporate wellness programs** | Medium | Large contract value. Programs standardized across employee populations. |
| **Hotel / resort fitness centers** | Medium | Linked to LIMITLESS HUB stays. Guests get personalized programs during retreats. |
| **Sports academies (youth/pro)** | Future | Relevant but longer sales cycle. Parkour gyms are the beachhead. |
| **CrossFit / established fitness franchises** | Avoid initially | NIH syndrome — prefer in-house tools, don't play well with external providers. |

### Launch Timeline

| Milestone | Date | Scope |
|---|---|---|
| **Internal alpha** | June 2026 | Core builder + exercise/session/program CRUD. LIMITLESS coaches only. |
| **El Fuerte Marbella pilot** | July 2026 | Full ecosystem integration (DT wearables, PATHS courses, HUB bookings). Parkour gym partners testing. |
| **Public B2B launch** | Q4 2026 | Multi-tenancy, marketplace, client delivery (B2C). Open to Parkour gyms + longevity clinics. |

### Competitive Position

| Cubes+ Advantage | Nearest Competitor | Why Cubes+ Wins |
|---|---|---|
| Modular composition (Exercise -> Session -> Program) | TrainHeroic (flat workout builder) | Granular reuse at every level; competitors work at "workout" level only |
| Fork model with attribution | None (all competitors silo content per account) | Knowledge flows between coaches and organizations; value compounds |
| Digital Twin integration (biomarkers + wearables) | Trainerize (basic step/calorie only) | Real physiological data: HRV, recovery, biomarkers, biological age |
| LIMITLESS ecosystem (Learn + Assess + Act loop) | None | No competitor connects education, diagnostics, and coaching |
| Community marketplace | TrainHeroic (programs only) | Marketplace includes exercises and sessions, not just programs |
| Parkour/alternative sports focus | None (all target general fitness) | Purpose-built for movement-intensive, skill-based training disciplines |

### Naming Convention Table

| Context | Atomic Unit | Single Workout | Multi-Workout Plan | Training Phase |
|---|---|---|---|---|
| **Internal / Database / Code** | Exercise | Session | Program | Phase |
| **Coach-facing UI** | Exercise | Session | Program | Phase |
| **Client-facing UI** | Exercise | Workout | Program | (not shown) |
| **UI Brand / Marketing** | Cube | (not used) | (not used) | (not used) |

**Rules:**
- "Cube" is a visual/brand metaphor only. It appears in the product name (Cubes+), in marketing materials, and as a visual element in the builder canvas (exercise cards are rendered as cube-shaped blocks). It is NEVER used in the database, API, or code variable names.
- Coaches see "Session" (the professional term). Clients see "Workout" (the consumer term). Both refer to the same entity.
- Coach-facing and client-facing labels are implemented via a `terminology` mapping layer in the frontend, not duplicated entities.

### Visual Identity: Architecture Constraint Note

The visual identity of Cubes+ (how exercises, sessions, and programs are rendered in the builder canvas) is a critical design decision that will be explored separately. The tech stack (Next.js + dnd-kit + unstyled Radix/shadcn primitives) is deliberately **visual-agnostic** — no CSS framework, component library, or rendering approach is locked in that would constrain future UI/UX possibilities. The architecture supports everything from flat minimalist cards to isometric 3D blocks to a full WebGL/canvas-based builder. This is by design: the visual language of Cubes+ is a product decision, not an engineering constraint.

---

## 2. User Model & Roles

### Design Principles

1. **Organization provisioning is LIMITLESS-managed.** Consistent with the Longevity OS approach — Platform Admins create and configure organizations. No self-service org creation.
2. **Coaching role is platform-wide, not per-org.** A Junior Coach is a Junior Coach everywhere. If a coach needs elevated permissions, their account is promoted. This eliminates per-org role conflicts and "which org am I acting as?" complexity.
3. **Org-scoped permissions are separate from coaching role.** Owner and Admin are org management permissions, not coaching skill levels. A Head Coach can also be an Org Admin if needed.
4. **No `can_create_exercises` flag.** The v1 hack is removed. Exercise creation is a Senior Coach+ privilege. If a Junior Coach reaches that level, promote them. Clean separation of responsibility.
5. **Clients are a separate identity.** Coach accounts and client/trainee accounts are completely separate (separate model, likely separate app). A person who coaches at Gym A and trains at Gym B has two accounts.

### Role Hierarchy

```
Platform Admin (LIMITLESS internal — manages platform and provisions orgs)
  │
  ├── Org-Scoped Permissions (per organization):
  │     ├── Organization Owner (billing, deletion, transfer)
  │     └── Organization Admin (settings, invites, member management)
  │
  └── Platform-Wide Coaching Roles (on the User model, global):
        ├── Head Coach (manage taxonomy, edit/delete others' content)
        ├── Senior Coach (create exercises, publish to community)
        └── Junior Coach (create sessions/programs, fork from community)
```

**Key distinction:** A user has ONE coaching role globally (`User.role`). They can belong to MULTIPLE organizations. Within each org, they may optionally hold org-scoped permissions (Owner or Admin) via `OrganizationMember.isOwner` / `OrganizationMember.isAdmin` flags.

### Permissions Matrix

| Capability | Platform Admin | Org Owner | Org Admin | Head Coach | Senior Coach | Junior Coach | Client |
|---|---|---|---|---|---|---|---|
| **Platform** | | | | | | | |
| Manage platform settings | Yes | - | - | - | - | - | - |
| Create organizations | Yes | - | - | - | - | - | - |
| Promote/demote coaching roles | Yes | - | - | - | - | - | - |
| **Organization Management** | | | | | | | |
| Manage billing | Yes | Own org | - | - | - | - | - |
| Delete organization | Yes | Own org | - | - | - | - | - |
| Transfer ownership | Yes | Own org | - | - | - | - | - |
| Manage org settings | Yes | Yes | Yes | - | - | - | - |
| Invite/remove members | Yes | Yes | Yes | - | - | - | - |
| Grant org admin permission | Yes | Yes | - | - | - | - | - |
| **Taxonomy** | | | | | | | |
| Manage domains/difficulty levels | Yes | Yes | Yes | Yes | - | - | - |
| **Content Creation** | | | | | | | |
| Create exercises | Yes | Yes | Yes | Yes | Yes | - | - |
| Create sessions | Yes | Yes | Yes | Yes | Yes | Yes | - |
| Create programs | Yes | Yes | Yes | Yes | Yes | Yes | - |
| Edit own content | Yes | Yes | Yes | Yes | Yes | Yes | - |
| Delete own content | Yes | Yes | Yes | Yes | Yes | Draft only | - |
| **Content Management** | | | | | | | |
| Edit others' content (within org) | Yes | Yes | Yes | Yes | - | - | - |
| Delete others' content (unused only) | Yes | Yes | Yes | Yes | - | - | - |
| Publish/unpublish own content | Yes | Yes | Yes | Yes | Yes | - | - |
| Archive content | Yes | Yes | Yes | Yes | Yes | - | - |
| **Community & Marketplace** | | | | | | | |
| Fork from community/marketplace | Yes | Yes | Yes | Yes | Yes | Yes | - |
| Publish to community | Yes | Yes | Yes | Yes | Yes | - | - |
| Publish to marketplace | Yes | Yes | Yes | Yes | Yes | - | - |
| Rate/review community content | Yes | Yes | Yes | Yes | Yes | Yes | - |
| **Assignments & Clients** | | | | | | | |
| Assign programs to coaches | Yes | Yes | Yes | Yes | Yes | - | - |
| Assign programs to clients | Yes | Yes | Yes | Yes | Yes | Own clients | - |
| Add clients | Yes | Yes | Yes | Yes | Yes | Own | - |
| **Analytics** | | | | | | | |
| View org analytics/insights | Yes | Yes | Yes | Yes | - | - | - |
| **Client Capabilities** | | | | | | | |
| View assigned programs | - | - | - | - | - | - | Yes |
| Log workouts | - | - | - | - | - | - | Yes |
| View own progress | - | - | - | - | - | - | Yes |
| Rate completed workouts | - | - | - | - | - | - | Yes |
| Message coach | - | - | - | - | - | - | Yes |

**"Unused" definition for deletion guards:** An exercise is "unused" if it has zero references in any `SessionExercise` row (across all sessions, any status, any org). Same for sessions in `ProgramSession`. Archived content is hidden from browsers but continues to render in compositions that reference it — archive, don't delete.

### Multi-Tenancy Model

**Row-level tenancy** using `organizationId` on all content entities. A `NULL` organizationId means platform-global content (created by LIMITLESS internal coaches).

**Multi-organization membership:** A single user (one email, one LIMITLESS SSO identity) can belong to multiple organizations. The `OrganizationMember` junction carries membership status and optional org-scoped permissions (`isOwner`, `isAdmin`). The user's coaching role is global on `User.role`.

**Franchise support (Phase 2+):** `parentOrganizationId` on the Organization entity. Parent orgs can push templates down, view aggregate analytics, and enforce brand-standard content.

---

## 3. Domain Model

### 3.1 Entity Hierarchy

```
Exercise (atomic building block)
  └── via SessionExercise junction (ordered, allows duplicates, carries phase + sets/reps/rest)
       └── Session (single training session)
            └── via ProgramSession junction (ordered, allows duplicates, carries dayLabel)
                 └── Program (multi-session training plan)
```

### 3.2 Composition Rules

| Container | Contains | Duplicates? | Ordered? |
|---|---|---|---|
| Session | Exercises (via SessionExercise) | Yes — same exercise at multiple positions | Yes — explicit `position` |
| Program | Sessions (via ProgramSession) | Yes — same session on multiple days | Yes — explicit `position` |

**What CANNOT compose:**
- Exercises cannot contain exercises (no self-referencing — P1: atoms do not contain atoms)
- Programs cannot contain programs
- Sessions cannot contain sessions
- Exercises cannot appear directly in programs (must go through a session)

**Publish validation:**
- Publishing a session requires all referenced exercises to be published
- Publishing a program requires all referenced sessions to be published
- A session must have at least 1 exercise to publish
- A program must have at least 2 sessions to publish

**Deletion rules:**
- Draft content: soft delete with 7-day retention, then hard delete
- Published exercise: BLOCKED if referenced by any session — must remove from all sessions first, or archive
- Published session: BLOCKED if referenced by any program
- Published program: soft delete (top-level entity)
- Archived content: hidden from browsers but still renders in parents that reference it

### 3.3 Content Visibility Levels

| Visibility | Who Can See | Default For |
|---|---|---|
| `private` | Only the creator | Draft/WIP content |
| `organization` | All members of the creator's organization | Newly published content |
| `community` | All Cubes+ users (read-only, forkable) | Explicitly shared by creator |
| `marketplace` | All Cubes+ users (purchasable or free download) | Explicitly published to marketplace |

**Transition flow:** `private` -> `organization` -> `community` -> `marketplace`. Each transition requires explicit action. Content never becomes more visible without consent.

**Organization override:** Org Admins/Owners can promote content to `community`/`marketplace` or restrict to `organization` only. Creators are notified on visibility changes.

### 3.4 Status Workflow

```
draft ──publish──> published ──archive──> archived
  ^                    |                      |
  |                    | new-version          | restore
  |                    v                      |
  |               draft (v2)                  |
  |                                           |
  └─────────── restore <──────────────────────┘
```

### 3.5 Versioning Model (Immutable Published Content)

When a published exercise is "edited":
1. System creates a NEW Exercise row: `status: draft`, `version: original.version + 1`, `parentExerciseId: original.id`
2. Original remains `status: published`, untouched
3. Coach edits the new draft
4. On publish, system shows sessions referencing the old version and offers to update (one-by-one or bulk)
5. Sessions not updated continue referencing the old version — they work fine

This ensures that publishing a change to a "plank" exercise used in 50 sessions does not silently alter those 50 sessions.

### 3.6 Duration Calculation

```
session.durationSeconds = SUM(
  for each SessionExercise:
    (overrideDurationSeconds ?? exercise.durationSeconds) * (sets ?? 1)
    + (restAfterSeconds ?? 0)
)

program.durationSeconds = SUM(session.durationSeconds for each ProgramSession)
```

Duration is calculated on write (stored denormalized) and recalculated whenever composition changes.

### 3.7 Complete Prisma Schema

This is the definitive schema. It incorporates the domain model, B2B multi-tenancy, visibility/sharing, and B2C client delivery.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ═══════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════

enum ContentStatus {
  draft
  published
  archived
}

enum ContentVisibility {
  private
  organization
  community
  marketplace
}

enum CoachRole {
  head_coach
  senior_coach
  junior_coach
}

enum OrgPlan {
  free
  pro
  team
  business
  enterprise
}

enum OrgStatus {
  active
  suspended
  cancelled
}

enum MemberStatus {
  invited
  active
  suspended
  departed
}

enum AssignmentStatus {
  pending
  accepted
  declined
  in_progress
  completed
}

enum ClientProgramStatus {
  assigned
  active
  paused
  completed
  abandoned
}

enum ClientSessionStatus {
  upcoming
  in_progress
  completed
  skipped
}

enum NotificationType {
  exercise_updated
  session_updated
  program_updated
  assignment_created
  assignment_status_changed
  like_received
  fork_received
  client_completed
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

// ═══════════════════════════════════════════════════════════════
// ORGANIZATION & IDENTITY
// ═══════════════════════════════════════════════════════════════

model Organization {
  id                   String    @id @default(uuid())
  name                 String    @db.VarChar(255)
  slug                 String    @unique @db.VarChar(100)
  logoUrl              String?   @map("logo_url") @db.VarChar(500)
  brandColors          Json?     @map("brand_colors")
  plan                 OrgPlan   @default(free)
  status               OrgStatus @default(active)
  billingEmail         String?   @map("billing_email") @db.VarChar(255)
  stripeCustomerId     String?   @map("stripe_customer_id") @db.VarChar(255)
  defaultVisibility    ContentVisibility @default(organization) @map("default_visibility")
  parentOrganizationId String?   @map("parent_organization_id")
  settings             Json?
  createdAt            DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt            DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  deletedAt            DateTime? @map("deleted_at") @db.Timestamptz

  parentOrganization Organization?  @relation("OrgHierarchy", fields: [parentOrganizationId], references: [id])
  childOrganizations Organization[] @relation("OrgHierarchy")

  members              OrganizationMember[]
  invitations          OrganizationInvitation[]
  domains              Domain[]
  phases               Phase[]
  difficultyLevels     DifficultyLevel[]
  exercises            Exercise[]
  sessions             Session[]
  programs             Program[]
  conversations        Conversation[]
  contentShares        ContentShare[]
  clients              Client[]
  subscriptions        OrganizationSubscription[]

  @@map("organizations")
}

/// Local user profile — synced from LIMITLESS SSO on first login.
/// Role is platform-wide (not per-org). A Junior Coach is a Junior Coach everywhere.
model User {
  id                 String    @id @default(uuid())
  externalUserId     String    @unique @map("external_user_id") @db.VarChar(255)
  email              String    @unique @db.VarChar(255)
  fullName           String    @map("full_name") @db.VarChar(255)
  role               CoachRole @default(junior_coach)
  avatarUrl          String?   @map("avatar_url") @db.VarChar(500)
  shortDescription   String?   @map("short_description")
  phone              String?   @db.VarChar(50)
  domainsOfExpertise String[]  @default([]) @map("domains_of_expertise")
  reputationScore    Int       @default(0) @map("reputation_score")
  lastLoginAt        DateTime? @map("last_login_at") @db.Timestamptz
  createdAt          DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt          DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  deletedAt          DateTime? @map("deleted_at") @db.Timestamptz

  memberships        OrganizationMember[]

  createdExercises   Exercise[]
  createdSessions    Session[]
  createdPrograms    Program[]
  createdDomains     Domain[]
  createdPhases      Phase[]
  createdDiffLevels  DifficultyLevel[]

  exerciseLikes      ExerciseLike[]
  sessionLikes       SessionLike[]
  programLikes       ProgramLike[]

  sessionAssignedBy  SessionAssignment[]  @relation("SessionAssigner")
  sessionAssignedTo  SessionAssignment[]  @relation("SessionAssignee")
  programAssignedBy  ProgramAssignment[]  @relation("ProgramAssigner")
  programAssignedTo  ProgramAssignment[]  @relation("ProgramAssignee")

  notifications      Notification[]       @relation("NotificationRecipient")
  actedNotifications Notification[]       @relation("NotificationActor")

  sentMessages       Message[]
  conversationParts  ConversationParticipant[]
  contentSharesBy    ContentShare[]
  contentRatings     ContentRating[]
  contentReports     ContentReport[]      @relation("Reporter")
  reviewedReports    ContentReport[]      @relation("Reviewer")
  invitationsSent    OrganizationInvitation[]

  @@index([externalUserId])
  @@map("users")
}

/// Membership junction. Coaching role is on User.role (platform-wide).
/// Org-scoped permissions (owner, admin) are boolean flags here.
model OrganizationMember {
  id               String       @id @default(uuid())
  organizationId   String       @map("organization_id")
  userId           String       @map("user_id")
  isOwner          Boolean      @default(false) @map("is_owner")
  isAdmin          Boolean      @default(false) @map("is_admin")
  status           MemberStatus @default(active)
  joinedAt         DateTime     @default(now()) @map("joined_at") @db.Timestamptz
  createdAt        DateTime     @default(now()) @map("created_at") @db.Timestamptz
  updatedAt        DateTime     @updatedAt @map("updated_at") @db.Timestamptz

  organization Organization @relation(fields: [organizationId], references: [id])
  user         User         @relation(fields: [userId], references: [id])

  @@unique([organizationId, userId])
  @@index([userId])
  @@map("organization_members")
}

/// Invitation to join an org. grantAdmin controls org-level permission.
/// The invitee's coaching role (User.role) is managed separately by Platform Admin.
model OrganizationInvitation {
  id             String    @id @default(uuid())
  organizationId String    @map("organization_id")
  email          String    @db.VarChar(255)
  grantAdmin     Boolean   @default(false) @map("grant_admin")
  invitedBy      String    @map("invited_by")
  token          String    @unique @db.VarChar(255)
  expiresAt      DateTime  @map("expires_at") @db.Timestamptz
  acceptedAt     DateTime? @map("accepted_at") @db.Timestamptz
  createdAt      DateTime  @default(now()) @map("created_at") @db.Timestamptz

  organization Organization @relation(fields: [organizationId], references: [id])
  inviter      User         @relation(fields: [invitedBy], references: [id])

  @@index([email])
  @@index([token])
  @@map("organization_invitations")
}

// ═══════════════════════════════════════════════════════════════
// TAXONOMY
// ═══════════════════════════════════════════════════════════════

model Domain {
  id             String        @id @default(uuid())
  name           String        @db.VarChar(100)
  description    String?
  status         ContentStatus @default(draft)
  organizationId String?       @map("organization_id")
  createdBy      String        @map("created_by")
  createdAt      DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt      DateTime      @updatedAt @map("updated_at") @db.Timestamptz
  deletedAt      DateTime?     @map("deleted_at") @db.Timestamptz

  organization Organization? @relation(fields: [organizationId], references: [id])
  creator      User          @relation(fields: [createdBy], references: [id])

  exerciseDomains ExerciseDomain[]
  sessionDomains  SessionDomain[]
  programDomains  ProgramDomain[]

  @@unique([name, organizationId])
  @@map("domains")
}

/// Structural phase within a session (Warm-up, Main, Cooldown, custom).
/// Lives on the SessionExercise junction row, NOT on the Exercise itself.
model Phase {
  id             String   @id @default(uuid())
  name           String   @db.VarChar(100)
  sortOrder      Int      @map("sort_order")
  isDefault      Boolean  @default(false) @map("is_default")
  organizationId String?  @map("organization_id")
  createdBy      String?  @map("created_by")
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt      DateTime @updatedAt @map("updated_at") @db.Timestamptz

  organization     Organization?    @relation(fields: [organizationId], references: [id])
  creator          User?            @relation(fields: [createdBy], references: [id])
  sessionExercises SessionExercise[]

  @@unique([name, organizationId])
  @@map("phases")
}

model DifficultyLevel {
  id             String   @id @default(uuid())
  label          String   @db.VarChar(100)
  sortOrder      Int      @map("sort_order")
  organizationId String?  @map("organization_id")
  createdBy      String   @map("created_by")
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt      DateTime @updatedAt @map("updated_at") @db.Timestamptz

  organization Organization? @relation(fields: [organizationId], references: [id])
  creator      User          @relation(fields: [createdBy], references: [id])

  exercises Exercise[]
  sessions  Session[]
  programs  Program[]

  @@unique([label, organizationId])
  @@map("difficulty_levels")
}

// ═══════════════════════════════════════════════════════════════
// CONTENT: EXERCISE (formerly Cube)
// ═══════════════════════════════════════════════════════════════

model Exercise {
  id                 String            @id @default(uuid())
  name               String            @db.VarChar(255)
  description        String?
  durationSeconds    Int               @map("duration_seconds")
  difficultyLevelId  String?           @map("difficulty_level_id")
  creatorNotes       String?           @map("creator_notes")
  status             ContentStatus     @default(draft)
  visibility         ContentVisibility @default(private)
  version            Int               @default(1)
  parentExerciseId   String?           @map("parent_exercise_id")
  forkedFromId       String?           @map("forked_from_id")
  allDomains         Boolean           @default(false) @map("all_domains")
  isOrgTemplate      Boolean           @default(false) @map("is_org_template")
  marketplacePrice   Decimal?          @map("marketplace_price") @db.Decimal(10, 2)
  downloadCount      Int               @default(0) @map("download_count")
  organizationId     String?           @map("organization_id")
  createdBy          String            @map("created_by")
  createdAt          DateTime          @default(now()) @map("created_at") @db.Timestamptz
  updatedAt          DateTime          @updatedAt @map("updated_at") @db.Timestamptz
  publishedAt        DateTime?         @map("published_at") @db.Timestamptz
  deletedAt          DateTime?         @map("deleted_at") @db.Timestamptz

  difficultyLevel  DifficultyLevel? @relation(fields: [difficultyLevelId], references: [id])
  parentExercise   Exercise?        @relation("ExerciseVersions", fields: [parentExerciseId], references: [id])
  versions         Exercise[]       @relation("ExerciseVersions")
  forkedFrom       Exercise?        @relation("ExerciseForks", fields: [forkedFromId], references: [id])
  forks            Exercise[]       @relation("ExerciseForks")
  organization     Organization?    @relation(fields: [organizationId], references: [id])
  creator          User             @relation(fields: [createdBy], references: [id])

  domains          ExerciseDomain[]
  media            ExerciseMedia[]
  sessionExercises SessionExercise[]
  likes            ExerciseLike[]
  notifications    Notification[]   @relation("NotificationExercise")
  contentShares    ContentShare[]   @relation("SharedExercise")
  ratings          ContentRating[]  @relation("RatedExercise")

  @@index([status, deletedAt])
  @@index([createdBy])
  @@index([organizationId])
  @@index([parentExerciseId])
  @@index([visibility])
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

// ═══════════════════════════════════════════════════════════════
// CONTENT: SESSION (formerly Routine)
// ═══════════════════════════════════════════════════════════════

model Session {
  id                 String            @id @default(uuid())
  name               String            @db.VarChar(255)
  description        String?
  durationSeconds    Int               @default(0) @map("duration_seconds")
  difficultyLevelId  String?           @map("difficulty_level_id")
  creatorNotes       String?           @map("creator_notes")
  status             ContentStatus     @default(draft)
  visibility         ContentVisibility @default(private)
  version            Int               @default(1)
  parentSessionId    String?           @map("parent_session_id")
  forkedFromId       String?           @map("forked_from_id")
  allDomains         Boolean           @default(false) @map("all_domains")
  isOrgTemplate      Boolean           @default(false) @map("is_org_template")
  isTemplate         Boolean           @default(false) @map("is_template")
  templateCategory   String?           @map("template_category") @db.VarChar(100)
  marketplacePrice   Decimal?          @map("marketplace_price") @db.Decimal(10, 2)
  downloadCount      Int               @default(0) @map("download_count")
  organizationId     String?           @map("organization_id")
  createdBy          String            @map("created_by")
  createdAt          DateTime          @default(now()) @map("created_at") @db.Timestamptz
  updatedAt          DateTime          @updatedAt @map("updated_at") @db.Timestamptz
  publishedAt        DateTime?         @map("published_at") @db.Timestamptz
  deletedAt          DateTime?         @map("deleted_at") @db.Timestamptz

  difficultyLevel  DifficultyLevel? @relation(fields: [difficultyLevelId], references: [id])
  parentSession    Session?         @relation("SessionVersions", fields: [parentSessionId], references: [id])
  sessionVersions  Session[]        @relation("SessionVersions")
  forkedFrom       Session?         @relation("SessionForks", fields: [forkedFromId], references: [id])
  forks            Session[]        @relation("SessionForks")
  organization     Organization?    @relation(fields: [organizationId], references: [id])
  creator          User             @relation(fields: [createdBy], references: [id])

  domains           SessionDomain[]
  sessionExercises  SessionExercise[]
  programSessions   ProgramSession[]
  likes             SessionLike[]
  assignments       SessionAssignment[]
  notifications     Notification[]    @relation("NotificationSession")
  contentShares     ContentShare[]    @relation("SharedSession")
  ratings           ContentRating[]   @relation("RatedSession")

  @@index([status, deletedAt])
  @@index([createdBy])
  @@index([organizationId])
  @@index([parentSessionId])
  @@index([visibility])
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

/// Core composition junction. Each row = one exercise slot within a session.
/// Phase, rest, override duration, sets, reps all live HERE, not on the Exercise.
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

  clientExerciseLogs ClientExerciseLog[]

  @@index([sessionId, position])
  @@map("session_exercises")
}

// ═══════════════════════════════════════════════════════════════
// CONTENT: PROGRAM (formerly Super-Routine)
// ═══════════════════════════════════════════════════════════════

model Program {
  id                 String            @id @default(uuid())
  name               String            @db.VarChar(255)
  description        String?
  durationSeconds    Int               @default(0) @map("duration_seconds")
  difficultyLevelId  String?           @map("difficulty_level_id")
  creatorNotes       String?           @map("creator_notes")
  status             ContentStatus     @default(draft)
  visibility         ContentVisibility @default(private)
  version            Int               @default(1)
  parentProgramId    String?           @map("parent_program_id")
  forkedFromId       String?           @map("forked_from_id")
  allDomains         Boolean           @default(false) @map("all_domains")
  isOrgTemplate      Boolean           @default(false) @map("is_org_template")
  isTemplate         Boolean           @default(false) @map("is_template")
  templateCategory   String?           @map("template_category") @db.VarChar(100)
  marketplacePrice   Decimal?          @map("marketplace_price") @db.Decimal(10, 2)
  downloadCount      Int               @default(0) @map("download_count")
  organizationId     String?           @map("organization_id")
  createdBy          String            @map("created_by")
  createdAt          DateTime          @default(now()) @map("created_at") @db.Timestamptz
  updatedAt          DateTime          @updatedAt @map("updated_at") @db.Timestamptz
  publishedAt        DateTime?         @map("published_at") @db.Timestamptz
  deletedAt          DateTime?         @map("deleted_at") @db.Timestamptz

  difficultyLevel  DifficultyLevel? @relation(fields: [difficultyLevelId], references: [id])
  parentProgram    Program?         @relation("ProgramVersions", fields: [parentProgramId], references: [id])
  programVersions  Program[]        @relation("ProgramVersions")
  forkedFrom       Program?         @relation("ProgramForks", fields: [forkedFromId], references: [id])
  forks            Program[]        @relation("ProgramForks")
  organization     Organization?    @relation(fields: [organizationId], references: [id])
  creator          User             @relation(fields: [createdBy], references: [id])

  domains          ProgramDomain[]
  programSessions  ProgramSession[]
  likes            ProgramLike[]
  assignments      ProgramAssignment[]
  notifications    Notification[]    @relation("NotificationProgram")
  contentShares    ContentShare[]    @relation("SharedProgram")
  ratings          ContentRating[]   @relation("RatedProgram")
  clientAssignments ClientProgramAssignment[]

  @@index([status, deletedAt])
  @@index([createdBy])
  @@index([organizationId])
  @@index([parentProgramId])
  @@index([visibility])
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

  clientProgress ClientSessionProgress[]

  @@index([programId, position])
  @@map("program_sessions")
}

// ═══════════════════════════════════════════════════════════════
// SOCIAL: LIKES (separate per entity type — real FKs, no polymorphism)
// ═══════════════════════════════════════════════════════════════

model ExerciseLike {
  id         String   @id @default(uuid())
  exerciseId String   @map("exercise_id")
  userId     String   @map("user_id")
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz

  exercise Exercise @relation(fields: [exerciseId], references: [id])
  user     User     @relation(fields: [userId], references: [id])

  @@unique([exerciseId, userId])
  @@index([exerciseId])
  @@map("exercise_likes")
}

model SessionLike {
  id        String   @id @default(uuid())
  sessionId String   @map("session_id")
  userId    String   @map("user_id")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  session Session @relation(fields: [sessionId], references: [id])
  user    User    @relation(fields: [userId], references: [id])

  @@unique([sessionId, userId])
  @@index([sessionId])
  @@map("session_likes")
}

model ProgramLike {
  id        String   @id @default(uuid())
  programId String   @map("program_id")
  userId    String   @map("user_id")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  program Program @relation(fields: [programId], references: [id])
  user    User    @relation(fields: [userId], references: [id])

  @@unique([programId, userId])
  @@index([programId])
  @@map("program_likes")
}

// ═══════════════════════════════════════════════════════════════
// ASSIGNMENTS (separate per entity type)
// ═══════════════════════════════════════════════════════════════

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
  assigner User    @relation("SessionAssigner", fields: [assignedBy], references: [id])
  assignee User    @relation("SessionAssignee", fields: [assignedTo], references: [id])

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
  assigner User    @relation("ProgramAssigner", fields: [assignedBy], references: [id])
  assignee User    @relation("ProgramAssignee", fields: [assignedTo], references: [id])

  notifications Notification[] @relation("NotificationProgramAssignment")

  @@index([assignedTo, status])
  @@index([assignedBy])
  @@map("program_assignments")
}

// ═══════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

model Notification {
  id                    String           @id @default(uuid())
  userId                String           @map("user_id")
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

  user                User               @relation("NotificationRecipient", fields: [userId], references: [id])
  actor               User?              @relation("NotificationActor", fields: [actorId], references: [id])
  exercise            Exercise?          @relation("NotificationExercise", fields: [exerciseId], references: [id])
  session             Session?           @relation("NotificationSession", fields: [sessionId], references: [id])
  program             Program?           @relation("NotificationProgram", fields: [programId], references: [id])
  sessionAssignment   SessionAssignment? @relation("NotificationSessionAssignment", fields: [sessionAssignmentId], references: [id])
  programAssignment   ProgramAssignment? @relation("NotificationProgramAssignment", fields: [programAssignmentId], references: [id])

  @@index([userId, isRead])
  @@index([userId, createdAt])
  @@map("notifications")
}

// ═══════════════════════════════════════════════════════════════
// CONTENT SHARING & COMMUNITY
// ═══════════════════════════════════════════════════════════════

model ContentShare {
  id                    String          @id @default(uuid())
  exerciseId            String?         @map("exercise_id")
  sessionId             String?         @map("session_id")
  programId             String?         @map("program_id")
  sharedBy              String          @map("shared_by")
  sharedWithOrganizationId String?      @map("shared_with_organization_id")
  sharedWithUserId      String?         @map("shared_with_user_id")
  permission            SharePermission @default(view)
  createdAt             DateTime        @default(now()) @map("created_at") @db.Timestamptz
  expiresAt             DateTime?       @map("expires_at") @db.Timestamptz

  exercise             Exercise?     @relation("SharedExercise", fields: [exerciseId], references: [id])
  session              Session?      @relation("SharedSession", fields: [sessionId], references: [id])
  program              Program?      @relation("SharedProgram", fields: [programId], references: [id])
  sharer               User          @relation(fields: [sharedBy], references: [id])
  sharedWithOrg        Organization? @relation(fields: [sharedWithOrganizationId], references: [id])

  @@map("content_shares")
}

model ContentRating {
  id              String   @id @default(uuid())
  exerciseId      String?  @map("exercise_id")
  sessionId       String?  @map("session_id")
  programId       String?  @map("program_id")
  userId          String   @map("user_id")
  rating          Int
  reviewText      String?  @map("review_text")
  creatorResponse String?  @map("creator_response")
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime @updatedAt @map("updated_at") @db.Timestamptz

  exercise Exercise? @relation("RatedExercise", fields: [exerciseId], references: [id])
  session  Session?  @relation("RatedSession", fields: [sessionId], references: [id])
  program  Program?  @relation("RatedProgram", fields: [programId], references: [id])
  user     User      @relation(fields: [userId], references: [id])

  @@map("content_ratings")
}

model ContentReport {
  id          String   @id @default(uuid())
  entityType  String   @map("entity_type") @db.VarChar(50)
  entityId    String   @map("entity_id")
  reporterId  String   @map("reporter_id")
  reason      String   @db.VarChar(50)
  description String?
  status      String   @default("open") @db.VarChar(20)
  reviewedBy  String?  @map("reviewed_by")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz
  resolvedAt  DateTime? @map("resolved_at") @db.Timestamptz

  reporter User  @relation("Reporter", fields: [reporterId], references: [id])
  reviewer User? @relation("Reviewer", fields: [reviewedBy], references: [id])

  @@map("content_reports")
}

// ═══════════════════════════════════════════════════════════════
// B2C: CLIENT TRAINING DELIVERY
// ═══════════════════════════════════════════════════════════════

/// Client profile — separate from User (coaches) for clean separation
model Client {
  id             String    @id @default(uuid())
  externalUserId String    @unique @map("external_user_id") @db.VarChar(255)
  email          String    @unique @db.VarChar(255)
  fullName       String    @map("full_name") @db.VarChar(255)
  avatarUrl      String?   @map("avatar_url") @db.VarChar(500)
  organizationId String?   @map("organization_id")
  digitalTwinId  String?   @map("digital_twin_id") @db.VarChar(255)
  createdAt      DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt      DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  organization        Organization?            @relation(fields: [organizationId], references: [id])
  programAssignments  ClientProgramAssignment[]

  @@index([organizationId])
  @@map("clients")
}

model ClientProgramAssignment {
  id         String              @id @default(uuid())
  clientId   String              @map("client_id")
  programId  String              @map("program_id")
  assignedBy String              @map("assigned_by")
  startDate  DateTime            @map("start_date") @db.Date
  status     ClientProgramStatus @default(assigned)
  notes      String?
  createdAt  DateTime            @default(now()) @map("created_at") @db.Timestamptz
  updatedAt  DateTime            @updatedAt @map("updated_at") @db.Timestamptz

  client   Client  @relation(fields: [clientId], references: [id])
  program  Program @relation(fields: [programId], references: [id])

  sessionProgress ClientSessionProgress[]

  @@index([clientId, status])
  @@map("client_program_assignments")
}

model ClientSessionProgress {
  id                        String              @id @default(uuid())
  clientProgramAssignmentId String              @map("client_program_assignment_id")
  programSessionId          String              @map("program_session_id")
  scheduledDate             DateTime?           @map("scheduled_date") @db.Date
  status                    ClientSessionStatus @default(upcoming)
  completedAt               DateTime?           @map("completed_at") @db.Timestamptz
  durationSeconds           Int?                @map("duration_seconds")
  subjectiveRPE             Int?                @map("subjective_rpe")
  rating                    Int?
  feedback                  String?
  createdAt                 DateTime            @default(now()) @map("created_at") @db.Timestamptz
  updatedAt                 DateTime            @updatedAt @map("updated_at") @db.Timestamptz

  clientProgramAssignment ClientProgramAssignment @relation(fields: [clientProgramAssignmentId], references: [id])
  programSession          ProgramSession          @relation(fields: [programSessionId], references: [id])

  exerciseLogs ClientExerciseLog[]

  @@index([clientProgramAssignmentId])
  @@map("client_session_progress")
}

model ClientExerciseLog {
  id                      String    @id @default(uuid())
  clientSessionProgressId String    @map("client_session_progress_id")
  sessionExerciseId       String    @map("session_exercise_id")
  completed               Boolean   @default(false)
  actualSets              Int?      @map("actual_sets")
  actualReps              String?   @map("actual_reps") @db.VarChar(50)
  actualDurationSeconds   Int?      @map("actual_duration_seconds")
  weight                  Decimal?  @db.Decimal(10, 2)
  notes                   String?
  completedAt             DateTime? @map("completed_at") @db.Timestamptz

  clientSessionProgress ClientSessionProgress @relation(fields: [clientSessionProgressId], references: [id])
  sessionExercise       SessionExercise       @relation(fields: [sessionExerciseId], references: [id])

  @@map("client_exercise_logs")
}

// ═══════════════════════════════════════════════════════════════
// MESSAGING (third-party recommended; minimal schema for fallback)
// ═══════════════════════════════════════════════════════════════

model Conversation {
  id             String   @id @default(uuid())
  isGroup        Boolean  @default(false) @map("is_group")
  title          String?  @db.VarChar(255)
  organizationId String?  @map("organization_id")
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt      DateTime @updatedAt @map("updated_at") @db.Timestamptz

  organization Organization?            @relation(fields: [organizationId], references: [id])
  participants ConversationParticipant[]
  messages     Message[]

  @@map("conversations")
}

model ConversationParticipant {
  id             String    @id @default(uuid())
  conversationId String    @map("conversation_id")
  userId         String    @map("user_id")
  lastReadAt     DateTime? @map("last_read_at") @db.Timestamptz
  joinedAt       DateTime  @default(now()) @map("joined_at") @db.Timestamptz

  conversation Conversation @relation(fields: [conversationId], references: [id])
  user         User         @relation(fields: [userId], references: [id])

  @@unique([conversationId, userId])
  @@index([userId])
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
  sender       User         @relation(fields: [senderId], references: [id])

  @@index([conversationId, createdAt])
  @@map("messages")
}

// ═══════════════════════════════════════════════════════════════
// BILLING
// ═══════════════════════════════════════════════════════════════

model SubscriptionPlan {
  id            String   @id @default(uuid())
  name          String   @db.VarChar(100)
  tier          OrgPlan
  priceMonthly  Decimal  @map("price_monthly") @db.Decimal(10, 2)
  priceAnnual   Decimal  @map("price_annual") @db.Decimal(10, 2)
  maxCoaches    Int      @map("max_coaches")
  maxClients    Int      @map("max_clients")
  features      Json
  stripePriceId String?  @map("stripe_price_id") @db.VarChar(255)
  active        Boolean  @default(true)
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime @updatedAt @map("updated_at") @db.Timestamptz

  subscriptions OrganizationSubscription[]

  @@map("subscription_plans")
}

model OrganizationSubscription {
  id                   String    @id @default(uuid())
  organizationId       String    @map("organization_id")
  planId               String    @map("plan_id")
  stripeSubscriptionId String?   @map("stripe_subscription_id") @db.VarChar(255)
  status               String    @db.VarChar(50)
  currentPeriodStart   DateTime  @map("current_period_start") @db.Timestamptz
  currentPeriodEnd     DateTime  @map("current_period_end") @db.Timestamptz
  cancelledAt          DateTime? @map("cancelled_at") @db.Timestamptz
  createdAt            DateTime  @default(now()) @map("created_at") @db.Timestamptz

  organization Organization     @relation(fields: [organizationId], references: [id])
  plan         SubscriptionPlan @relation(fields: [planId], references: [id])

  @@index([organizationId])
  @@map("organization_subscriptions")
}

model MarketplacePurchase {
  id                    String   @id @default(uuid())
  buyerId               String   @map("buyer_id")
  entityType            String   @map("entity_type") @db.VarChar(50)
  entityId              String   @map("entity_id")
  sellerId              String   @map("seller_id")
  price                 Decimal  @db.Decimal(10, 2)
  currency              String   @default("USD") @db.VarChar(3)
  platformFee           Decimal  @map("platform_fee") @db.Decimal(10, 2)
  sellerRevenue         Decimal  @map("seller_revenue") @db.Decimal(10, 2)
  stripePaymentIntentId String?  @map("stripe_payment_intent_id") @db.VarChar(255)
  status                String   @db.VarChar(50)
  createdAt             DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@map("marketplace_purchases")
}
```

### 3.8 Key Schema Decisions vs. Individual Reports

| Conflict | Resolution |
|---|---|
| Domain Model used `Tenant` / `Coach`; B2B Strategy used `Organization` / `User` | **Resolved: `Organization` + `User`.** "Tenant" is a technical term that does not belong in a user-facing app. "Coach" is a role, not an identity. |
| Domain Model had per-org roles; B2B Strategy had per-org roles | **Overridden: Coaching role is platform-wide** on `User.role` (CoachRole enum). Org-scoped permissions (owner, admin) are boolean flags on `OrganizationMember`. No `canCreateExercises` flag — exercise creation is a Senior Coach+ privilege. Promotion is managed by Platform Admin. |
| B2B Strategy's data model used `entity_type + entity_id` for ratings and reports (polymorphic); Domain Model forbade polymorphism | **Resolved: ContentRating uses nullable FKs** (same pattern as Notification). ContentReport uses typed strings as a pragmatic exception — reports are low-volume, admin-only, and adding 3 separate report tables provides no meaningful benefit. |
| Integration Architect assumed FastAPI backend | **Overridden: Next.js 15 + Prisma.** All API routes are Next.js Route Handlers. No separate backend service. |
| Builder UX Architect stored phases as JSON metadata on the session | **Overridden: Phase is a first-class entity** on `SessionExercise.phaseId` (FK). This is more queryable, more consistent, and enables phase-level analytics. |

---

## 4. Builder Architecture

### 4.1 Three-Panel Layout

```
Desktop (>= 1280px):
+------------------+-----------------------------------+------------------+
|  LIBRARY PANEL   |        BUILDER CANVAS             | PROPERTIES PANEL |
|  (collapsible)   |                                   | (context-aware)  |
|                  |        [Phase: Warm-Up]           |                  |
|  [Tabs]          |        +-item-+-item-+            | Shows:           |
|  Exercises       |                                   | - Selected item  |
|  |Sessions       |        [Phase: Main]              |   details        |
|  |Templates      |        +-item-+-item-+            | - Phase props    |
|                  |        +-item-+                   | - Session meta   |
|  [Search]        |                                   |   when saving    |
|  [Filters]       |        [Phase: Cooldown]          |                  |
|  +--card--+      |        +-item-+                   | [Quick edit]     |
|  +--card--+      |                                   | [Preview]        |
|                  |  [Duration: 45m] [Undo] [Redo]   |                  |
|                  |  [Clear] [Save] [Preview]         |                  |
+------------------+-----------------------------------+------------------+
     280px               flex-1 (min 500px)                  320px
```

**Why 3 panels, not v1's 4 panels:** v1 gave the builder only 25% of screen width. With tabs in the library panel (Exercises / Sessions / Templates), one panel replaces three.

**Builder canvas style: Tetris Duration Blocks** (LOCKED). Exercise blocks have height proportional to duration — a visual "tower" where coaches instantly see the session's time distribution. Short exercises (30s) are compact blocks, long exercises (10 min) are tall blocks. Phase colors (amber/rose/cyan) create a visual energy arc. Mobile-friendly: vertical stack naturally adapts to narrow screens.

**Tablet (1024-1279px):** 2-panel layout. Properties become a bottom sheet on item tap.

**Mobile (< 768px):** Building functionality is **desktop-only** for the webapp. Mobile web shows read-only views with Tetris-style session visualization (the same block heights, but non-interactive — coaches can review session structure on their phone/tablet at the gym). A future native iOS/Android app will bring building capability to mobile devices.

### 4.2 Phase Zones

Phases are structural canvas regions that group exercises by training purpose. They are **optional but encouraged**.

**Default phases:** Warm-Up, Main, Cooldown. Coach can add custom phases ("Mobility", "Skills", "Conditioning") or remove all phases for a flat list.

**Color System: Palette B Refined — "Warm Athletic"** (LOCKED)

| Token | Color | Hex | Usage |
|---|---|---|---|
| **Phase: Warm-Up** | Amber | `#fbbf24` | Warm-up blocks, labels, tags |
| **Phase: Main** | Rose | `#e11d48` | Main blocks, primary accent, buttons |
| **Phase: Cooldown** | Cyan | `#06b6d4` | Cooldown blocks, published status |
| **Phase: Custom** | Purple | `#a855f7` | User-created custom phases |
| **Accent Primary** | Rose | `#e11d48` | Buttons, selected states, active nav |
| **Accent Hover** | Light Rose | `#f43f5e` | Hover states |
| **Accent Subtle** | Dark Rose | `#1c0a14` | Subtle backgrounds |
| **Status: Draft** | Gray | `#525252` | |
| **Status: Published** | Cyan | `#06b6d4` | |
| **Status: Review** | Amber | `#fbbf24` | |
| **Status: Archived** | Gray | `#6b7280` | |
| **Difficulty: Beginner** | Cyan | `#06b6d4` | |
| **Difficulty: Intermediate** | Amber | `#fbbf24` | |
| **Difficulty: Advanced** | Rose | `#e11d48` | |
| **Difficulty: Elite** | Red | `#dc2626` | |
| **Surface: App BG** | Near-black | `#0a0a0a` | |
| **Surface: Canvas** | Dark | `#0d0d0d` | |
| **Surface: Card** | Elevated | `#111111` | |
| **Surface: Elevated** | Light | `#161616` | |
| **Phase BG: Warm-Up** | Dark amber | `#3b2506` | Block background gradient start |
| **Phase BG: Main** | Dark rose | `#4c0519` | Block background gradient start |
| **Phase BG: Cooldown** | Dark cyan | `#0e4a4c` | Block background gradient start |
| **Phase BG: Custom** | Dark purple | `#2e1065` | Block background gradient start |

**Design rationale:** Amber → Rose → Cyan creates a visual "energy arc" matching the session's intensity curve (warm up → peak → cool down). Rose accent is distinctive in the fitness coaching space (competitors use blue/green/orange). Palette is visually separate from LIMITLESS brand (gold/teal) while not clashing. Reference mockup: `TEMP/cubes-palette-b-refined.html`.

**Behavior:**
- Items can be dragged between phases
- Each phase shows its total duration
- Phase assignment is stored as `SessionExercise.phaseId` (real FK)
- In program mode, phases group sessions (AM/PM splits, day groups)

### 4.3 State Management

**Zustand** with `temporal` middleware for undo/redo. Replaces the v1 931-line `useState` orchestrator.

```
src/
  stores/
    builder-store.ts       # Core builder state + actions
    builder-history.ts     # Undo/redo via zustand/temporal (50 snapshots max)
  hooks/
    use-builder.ts         # Selector hooks for components
    use-builder-dnd.ts     # DnD event handlers
    use-repository.ts      # Repository fetch + filter state (TanStack Query)
```

**Store shape:**
- `items: BuilderItem[]` — current canvas contents
- `mode: 'empty' | 'session' | 'program'` — auto-detected from first item type
- `editingEntity: { id, name, creatorId, type } | null` — when editing existing content
- `isDirty: boolean`
- `phases: Phase[]` — phase zones with item assignments
- `draftId: string | null` — for localStorage persistence

### 4.4 Drag-and-Drop

**Library:** Keep `@dnd-kit/core` + `@dnd-kit/sortable`.

**Sensors:**
- `PointerSensor` (desktop)
- `TouchSensor` with `{ delay: 150, tolerance: 5 }` (tablet)
- `KeyboardSensor` with `sortableKeyboardCoordinates` (accessibility)

**Dual interaction model preserved from v1:** Items can be added via drag-and-drop OR via "+" button. Critical for tablet users.

### 4.5 Template System

Templates are not separate entities. They are sessions or programs with `isTemplate: true` and `templateCategory`.

**Loading a template:** deep-copies all content into the builder with new IDs and current user as creator. The template is never modified.

**Template types:**
1. **System templates** — curated by LIMITLESS editorial team
2. **Published templates** — any published session/program set as template by creator
3. **Organization templates** — org-level shared starting points

### 4.6 Undo/Redo

Zustand temporal middleware. Stores snapshots of `items` and `phases` arrays. Capped at 50 history entries. Keyboard shortcuts: Ctrl+Z / Ctrl+Shift+Z.

### 4.7 Auto-Save

**Explicit save with draft auto-persistence.**
- Builder state auto-saves to `localStorage` every 2s (debounced)
- This is a local draft, not server-persisted — building is desktop-only, so cross-device sync is not needed for the initial launch
- Coach must click "Save" to persist to backend
- On page load with existing draft: "Resume unsaved work?" prompt
- Server-persisted drafts (cross-device sync) deferred to native mobile app scope

### 4.8 What to Port vs. Rewrite from v1

| Component | Action | Notes |
|---|---|---|
| `BuilderCanvas` | REFACTOR | Add phase zones, undo integration, keyboard DnD |
| `RepositoryPanel` | REFACTOR | Add virtualization (`@tanstack/react-virtual`), infinite scroll |
| `DetailDrawer` | PORT | API migration only (cookie auth) |
| `SaveDialog` | REFACTOR | Extract save pipeline to hook; add template-save-as |
| `ModeTransitionDialog` | PORT | 44 lines, pure UI |
| `page.tsx` orchestrator | REWRITE | 931 lines -> ~200 line page + Zustand store |
| `routines/new`, `routines/[id]/edit` | DELETE | All creation/editing goes through `/builder` |
| `super-routines/new`, `super-routines/[id]/edit` | DELETE | Same |
| Auth hook + API client | REWRITE | localStorage JWT -> cookie SSO |
| API modules (`cubes.ts`, `routines.ts`, etc.) | PORT | Swap base client import |
| Types (`lib/types/*`) | PORT | Rename to match new entity names |
| `CubePickerPopover` | PORT | Clean inline search component |
| `RoutineContainer` | REFACTOR | Add phase awareness |
| Cypress tests | REFACTOR | Update selectors, auth, entity names |

**Estimated builder-specific effort: 23-30 dev-days.**

### 4.9 Preview Mode (Phase 1b — post-pilot)

A "Preview" button in the builder toolbar opens a modal showing the session as a client would see it: exercises grouped by phase, numbered list with durations, expand buttons for exercise instructions/media/video. Includes a "Share Link" to generate a read-only URL.

**Not needed for the July pilot** — coaches can save and view the session detail page. The polished in-builder preview is a fast-follow for pre-public-launch (Q4 2026).

---

## 5. Client Experience (B2C — Future Scope)

**B2C is NOT part of the v2 initial launch.** Cubes+ v2 is a purely B2B coach-facing platform. The client/trainee experience will be built as a **separate application** (PWA or React Native) consuming the Cubes+ API when the B2B side is fully functional and stable.

### 5.1 What v2 DOES Include (API-ready for B2C)

The Prisma schema includes `Client`, `ClientProgramAssignment`, `ClientSessionProgress`, and `ClientExerciseLog` models. The API includes endpoints for program assignment and client management. This means:

- Coaches can **create client entries** and **assign programs** from day 1
- The **data layer is B2C-ready** — no schema changes needed when the client app ships
- The **OS Dashboard "Today's Workout" widget** can serve as an interim client touchpoint before the dedicated app

### 5.2 v2 Route Structure (Coach-Only)

```
app/
  (coach)/                 # Coach experience (desktop-optimized)
    builder/               # Main builder page
    library/
      exercises/
      sessions/
      programs/
      templates/
    admin/                 # Org management, analytics
    clients/               # Client roster, assignment, progress review
    layout.tsx             # Multi-panel layout, sidebar nav
  (shared)/                # Shared pages
    login/
    onboarding/
    settings/
```

No `(client)` route group. No mobile-first workout execution UI. No bottom-tab navigation. The codebase stays lean and focused on the builder experience.

### 5.3 Future Client App (Separate Project)

When B2C launches, a separate application will provide:

- **Today screen:** Assigned workout, readiness score (from DT), one-tap start
- **Active Workout:** Exercise video demos, set/rep logging, timer, swipe navigation
- **Progress:** Training volume charts, personal records, DT health overlay
- **Messages:** Coach chat via third-party service (Stream Chat or similar)

**Client terminology:** Exercises stay "Exercise," Sessions become "Workout," Programs stay "Program." Domains become "Training Focus." Phases are not exposed.

**Architecture:** The client app consumes the same Cubes+ API endpoints that the coach frontend uses. No backend changes required — only a new frontend.

### 5.4 Messaging Strategy

**Pilot (July 2026):** No in-app messaging. Coaches and clients use existing channels (WhatsApp, Telegram). Adding half-baked chat would be worse than leveraging established tools.

**Public launch (Q4 2026):** Integrate Stream Chat (or equivalent third-party). Free tier supports 25 MAU (sufficient for early launch), scales to $499/mo for 10K MAU. Provides: real-time WebSocket delivery, typing indicators, read receipts, file sharing, push notifications, pre-built React SDK with customizable UI.

**No custom messaging code in the Cubes+ codebase.** The v1 conversation/message tables remain in the Prisma schema as a fallback but are not exposed in the v2 API.

---

## 6. Platform Integration

### 6.1 Gateway Routing

| Access Method | URL | Purpose |
|---|---|---|
| Gateway path | `app.limitless-longevity.health/train/*` | Primary user-facing access |
| Direct subdomain | `cubes.limitless-longevity.health` | Direct access, local dev fallback |
| Legacy redirect | `cubes.elixyr.life` | 301 redirect for 6 months |

**Gateway Worker update:**
```javascript
const ROUTES = [
  { prefix: '/train', backend: 'https://cubes-plus.onrender.com' },
  // ... existing routes
]
```

Since Cubes+ v2 is a single Next.js app (no separate API backend), both frontend pages and API route handlers are served from the same deployment. API routes live at `/api/v1/*` internally, accessible via `/train/api/v1/*` through the gateway.

**Next.js basePath:** `NEXT_PUBLIC_BASE_PATH=/train` in production.

### 6.2 Auth Flow (Cookie-Based SSO)

Cubes+ validates the `payload-token` cookie set by PATHS on `.limitless-longevity.health`.

**Frontend:**
- Read `payload-token` from cookies to determine auth state
- All API calls use `credentials: 'include'`
- Login redirect: `window.location.href = 'https://app.limitless-longevity.health/learn/login?redirect=/train'`

**Backend (Next.js API Routes):**
```typescript
// lib/auth.ts
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

export async function getAuthUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value
  if (!token) return null
  try {
    return jwt.verify(token, process.env.PAYLOAD_SECRET!) as JWTPayload
  } catch {
    return null
  }
}
```

**On first login:** Cubes+ reads `sub` from JWT, looks up local User by `externalUserId`. If not found, creates a new User record. Organization role is managed within Cubes+ by admins.

### 6.3 Service-to-Service Auth

| Direction | Auth | Header |
|---|---|---|
| Cubes+ -> Digital Twin | API key | `X-Service-Key: <CUBES_DT_KEY>` |
| PATHS -> Cubes+ | API key | `X-Service-Key: <PATHS_CUBES_KEY>` |
| HUB -> Cubes+ | API key | `X-Service-Key: <HUB_CUBES_KEY>` |
| OS Dashboard -> Cubes+ | User cookie | Same-origin via gateway |

### 6.4 Digital Twin Integration

**Coach views client health data:**
```
Coach opens client profile -> Cubes+ API: GET /api/v1/clients/:id/health-context
  -> Cubes+ backend calls DT: GET /api/twin/:userId/ai-context (via X-Service-Key)
  -> DT returns health profile, biomarkers, wearable data, recovery status
  -> Cubes+ enriches with training implications (e.g., "Avoid Valsalva — hypertension")
  -> Coach sees actionable health context alongside training tools
```

**Routine execution tracking:**
```
Client completes workout -> Cubes+ API: POST /api/v1/sessions/:id/complete
  -> Cubes+ saves ClientSessionProgress + ClientExerciseLogs
  -> Cubes+ posts to DT: POST /api/twin/:userId/activity (routine_completed event)
  -> DT logs activity, updates longevity score exercise pillar
```

**Wearable correlation:**
```
Coach reviews session -> Cubes+ queries DT: GET /api/twin/:userId/wearables/stream
  with start/end timestamps from ClientSessionProgress
  -> Returns heart rate, HRV, calories during that session window
  -> Coach sees HR graph overlaid on routine timeline
```

**Readiness-based recommendations (pull pattern):**
```
Client opens today's workout -> Cubes+ checks DT: GET /api/twin/:userId/wearables/latest
  -> readinessScore >= 80: proceed as planned
  -> readinessScore 60-79: suggest lighter alternative
  -> readinessScore < 60: suggest rest day or mobility
```

### 6.5 PATHS Integration

**Routine embed cards:** PATHS Lexical editor block `RoutineEmbed` fetches minimal data from `GET /api/v1/sessions/:id/summary` and renders a card with "Try this routine" CTA.

**Learning-to-training loop:** After PATHS course completion, PATHS post-completion screen shows routine suggestions via `GET /api/v1/sessions/suggestions?topic=strength_training`.

**Shared taxonomy:** PATHS content pillars map to Cubes+ domains (Exercise/Movement -> strength/cardio/mobility, Sleep -> recovery, Stress -> breathwork/mindfulness).

### 6.6 HUB Integration

**Booking to routine attachment:** Coach attaches a Cubes+ session to a HUB appointment. HUB fetches session summary via `GET /api/v1/sessions/:id/summary`.

**Stay programs:** Hotel guest books a stay via HUB. HUB stores `cubesProgramId` on the booking. HUB assigns program via `POST /api/v1/programs/:id/assign`.

**Clinician-to-coach handoff:** Clinician writes exercise prescription to DT (via HUB). Coach reads it from DT via Cubes+ health context proxy. No direct HUB-to-Cubes+ data transfer needed.

### 6.7 OS Dashboard Integration

Three widgets:

| Widget | Endpoint | Shows |
|---|---|---|
| Today's Routine | `GET /api/v1/me/today` | Scheduled workout, readiness score, recovery warning |
| Active Programs | `GET /api/v1/me/programs/active` | Progress bar, streak, weekly stats |
| Coach Activity | `GET /api/v1/me/coach/activity` | Recent creations, client completions, assignments |

App launcher card: `GET /api/v1/me/summary`.
Federated search: `GET /api/v1/search?q=<query>&limit=5`.

### 6.8 API Contracts Summary

**Cubes+ Endpoints (Provider):**

| Method | Path | Auth | Consumer | Purpose |
|---|---|---|---|---|
| `GET` | `/api/v1/sessions/:id/summary` | Service key or cookie | PATHS, HUB, OS Dashboard | Session summary card |
| `GET` | `/api/v1/programs/:id/summary` | Service key | HUB | Program summary for stay booking |
| `POST` | `/api/v1/programs/:id/assign` | Service key (HUB) | HUB | Assign program to client |
| `GET` | `/api/v1/sessions/suggestions` | Service key or cookie | PATHS, OS Dashboard | Topic-based session suggestions |
| `GET` | `/api/v1/me/today` | Cookie | Frontend, OS Dashboard | Today's workout + readiness |
| `GET` | `/api/v1/me/programs/active` | Cookie | OS Dashboard | Active programs + stats |
| `GET` | `/api/v1/me/summary` | Cookie | OS Dashboard | App launcher card data |
| `GET` | `/api/v1/me/coach/activity` | Cookie (coach) | OS Dashboard | Coach activity feed |
| `POST` | `/api/v1/sessions/:id/complete` | Cookie | Frontend | Log session completion |
| `GET` | `/api/v1/clients/:id/health-context` | Cookie (coach) | Frontend | Client health data (proxied from DT) |
| `GET` | `/api/v1/search` | Cookie | OS Dashboard | Federated search |

**Digital Twin Endpoints (consumed by Cubes+):**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/twin/:userId/ai-context` | Service key | Health context for coach view |
| `POST` | `/api/twin/:userId/activity` | Service key | Log routine completion |
| `GET` | `/api/twin/:userId/wearables/stream` | Service key | Session wearable data (time window) |
| `GET` | `/api/twin/:userId/wearables/latest` | Service key | Latest readiness/recovery |

---

## 7. Monetization

### 7.1 Growth-First Strategy

**Top priority is user base growth.** Cubes+ aims to become the default go-to platform for coaches worldwide, starting with the alternative sports community (Parkour) and LIMITLESS business partners (Fuerte Group and others who adopt Cubes+ as part of LIMITLESS services).

The monetization model follows **Render/Vercel-style freemium** — a genuinely useful free tier that attracts users and builds the community, with paid tiers for advanced features and scale.

### 7.2 Pricing Tiers

| Tier | Price | Target User | Limits | Key Features |
|---|---|---|---|---|
| **Free** | $0/mo | Individual coaches, students, hobbyists | 10 programs, 50 exercises, 1 org membership | Full builder, community library (fork + browse), basic search, assignments |
| **Pro** | $19/mo | Professional coaches, freelancers | Unlimited programs + exercises, 3 org memberships | Publish to community, templates, advanced filters, basic analytics, DT health context |
| **Team** | $79/mo | Small gyms, studios (up to 10 coaches) | 10 coach seats, org library | Org-scoped library, assignment workflows, team analytics, custom domains/phases |
| **Business** | $199/mo | Large gyms, academies (up to 50 coaches) | 50 coach seats, API access | Advanced analytics, custom branding, priority support, marketplace publishing |
| **Enterprise** | Custom | Franchise networks, corporate wellness | Unlimited seats | Franchise hierarchy, SSO, SLA, dedicated account manager, white-label options |

**Key design decisions:**
- Free tier is **genuinely functional** — a coach can build real training programs, not just a demo. This is how Render and Vercel win: the free tier is good enough that users tell their colleagues.
- Limits are on **quantity** (programs, exercises, org memberships), not on **features**. The builder, community library, and fork model are available to everyone — these drive network effects.
- Paid tiers unlock **scale** (more content, more seats), **professional tools** (analytics, DT integration, templates), and **organization features** (team library, custom branding).
- LIMITLESS business partners (Fuerte Group, pilot Parkour gyms) are provisioned at the appropriate tier as part of the commercial relationship — the decision to use Cubes+ is made for them.

Additional seats beyond tier limit: $12/mo per coach.

### 7.3 Marketplace Commission (Phase 4+)

| Transaction | Creator Gets | Platform Gets |
|---|---|---|
| Free download | N/A | N/A |
| Paid content sale | 80% | 20% |
| Platform-referred sale | 70% | 30% |

Marketplace is a later-phase feature. Initially, all community sharing is free — this maximizes the knowledge-sharing flywheel that is Cubes+'s core differentiator.

### 7.4 LIMITLESS Ecosystem Bundling

LIMITLESS longevity clients who use HUB + Digital Twin get Cubes+ Pro features included in their LIMITLESS membership. This drives ecosystem lock-in and differentiates from fitness-only competitors. For LIMITLESS partner organizations (Fuerte Group hotels, longevity clinics), Cubes+ is bundled as part of the service offering.

---

## 8. Technical Architecture

### 8.1 Deployment Topology

```
                    Cloudflare (DNS + CDN + Gateway Worker)
                              |
              +---------------+---------------+
              |                               |
    Render (or Vercel)                 Render PostgreSQL
    Cubes+ Next.js App                 (managed, daily backups)
    - SSR + API Route Handlers
    - basePath: /train
              |
              +---- Cloudinary (images, exercise demo photos)
              +---- Mux or Cloudflare Stream (video, Phase 2+)
              +---- Stripe (billing, Phase 2+)
              +---- Stream Chat (messaging, Phase 3+)
```

**Single deployment:** Next.js serves both frontend pages and API route handlers. No separate API service.

**Database:** Render Managed PostgreSQL (or equivalent). Daily automated backups with point-in-time recovery. Soft delete with 7-day retention at application level.

### 8.2 Service Boundaries

| Data | Cubes+ Owns | Cubes+ Consumes |
|---|---|---|
| Exercises, sessions, programs | Yes | - |
| Exercise media (Cloudinary URLs) | Yes | - |
| Coach-to-coach assignments | Yes | - |
| Client program assignments + progress | Yes | - |
| Marketplace purchases | Yes | - |
| User identity / auth | - | PATHS (via cookie JWT) |
| Health profiles / biomarkers | - | Digital Twin (via API) |
| Wearable data | - | Digital Twin (time-window queries) |
| Activity log (write) | - | Digital Twin (POST on completion) |
| Bookings / appointments | - | HUB (attaches routineId) |
| Exercise prescriptions | - | Digital Twin (written by HUB clinicians) |

### 8.3 Search Strategy

**Phase 1:** PostgreSQL full-text search with `tsvector` + GIN index on Exercise name + description. Weighted ranking (name 4x, description 1x). Minimum 2-character search term.

**Phase 2+:** Evaluate Meilisearch or Algolia if query patterns outgrow PostgreSQL (faceted search, typo tolerance, instant results over 100K+ items).

**Faceted filters:** Domain, difficulty level, phase, duration range, creator, organization, visibility. Filter counts via SQL aggregation.

### 8.4 Media Strategy

**Images:** Cloudinary. Max 10MB per image. Responsive delivery via `srcset`. WebP/AVIF auto-format.

**Video (Phase 2+):** Mux or Cloudflare Stream for exercise demonstration videos. Transcoding to multiple resolutions, HLS streaming, auto-thumbnail generation. Per-organization storage quotas.

**YouTube embeds:** Supported alongside uploaded video. Stored as `ExerciseMedia` with `mediaType: youtube`.

### 8.5 Security

- **Auth:** HttpOnly cookie (`payload-token`) validated server-side. No tokens in localStorage.
- **CSRF:** SameSite=Lax cookie + origin checking on mutations (Next.js built-in).
- **Rate limiting:** Cloudflare rate limiting rules. At minimum: 5 login-related requests per minute per IP, 100 API requests per minute per user.
- **Input validation:** Zod schemas on all API route handlers. Whitelist allowed sort columns (no `getattr` equivalent).
- **CORS:** Not needed for gateway-routed traffic (same origin). Direct subdomain access allows specific origins only.
- **Organization isolation:** All content queries scoped by `organizationId` via Prisma middleware.
- **Service keys:** Scoped per consuming service. Stored in environment variables. Validated in middleware.

### 8.6 Performance

- **Repository panels:** `@tanstack/react-virtual` + `useInfiniteQuery` with page size 20. Only ~15 items rendered in DOM at any time.
- **Builder canvas:** Full DOM render (sessions rarely exceed 30 exercises). Windowing deferred unless edge cases arise.
- **API batching:** `GET /api/v1/sessions/batch?ids=a,b,c` for program loading (1 round-trip instead of N).
- **Search debouncing:** 300ms debounce on repository search.
- **Image lazy loading:** `loading="lazy"` on all exercise media.
- **Query optimization:** Prisma `select` and `include` scoped per endpoint (list views load minimal fields; detail views load full relationships).

---

## 9. Implementation Plan

### Milestones

| Milestone | Date | What's Live |
|---|---|---|
| **Internal alpha** | June 2026 | Builder + library + CRUD (LIMITLESS coaches only) |
| **El Fuerte Marbella pilot** | July 2026 | + Gateway integration, DT health context, Parkour gym partners testing |
| **Public B2B launch** | Q4 2026 | + Multi-tenancy, community/fork model, billing |
| **Advanced features** | Q1 2027 | + Wearable loop, marketplace, analytics |
| **B2C client app** | Q1-Q2 2027 | Separate project — client-facing workout delivery |

### Phase 1: Foundation (Weeks 1-7) — Internal Alpha

**Goal:** Coaches can create exercises, build sessions, compose programs, and manage a library. Single organization (LIMITLESS). No clients, no marketplace.

**Target: June 2026**

| Task | Effort | Notes |
|---|---|---|
| Next.js 15 + Prisma project setup, Tailwind, shadcn/ui | 2 days | |
| Prisma schema (core entities: User, Organization, Domain, Phase, DifficultyLevel, Exercise, Session, Program + junctions) | 2 days | |
| Cookie auth (validate `payload-token`, User sync on first login) | 2 days | |
| Exercise CRUD (API routes + UI) | 3 days | |
| Session CRUD + builder canvas (Zustand store, DnD, phase zones) | 8 days | Largest task — core builder |
| Program CRUD + builder program mode | 4 days | |
| Library panels with search, filter, sort, virtualized scroll | 3 days | |
| Template system (isTemplate flag, template browser, load-into-builder) | 3 days | |
| Undo/redo (Zustand temporal) | 1 day | |
| Save pipeline (smart save, mode transition, auto-save draft) | 2 days | |
| Properties panel | 2 days | |
| Coach-to-coach assignments | 2 days | |
| Notifications | 2 days | |
| Like system | 1 day | |
| Deploy to Render, smoke testing, bug fixes | 3 days | |
| **Phase 1 Total** | **~40 days** | |

### Phase 2: Gateway + DT Integration (Weeks 8-10) — Pilot Ready

**Goal:** Cubes+ accessible via gateway, SSO working, coaches can see client health data while building routines. Ready for El Fuerte pilot.

**Target: July 2026**

| Task | Effort | Notes |
|---|---|---|
| Gateway Worker: add `/train` route | 1 day | |
| basePath configuration + testing | 1 day | |
| DNS records for `cubes.limitless-longevity.health` | 0.5 day | |
| Unified header (LIMITLESS branding, nav dropdown) | 2 days | |
| Login redirect flow testing | 1 day | |
| CORS configuration for direct subdomain | 0.5 day | |
| Health context proxy (`/clients/:id/health-context` → DT) | 2 days | High-value for pilot |
| Training implications engine (conditions → constraints) | 3 days | |
| Client roster management (coach creates client entries) | 2 days | B2C-ready data, no client UI |
| Program assignment API (`POST /programs/:id/assign`) | 1 day | |
| Session completion logging → DT activity log | 2 days | |
| OS Dashboard "Coach Activity" widget | 2 days | |
| **Phase 2 Total** | **~18 days** | |

### Phase 3: Multi-Tenancy + Community (Weeks 11-17) — Public Launch

**Goal:** Multiple organizations, community fork model, billing. Open to Parkour gyms + longevity clinics.

**Target: Q4 2026**

| Task | Effort | Notes |
|---|---|---|
| Organization CRUD + admin dashboard | 3 days | |
| Invitation system (email + token) | 2 days | |
| Organization-scoped queries (Prisma middleware) | 2 days | |
| Organization library isolation | 2 days | |
| Role-based permission enforcement | 3 days | |
| Visibility controls (private → org → community) | 2 days | |
| Fork model (fork, attribution chain, fork count) | 3 days | Core differentiator |
| Community library browser | 2 days | |
| Rating + review system | 2 days | |
| Billing integration (Stripe subscriptions, tier enforcement) | 4 days | |
| Free tier limits enforcement | 2 days | |
| Preview mode (client view preview in builder) | 1 day | Phase 1b feature |
| OS Dashboard widgets (Today's Routine, Active Programs) | 3 days | |
| PATHS RoutineEmbed Lexical block | 3 days | |
| Session/Program summary endpoints for HUB | 2 days | |
| v1 data migration script + execution | 3 days | |
| **Phase 3 Total** | **~39 days** | |

### Phase 4: Wearable Loop + Advanced (Weeks 18-22) — Platform Maturity

**Goal:** Closed-loop wearable data correlation, marketplace, advanced analytics.

**Target: Q1 2027**

| Task | Effort | Notes |
|---|---|---|
| Session start/end timestamp tracking | 1 day | |
| Wearable data query (DT stream endpoint by time window) | 1 day | |
| Session performance review screen (HR overlay) | 4 days | |
| Readiness-based recommendations (DT readiness score → session suggestions) | 2 days | |
| Marketplace listings + Stripe Connect for payouts | 5 days | |
| Coach analytics dashboard | 4 days | |
| Federated search endpoint for OS Dashboard | 2 days | |
| HUB program assignment endpoint (stay programs) | 2 days | |
| **Phase 4 Total** | **~21 days** | |

### Phase 5: B2C Client App (Separate Project)

**Goal:** Clients receive programs, log workouts, track progress. Separate application consuming Cubes+ API.

**Target: Q1-Q2 2027**

| Task | Effort | Notes |
|---|---|---|
| Client app project setup (PWA or React Native — decision TBD) | 3 days | |
| Auth flow (separate client login, Client model) | 3 days | |
| Today screen (assigned workout, readiness score) | 3 days | |
| Active Workout screen (exercise-by-exercise with logging) | 5 days | |
| Progress screen (charts, PRs, DT health overlay) | 3 days | |
| Third-party messaging integration (Stream Chat) | 3 days | Or defer further |
| Mobile-first responsive design | 3 days | |
| **Phase 5 Total** | **~23 days** | |

### Total Estimated Effort

| Phase | Effort | Target | Cumulative |
|---|---|---|---|
| Phase 1: Foundation | ~40 days (8 weeks) | June 2026 | 8 weeks |
| Phase 2: Gateway + DT | ~18 days (3-4 weeks) | July 2026 (pilot) | 11 weeks |
| Phase 3: Multi-Tenancy + Community | ~39 days (8 weeks) | Q4 2026 (public launch) | 19 weeks |
| Phase 4: Wearable Loop + Advanced | ~21 days (4 weeks) | Q1 2027 | 23 weeks |
| Phase 5: B2C Client App | ~23 days (5 weeks) | Q1-Q2 2027 | 28 weeks |
| **Total** | **~141 dev-days** | **~28 weeks (7 months)** | |

Note: Phases 1-2 must be sequential. Phases 3-4 are sequential. Phase 5 is an independent project that can run in parallel with Phase 4 if resources allow.

### Dependencies

```
Phase 1 (Foundation) ──> Phase 2 (Gateway + DT) ──> Phase 3 (Multi-Tenancy + Community)
   June 2026                 July 2026 (pilot)          Q4 2026 (public launch)
                                                              |
                                                              v
                                                    Phase 4 (Wearable + Advanced)
                                                         Q1 2027
                                                              |
                                                    Phase 5 (B2C Client App) ← can parallel Phase 4
                                                         Q1-Q2 2027
```

### v1 Data Migration Strategy

| v1 Table | v2 Table | Strategy |
|---|---|---|
| `users` | `users` | Copy fields. Generate `externalUserId` from email. Drop auth fields. Create LIMITLESS org + membership. |
| `cubes` | `exercises` | `duration_minutes * 60` -> `durationSeconds`. Merge `exercise_list` + `instructions` -> `description`. Convert integer difficulty to DifficultyLevel FK. |
| `cube_nesting` | DROPPED | Children become standalone exercises. Grouping relationship lost. |
| `routines` | `sessions` | Rename fields. Convert duration. |
| `super_routines` | `programs` | Rename fields. Set `dayLabel = "Day {position}"`. |
| `routine_cubes` | `session_exercises` | Populate `phaseId` from cube's old `category_id`. Generate surrogate IDs. |
| `likes` (polymorphic) | 3 like tables | Split by `entity_type`. Discard orphaned likes. |
| `assignments` (polymorphic) | 2 assignment tables | Split by `entity_type`. |
| `cube_media` + `cube_youtube_links` | `exercise_media` | Merge with `mediaType` discriminator. |

**Migration execution:** TypeScript script connecting to both databases. Migrate in FK dependency order. Preserve UUIDs. Validate with count comparisons. Recalculate all durations.

---

## 10. Decisions Log

### Architecture & Stack

| # | Decision | Considered Alternatives | Reasoning |
|---|---|---|---|
| D-01 | **3-tier hierarchy** (Exercise → Session → Program) | 2-tier (Exercise → Program), 4-tier (Exercise → Block → Session → Program) | 2 tiers loses the natural session boundary. 4 tiers over-engineers what phases already handle. |
| D-02 | **Phase on junction row**, not on Exercise | Phase as Exercise attribute (v1), Phase as 4th tier entity | The same exercise can be warm-up in one session and active recovery in another. Phase is contextual. |
| D-03 | **Remove cube nesting** | Keep with depth limit, convert to "Block" entity | No demonstrated user value. Builder UI never rendered nested cubes. Adds recursive query complexity. Atoms cannot contain atoms. |
| D-04 | **Next.js 15 + Prisma** (full rebuild) | Keep FastAPI backend, Payload CMS, Fastify + Drizzle | Aligns with HUB stack, eliminates Python from platform, single deployment. Prisma's junction tables are a natural fit for ordered M2M composition. Payload rejected due to weaker relational modeling for this domain. |
| D-05 | **Organization-based multi-tenancy** (row-level) | Schema-per-tenant, single-tenant with access control | Row-level is simplest. Schema-per-tenant has operational overhead. Single-tenant does not scale to B2B. |
| D-06 | **Separate `User` and `Client` models** | Single model with role flag | Clean separation. Coach accounts and client/trainee accounts are completely separate identities, likely served by separate apps. No cross-reference between User and Client. |
| D-07 | **B2C as a separate app/project** | Hybrid (same Next.js app, separate route groups), embedded in OS Dashboard only | B2B is core focus. B2C is future scope that doesn't need day-1 implementation. Separate app consumes the same Cubes+ API. Keeps v2 codebase lean and focused on the builder. |
| D-08 | **Defer messaging entirely** | Build custom chat, integrate Stream Chat for launch | Coaches already use WhatsApp/Telegram. Half-baked in-app chat is worse than telling coaches to use existing channels. Integrate third-party messaging when scale justifies the investment (post-public-launch). |
| D-09 | **Immutable published content** with versioning | Allow in-place edits with notification, append-only log | B2B trust requires that publishing a change does not silently alter content others depend on. |
| D-10 | **GitHub-inspired fork model** for sharing | Direct sharing permissions, template marketplace only | Forks with attribution create a knowledge flywheel. Coaches build on each other's work. No competitor offers this. |
| D-11 | **Cookie-based JWT auth** (shared `payload-token`) | OAuth2 between services, separate auth system | Already implemented across LIMITLESS ecosystem. One cookie, one domain, zero CORS issues via gateway. |

### Builder & UX

| # | Decision | Considered Alternatives | Reasoning |
|---|---|---|---|
| D-12 | **Zustand** for builder state | Redux Toolkit, React Context, Jotai | Lighter than Redux for this scope. Built-in temporal middleware for undo/redo. No provider wrapping. |
| D-13 | **Keep dnd-kit** for drag-and-drop | react-beautiful-dnd (deprecated), pragmatic-drag-and-drop | Best React DnD library. Supports nested sortables, multiple sensors. Already proven in v1 codebase. |
| D-14 | **3-panel builder layout** | 2-panel (library + canvas), 4-panel (v1) | 4-panel gives builder 25% width. 2-panel loses persistent properties. 3-panel matches professional builder tools (Figma, Webflow). |
| D-15 | **Templates are not separate entities** | Dedicated Template model, template marketplace entity | Templates are sessions/programs with `isTemplate: true`. Avoids schema duplication. Loading creates a deep copy. |
| D-16 | **Duration in seconds** (not minutes) | Keep minutes from v1 | "30-second sprint" and "90-second plank" require sub-minute precision. Seconds are the universal unit. |
| D-17 | **Unified DifficultyLevel lookup** | Keep dual system (numeric for exercises, labels for sessions) | One system, one mental model. Numeric "7" is just a label in the lookup table if that is what the coach wants. |
| D-18 | **No real-time collaboration** in builder | Liveblocks/Yjs for multiplayer | Typical use is single-coach editing. Cost (2-3 months) far exceeds demand. Activity feed + lock indicator suffice. |
| D-19 | **Distinct functional color palette** for builder | Use LIMITLESS brand palette (gold/teal/silver) | Brand palette feels forced in the builder context. Cubes+ has its own visual identity. Phase zones need distinct functional colors for clarity. |
| D-20 | **Building is desktop-only** for webapp | Mobile-responsive builder, tablet builder | Coaches use desktop for building. Mobile web shows read-only views. A future native iOS/Android app will bring building to mobile devices. |

### Identity & Roles

| # | Decision | Considered Alternatives | Reasoning |
|---|---|---|---|
| D-21 | **Rename Tenant → Organization, Coach → User** | Keep Domain Model Architect's naming | "Tenant" is infrastructure jargon. "Coach" is a role, not an identity. |
| D-22 | **Platform-wide coaching roles** (on User model) | Per-org roles (on OrganizationMember) | Eliminates per-org role conflicts and "which org am I acting as?" complexity. A Junior Coach is a Junior Coach everywhere. If promotion is needed, promote the account. |
| D-23 | **No `can_create_exercises` flag** | Keep v1's per-user permission flag | The v1 flag was a hack around unclear role separation. Exercise creation is a Senior Coach+ privilege. If a Junior Coach earns that trust, promote them. Clean separation of responsibility. |

### UI/UX Design

| # | Decision | Considered Alternatives | Reasoning |
|---|---|---|---|
| D-27 | **Palette B Refined "Warm Athletic"** (amber/rose/cyan) | Electric Functional (indigo), Muted Professional (blue) | Athletic energy matches Parkour audience. Rose accent is distinctive in fitness space. Amber→Rose→Cyan creates energy arc matching session intensity. Clear separation from LIMITLESS brand (gold/teal). |
| D-28 | **Tetris Duration Blocks** for builder canvas | Clean Card Stack (uniform height), Kanban Phase Columns | Duration-as-height is novel and instantly communicates session structure. Mobile-friendly (vertical stack). Paired with Warm Athletic palette, blocks form a visual energy bar. |
| D-29 | **Rich info density** (creator, thumbnail, domains) | Minimal (name + duration), Standard (+ sets, phase) | Professional tool for coaches — they need to see who created what, which domains, and difficulty at a glance. |
| D-30 | **Media-Prominent Cards** for library pages | Grid cards (Pinterest), List view (table), Toggle (grid/list) | Hero images/video match the social media paradigm coaches know (Instagram/YouTube). Movement is visual — exercises need video demos front and center. |
| D-31 | **Full Page Form** for exercise creation | Slide-out drawer, Multi-step wizard | Professional tool — experienced coaches want all fields at once, fast creation. Wizard considered for future onboarding if feedback signals issues with new coaches. |
| D-32 | **Full Page with Hero** for detail views | Split panel (master-detail) | Consistent with Media-Prominent library choice. Immersive video/photo hero, full reviews with creator responses, fork chain, "used in" sessions list. Shareable URL. |

### Strategy & Market

| # | Decision | Considered Alternatives | Reasoning |
|---|---|---|---|
| D-24 | **B2B-only v2 launch** | Launch B2B + B2C together | Focus. Build the professional tool first. B2C is an extension that works only if the B2B core is solid. |
| D-25 | **Growth-first freemium** (Render/Vercel model) | Paid-only with trial, freemium with crippled free tier | Top priority is user base growth. Free tier must be genuinely useful (full builder, community library, fork model) to attract coaches and drive network effects. |
| D-26 | **Parkour gyms as day-1 launch vertical** | General fitness, CrossFit, corporate wellness | Mature sport with money arriving (FIG, RedBull) but infrastructure lagging. Perfect gap. Direct partnerships already in progress. CrossFit has NIH syndrome. |

---

## 11. Open Questions

### Resolved During Design Review

| # | Question | Resolution |
|---|---|---|
| Q-01 | How do clients get assigned to coaches? | **Coach invites clients** (creates client entry with email). HUB booking → assignment is Phase 4+. Self-service browse is B2C client app scope. |
| Q-02 | Should the community library be available to free-tier users? | **Yes — fork + browse included in free tier.** Community access drives the network effect that is Cubes+'s core differentiator. Gating it would kill adoption. |

### Still Open

| # | Question | Impact | Who Decides | When Needed |
|---|---|---|---|---|
| Q-03 | Should Cubes+ support offline routine execution with sync-on-reconnect for hotel gym use? | Affects architecture (service worker, local DB). High value for Fuerte Group use case. | Product Owner + Engineering | Phase 5 (B2C app) |
| Q-04 | Real-time heart rate during workout (WebSocket from DT) or post-session review only? | WebSocket adds significant complexity. Post-session may be sufficient initially. | Product Owner | Phase 4 |
| Q-05 | Exercise demonstration videos: hosted in Cubes+ (Cloudinary/Mux) or shared media library with PATHS? | Affects storage costs and media management UX. PATHS already uses Cloudinary. | Architecture | Phase 1 (media upload) |
| Q-06 | Multi-language support for exercise names and instructions — same i18n approach as PATHS or separate? | Affects schema (localized fields change DB structure). Needed for European Parkour gyms (en/es/de/fr). | Architecture | Phase 3 (public launch) |
| Q-07 | B2C client app technology: React Native, PWA with custom manifest, or Capacitor? | Each has different build cost, maintenance burden, and platform capabilities (push notifications, offline). | Engineering | Phase 5 |
| Q-08 | Franchise support: build `parentOrganizationId` FK in Phase 3 or defer? | Low effort to add the FK now. Business logic (push templates, aggregate analytics) is significant. | Product Owner | Phase 3 |
| Q-09 | Marketplace payments: Stripe Connect (direct payout to creators) or manual payouts? | Connect scales but is more work. Manual payouts simpler for early marketplace. | Finance + Engineering | Phase 4 |
| Q-10 | Coach analytics: what specific metrics matter most? | Affects analytics schema and dashboard design. Needs coach user research from pilot. | Product Owner | Phase 3 (informed by pilot data) |
