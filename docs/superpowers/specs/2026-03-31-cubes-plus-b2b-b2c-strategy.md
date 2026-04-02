# Cubes+ B2B & B2C Platform Strategy

**Author:** Platform Strategy Architect  
**Date:** 2026-03-31  
**Status:** Draft — Pending Owner Review

---

## Table of Contents

1. [Competitive Landscape Summary](#1-competitive-landscape-summary)
2. [B2B Tenant Model](#2-b2b-tenant-model)
3. [Content Ownership & Visibility](#3-content-ownership--visibility)
4. [B2C Architecture Decision](#4-b2c-architecture-decision)
5. [Client Experience Design](#5-client-experience-design)
6. [Monetization Model](#6-monetization-model)
7. [Sharing & Collaboration Design](#7-sharing--collaboration-design)
8. [User Journey Maps](#8-user-journey-maps)
9. [Data Model Implications](#9-data-model-implications)

---

## 1. Competitive Landscape Summary

### Platform Comparison Matrix

| Platform | Pricing Model | Coach-Client Model | Marketplace | White-Label | B2B Multi-Tenant | Unique Strength |
|----------|--------------|-------------------|-------------|-------------|-------------------|-----------------|
| **ABC Trainerize** | Per-coach tiers ($22-350/mo), per-location for studios | Coach creates program, assigns to client via app | No | Yes (Custom Branded App) | Yes (Studio/Enterprise plans with locations) | Deepest gym integration (ABC Fitness parent), franchise support |
| **TrueCoach** | Per-client tiers ($20-107/mo) | Coach designs workout series, client sees via mobile app | No | No | Partial (multi-coach billing) | Simplest coach UX, "one screen" workout review |
| **TrainHeroic** | Per-coach ($10/mo base) + marketplace fees | Coach creates programs for teams or individuals | **Yes** — coaches sell programs/team subscriptions | No | Partial (Organization plan) | Only major platform with a real training marketplace |
| **PT Distinction** | Per-client tiers ($20/mo base, $1.60/client over 50) | Coach builds programs, assigns with automated delivery | No | Yes (Custom iOS/Android apps) | Multi-trainer (free extra trainers) | All features included at every tier, no upsells |
| **Everfit** | Per-coach tiers ($16-88/mo) | Coach creates multi-week plans, assigns to clients | No | Yes (white-label) | Studio plan for multi-coach | AI Workout Builder, integrated billing |
| **My PT Hub** | Per-coach ($20-49/mo), unlimited clients at higher tier | Coach builds programs, nutrition plans, habit coaching | No | Yes (Premium add-on) | Multi-trainer ($3-5/mo per additional trainer) | Lowest price for unlimited clients |

### What Competitors Do Well

1. **Mobile-first client experience.** Every competitor delivers training via a polished mobile app. Clients never touch the builder — they see a simplified daily view with exercise demos, logging, and messaging. This is table stakes.

2. **Template-based program delivery.** Coaches create once, assign to many. The "write a program once, customize per client" workflow is universal. No competitor makes coaches rebuild programs from scratch for each client.

3. **Integrated communication.** In-app messaging between coach and client (with media sharing) is standard. No one relies on external messaging.

4. **TrainHeroic's marketplace is the standout differentiator.** It is the only platform where coaches can sell training programs to strangers. The model works: coaches get exposure, athletes get quality programs, TrainHeroic takes $1/client/month + 30% on marketplace-driven sales. This is the closest analog to Cubes+ "knowledge sharing" vision.

5. **White-label is a premium upsell.** Trainerize, PT Distinction, Everfit, and My PT Hub all offer custom-branded apps as a premium feature. Gyms pay $75-350/month to put their logo on the app. This is pure margin.

### What Competitors Do Poorly

1. **No collaborative authoring.** Every platform treats program creation as a solo activity. There is no "fork this program," no version history, no co-authoring, no attribution. Coaches share by exporting PDFs or copy-pasting.

2. **No modular composition system.** Competitors work at the "workout" level (list of exercises with sets/reps). Nobody has Cubes+ "atomic building blocks that compose into routines that compose into programs." This is a genuine differentiator.

3. **No cross-organization knowledge sharing.** A coach at Gym A cannot discover what coaches at Gym B have built. Knowledge is siloed per account. TrainHeroic's marketplace partly addresses this but only for finished programs, not modular components.

4. **Shallow exercise libraries.** Most offer 500-1500 stock exercises. None have a community-contributed, peer-reviewed exercise/component library that grows organically.

5. **No longevity/health data integration.** No competitor connects training delivery to health biomarker data. The Cubes+ integration with Digital Twin (wearables, biomarkers, longevity scores) is completely unmatched.

### Cubes+ Strategic Opportunity

The gap in the market is clear: **collaborative, modular training design with health data feedback loops.** Competitors are coaching delivery platforms. Cubes+ can be a coaching knowledge platform — where the value compounds as more professionals contribute and refine training components.

---

## 2. B2B Tenant Model

### Recommendation: Organization-Based Multi-Tenancy

A "tenant" in Cubes+ is an **Organization** — any entity that employs or contracts coaches. This covers:

- A single gym
- A boutique studio
- A franchise location (each location = one Organization, franchise HQ = parent Organization)
- A sports academy
- A corporate wellness provider
- An independent coach operating solo (Organization of one)

The Organization is the **billing entity**, the **content boundary**, and the **administration unit**.

### User Hierarchy Within an Organization

```
Organization Owner
  └── Organization Admin(s)
       └── Head Coach(es)
            └── Senior Coach(es)
                 └── Junior Coach(es)
                      └── Clients (B2C extension)
```

| Role | Permissions | Typical Person |
|------|------------|----------------|
| **Organization Owner** | Full control: billing, plan management, org settings, user management, all content. Can delete the org. Can transfer ownership. | Gym owner, studio founder |
| **Organization Admin** | User management, org settings, all content CRUD, but cannot manage billing or delete the org. | Operations manager, head of training |
| **Head Coach** | Full content CRUD (create/edit/delete cubes, routines, super-routines). Can manage domains and difficulty levels. Can assign routines to any coach or client. Can grant junior coaches cube-creation permission. | Lead trainer, department head |
| **Senior Coach** | Full content CRUD. Can assign routines to junior coaches and clients. Cannot manage domains/difficulty levels or grant permissions. | Experienced trainer |
| **Junior Coach** | Can create routines and super-routines. Can create cubes only if explicitly granted permission by a Head Coach or above. Can assign routines to their own clients. | New hire, intern, apprentice |
| **Client** | Read-only for assigned programs. Can log workouts, track progress, message their coach. Cannot access the builder or any shared library. | Gym member, online coaching client |

### Why This Hierarchy

The existing Cubes+ v1 has four coach roles (Admin, Head Coach, Senior Coach, Junior Coach). The B2B model preserves this structure and adds two layers:

1. **Organization Owner/Admin** above the coaching hierarchy — separating business administration from training operations.
2. **Client** below — the training consumer who never sees the builder.

This means the v1 role system migrates cleanly. The existing `role` enum simply gains `org_owner`, `org_admin`, and `client` values, and the existing permission logic for the four coach roles stays intact.

### Multi-Organization Membership

A single user account (tied to one email, one LIMITLESS SSO identity) can belong to **multiple Organizations** with different roles in each. Use cases:

- A freelance coach works at two gyms
- A coach owns their own studio but also consults for a corporate wellness program
- A client trains at Gym A and also follows an independent online coach

The `organization_members` junction table carries the role, so the same person can be a Head Coach at Org A and a Junior Coach at Org B.

### Franchise Support (Phase 2+)

For franchises, introduce a `parent_organization_id` on the Organization entity. The parent org (franchise HQ) can:

- Push template content down to child orgs
- View aggregated analytics across locations
- Enforce brand-standard routines that locations cannot modify (locked templates)
- Manage billing centrally

This is not needed for launch but the data model should accommodate it from day one.

---

## 3. Content Ownership & Visibility

### Ownership Rules

1. **The creator owns the content.** When Coach Alice creates a cube, she is the `creator_id`. This never changes.

2. **The organization has a license.** Content created by a member while they belong to an organization is automatically licensed to that organization. If Coach Alice leaves Gym X, the cube remains in Gym X's library (the organization retains a non-exclusive license). Alice also retains it in her personal portfolio.

3. **This mirrors real-world employment.** A trainer who develops a program at a gym expects the gym to keep using it. But the trainer also expects to take their expertise to their next job. Cubes+ codifies this as: **creator retains authorship, organization retains usage rights.**

### Visibility Levels

Every cube, routine, and super-routine has a `visibility` field with four possible values:

| Visibility | Who Can See It | Default For |
|------------|---------------|-------------|
| `private` | Only the creator | Draft/work-in-progress content |
| `organization` | All members of the creator's organization | Newly activated content |
| `community` | All Cubes+ users (read-only, can be forked) | Explicitly shared by creator |
| `marketplace` | All Cubes+ users (available for purchase/free download) | Explicitly published by creator |

### Default Visibility Flow

```
Created → private (draft)
  ↓ Creator activates
Activated → organization (shared with gym)
  ↓ Creator explicitly shares
Shared → community (visible to all, forkable)
  ↓ Creator explicitly publishes
Published → marketplace (listed for download/purchase)
```

Each transition requires explicit action. Content never becomes more visible without the creator's consent.

### Organization Override Rules

Organization Admins and Owners can:

- **Promote visibility:** Move org content to `community` or `marketplace` (e.g., the gym wants to share their signature warm-up routine publicly).
- **Restrict visibility:** Lock content to `organization` only (e.g., proprietary training methodology that should not be shared).
- **Set org-wide defaults:** An organization can set its default visibility for new content (e.g., "all activated content starts as `community`").

Creators are notified when an admin changes their content's visibility.

### Cross-Tenant Sharing

Direct sharing between specific organizations is NOT supported in v1. Instead:

- Coach A at Gym X wants to share with Coach B at Gym Y → Coach A sets the content to `community` visibility, and Coach B can find and fork it.
- For private B2B partnerships (e.g., Gym X licenses their methodology to Gym Y) → use the marketplace with private listing links (unlisted but accessible via URL, like YouTube unlisted videos).

This avoids the complexity of explicit org-to-org sharing permissions while still enabling knowledge transfer.

---

## 4. B2C Architecture Decision

### The Three Options Evaluated

#### Option A: Embedded in Cubes+ (Same App, Role-Based UI)

- Clients log into the same Next.js app
- Route guards show `/builder` to coaches, `/my-training` to clients
- Single database, single deployment

**Pros:** One codebase, one deployment, simpler ops, shared auth is trivial.  
**Cons:** The builder is a complex desktop-optimized React app with drag-and-drop, multi-panel layouts, and real-time state management. Bolting a mobile-first client view onto this codebase creates bundle bloat, conflicting responsive design requirements, and cognitive load for developers working on either experience.

#### Option B: Separate Lightweight App Consuming Cubes+ API

- Cubes+ exposes a Programs API
- A separate PWA (or native app) serves the client experience
- Completely independent codebase and deployment

**Pros:** Clean separation, mobile-optimized, can be a PWA with offline support.  
**Cons:** Two codebases, API contract maintenance, two deployments, duplicated auth handling.

#### Option C: Hybrid — Same Next.js App, Separate Page Trees

- Coaches use `/builder`, `/admin`, `/library`
- Clients use `/my-training` — a completely separate page tree with its own layout, navigation, and mobile-first design
- Same Next.js app, same deployment, but the page trees share only the API layer and auth
- Route-based code splitting ensures clients never download builder code

**Pros:** One deployment, clean UX separation via Next.js route groups, shared API types and auth.  
**Cons:** Codebase grows, but route-based code splitting mitigates bundle concerns.

### Recommendation: Option C (Hybrid) — with a Long-Term Path to Option B

**For launch, build Option C.** Here is why:

1. **Cubes+ is being rebuilt on Next.js + Prisma + PostgreSQL.** The rebuild is the perfect moment to design the route structure with two separate page trees from day one. This is not "bolting on" — it is architecting with the dual audience in mind.

2. **Next.js App Router route groups are built for this.** The structure would be:

```
app/
  (coach)/          ← Coach experience (desktop-optimized)
    builder/
    library/
    admin/
    clients/
    layout.tsx       ← Multi-panel layout, sidebar nav
  (client)/         ← Client experience (mobile-first)
    my-training/
    progress/
    messages/
    layout.tsx       ← Bottom-tab navigation, card-based layout
  (shared)/         ← Shared pages
    login/
    onboarding/
    settings/
```

3. **Route-based code splitting means clients never download builder code.** The drag-and-drop library (dnd-kit), the multi-panel layout system, and all the builder state management stay in the `(coach)` route group. Clients download only their lightweight views.

4. **One deployment, one database, one auth system.** Given that Cubes+ already integrates with the LIMITLESS ecosystem via cookie-based JWT SSO, having one app simplifies everything.

5. **The migration path to Option B is natural.** If the client experience grows complex enough to warrant separation (native mobile app, offline-first PWA), the API layer is already clean because the `(client)` pages only talk to the server via API routes. Extract those API routes into a standalone service when needed.

### What About the OS Dashboard?

The LIMITLESS OS Dashboard (`os.limitless-longevity.health`) already exists as the unified entry point. The client training experience should appear **both** in Cubes+ directly (for gyms that use Cubes+ standalone) **and** as a widget/section in the OS Dashboard (for LIMITLESS ecosystem users).

Implementation: The OS Dashboard calls the same Cubes+ API endpoints and renders a summarized "Today's Training" card. Clicking it deep-links into the full Cubes+ client experience at `/my-training`.

### Digital Twin Integration

The feedback loop is the killer feature no competitor has:

```
Coach creates program in Cubes+ builder
  → Client receives program in /my-training
    → Client performs workout, wearable captures:
       - Heart rate zones (Oura/Garmin)
       - Recovery metrics (HRV, sleep)
       - Activity duration and intensity
    → Data flows to Digital Twin
      → Coach sees biometric feedback alongside training logs
        → Coach adjusts program based on real physiological data
```

This is implemented via the existing Digital Twin API (`/api/twin/:userId/...`). The Cubes+ client view posts workout completion events to Digital Twin's activity log, and the coach view reads biometric context from Digital Twin when reviewing client progress.

---

## 5. Client Experience Design

### What the Client Sees

The client experience is deliberately simple — a mobile-first interface with four screens:

#### Screen 1: Today (Home)

```
┌─────────────────────────┐
│  Good morning, Sarah     │
│  ─────────────────────  │
│  TODAY'S TRAINING        │
│  ┌─────────────────────┐│
│  │ 🏋️ Upper Body Power  ││
│  │ Coach: Mike R.       ││
│  │ 45 min · 6 exercises ││
│  │ [Start Workout →]   ││
│  └─────────────────────┘│
│                         │
│  UPCOMING               │
│  Wed: Recovery & Mobility│
│  Thu: Lower Body Strength│
│  Fri: Conditioning       │
│                         │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐  │
│  │🏠│ │📊│ │💬│ │👤│  │
│  └──┘ └──┘ └──┘ └──┘  │
└─────────────────────────┘
```

- Time-of-day greeting (matches OS Dashboard pattern)
- Today's assigned routine with one-tap start
- Upcoming schedule for the week
- Bottom tab navigation: Home, Progress, Messages, Profile

#### Screen 2: Active Workout

```
┌─────────────────────────┐
│  Upper Body Power  2/6   │
│  ─────────────────────  │
│  BENCH PRESS             │
│  ┌─────────────────────┐│
│  │  [Exercise Video]    ││
│  │  Demo / Coach Notes  ││
│  └─────────────────────┘│
│                         │
│  Set 1: 80kg × 8 [✓]   │
│  Set 2: 85kg × 6 [✓]   │
│  Set 3: 85kg × _  [ ]   │
│                         │
│  Coach note: "Focus on  │
│  eccentric control"     │
│                         │
│  [← Previous] [Next →]  │
│  ─────────────────────  │
│  ⏱ 23:41 elapsed        │
└─────────────────────────┘
```

- Video demonstration for each exercise (from cube media)
- Set/rep logging with weight tracking
- Coach notes per exercise
- Swipe or tap navigation between exercises
- Timer and elapsed duration

#### Screen 3: Progress

- Weekly/monthly training volume charts
- Personal records (lifted weight, session counts)
- If Digital Twin connected: HRV trend, recovery score, sleep quality alongside training load
- Photo progress (optional)
- Coach feedback history

#### Screen 4: Messages

- 1:1 chat with assigned coach(es)
- Media sharing (form check videos, photos)
- Structured check-in forms (weight, energy level, soreness — configured by coach)

### Client Onboarding Flow

1. Coach creates a client entry in Cubes+ (name + email)
2. Client receives an invitation email with a magic link
3. Client opens link → lands on LIMITLESS SSO login/register
4. After auth, client completes a profile (basic info, goals, experience level)
5. Client is connected to their coach and sees their first assigned program

Clients do NOT need to know about cubes, routines, or the builder. They see "programs" composed of "workouts" composed of "exercises" — consumer-friendly language.

### Terminology Translation

| Builder Term (Coach) | Client-Facing Term |
|----------------------|-------------------|
| Cube | Exercise Block |
| Routine | Workout |
| Super-Routine | Program |
| Domain | Training Focus |
| Assignment | My Schedule |

---

## 6. Monetization Model

### Recommended Pricing Strategy: Tiered Per-Organization + Marketplace Commission

After analyzing competitor pricing, the optimal model balances accessibility for individual coaches with scalable revenue from organizations.

### Pricing Tiers

| Tier | Price | Includes | Target |
|------|-------|----------|--------|
| **Solo** (free) | $0/mo | 1 coach, 3 clients, community library access (read-only), 50 cubes | Independent coach trying the platform |
| **Pro** | $29/mo | 1 coach, 25 clients, full community library (fork & contribute), unlimited cubes, client app, basic analytics | Freelance coach, small PT business |
| **Team** | $99/mo | 5 coaches, 100 clients, org library, assignment workflows, advanced analytics, white-label client app | Small gym, boutique studio |
| **Business** | $249/mo | 20 coaches, 500 clients, everything in Team + API access, custom branding, priority support | Mid-size gym, sports academy |
| **Enterprise** | Custom | Unlimited coaches/clients, franchise support, SSO, SLA, dedicated account manager | Franchise chains, corporate wellness |

Additional coach seats: $15/mo per coach beyond tier limit.  
Additional client seats: $1/mo per client beyond tier limit.

### Why This Model

1. **Free tier drives adoption.** Every competitor offers a free tier (Trainerize: 1 client free, Everfit: 5 clients free, TrueCoach: free trial). The free tier must be genuinely useful — 3 clients lets a coach actually test the platform with real people.

2. **Per-organization, not per-coach.** Charging per-coach penalizes growth. A gym adding a new trainer should not feel financial friction. The tiers include coach bundles with low per-seat overage. This is how Trainerize's Studio plan works, and it is the model gym owners prefer.

3. **Client seats scale gently.** $1/mo per client beyond the tier limit means a gym with 200 clients on the Team plan pays $99 + $100 = $199/mo. This is competitive with TrueCoach ($107/mo for unlimited) and Trainerize ($250/mo for studios).

4. **White-label as a tier feature, not an add-on.** Competitors charge $75-350/mo extra for white-label. Including it in Team and above makes the tier jump compelling.

### Marketplace Revenue

For the community marketplace (Phase 2+):

| Transaction Type | Creator Gets | Cubes+ Gets |
|-----------------|-------------|-------------|
| Free download | N/A | N/A (drives engagement) |
| Paid program sale | 80% | 20% |
| Paid subscription (team) | 85% | 15% |
| Marketplace-driven sale (Cubes+ referred) | 70% | 30% |

This is more generous than TrainHeroic's 70/30 split, which incentivizes creators to publish on Cubes+ first.

### Revenue Projections (Illustrative)

Assuming Year 1 targets of 500 Solo (free), 200 Pro, 50 Team, 10 Business, 2 Enterprise:

```
Pro:      200 × $29   = $5,800/mo
Team:      50 × $99   = $4,950/mo
Business:  10 × $249  = $2,490/mo
Enterprise: 2 × $500  = $1,000/mo (estimated)
Overages:              ≈ $2,000/mo
Marketplace:           ≈ $500/mo (early days)
────────────────────────────────────
Total:                 ≈ $16,740/mo ($200K ARR)
```

### LIMITLESS Ecosystem Bonus

LIMITLESS longevity clients who use the HUB for booking and Digital Twin for health tracking get Cubes+ Pro features included in their LIMITLESS membership. This drives ecosystem lock-in and differentiates the LIMITLESS offering from competitors who are fitness-only.

---

## 7. Sharing & Collaboration Design

### The Knowledge Ecosystem Vision

The vision is: "Knowledge should spread and grow from cooperation between professionals." This requires four mechanisms:

### 7.1 Fork Model (GitHub-Inspired)

Any community-visible cube, routine, or super-routine can be **forked**:

1. Coach browses the community library
2. Finds a "Dynamic Warm-Up for Over-50s" cube by Coach Maria
3. Clicks "Fork" → gets a copy in their own library
4. Modifies it (adds mobility exercises specific to their clients)
5. Their version shows: "Forked from Coach Maria's Dynamic Warm-Up for Over-50s"

**Attribution chain:** Every forked item carries a `forked_from_id` reference. The UI shows a lineage trail: "Original by Maria → Modified by John → Modified by you." This is visible but non-blocking — you can modify freely after forking.

**Key rule:** Forking creates an independent copy. Changes to the original do NOT propagate to forks (unlike Git). This is intentional — training programs are not software, and "merge conflicts" in workout routines make no sense.

### 7.2 Community Library with Quality Controls

The community library is the shared space where all `community`-visibility content appears. To prevent low-quality content from flooding it:

**Contribution requirements:**
- Minimum account age: 7 days
- Minimum content created: 5 cubes or 2 routines before you can share to community
- Profile must be complete (name, photo, expertise domains, bio)

**Quality signals (not gates):**
- Like count (existing system)
- Fork count (how many people found it useful enough to copy)
- Creator reputation score (based on total likes + forks across all their content)
- Domain tags (allows filtering to relevant specialties)

**Curation (Phase 2+):**
- Featured content curated by LIMITLESS editorial team
- "Staff Pick" badge for high-quality contributions
- Domain-specific leaderboards (top Strength creators, top Mobility creators)

**What is NOT included:** No upfront review/approval process. Content goes to community immediately if the creator meets the contribution requirements. Post-hoc moderation handles spam and plagiarism via a report mechanism.

### 7.3 Rating and Review System

Likes alone are insufficient for meaningful quality assessment. The system needs:

**Ratings:**
- 5-star rating on community content (only by users who have forked or used the content in a routine — prevents drive-by ratings)
- Aggregate rating displayed on content cards

**Reviews:**
- Optional text review when rating
- Reviews are public and tied to the reviewer's profile
- Creator can respond to reviews (one response per review)

**Credibility weighting:**
- Ratings from coaches with higher reputation scores carry more weight in the aggregate
- Ratings from coaches in the same domain specialty carry more weight

### 7.4 Collaboration Within Organizations

Beyond community sharing, organizations need internal collaboration tools:

**Shared organization library:** All `organization`-visibility content appears here. Coaches browse, fork, and build on each other's work within the gym.

**Assignment as collaboration:** Head coaches assign routines to junior coaches not just as "do this with your client" but as "learn this methodology." The assignment workflow already exists in v1.

**Team templates:** Organization Admins can mark content as "org template" — a locked, canonical version that coaches can fork but not edit. The gym's signature warm-up routine becomes a template that all coaches use as a starting point.

**Activity feed:** Organization-level feed showing "Coach John created a new routine," "Coach Sarah forked Coach John's routine," "Coach Mike published to community." This drives internal engagement and friendly competition.

---

## 8. User Journey Maps

### Journey 1: Gym Owner Onboards Their Team

```
Day 0: Gym Owner Discovery
├── Finds Cubes+ via search/referral/LIMITLESS partnership
├── Signs up with LIMITLESS SSO (or creates new account)
├── Selects "Team" plan → enters payment details
└── Creates Organization: "Peak Performance Gym"

Day 0: Initial Setup (15 minutes)
├── Uploads gym logo and brand colors
├── Creates training domains: "Strength," "Conditioning," "Mobility," "Sport-Specific"
├── Defines difficulty levels: "Beginner → Intermediate → Advanced → Elite"
└── Org is ready for coaches

Day 0-1: Invite Coaches
├── Owner goes to Admin → Team → Invite
├── Enters coach emails + roles (Head Coach: Mike, Senior Coaches: Sarah, John)
├── Coaches receive invitation email
├── Each coach clicks link → SSO login → joins "Peak Performance Gym"
├── Coaches complete onboarding (expertise domains, bio, photo)
└── Coaches can immediately access the builder

Week 1: Content Seeding
├── Head Coach Mike creates foundational cubes (warm-ups, core exercises, cooldowns)
├── Mike sets cubes to "organization" visibility
├── Senior coaches fork Mike's cubes and build routines for their specialties
├── Owner reviews library → marks key routines as "org templates"
└── Organization library has 50+ cubes and 10+ routines

Week 2: Client Onboarding
├── Coaches add their clients (name + email)
├── Clients receive invitation → register → complete profile
├── Coaches assign programs (super-routines) to clients
├── Clients open /my-training → see their first workout
└── Training delivery begins
```

### Journey 2: Senior Coach Creates and Shares a Program

```
1. Open Builder (Desktop)
├── Coach Sarah opens Cubes+ on her laptop
├── Left panel: Super-Routines Repository
├── Center: Builder Canvas
├── Right panels: Routines Repository, Cubes Repository
└── All panels show org + personal content

2. Create New Cubes (if needed)
├── Sarah needs a "Kettlebell Complex" cube that doesn't exist
├── Opens cube creator → names it, sets domain "Strength," category "Main Part"
├── Adds 4 exercises with sets/reps, attaches demo videos from Cloudinary
├── Sets duration: 15 minutes
├── Saves as draft (private) → reviews → activates (becomes org-visible)
└── Cube appears in the Cubes Repository

3. Build a Routine
├── Sarah drags cubes from the repository to the canvas:
│   - "Dynamic Warm-Up" (from org templates)
│   - "Kettlebell Complex" (her new cube)
│   - "Core Circuit" (forked from community, modified)
│   - "Cooldown Stretch" (from org templates)
├── Reorders via drag-and-drop
├── Total duration auto-calculates: 55 minutes
├── Adds routine metadata: name, difficulty, instructions
└── Saves and activates → "Full Body Kettlebell Session"

4. Build a Program (Super-Routine)
├── Sarah drags 3 routines to create a 3-day-per-week program:
│   - Mon: Full Body Kettlebell Session
│   - Wed: Upper Body Strength
│   - Fri: Conditioning & Mobility
├── Names it: "4-Week Kettlebell Foundation"
├── Adds program description and progression notes
└── Saves and activates

5. Assign to Client
├── Sarah goes to Clients → selects "Tom R."
├── Assigns "4-Week Kettlebell Foundation" starting next Monday
├── Adds personal note: "Start light, focus on form week 1"
└── Tom receives notification in his client app

6. Share to Community (Optional)
├── Program is well-received by gym colleagues
├── Sarah changes visibility to "community"
├── Adds tags: "kettlebell," "beginner-friendly," "full-body"
├── Program appears in the community library
├── Other coaches discover, fork, and rate it
└── Sarah's reputation score increases
```

### Journey 3: Client Follows Their Assigned Program

```
Monday Morning: Open App
├── Client Tom opens Cubes+ on his phone → /my-training
├── Sees: "Today's Workout: Full Body Kettlebell Session · 55 min"
├── Taps "Start Workout"
└── Active workout screen loads

During Workout:
├── Exercise 1: Arm Circles (from Dynamic Warm-Up cube)
│   ├── Video demo plays automatically
│   ├── Coach note: "30 seconds each direction"
│   ├── Tom taps "Done" → next exercise
│   └── Timer tracks rest periods
├── Exercise 2-8: Main exercises
│   ├── Each shows: video demo, sets × reps, target weight
│   ├── Tom logs actual weight and reps per set
│   ├── Green checkmarks appear on completed sets
│   └── "Focus on eccentric control" — coach note
├── Exercise 9-10: Cooldown
│   ├── Guided stretches with hold timers
│   └── Tom completes all exercises
└── Workout Complete screen → shows summary:
    - Duration: 52 minutes
    - Volume: 4,200 kg total
    - "Great session! Tell your coach how it felt" → quick feedback

Post-Workout (Automatic):
├── Workout completion event → Digital Twin activity log
├── Oura Ring captures: resting HR recovery, HRV post-session
├── Sleep data tonight feeds into recovery score
└── Coach Sarah sees in her dashboard:
    - Tom completed Monday's workout (52 min)
    - Training load: moderate
    - Recovery trend: improving
    - HRV: 45ms (above Tom's baseline)

Wednesday: Coach Reviews and Adjusts
├── Sarah reviews Tom's Monday data
├── Sees strong recovery metrics → adjusts Wednesday intensity up
├── Edits Tom's Wednesday routine to add an extra set on key lifts
├── Tom sees the updated workout when he opens the app Wednesday
└── Feedback loop complete: data → insight → adjustment → delivery
```

---

## 9. Data Model Implications

### New Entities Required for B2B/B2C

The existing Cubes+ v1 data model needs the following additions:

```
┌─────────────────────────────────────────────────────────┐
│ EXISTING (v1)                                            │
│                                                          │
│ users, domains, categories, difficulty_levels,           │
│ cubes, routines, super_routines,                         │
│ cube_domains, routine_domains, sr_domains,               │
│ cube_nesting, routine_cubes, sr_routines,                │
│ cube_media, cube_youtube_links,                          │
│ likes, assignments, conversations, messages,             │
│ notifications                                            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ NEW (B2B Multi-Tenancy)                                  │
│                                                          │
│ organizations                                            │
│   id, name, slug, logo_url, brand_colors (JSON),         │
│   plan_tier, billing_email, stripe_customer_id,          │
│   default_content_visibility, parent_organization_id,    │
│   settings (JSON), created_at, updated_at, deleted_at    │
│                                                          │
│ organization_members                                     │
│   id, organization_id (FK), user_id (FK),                │
│   role (org_owner|org_admin|head_coach|senior_coach|     │
│         junior_coach|client),                            │
│   can_create_cubes, invited_by (FK), joined_at,          │
│   status (invited|active|suspended|departed),            │
│   created_at, updated_at                                 │
│                                                          │
│ organization_invitations                                 │
│   id, organization_id (FK), email, role,                 │
│   invited_by (FK), token, expires_at,                    │
│   accepted_at, created_at                                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ NEW (Content Visibility & Sharing)                        │
│                                                          │
│ -- Add to cubes, routines, super_routines:               │
│    visibility (private|organization|community|            │
│               marketplace)                               │
│    organization_id (FK, nullable — null = personal)      │
│    forked_from_id (FK, nullable, self-referencing)        │
│    is_org_template (boolean, default false)               │
│    marketplace_price (decimal, nullable)                  │
│    download_count (integer, default 0)                    │
│                                                          │
│ content_ratings                                          │
│   id, entity_type, entity_id, user_id (FK),             │
│   rating (1-5), review_text, creator_response,           │
│   created_at, updated_at                                 │
│                                                          │
│ content_reports                                          │
│   id, entity_type, entity_id, reporter_id (FK),         │
│   reason (spam|plagiarism|inappropriate|other),          │
│   description, status (open|reviewed|resolved),          │
│   reviewed_by (FK), created_at, resolved_at              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ NEW (B2C Client Training Delivery)                       │
│                                                          │
│ client_programs                                          │
│   id, client_id (FK → users), coach_id (FK → users),    │
│   organization_id (FK), super_routine_id (FK),           │
│   start_date, end_date, status (active|paused|           │
│   completed|cancelled), notes, created_at, updated_at    │
│                                                          │
│ workout_logs                                             │
│   id, client_id (FK), routine_id (FK),                   │
│   client_program_id (FK), scheduled_date, started_at,    │
│   completed_at, duration_seconds, notes,                 │
│   perceived_effort (1-10), mood (1-5),                   │
│   created_at, updated_at                                 │
│                                                          │
│ exercise_logs                                            │
│   id, workout_log_id (FK), cube_id (FK),                 │
│   exercise_index (position within cube),                 │
│   exercise_name, sets_completed (JSON array:             │
│   [{weight, reps, duration, rest_seconds}]),             │
│   notes, created_at                                      │
│                                                          │
│ client_checkins                                          │
│   id, client_id (FK), coach_id (FK),                     │
│   organization_id (FK), checkin_type (weekly|custom),     │
│   responses (JSON — dynamic form responses),             │
│   photos (JSON array of URLs), weight, body_fat,         │
│   energy_level (1-5), soreness_level (1-5),              │
│   created_at                                             │
│                                                          │
│ coach_client_messages                                    │
│   id, sender_id (FK), receiver_id (FK),                  │
│   organization_id (FK), content, media_url,              │
│   media_type, read_at, created_at                        │
│                                                          │
│ -- Digital Twin integration (no new tables —             │
│    workout_logs post to DT activity log via API)         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ NEW (Marketplace & Billing)                              │
│                                                          │
│ marketplace_purchases                                    │
│   id, buyer_id (FK), entity_type, entity_id,            │
│   seller_id (FK), price, currency,                       │
│   platform_fee, seller_revenue,                          │
│   stripe_payment_intent_id, status, created_at           │
│                                                          │
│ subscription_plans                                       │
│   id, name, tier (solo|pro|team|business|enterprise),    │
│   price_monthly, price_annual, max_coaches,              │
│   max_clients, features (JSON), stripe_price_id,         │
│   active, created_at, updated_at                         │
│                                                          │
│ organization_subscriptions                               │
│   id, organization_id (FK), plan_id (FK),                │
│   stripe_subscription_id, status, current_period_start,  │
│   current_period_end, cancelled_at, created_at           │
└─────────────────────────────────────────────────────────┘
```

### Changes to Existing Entities

| Entity | Change | Reason |
|--------|--------|--------|
| `users` | Add `paths_user_id` (integer, nullable) | SSO bridge to LIMITLESS ecosystem |
| `users` | Add `reputation_score` (integer, default 0) | Community quality signals |
| `users` | Add `bio` (text, nullable) | Community profile |
| `users` | Role enum: add `org_owner`, `org_admin`, `client` | Note: role is NOW per-organization via `organization_members`, not a global user field. The user-level `role` field becomes deprecated in favor of the membership role. |
| `cubes` | Add `visibility`, `organization_id`, `forked_from_id`, `is_org_template`, `marketplace_price`, `download_count` | Visibility and sharing |
| `routines` | Same additions as cubes | Visibility and sharing |
| `super_routines` | Same additions as cubes | Visibility and sharing |
| `assignments` | Add `client_id` (FK, nullable) | Assignments can now target clients, not just coaches |

### Migration Strategy

The existing v1 database has all content owned by a single implicit organization (LIMITLESS internal). The migration is:

1. Create an "LIMITLESS" organization record
2. Set `organization_id` on all existing content to the LIMITLESS org
3. Set `visibility = 'organization'` on all existing active content
4. Create `organization_members` records for all existing users with their current roles
5. Deprecate the user-level `role` column (keep for backward compat, read from `organization_members`)

This is a non-destructive migration — no data is lost, and the v1 experience continues to work with the new multi-tenant layer on top.

---

## Appendix: Implementation Phasing

### Phase 1: Foundation (Rebuild)
- Next.js + Prisma + PostgreSQL rebuild with the v1 feature set
- Organizations table and membership (single-tenant: LIMITLESS only)
- Route group structure: `(coach)` and `(client)` from day one
- Visibility field on content (defaults to `organization`)
- LIMITLESS SSO integration (cookie-based JWT)

### Phase 2: Multi-Tenancy
- Organization CRUD, billing integration (Stripe)
- Invitation system for coaches
- Organization library isolation (content scoped to org)
- Org admin dashboard

### Phase 3: Client Delivery (B2C)
- Client role and onboarding flow
- `/my-training` client experience (mobile-first)
- Workout logging (exercise_logs, workout_logs)
- Coach-client messaging
- Digital Twin integration (workout events → activity log)

### Phase 4: Community & Marketplace
- Community visibility level
- Fork mechanism with attribution
- Rating and review system
- Community library with search and filters
- Marketplace listings and Stripe Connect for creator payouts

### Phase 5: Scale
- Franchise support (parent organizations)
- White-label configuration
- API access for Business/Enterprise tiers
- Native mobile app evaluation (if PWA proves insufficient)
- Advanced analytics and reporting

---

## Sources

- [ABC Trainerize Pricing](https://www.trainerize.com/pricing/)
- [ABC Trainerize for Gyms and Studios](https://www.trainerize.com/gyms-and-studios/)
- [ABC Trainerize Multi-Location Support](https://help.trainerize.com/hc/en-us/articles/115001561346)
- [TrueCoach Pricing](https://truecoach.co/pricing/)
- [TrueCoach Reviews — G2](https://www.g2.com/products/truecoach/reviews)
- [TrainHeroic Marketplace — Selling Teams vs Programs](https://support.trainheroic.com/hc/en-us/articles/18156885545997)
- [TrainHeroic — Become a Seller](https://www.trainheroic.com/become-a-seller/)
- [TrainHeroic Marketplace](https://marketplace.trainheroic.com/)
- [PT Distinction Features](https://www.ptdistinction.com/features)
- [PT Distinction Pricing](https://www.ptdistinction.com/pricing)
- [Everfit Pricing](https://everfit.io/pricing/)
- [Everfit Reviews — G2](https://www.g2.com/products/everfit/reviews)
- [My PT Hub Pricing](https://www.mypthub.net/pricing/)
- [My PT Hub Features](https://www.mypthub.net/)
