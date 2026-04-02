# LIMITLESS PATHS — Platform Improvement Plan

**Date:** 2026-03-26
**Status:** Phase 11 complete — all improvement phases deployed (brand unification through telemedicine bridge)
**Scope:** UX/UI overhaul + competitive value proposition

## Phase 1 Implementation Status (2026-03-26)

### Completed
- **Brand token unification:** 53 `amber-500` → `brand-gold`, generic tokens → brand equivalents across 20 files
- **Typography pass:** `font-serif` → `font-display` across 11 files, content headings upgraded
- **Expert profile fields:** Added `bio`, `expertise`, `credentials`, `linkedIn`, `publicProfile` to Users collection
- **DB migration:** `20260326_120000_expert_profile_fields.ts` created (pending production run)
- **ExpertCard component:** Created with inline + card variants, gold ring avatar, credential display, LinkedIn link
- **Content page integration:** ExpertCard wired into article detail (author) and course detail (instructor) pages
- **Build verified:** All changes pass `pnpm build`

### Pending: Tier Restructuring Strategy (G2)

**Current tiers:** Free, Regular, Premium, Enterprise (differentiated only by content access level)

**Proposed restructuring:**

| Tier | Price | Content Access | AI Tutor | Features |
|------|-------|---------------|----------|----------|
| **Free** | €0 | Articles only | None (0/day) | Pillar browsing, 10 searches/day |
| **Regular** | ~€15/mo | Articles + Courses | 10/day | Enrollment tracking, quiz generation |
| **Premium** | ~€30/mo | All content | 50/day | Health profile, personalized paths, daily protocols, action plans, 10% diagnostic discount |
| **Enterprise/VIP** | Custom | All content | Unlimited | Telemedicine, expert Q&A priority, cohort programs, family accounts, annual diagnostic included |

**Implementation steps (no code changes needed):**
1. Create Stripe products and price IDs for new tiers in Stripe Dashboard
2. Update MembershipTiers records in Payload admin panel (name, features list, prices, stripe IDs)
3. Update rate limiter config in `src/ai/rateLimiter.ts` if tier daily limits change
4. Current access control architecture (`getEffectiveAccessLevels` in `src/utilities/accessLevels.ts`) supports this without code changes

**Key principle:** Differentiate by *real value* (health profile, protocols, diagnostic discounts), not just content gating. This kills price comparison to Udemy's €10 courses.

### Pending: Clinical Case Study Content Plan (D1)

**What:** De-identified patient journeys showing diagnostics → interventions → outcomes.

**Format:** Standard articles with a "Case Study" tag/pillar. No new content type needed.

**Content template:**
1. Patient profile (anonymized: age, gender, role, presenting concerns)
2. Initial diagnostics (which tests, key findings, biomarker baselines)
3. Intervention protocol (which pillars, specific recommendations)
4. Timeline and compliance
5. Follow-up diagnostics (biomarker changes, improvements)
6. Key takeaways

