# In-App User Feedback Collection System — Research Report

**Date:** 2026-03-29
**Status:** Research Complete — Awaiting Decision
**Context:** LIMITLESS platform needs feedback collection across PATHS, HUB, OS Dashboard, and Digital Twin

---

## Executive Summary

LIMITLESS needs a feedback system that serves C-suite executives and UHNW individuals — people who expect concierge-level interactions, not generic survey popups. The system must collect feature requests, content suggestions, satisfaction scores, and bug reports while respecting extreme privacy sensitivity.

**Recommendation:** Hybrid approach — custom Payload CMS `Feedback` collection for core data ownership + lightweight third-party widget (Featurebase or Nolt) for public-facing feature voting/roadmap. This balances privacy control with community engagement features that would take months to build custom.

---

## 1. Third-Party Feedback Platforms Compared

### Tier 1: Full-Featured (Expensive)

| Tool | Pricing | Key Features | Integration Effort | Privacy |
|------|---------|-------------|-------------------|---------|
| **UserVoice** | $999-1,499/mo (min annual) | Enterprise feedback portal, in-app widget, SSO, analytics | Medium — JS widget embed | Data stored on their servers; SOC 2 |
| **Productboard** | $20-80/user/mo | Product management + feedback, insights, roadmap | Medium — API + widget | Enterprise security |

**Verdict:** Overkill and overpriced for LIMITLESS's current scale. UserVoice at $12k+/year is enterprise SaaS pricing for a boutique consultancy with dozens of users, not thousands.

### Tier 2: Mid-Range (Best Value for Feature Voting)

| Tool | Pricing | Key Features | Integration Effort | Privacy |
|------|---------|-------------|-------------------|---------|
| **Featurebase** | Free — $49/mo | Feedback boards, roadmap, changelog, surveys, in-app widget, AI | Low — script tag or React SDK | EU-based, GDPR compliant |
| **Canny** | Free (25 users) — $79+/mo (scales with tracked users) | Feature voting, roadmap, changelog, SSO, API | Low — JS widget | US-based, SOC 2 |
| **Nolt** | $29-69/mo flat | Feature voting boards, SSO, embeddable widget, custom branding | Low — embed/widget | Simple, fewer integrations |
| **Frill** | $25/mo base + $25/mo per module | Feedback, roadmap, changelog (modular pricing) | Low — widget | Modular pricing adds up |
| **Sleekplan** | Free tier available | Feedback widget, voting, roadmap, changelog, CSAT | Low — JS SDK | Widget-first approach |

**Best fit:** Featurebase — generous free tier, all modules included, modern UI, in-app widget, and the public roadmap doubles as a transparency tool for premium clients.

### Tier 3: Bug/UX Focused

| Tool | Pricing | Key Features | Integration Effort | Privacy |
|------|---------|-------------|-------------------|---------|
| **Gleap** | $29/mo — $119/mo (Teams) | Screenshot annotation, screen recording, bug reporting, surveys, AI | Low — SDK | All-in-one support |
| **Userback** | ~$49/mo+ | Visual feedback, annotated screenshots, session replay, surveys | Low — JS widget | Good for dev teams |
| **Usersnap** | ~$49/mo+ | Screenshot feedback, NPS/CSAT surveys, project boards | Low — JS widget | Enterprise options |

**Best fit for bug reporting:** Gleap — visual bug reports with console logs and session context. But this is a "nice to have" given our small user base.

---

## 2. Custom-Built Approach (Payload CMS Collection)

### Architecture: `Feedback` Collection in PATHS

Payload CMS already has a Form Builder plugin, but a dedicated `Feedback` collection gives us full control:

