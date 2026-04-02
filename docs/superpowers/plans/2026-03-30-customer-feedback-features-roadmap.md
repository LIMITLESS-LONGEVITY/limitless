# Customer Feedback Features — Implementation Roadmap

**Date:** 2026-03-30
**Source:** Demo feedback (hospital + hotel network clients)
**Status:** Plan — Awaiting Approval

---

## Feature 1: Personalized Login Greeting

### What the Customer Said
> "Upon every login to the dashboard, the platform should greet the user and wish them a great day."

### Structured Requirement
**Feature:** Context-aware personalized greeting on the OS Dashboard, pulling real-time data from the Digital Twin and PATHS to create a concierge-grade welcome experience.

### Design: The Three-Line Concierge Model

| Line | Purpose | Example |
|------|---------|---------|
| **Primary** | Time-aware salutation + first name | "Good morning, James." |
| **Secondary** | One contextual data insight (rotated by priority) | "Your sleep score was 87 last night — excellent recovery." |
| **Tertiary** | Forward-looking nudge (optional) | "Your next diagnostic is in 2 days." |

**Data priority for secondary line (pick ONE per visit):**

| Priority | Source | When to Show |
|----------|--------|-------------|
| 1 | Wearable sleep score | Morning, if wearable connected |
| 2 | Wearable HRV | Morning, if sleep score unavailable |
| 3 | Bio age trend | If bio age improved since last login |
| 4 | Learning progress | If course is >60% complete |
| 5 | Upcoming appointment | If appointment within 7 days |
| 6 | Streak | If active streak >3 days |
| 7 | Tier welcome | First login after tier upgrade only |
| 8 | Fallback | "Your longevity dashboard awaits." |

**Animation:** Staggered opacity fade-in (200ms/500ms/800ms delays), CSS-only, respects `prefers-reduced-motion`. No confetti, no typewriter — luxury tone.

**Time divisions:** Good morning (4AM-noon), Good afternoon (noon-6PM), Good evening (6PM-4AM). Client-side `Date()` — no timezone API needed.

### What Already Exists
- OS Dashboard has a static "Welcome back" in `DashboardView.tsx` (lines 38-46)
- Health data available via `/api/twin/{userId}/summary`
- Learning progress via `/learn/api/me/enrollments`
- User name available from DT profile or PATHS `/api/users/me`

### Implementation
- **Component:** New `GreetingBanner.tsx` replacing the static welcome div
- **Where:** OS Dashboard (`limitless-os-dashboard`)
- **Data:** Lift health fetch to `DashboardView`, share with `HealthWidget`
- **Effort:** ~0.5 day
- **Dependencies:** None — all APIs exist

### Phases
1. **Phase 1** (immediate): Time greeting + name + fallback message
2. **Phase 2** (after wearable E2E): Sleep/HRV contextual line
3. **Phase 3** (future): Template rotation (3-5 variants per context type)

---

## Feature 2: User Feedback Collection

### What the Customer Said
> "There should be a way for the user to give feedback on their experience with the platform — things they'd like to see, new features, new content."

### Structured Requirement
**Feature:** In-app feedback system that feels like messaging a personal concierge, not filling out a survey. Supports bug reports, feature requests, content suggestions, and satisfaction scoring. Must handle UHNW privacy concerns.

### Design: Hybrid Custom + Third-Party

| Component | Solution | Why |
|-----------|----------|-----|
| **Core feedback** | Custom Payload `Feedback` collection | Sensitive data stays in our Postgres — critical for UHNW privacy |
| **Feature voting** | Featurebase (free tier) | Handles voting, roadmap, changelog at $0/mo. Only general feature ideas go here (no PII) |

**Feedback modal UX:**
- Framed as "Share your thoughts with your concierge team" — not "Submit feedback"
- 1-click satisfaction: Exceptional / Good / Could Improve
- Optional detail expansion (textarea)
- Category selector: Experience, Content, Feature Request, Bug Report
- Anonymity toggle for privacy-conscious clients
- Dark/gold/teal aesthetic matching OS Dashboard
- Accessible via persistent subtle menu item (not popup)

### What Already Exists
- Payload `@payloadcms/plugin-form-builder` is enabled but unused
- No feedback collection anywhere on the platform

### Implementation

**Payload `Feedback` collection:**
```
Fields: user (relationship), category (select), satisfaction (select),
        message (textarea), pageUrl (text), anonymous (checkbox),
        status (select: new/reviewed/actioned/closed), internalNotes (textarea)
Access: create = authenticated, read/update = admin only
```

**Cross-app feedback widget:** Shared React component injected into PATHS, HUB, and OS Dashboard.

### Phases
1. **Phase 1** (~1 day): Payload collection + React modal in PATHS
2. **Phase 2** (~0.5 day): Widget in HUB + OS Dashboard
3. **Phase 3** (~0.5 day): NPS/CSAT triggers (post-course-completion, post-booking)
4. **Phase 4** (~2 hours): Featurebase setup for feature voting
5. **Phase 5** (~1 hour): Public roadmap page

**Total effort:** ~3 days

---

## Feature 3: Visual Celebrations (see separate Gamification Plan)

### What the Customer Said
> "More visual pizzazz — users expect visual cues like TikTok and Instagram. When a user completes a course there should be visual celebration."