**Production requirements:**
- Hospital data sharing agreement with Recoletas Salud
- Patient consent process for anonymized case publication
- Clinical review by Dr. Lysenko before publication
- Minimum 3 case studies for launch (one per founder's domain: metabolic, movement, nutrition)

**Why this matters:** Most compelling evidence for UHNW buyers. They want results from people like them. No generic education platform can produce these.

---

## Phase 2 Implementation Status (2026-03-26)

### Completed
- **FIX NEEDED (UI/UX placement issue) User dashboard:** `/dashboard` with welcome message, tier badge, active course progress, recommendations, quick AI tutor access
- **FIX NEEDED (UI/UX placement issue) Diagnostic booking MVP:** `diagnostic-booking` endpoint, package browsing and selection
- **FIX NEEDED (TOO DARK) Onboarding flow:** 3-step welcome modal after first login (Welcome → Choose pillars → First course recommendation), `hasCompletedOnboarding` checkbox field on Users
- **Content page redesign:** Brand-unified cards, articles, and course pages with glassmorphism and brand tokens
- **Diagnostic upsell engine:** Content-to-diagnostic mapping, contextual suggestions after course completion

---

## Phase 3 Implementation Status (2026-03-26)

### Completed
- **HealthProfiles collection:** Biomarkers (vitamin D, hsCRP, HbA1c, etc.), goals, conditions, medications, pillar priorities. Owner-only access control. NOT indexed in RAG (health data privacy by omission).
- **Health-context AI tutor:** `buildHealthContextSection` shared formatter injects health profile into tutor system prompt. Graceful degradation when no health profile exists. Biomarker-aware responses for Premium+ users.
- **AI Action Plans:** `ActionPlans` collection + `/api/actionPlan` endpoint. Generates personalized 30-day structured plans based on course content + health profile. Weekly breakdown with daily actions.
- **Content Discovery:** `/api/discover` endpoint. Conversational content discovery using semantic search + AI ranking. Natural language queries ("I sleep poorly and want to improve metabolic health") return structured learning paths.
- **Daily Protocols:** `DailyProtocols` collection + `/api/dailyProtocol` (generate) + `/api/dailyProtocolStatus` (toggle completion). Personalized morning/afternoon/evening protocols based on health profile and course progress.
- **3 new model entries** in AI config for action plans, discovery, and daily protocols
- **3 new rate limit tiers** for action plan generation, discovery queries, and protocol generation
- **3 DB migrations** for HealthProfiles, ActionPlans, and DailyProtocols collections

---

## Executive Summary

With the PATHS MVP live in production, this plan identifies improvements across two domains:

1. **UX/UI** — resolving the "split personality" between the premium homepage and generic content pages, and elevating every touchpoint to match the "Scientific Luxury" brand
2. **Value Proposition** — leveraging LIMITLESS's unique assets (hospital, hotel, expert team, AI) to build features no competitor can replicate

The core competitive argument:

> **vs Udemy/Coursera:** "They sell courses. We sell outcomes — measured by your actual biomarkers."
> **vs Masterclass:** "Our instructors don't just teach — they treat. They're the same doctors who run your blood panels."
> **vs Headspace/Calm:** "We offer a complete longevity operating system: personalized by your biomarkers, guided by clinical protocols, verified by diagnostic re-testing."

The moat is the integration: **hospital + hotel + education + AI + real clinicians**, all connected by health data. No competitor can replicate this without building all four pillars simultaneously.

---

## Domain 1: UX/UI

### The Core Problem: Split Personality

The platform has two visual identities. The homepage follows the "Scientific Luxury" brand (dark backgrounds, glassmorphism, gold/teal accents, Cormorant Garamond headings). But once users navigate to content pages (articles, courses, search, account), it falls back to generic Tailwind defaults — different colors (`amber-500` instead of `brand-gold`), no display fonts, plain backgrounds. It feels like two different products.

---

### P0 — Critical (do first, ~1-2 days)

#### A1. Design Token Inconsistency

- **Current state:** Homepage uses brand tokens (`bg-brand-dark`, `text-brand-gold`, `font-display`, glassmorphism). Content pages use generic Tailwind (`text-muted-foreground`, `bg-muted`, `border-border`, `amber-500`).
- **Problem:** Navigating from homepage to `/articles` is a jarring visual shift. The accent color changes from `brand-gold` (#C9A84C) to `amber-500` (a different, more orange hue). Content pages look like a generic SaaS template.
- **Fix:** Replace all `amber-500` with `brand-gold`. Replace `bg-muted` with brand equivalents. Apply `bg-brand-dark` or `bg-brand-dark-alt` backgrounds to content pages. Style content page headers with brand tokens.
- **Key files:** `ContentListItem`, `PillarFilter`, `EnrollButton`, `LockedContentBanner`, `TutorPanel`, `AccountNav`, all article/course pages.
- **Complexity:** Medium (systematic find-and-replace across ~15 files, then visual tuning)

#### A2. Typography Underutilization

- **Current state:** Layout loads Cormorant Garamond (`font-display`) and Inter (`font-sans`). Homepage uses both beautifully. Content pages rely on `prose` defaults — article titles use `text-3xl font-bold` (Inter), not the elegant Cormorant Garamond.
- **Problem:** The `font-display` typeface that gives the brand its luxury character disappears once you leave the homepage.
- **Fix:** Apply `font-display` to all page-level headings (article titles, course titles, section headings). Customize the Tailwind typography plugin to use Cormorant Garamond for `prose` headings.
- **Complexity:** Low (typography plugin config + a few component class changes)

---

### P1 — High Priority (~5-8 days)

#### B1. Navigation — Limited Content Discovery

- **Current state:** Three hardcoded nav items (Courses, Articles, Guide) plus search icon. No visual indicators of content depth.
- **Problem:** No "Dashboard" or "My Learning" for logged-in users. No way to browse by pillar from nav. Search icon is small and easy to miss. AI Tutor only accessible from within articles.
- **Fix:** Add "Dashboard" link for authenticated users. Add dropdown mega-menu for Courses by pillar. Make search expandable in header. Add persistent floating AI Tutor button on all content pages.
- **Complexity:** Medium

#### B2. Missing User Dashboard

- **Current state:** Authenticated users get `/account/profile`, `/account/billing`, `/account/courses`. No central dashboard.
- **Problem:** No "home base" for logged-in users. No at-a-glance progress, recommendations, or activity view. After login, users land on a generic listing page.
- **Fix:** Create `/dashboard` with: welcome message + tier badge, active course progress cards, recently viewed articles, recommended content, learning streak, quick access to AI tutor. Redirect logged-in users here after login.
- **Complexity:** High

#### C1. Article Reading Experience

- **Current state:** Clean layout with sidebar (TOC, tutor button, related content), main content area, RichText. Uses generic typography.
- **Problem:** No reading time estimate. No scroll progress indicator. Generic typography. No related articles at bottom (only in sidebar, hidden on mobile). No share buttons.
- **Fix:** Add estimated reading time. Add thin scroll progress bar (gold gradient) at top. Apply `font-display` to title. Add "Related Content" section at bottom. Add share buttons (copy link, LinkedIn).
- **Complexity:** Low-Medium

#### C2. Course/Lesson Flow and Progress

- **Current state:** Module breakdown with lesson lists, checkmarks for completed lessons, small progress bar.
- **Problem:** Progress bar is tiny (h-1.5). No module completion summary. No time remaining estimate. No celebration on course completion.
- **Fix:** Add per-module completion summary ("3/5 lessons completed"). Make progress bars more prominent (h-2.5 + percentage). Add time remaining estimate. Add completion celebration.
- **Complexity:** Medium

#### D1. Onboarding Flow

- **Current state:** Register → verify email → dropped into platform with no guidance.
- **Problem:** Cold start problem. New users face a blank slate. Premium audience expects white-glove treatment.
- **Fix:** 3-step welcome modal after first login: Welcome → Choose pillars → First course recommendation. Pre-enroll in "Getting Started" course. Show persistent banner until key actions completed.
- **Complexity:** Medium

#### D2. Paywall Design

- **Current state:** `LockedContentBanner` shows a small inline banner with lock icon and "Upgrade" link. Uses `amber-500`.
- **Problem:** Too subtle. No content preview or teaser. No social proof. Billing page tier cards are generic.
- **Fix:** Full-width gradient section with blurred content preview. Benefit summary. Testimonial quote. Comparison table with "Most Popular" badge and annual savings callout.
- **Complexity:** Medium

#### D3. Social Proof and Trust Signals

- **Current state:** No testimonials visible (data is fetched but section may not be wired up). No partner logos. No user count. No expert credentials displayed.
- **Problem:** C-suite / UHNW audience needs strong social proof before engaging.
- **Fix:** Wire up TestimonialsSection on homepage. Add partner logos bar. Show instructor credentials on course pages. Add aggregate stats ("200+ hours of content").
- **Complexity:** Low-Medium

#### E4. Content Cards

- **Current state:** Homepage uses gorgeous `GlassCard` with glassmorphism. Content listing pages use `ContentListItem` — plain horizontal rows with `border-border` styling, no imagery on mobile.
- **Problem:** Content list items look utilitarian. No hover effects beyond background color. Two completely different card systems.
- **Fix:** Unified `ContentCard` component with brand styling (glass background, gold hover border, brand typography). Always show thumbnails on mobile. Add "new" indicator for recent content.
- **Complexity:** Medium

#### A6. Mobile Responsiveness

- **Current state:** Homepage grids collapse properly. Auth forms center. Hamburger menu works.
- **Problem:** `ContentListItem` images hidden on mobile (sparse text-only list). No aspect ratio control on featured images. No floating TOC on mobile for lessons.
- **Fix:** Show smaller thumbnails on mobile. Add `aspect-video` to featured images. Add floating TOC button for lesson pages.
- **Complexity:** Medium

---

### P2 — Medium Priority (~3-5 days)

#### A4. Dark Mode Enforcement

- Force dark mode across the platform (brand is fundamentally dark). Remove or hide theme selector. Create proper light-mode brand treatment later if needed.
- **Complexity:** Low

#### A5. Animation & Micro-Interactions

- Add skeleton loading states for data-dependent pages. Add hover lift (translate-y + shadow) to content cards. Replace hero scroll indicator `animate-pulse` with gentler animation. Add entrance animations to content headings. Page transitions via `loading.tsx`.
- **Complexity:** Medium

#### B3. Search UX

- Add "AI-Powered Search" badge. Show suggested/trending searches on empty state. Add collection type icons to results. Add pillar filter chips. Style with brand aesthetics.
- **Complexity:** Medium

#### B4. Breadcrumb Navigation

- Add consistent breadcrumbs: `Home > Courses > [Course] > [Lesson]`, `Home > Articles > [Pillar] > [Article]`. Brand silver for inactive crumbs, gold for current.
- **Complexity:** Low

#### C3. Quiz Interaction Design

- Style quiz blocks with distinct card treatment. Add immediate feedback with explanations. Show score summary. Track results. Allow retakes.
- **Complexity:** High

#### C4. AI Tutor Polish

- Add slide-in animation. Render markdown in responses. Add suggested starter questions. Persist chat in sessionStorage. Add copy button. Typing indicator (animated dots).
- **Complexity:** Medium

#### E1. Auth Pages

- Add show/hide password toggle. Password strength meter on registration. Split layout on desktop (branding sidebar + form). Structured error messages with icons.
- **Complexity:** Low-Medium

#### E2. Header

- Add mobile menu slide animation. Consider "by LIMITLESS" subtitle under PATHS logo. Notification bell placeholder.
- **Complexity:** Low

#### E3. Footer

- Multi-column footer: logo + tagline, platform links, company links (Privacy, Terms), social links. Add LinkedIn and contact email. Move/remove theme selector.
- **Complexity:** Low

#### E6. Account Pages

- Add avatar display (circular with gold border). Replace "Loading..." with skeleton states. Brand typography for headings. Tier status card at top. More whitespace.
- **Complexity:** Low-Medium

#### D4. Gamification (Phase 1)

- Completion certificates for finished courses. Learning streak on dashboard. Pillar mastery badges (Phase 2).
- **Complexity:** Medium

---

### P3 — Nice-to-Have

- **C5. Video player:** Add `title` attribute to iframes (accessibility), branded container, loading skeleton. Progress tracking via player APIs is future work.
- **E5. Platform guide:** Apply brand tokens to role cards, sidebar border, page titles. Functional layout is solid.

---

## Domain 2: Value Proposition & Competitive Edge

### Current Platform Capabilities (What Already Exists)

- Full LMS: courses (modules, lessons, quizzes), articles, enrollment tracking, lesson progress
- AI-powered RAG tutor (Jina embeddings + pgvector + Qwen models, streaming SSE, tier-based rate limiting)
- AI quiz generation from content
- Semantic search with reranking
- AI content recommendations (excluding completed content)
- 4-tier access control (Free/Regular/Premium/Enterprise) with "highest wins" union
- Stripe billing with webhook-driven tier sync
- Editorial workflow state machine (Draft → In Review → Approved → Published → Archived)
- Multi-tenant B2B with org isolation
- 7 Lexical rich-text blocks (VideoEmbed, AudioEmbed, Callout, CodeBlock, PDFViewer, ImageGallery, QuizQuestion)
- 6 content pillars
- 50-page platform guide across 7 user roles

### What Does NOT Exist Yet (Gaps)

- No health data / biomarker integration
- No booking or scheduling system
- No community features (forums, discussions, cohort learning)
- No gamification or achievement system
- No notification/reminder system
- No habit tracking or daily practice features
- No certificates/credential generation
- No live/interactive content (webinars, live Q&A)
- No Digital Twin integration
- No telemedicine integration
- No family accounts or pediatric-specific content structure
- No progress dashboard beyond basic completion percentage

---

### P0 — Critical for Differentiation

#### A3. Expert Practitioner Profiles

- **Description:** Every article and course prominently features the real expert who created it — credentials, hospital affiliation, specialization, video introduction. Not "a course by LIMITLESS" but "a course by Dr. Maria Santos, Head of Metabolic Medicine at Recoletas Salud."
- **Why:** Udemy has anonymous instructors. Coursera has university brands but impersonal delivery. Masterclass has celebrities, not practitioners. LIMITLESS has actual clinicians who see patients.
- **Complexity:** Low
- **Dependencies:** Extended User profile fields (bio, credentials, photo, video intro), frontend profile pages

#### D1. Clinical Case Studies (De-identified)

- **Description:** Real patient journeys (anonymized): diagnostic findings → interventions → outcomes over time. "Patient A, 52M, CEO: Initial DEXA showed sarcopenia. After 16 weeks of Movement + Nutrition protocol, lean mass increased 8%."
- **Why:** Most compelling evidence for UHNW buyers. They want results from people like them. No generic platform can produce these.
- **Complexity:** Low (content creation, not engineering)
- **Dependencies:** Hospital data sharing agreement, patient consent process

#### G1. Diagnostic Package Upsell Engine

- **Description:** As users progress through content, PATHS suggests relevant diagnostic packages. "You completed our Metabolic Health course — want to see where you stand? Our Basic Metabolic Panel at Recoletas: EUR 800, includes pre/post PATHS learning paths."
- **Why:** Education subs = EUR 15/mo. Diagnostics = EUR 800-3,500 one-time. If 5% of subscribers book one diagnostic per year, the platform pays for itself many times over. This is the primary revenue multiplier.
- **Complexity:** Medium
- **Dependencies:** Diagnostic package catalog, content-to-diagnostic mapping, booking flow

#### G2. Tier Restructuring with Real Value Differentiation

- **Description:** Restructure tiers around concrete value, not just content access:
  - **Free:** Articles, pillar browsing, 10 semantic searches/day. No AI tutor, no courses.
  - **Regular (~EUR 15/mo):** All Free + courses, enrollment tracking, 10 AI tutor conversations/day, quiz generation.
  - **Premium (~EUR 30/mo):** All Regular + health profile, personalized learning paths, 50 AI conversations/day, daily protocols, action plans, 10% diagnostic discount.
  - **Enterprise/VIP:** All Premium + telemedicine, expert Q&A priority, cohort programs, family accounts, unlimited AI, annual diagnostic included.
- **Why:** Current differentiation is content access level only. Real value differentiation (health profile, protocols, diagnostic discounts) justifies premium pricing and kills comparison to Udemy's EUR 10 courses.
- **Complexity:** Low-Medium

#### E1. Diagnostic Booking MVP

- **Description:** Browse and book diagnostic packages from within PATHS. Package selection with educational content explaining each test, date/time selection, pre-appointment preparation content.
- **Why:** Turns PATHS from an education platform into the front door for clinical services. Even a simple booking form is valuable.
- **Complexity:** Medium-High
- **Dependencies:** Hospital scheduling (or manual booking with confirmation), booking collection, Stripe

---

### P1 — High Value (6-10 weeks)

#### A1. Biomarker-Linked Learning Paths

- **Description:** After diagnostics at Recoletas, biomarker results are ingested into PATHS. The platform generates personalized learning paths: "Your Vitamin D is low — here are 3 articles on supplementation, plus a 4-lesson nutrition course."
- **Why:** Content recommended by your body, not browsing history. **Single most defensible moat.** No competitor connects education to real clinical data.
- **Complexity:** High
- **Dependencies:** Health profile collection, hospital data pipeline, biomarker-to-content mapping

#### B1. Health-Context AI Tutor

- **Description:** Upgrade existing AI tutor to incorporate user's health profile. "Based on your last blood panel showing low Vitamin D (22 ng/mL) and elevated hsCRP (3.2 mg/L), the article recommends D3 at 4000 IU/day plus omega-3s for inflammation."
- **Why:** ChatGPT gives generic answers. PATHS tutor gives answers grounded in curated content AND your actual health data.
- **Complexity:** Medium (RAG pipeline exists; add health profile to context)
- **Dependencies:** Health profile collection, updated tutor system prompt

#### B2. AI-Generated Personalized Action Plans

- **Description:** After completing a course, AI generates a personalized 30-day action plan based on content + health data. "Week 1: Temperature optimization. Week 2: Light exposure timing."
- **Why:** Courses end with a certificate on other platforms. LIMITLESS courses end with a personalized protocol.
- **Complexity:** Medium
- **Dependencies:** Health profile (optional but better with it), new AI endpoint, action plan collection

#### B5. Conversational Content Discovery

- **Description:** Instead of browsing a catalog: "I sleep poorly, my HRV is low, and I want to improve metabolic health." AI generates a structured learning path. Goes beyond semantic search to become a content concierge.
- **Why:** C-suite executives don't browse catalogs. They describe a problem and expect a solution. White-glove service delivered by AI.
- **Complexity:** Medium
- **Dependencies:** Existing RAG infrastructure, new "learning path generator" AI endpoint

#### C1. Daily Longevity Protocols

- **Description:** Personalized "Today's Protocol" each morning. "Morning: 10 min cold exposure (from Module 3). Afternoon: Mediterranean recipe. Evening: Blue light cutoff at 8pm." Users check off completed items.
- **Why:** Headspace succeeds via daily rituals. LIMITLESS needs the same, grounded in science and personalized to health data.
- **Complexity:** Medium
- **Dependencies:** Protocol collection, notification system, mobile-optimized UI

#### D3. Micro-Learning for Executives

- **Description:** 3-5 minute daily lessons, audio-first format. "Today's 3-minute lesson: Why your post-lunch energy crash is a glucose problem, not a willpower problem. Action: Walk 10 minutes after lunch."
- **Why:** C-suite users won't sit through 45-minute lectures. High-density, actionable, audio-friendly content respects their time.
- **Complexity:** Low (uses existing lesson infrastructure + AudioEmbed block)

#### D4. Expert Video Masterclasses

- **Description:** Premium, professionally-produced video series from LIMITLESS's own scientists and coaches. "Dr. Torres on Reading Your Blood Panel," "Coach Hernandez on Zone 2 Training."
- **Why:** Masterclass proved premium video commands premium pricing. LIMITLESS content is clinical and actionable, from practitioners who can actually treat you.
- **Complexity:** Low (production, not engineering; uses existing VideoEmbed + course infrastructure)

#### E2/E3. Pre/Post Diagnostic Education

- **Description:** Booking a diagnostic auto-enrolls in a prep course ("Understanding MRI," "What your blood panel measures"). After diagnostics, results loaded into health profile, "Understanding Your Results" learning path generated, AI tutor primed with results.
- **Why:** The full closed loop: Learn → Diagnose → Understand → Act → Re-Diagnose. No competitor offers this.
- **Complexity:** E2 = Low (content creation); E3 = High (data integration)
- **Dependencies:** Diagnostic booking (E1), health profile (A1)

#### E5. Telemedicine Bridge

- **Description:** AI tutor detects when questions exceed educational scope: "This is a great question about medication interactions — I recommend scheduling a telemedicine consultation with Dr. Torres. Shall I help you book?" Clinician sees user's learning history and tutor conversations.
- **Why:** AI-to-human handoff that builds trust and generates revenue. Tutor becomes a qualifying layer.
- **Complexity:** Medium
- **Dependencies:** Telemedicine scheduling, AI tutor escalation logic

#### F1. Longevity Concierge Certification

- **Description:** Structured program for El Fuerte hotel staff: "Understanding longevity guests," "Nutrition requirements," "Sleep environment optimization," "Recovery protocols." Staff earn "LIMITLESS Certified Longevity Concierge" credential.
- **Why:** Hotel charges premium for longevity stays. Staff must deliver premium experience. Justifies B2B pricing.
- **Complexity:** Low-Medium (content + certificate generation, uses existing multi-tenant + enrollment)

#### F3. B2B Compliance Dashboard

- **Description:** Admin dashboard for tenants: staff completion rates, quiz scores, certification status, overdue training, engagement trends. Exportable reports.
- **Why:** B2B buyers need reporting to justify training budgets. Without it, they can't purchase.
- **Complexity:** Medium

---

### P2 — Engagement & Growth (8-12 weeks)

| # | Feature | Description |
|---|---------|-------------|
| A2 | Family accounts | Parent links to child accounts. Age-appropriate content. Family dashboard. AI tutor adjusts language by age group. |
| C2 | Biomarker progress tracking | Visualize biomarker trends over time. Link improvements to content consumed and protocols followed. |
| B3 | Adaptive quiz difficulty | Track quiz performance, adjust difficulty over time. Test application vs recall for advanced users. |
| B4 | AI content summarizer | Knowledge-aware summaries. New users get comprehensive; advanced users get "what's new for you." |
| C3 | Expert Q&A sessions | Monthly live sessions with coaches/scientists for Premium/Enterprise. Recorded, transcribed, indexed by RAG. |
| C4 | Longevity engagement score | Composite score: content completed + quizzes + protocols + biomarker improvements. Milestones unlock real rewards (coaching calls, diagnostic discounts). |
| C5 | Cohort-based programs | 4-6 week guided programs with peer groups, expert check-ins, pre/post biomarker comparison. 10x completion rates vs self-paced. |
| E4 | Hotel stay integration | Pre-stay prep modules, during-stay daily protocols, post-stay 90-day follow-up plan. Extends 7-day hotel experience to 90+ day engagement. |
| D5 | Longevity news digest | Weekly AI-curated research digest, interpreted by LIMITLESS's scientific team. Delivered via email + in-platform. |
| F2 | Clinical staff CE | Continuing education for Recoletas staff. Completion tracking for professional development. |
| D2 | Protocol libraries | Step-by-step clinical protocols with prerequisites, daily schedules, supplement specifics, progress checkpoints. New content type. |
| G3 | Corporate licensing | Formalized B2B pricing: base fee + per-seat. 200 staff at EUR 15/seat/month = EUR 3,000/month recurring. |
| G4 | Bundled packages | "EUR 4,500 Longevity Stay Package" = hotel stay + 3 months PATHS Premium + action plan + telemedicine follow-up. |

---

### P3 — Scale (12+ weeks)

| # | Feature | Description |
|---|---------|-------------|
| F4 | White-label configuration | Per-tenant branding (logo, colors, name). "Recoletas Salud Academy" or "El Fuerte Wellness Institute." |

---

## Phase 4 Implementation Status (2026-03-26)

### Completed (commit 08a0f291)
- **Health Profile page:** `/account/health` with 16 preset biomarkers (auto-filled units + normal ranges), health goals checkbox grid (10 options), conditions/medications dynamic arrays, pillar priority ordering. Creates/updates health-profiles collection via API.
- **Daily Protocol Widget:** Dashboard morning/afternoon/evening GlassCard blocks with action checkboxes. Fetches/generates via POST `/api/ai/daily-protocol`. Completion tracking via PATCH. Regenerate for Premium+.
- **Action Plan UI:** ActionPlanCTA component on completed courses — generates 30-day plans via POST `/api/ai/action-plan`. Expandable week/day display. `/account/plans` page listing all generated plans.
- **Discover Page:** `/discover` with AI-powered goal-based content discovery. 6 suggested prompts. Numbered learning path results with reasoning per item. "Discover" added to header nav between Articles and Guide.
- **Navigation updates:** AccountNav expanded to 7 items (Dashboard, Profile, Health Profile, Action Plans, Certificates, Billing, My Courses). Mobile tabs use `overflow-x-auto`. Header nav has Discover.

---

## Phase 5 Implementation Status (2026-03-26)

### Completed (commit 3405ab68)
- **Certificates collection:** Auto-generated on enrollment completion via afterChange hook on Enrollments. Denormalized course title, pillar, instructor. Unique certificate number (`PATHS-{timestamp}-{random}`). Multi-tenant scoped.
- **CertificateCard component:** Compact mode (GlassCard for lists) + full mode (branded display with gold corner accents, print-ready with `@media print` CSS).
- **Certificate pages:** `/account/certificates` list page, `/certificates/[id]` public shareable view with print button. "Certificates" added to AccountNav. Congratulations banner on completed course pages.
- **B2B tenant certification:** Added `certificationEnabled`, `certificationExpiry`, `organizationName`, `organizationLogo` fields to Tenants collection. Conditional admin UI.

### Build error lesson learned
- CertificateCard used `style jsx global` which requires `'use client'`. Server components can't use styled-jsx. Fixed by adding `'use client'` to CertificateCard and creating a CertificateViewClient wrapper for the server page.

---

## Phase 6 Implementation Status (2026-03-26)

### Completed
- **Learning streaks:** `currentStreak`, `longestStreak`, `lastActivityDate` fields added to Users collection. `updateStreak` afterChange hook on LessonProgress uses UTC midnight date-only comparison to avoid double-counting. Dashboard stats row expanded to 4 columns with flame icon streak card.
- **Paywall redesign:** `LockedContentBanner` now shows blurred content preview, tier benefits checklist, gold CTA, social proof line. `BillingClient` has "Recommended" badge on Premium tier with gold highlight and annual savings percentage display.
- **Multi-tenant prep:** Migration adds `tenant_id` to certificates table. Plugin scope re-addition done in follow-up deploy (confirmed two-step pattern from gotcha #36).

---

## Phase 7 Implementation Status (2026-03-26)

### Completed
- **Skeleton loaders:** Reusable `Skeleton` component with variants: `SkeletonLine`, `SkeletonBlock`, `SkeletonInput`, `SkeletonCard`, `SkeletonListItem`, `SkeletonProfileForm`. All "Loading..." text replaced with animated skeletons/spinners across the platform.
- **Breadcrumbs:** Reusable `Breadcrumb` component. Added to article detail (Articles > Pillar > Title), course detail (Courses > Title), lesson viewer (Courses > Course > Lesson).
- **Footer expansion:** 4-column layout (Logo+tagline, Platform links, Account links, Company links). LinkedIn icon added. Theme selector moved to bottom bar.
- **Search UX:** "AI-Powered" teal badge on search. Improved placeholder text. Collection type labels (Article/Course/Lesson) on search results.
- **AI Tutor polish:** Simple markdown renderer (bold, code, lists — no external dependency). 3 suggested starter questions per context type. Copy button on assistant messages.

---

## Phase 8 Implementation Status (2026-03-26)

### Completed
- **B2B Compliance Dashboard:** New page at `/account/team`. Overview cards (staff count, enrollments, certificates, overdue). Expandable staff table with per-member enrollments + certificates. Sortable by name/status/completion. Certificate expiry warnings (30-day). CSV export of all staff data.
- **Access control:** `isTenantManager` utility (publisher role + tenant = manager, admin always qualifies). `getUserTenantId` helper for extracting tenant from user object. Conditional "Team" nav item in AccountNav — only visible to tenant managers and admins.

---

## Phase 9 Implementation Status (2026-03-26)

### Completed
- **Biomarker progress tracking:** `recharts` dependency added. `BiomarkerChart` component with line chart, normal range shading (teal `ReferenceArea`), status-colored data points (green/yellow/red), trend indicators (up/down/stable arrows). `BiomarkerTrendsSection` groups biomarkers by name, shows charts for entries with 2+ data points. Integrated into `/account/health` page below biomarker input form.
- **AI health context enhanced:** `buildHealthContextSection` now includes trend info for multi-entry biomarkers (e.g., "trend: up from 22 over 3 months"). Provides richer context to AI tutor for personalized health-aware responses.

### Key technical note
- Recharts requires `'use client'` — all chart components must be client components as Recharts uses DOM APIs.

---

## Phase 10 Implementation Status (2026-03-27)

### Completed
- **Hotel longevity stay integration:** Courses collection extended with `stayType` (3/5/7-day), `stayLocation`, `stayPrice`, `stayMemberPrice`, `stayIncludes` array, `followUpMonths`. Enrollments extended with `stayStartDate`, `stayEndDate` for time-gated access. Reuses existing enrollment/progress/certificate infrastructure — no new collection needed.
- **Stay booking page:** `/stays` with 3 package cards (Discovery 3-day €3,500, Immersion 5-day €6,500, Transformation 7-day €9,500). Member/non-member pricing. Contact form submits to `/api/stay-booking`. "Stays" added to header nav.
- **Time-gated content access:** `getStayPhase` utility (pre-arrival/during-stay/post-stay/follow-up-expired), `getStayDayNumber`, `isModuleAccessible`. `StayDayGate` component shows "Available on Day X" for locked content during stay programs.
- **Stay-aware AI daily protocols:** Detects active stay enrollment, injects stay context (day number, location, hotel activities) into daily protocol prompt for personalized during-stay recommendations.
- **Migration:** `20260327_170000_stay_fields.ts`

### Key design decision
- Stay programs reuse the Courses collection with `stayType` set. Modules map to days, Lessons map to activity blocks. This means all enrollment tracking, progress, certificates, and AI features work automatically for stay content.

---

## Phase 11 Implementation Status (2026-03-27)

### Completed
- **Telemedicine bridge — AI tutor → human clinician handoff:** Tutor system prompt instructs the model to append `[SUGGEST_CONSULTATION]` when questions involve medication decisions, test interpretation, symptoms, or clinical judgment. Tutor endpoint parses the marker from the SSE stream, strips it from the user-visible text, and emits a separate `{ escalation: true }` SSE event.
- **TutorPanel escalation UI:** Gold CTA card appears in the tutor panel when an escalation event is detected. Auto-prefilled inline booking form (name + email from auth context, topic derived from conversation). Submits to `/api/telemedicine-booking`.
- **Telemedicine booking endpoint:** `/api/telemedicine-booking` sends notification email to `TELEMEDICINE_EMAIL` env var. Logs whether submission originated from tutor escalation or the public form.
- **Public telemedicine page:** `/telemedicine` with service cards (Biomarker Review, Health Planning, Medication Guidance, Follow-Up Care). Pricing: included for Premium+, €99/session for Regular. Contact form.

### Key technical pattern
- The `[SUGGEST_CONSULTATION]` marker pattern allows the AI model to signal clinical escalation without changing the conversational flow. The marker is invisible to the user — the endpoint intercepts it at the SSE level.

---

## Implementation Roadmap

### Phase 1: Brand Unification + Foundation (weeks 1-2)

- UX/UI P0: Design token unification + typography pass
- Expert practitioner profiles (A3)
- Clinical case study content planning (D1)
- Tier restructuring strategy (G2)

### Phase 2: Content Pages + Booking (weeks 3-5)

- User dashboard build
- Content page redesign (cards, articles, courses)
- Diagnostic booking MVP (E1)
- Diagnostic upsell engine (G1)
- Onboarding flow

### Phase 3: AI Enhancement + Personalization (weeks 6-10)

- Health profile collection (A1)
- Health-context AI tutor upgrade (B1)
- AI action plans (B2)
- Conversational content discovery (B5)
- Daily protocols (C1)
- Pre/post diagnostic education (E2/E3)
- Micro-learning content (D3)
- Expert video masterclasses (D4)
- Telemedicine bridge (E5)

### Phase 4: B2B + Engagement (weeks 8-14)

- Longevity concierge certification (F1)
- Compliance dashboard (F3)
- Gamification (certificates, streaks, scores)
- Paywall redesign

### Phase 5: Growth Features (weeks 12-20)

- Family accounts (A2)
- Biomarker progress tracking (C2)
- Cohort-based programs (C5)
- Hotel stay integration (E4)
- Expert Q&A sessions (C3)
- Protocol libraries (D2)

---

## Key Files Referenced

### UX/UI (files needing brand unification)

- `src/app/(frontend)/globals.css` — typography plugin, brand tokens
- `src/components/ContentListItem/index.tsx` — redesign with brand aesthetic
- `src/components/PillarFilter/index.tsx` — replace amber-500
- `src/components/EnrollButton/index.tsx` — replace amber-500
- `src/components/LockedContentBanner/index.tsx` — paywall redesign
- `src/components/TutorPanel/index.tsx` — UI polish
- `src/components/TierBadge/index.tsx` — align with brand
- `src/app/(frontend)/articles/` — brand styling
- `src/app/(frontend)/courses/` — brand styling
- `src/app/(frontend)/account/` — brand pass
- `src/Footer/Component.tsx` — footer expansion

### Platform Architecture (existing infrastructure to build on)

- `src/payload.config.ts` — 18 collections, 13 endpoints, 4 globals
- `src/collections/` — full data model
- `src/endpoints/ai/` — 6 AI endpoints (tutor, quiz, search, recommendations, related)
- `src/ai/retrieval.ts` — two-stage RAG pipeline (pgvector + Jina reranking)
- `src/ai/rateLimiter.ts` — tier-based rate limiting
- `src/hooks/editorialWorkflow.ts` — 5-state editorial workflow
- `src/hooks/indexContentChunks.ts` — automatic RAG indexing on publish
- `src/access/canReadContent.ts` — "highest wins" access control
- `src/endpoints/stripe/webhooks.ts` — full Stripe lifecycle
- `src/fields/lexicalEditor.ts` — 7 custom Lexical blocks