```typescript
// src/collections/Feedback.ts
const Feedback: CollectionConfig = {
  slug: 'feedback',
  admin: {
    useAsTitle: 'subject',
    defaultColumns: ['subject', 'type', 'status', 'user', 'createdAt'],
  },
  access: {
    create: authenticated,      // Any logged-in user
    read: adminsOnly,           // Only staff sees all feedback
    update: adminsOnly,
    delete: adminsOnly,
  },
  fields: [
    { name: 'type', type: 'select', options: [
      { label: 'Feature Request', value: 'feature' },
      { label: 'Content Suggestion', value: 'content' },
      { label: 'Bug Report', value: 'bug' },
      { label: 'General Feedback', value: 'general' },
      { label: 'Concierge Request', value: 'concierge' },
    ]},
    { name: 'subject', type: 'text', required: true },
    { name: 'body', type: 'richText' },
    { name: 'satisfaction', type: 'number', min: 1, max: 10 },  // NPS-style
    { name: 'priority', type: 'select', options: ['low', 'medium', 'high'] },
    { name: 'status', type: 'select', options: [
      'new', 'acknowledged', 'under-review', 'planned', 'in-progress', 'shipped', 'declined'
    ], defaultValue: 'new' },
    { name: 'context', type: 'group', fields: [
      { name: 'app', type: 'select', options: ['paths', 'hub', 'dashboard', 'digital-twin', 'general'] },
      { name: 'pageUrl', type: 'text' },
      { name: 'userAgent', type: 'text', admin: { readOnly: true } },
    ]},
    { name: 'user', type: 'relationship', relationTo: 'users' },
    { name: 'internalNotes', type: 'richText', admin: { condition: (_, siblingData) => true } },
    { name: 'resolution', type: 'richText' },
  ],
  hooks: {
    afterChange: [
      // Send notification to admin (email or Telegram)
      // Send acknowledgment to user
    ],
  },
}
```

### Frontend Component: Premium Feedback Modal

```typescript
// Accessible from all apps via shared component or gateway-injected script
// Triggered by: floating button, menu item, or keyboard shortcut
interface FeedbackPayload {
  type: 'feature' | 'content' | 'bug' | 'general' | 'concierge'
  subject: string
  body: string
  satisfaction?: number
  context: {
    app: string
    pageUrl: string
    userAgent: string
  }
}
```

### Pros of Custom Build
- **Full data ownership** — feedback stays in our Postgres database alongside user data
- **No third-party data exposure** — critical for UHNW privacy
- **Integrated with existing auth** — JWT cookie SSO means seamless experience
- **Admin panel built-in** — Payload admin UI for reviewing/managing feedback
- **No per-user pricing** — scales with our infrastructure, not vendor billing
- **Custom UX** — can design the "Scientific Luxury" aesthetic into the feedback flow

### Cons of Custom Build
- **No feature voting/upvoting** without building it (1-2 days of work)
- **No public roadmap view** without building it (1-2 days)
- **No changelog/announcement system** without building it
- **No AI categorization** out of the box
- **Maintenance burden** — we own the code

### Estimated Build Time
| Component | Effort |
|-----------|--------|
| Payload `Feedback` collection | 2 hours |
| Frontend modal component (React) | 4 hours |
| Email notifications (Resend) | 2 hours |
| NPS/CSAT micro-survey | 3 hours |
| Feature voting (upvote system) | 8 hours |
| Public roadmap page | 6 hours |
| **Total (core only, no voting)** | **~8 hours** |
| **Total (with voting + roadmap)** | **~25 hours** |

---

## 3. NPS / CSAT / Satisfaction Scoring

### Recommended Implementation

**NPS (Net Promoter Score):** "How likely are you to recommend LIMITLESS to a colleague?" (0-10)
- Deploy quarterly or after milestone interactions (completing a course, finishing a stay)
- Segment by membership tier — Platinum vs Gold satisfaction may differ
- Follow up with open-text "What's the primary reason for your score?"

**CSAT (Customer Satisfaction):** "How satisfied are you with [specific interaction]?" (1-5 stars)
- Trigger after: course completion, booking confirmation, health report delivery
- Keep it to one question + optional comment — respect busy executive schedules

**CES (Customer Effort Score):** "How easy was it to [complete this task]?" (1-7)
- Use sparingly — after onboarding, after first AI consultation

### For UHNW Audiences: Reframe the Language
- Instead of "Rate us 1-10": "How has your experience been so far?"
- Instead of star ratings: Elegant emoji scale or text labels ("Exceptional" / "Good" / "Could be better")
- Instead of "Submit feedback": "Share your thoughts with your concierge team"
- Always close the loop: acknowledge receipt personally, report back on action taken

---

## 4. Making Feedback Feel Premium (Not a Generic Survey)

### Design Principles for Scientific Luxury

1. **Concierge framing** — "Your dedicated team would love to hear from you" not "Help us improve"
2. **Minimal friction** — 1-click satisfaction + optional detail expansion
3. **Dark, elegant UI** — matches the OS Dashboard aesthetic (dark background, gold/teal accents, glassmorphism)
4. **No popup surveys** — use a subtle, persistent side tab or menu item
5. **Personal follow-up** — every piece of feedback gets a human-written response
6. **Proactive, not reactive** — "We noticed you explored our longevity protocols. Anything you'd like us to add?" (triggered by behavior)
7. **Voice/text options** — UHNW clients may prefer speaking to typing; consider Telegram/WhatsApp integration for collecting feedback conversationally
8. **Gratitude, not incentives** — no "earn 50 points for a review"; instead, "Thank you — we've shared this with Dr. [Name]"