### Structured Requirement
This feedback maps to a broader **gamification strategy**. Visual celebrations are one component of a comprehensive system that includes achievements, progression, streaks, and health milestones.

**See:** `docs/superpowers/plans/2026-03-30-gamification-strategy.md` (separate plan)

**Quick wins (can ship independently):**
- Course completion: gold particle burst (canvas-confetti, brand colors)
- Lesson completion: subtle checkmark animation (Framer Motion)
- Enrollment: welcome shimmer effect
- Streak milestone (7, 30, 100 days): achievement toast with Lottie animation

**Critical design rule for UHNW audience:** Celebrations must feel like a private intelligence dashboard acknowledging progress — not a mobile game rewarding a child. 1-3 seconds, auto-dismiss, brand-colored, no cartoon elements.

---

## Feature 4: Multi-Language Support (i18n)

### What the Customer Said
> "The platform needs to support other languages — Spanish and Russian for the coming sprints."

### Structured Requirement
**Feature:** Full internationalization of PATHS platform — UI strings, CMS content, and course materials in English (default), Spanish, and Russian.

### Technical Approach

| Layer | Solution | How |
|-------|----------|-----|
| **CMS content** | Payload field-level localization | Mark fields as `localized: true`, stores per-locale values |
| **UI strings** | next-intl (cookie-based, no URL prefix) | JSON message files per locale, `t()` function in components |
| **Locale routing** | Cookie-based (no `/es/`, `/ru/` prefixes) | Avoids basePath (`/learn`) conflict with gateway |
| **Content translation** | Hybrid: LLM draft + human review | Claude translates, bilingual editor reviews in Payload admin |
| **Fonts** | Add Cyrillic subset to Cormorant Garamond + Inter | Both fonts support Cyrillic natively |

### Key Technical Decisions

1. **Cookie-based locale (no URL prefix)** — Adding `/es/` would create `/learn/es/courses` through the gateway, which is fragile. Cookie-based is simpler and avoids basePath conflicts.

2. **Field-level localization (not document-level)** — Payload stores each locale's value as a keyed object. One course document contains all translations. Requires data migration for existing fields.

3. **Per-locale publish status** — Payload's experimental `localizeStatus` lets you publish English while Spanish stays in draft. Perfect for gradual rollout.

4. **LLM translation + human review** — For medical/longevity content, LLM (Claude) generates drafts, bilingual editor reviews. Professional quality without $12k/year translation platforms.

### What Already Exists
- No i18n configured anywhere
- HTML lang hardcoded to "en"
- All UI strings hardcoded in English
- ~200-400 UI strings to extract
- Payload config has no `localization` block

### Migration Risk
**HIGH** — Converting existing fields to `localized: true` changes the database structure. Existing data will be lost without a migration script. Must write migration BEFORE enabling localization.

### Phases
1. **Phase 0** (~1 day): Write data migration script for existing content
2. **Phase 1** (~1 day): Add Payload `localization` config + mark fields + run migration
3. **Phase 2** (~1 day): Install next-intl + configure + extract English strings
4. **Phase 3** (~0.5 day): Locale switcher component in header + Cyrillic font subsets
5. **Phase 4** (~2-3 days): Spanish translation (UI strings + content via LLM + review)
6. **Phase 5** (~2-3 days): Russian translation (same process)
7. **Phase 6** (~1 day): QA all 3 locales end-to-end

**Total effort:** ~7-10 working days for both languages

### Language Considerations

| | Spanish | Russian |
|---|---|---|
| Script | Latin | **Cyrillic** (needs font subset) |
| Text expansion | +20-30% vs English | +10-15% vs English |
| Formality | Use `usted` (formal) for C-suite | Standard formal register |
| Date format | DD/MM/YYYY | DD.MM.YYYY |
| Number format | 1.000,50 | 1 000,50 |
| Pluralization | Simple (1 vs many) | Complex (1, 2-4, 5-20, 21...) |

---

## Roadmap Summary

| Sprint | Feature | Effort | Impact |
|--------|---------|--------|--------|
| **Sprint 1** (this week) | Login greeting (Phase 1) | 0.5 day | High — immediate wow factor |
| **Sprint 1** | Visual celebrations (quick wins) | 1 day | High — demo-ready polish |
| **Sprint 2** (next week) | Feedback collection (Phases 1-3) | 2 days | Medium — shows we listen |
| **Sprint 2** | Login greeting (Phase 2 — health data) | 0.5 day | High — differentiator |
| **Sprint 3** | i18n foundation (Phases 0-3) | 3-4 days | High — unlocks new markets |
| **Sprint 4** | Spanish translation (Phase 4) | 2-3 days | High — first new market |
| **Sprint 5** | Russian translation (Phase 5) | 2-3 days | High — second market |
| **Sprint 5** | Feature voting (Featurebase) | 2 hours | Low effort, good optics |
| **Ongoing** | Gamification (see separate plan) | Multi-sprint | Transformative |

---

## Dependencies

| Feature | Depends On |
|---------|-----------|
| Greeting (Phase 2) | Wearable E2E working (Oura test rings) |
| i18n | Data migration script (must be written first) |
| Feedback widget in HUB | HUB clinician portal QA complete |
| Visual celebrations | Gamification plan approval |