### Feedback Touchpoints (Premium Flow)

```
Course Completion → "How was this learning experience?" [Exceptional / Good / Could improve]
                    → Optional: "What topic should we cover next?"

Health Report     → "Was this insight helpful?" [Yes / Partially / Not yet]
                    → Optional: "Tell us more so we can refine future reports"

Monthly Check-in  → Personal message from concierge: "Any thoughts on how we can
                     make your LIMITLESS experience even better?"

Post-Stay         → "How was your wellness stay at [location]?"
                    → White-glove follow-up from clinical team
```

---

## 5. Feature Voting and Prioritization

### Option A: Custom Build in Payload

Add a `votes` field (number) + `voters` (relationship to users) on the Feedback collection. Build a simple frontend page that shows feature requests sorted by votes. Users click to upvote, limited to one vote per feature.

- **Pros:** Full control, data stays in-house, integrated auth
- **Cons:** ~8 hours to build, no AI deduplication, basic UI

### Option B: Featurebase (Recommended for Voting)

- Free tier: 1 board, unlimited users, unlimited feedback, public roadmap
- $49/mo Growth: 4 boards, custom domain, SSO, remove branding, API
- Embed as iframe or use their widget SDK
- Custom CSS to match LIMITLESS branding
- SSO integration with our JWT auth

- **Pros:** Built-in voting, roadmap, changelog, AI deduplication, zero maintenance
- **Cons:** Data on their servers (EU-based), another vendor dependency

### Option C: Nolt

- $29/mo flat: 1 board, SSO, embeddable
- Simpler than Featurebase, less feature-rich
- Good if you just want a clean voting board

### Recommended Prioritization Framework

Use feature votes as **one input**, weighted by:
1. **Membership tier multiplier** — Platinum feedback carries more weight
2. **Strategic alignment** — Does it advance the Longevity OS vision?
3. **Build effort** — Quick wins vs multi-week projects
4. **Revenue impact** — Will it improve retention or upsell?

---

## 6. Integration with Existing Stack

### PATHS (Payload CMS 3.x + Next.js)
- **Custom collection:** Native — just add `Feedback.ts` to `/src/collections/`
- **Form Builder plugin:** Already available in Payload ecosystem, adds Forms + Form Submissions collections
- **Frontend widget:** React component, deployed at `/learn/feedback` or as modal accessible from header
- **API endpoint:** `POST /api/feedback` via Payload REST API (auto-generated)

### HUB (Next.js + Prisma)
- **Option 1:** POST feedback to PATHS API through gateway (`/learn/api/feedback`)
- **Option 2:** Add a `Feedback` model to HUB's Prisma schema (duplicates data model)
- **Option 3:** Shared feedback micro-widget that calls a single feedback API
- **Recommended:** Option 1 — centralize feedback in PATHS/Payload, all apps POST through gateway

### OS Dashboard (Cloudflare Pages, static)
- Inject a shared feedback widget script (either custom or third-party)
- Calls the PATHS feedback API through gateway
- Could also embed Featurebase widget if using that route

### Digital Twin (Fastify + Drizzle)
- No direct user-facing feedback needed — it's a backend service
- Health data satisfaction scores could feed into the feedback system via API

### Cross-App Feedback Flow

```
User clicks "Share Feedback" (any app)
        │
        ▼
Feedback Modal (shared React component or injected script)
        │
        ▼
POST /learn/api/feedback  (via API Gateway)
        │
        ▼
PATHS Payload → Feedback Collection (Postgres)
        │
        ├─→ Email notification to admin (Resend)
        ├─→ Telegram/Discord alert to ops channel
        └─→ Auto-acknowledge to user
```

---

## 7. Privacy Considerations for UHNW Clients

### Critical Requirements

1. **Data residency:** Feedback containing personal details must stay in our infrastructure (Render/Postgres), not third-party servers
2. **Anonymity option:** Allow feedback without attaching user identity
3. **Encryption:** At rest (Postgres TDE or column-level) and in transit (TLS)
4. **Access control:** Only designated admins see feedback; no shared dashboards with third parties
5. **Right to deletion:** GDPR Article 17 — user can request all feedback be purged (already have GDPR delete in Digital Twin)
6. **No tracking pixels:** Third-party widgets may inject analytics — audit before deploying
7. **Consent:** Clear notice at feedback submission: what data is collected, who sees it, retention period
8. **No public attribution:** If using a public voting board, allow pseudonymous participation
9. **Audit trail:** Log who accessed feedback data and when

### Third-Party Risk Assessment

| Tool | Data Location | Privacy Risk | Mitigation |
|------|--------------|-------------|------------|
| Featurebase | EU servers | Low-Medium | SSO, no PII in public posts, custom privacy policy |
| Canny | US servers | Medium | Less control over data residency |
| Custom Payload | Our Postgres | Lowest | Full control |

### Recommendation for UHNW Privacy

- **Core feedback (bug reports, satisfaction, personal requests):** Custom Payload collection — data never leaves our infrastructure
- **Feature voting (public-facing, opt-in):** Featurebase with pseudonymous participation — only general feature ideas, no personal data
- **Concierge requests:** Route directly to admin team, never stored in third-party systems

---

## 8. Recommended Implementation Plan

### Phase 1: Core Feedback Collection (Custom, ~1 day)
- Add `Feedback` collection to PATHS
- Build React feedback modal component
- Add email notification via Resend
- Deploy feedback button in PATHS header/nav
- Available at `/learn/api/feedback` through gateway

### Phase 2: Cross-App Widget (~0.5 day)
- Extract feedback modal into a standalone script
- Inject into OS Dashboard and HUB
- All feedback flows to central PATHS collection

### Phase 3: NPS/CSAT Micro-Surveys (~0.5 day)
- Add timed triggers: course completion, post-booking, monthly check-in
- Store satisfaction scores in Feedback collection with `type: 'nps'` or `type: 'csat'`
- Build simple dashboard in Payload admin showing score trends

### Phase 4: Feature Voting (Buy, ~2 hours setup)
- Set up Featurebase free tier
- Customize branding to match LIMITLESS aesthetic
- Enable SSO for seamless login
- Embed voting board at `app.limitless-longevity.health/roadmap` or as widget
- Populate with initial feature ideas to seed engagement

### Phase 5: Public Roadmap & Changelog (Buy, ~1 hour)
- Enable Featurebase roadmap module
- Categorize: "Under Review" / "Planned" / "In Progress" / "Shipped"
- Link from OS Dashboard: "See what's coming next"

---

## Sources

- [Userback — Feedback Software](https://userback.io/)
- [Userpilot — How to Collect In-App Feedback](https://userpilot.com/blog/in-app-feedback/)
- [Gleap — In-App Feedback Widgets Guide](https://www.gleap.io/blog/in-app-feedback-widgets-guide)
- [Featurebase — Modern Support & Feedback Platform](https://www.featurebase.app/)
- [Featurebase — Pricing](https://www.featurebase.app/pricing)
- [Canny Pricing — Hidden Costs Explained](https://featureos.com/blog/canny-pricing-2026)
- [UserVoice — Pricing Plans](https://uservoice.com/pricing)
- [UserVoice Pricing Analysis](https://userjot.com/blog/uservoice-pricing)
- [Nolt — Manage Feedback](https://nolt.io/)
- [Frill — Feedback, Roadmap, Changelog](https://frill.co/)
- [Sleekplan — Feedback Widget](https://sleekplan.com/use-case/feedback-widget/)
- [Sleekplan — Feature Voting Playbook](https://sleekplan.com/blog/feature-voting-in-2026-the-board-tool-and-system-playbook-for-your-saas-app-8802/)
- [Payload CMS — Form Builder Plugin](https://payloadcms.com/docs/plugins/form-builder)
- [Payload CMS — Collection Configs](https://payloadcms.com/docs/configuration/collections)
- [Featurebase — Public Roadmap Examples](https://www.featurebase.app/blog/public-roadmap-examples)
- [Public Product Roadmap Best Practices](https://easydesk.app/blog/public-product-roadmap)
- [NPS vs CSAT — Which Metric](https://userpilot.com/blog/nps-vs-csat/)
- [GDPR Compliance in Feedback Management](https://www.anecdoteai.com/blog/gdpr-compliance-in-customer-feedback-management)
- [Protecting Customer Privacy in Feedback Systems](https://blocksurvey.io/guides/best-practices-for-ensuring-customer-data-security-in-feedback-platforms)
- [Luxury Customer Experience — Simply Contact](https://simplycontact.com/customer-support-in-luxury-sector/)
- [White-Glove Experience for UHNW — Fidelity](https://clearingcustody.fidelity.com/insights/spotlights/white-glove-experience-for-uhnw)
