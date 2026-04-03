# Workbench Handoff Batch 5 — 2026-03-28

Post-gateway feature development. HUB Phase 3-4, DT Phase 2, cross-service integration.

**Prerequisites:** Batch 4 (API Gateway) must be complete. All apps serve under `app.limitless-longevity.health`.

---

## Task 1: HUB Phase 3 — Membership Subscription Billing

**Spec:** `docs/superpowers/specs/2026-03-27-hub-design.md` sections 7 (Stripe), 10 (Tier Mapping)
**AGENTS.md:** `limitless-hub/AGENTS.md`

### What to build

1. **Membership subscription flow:**
   - `POST /book/api/membership/subscribe` — creates Stripe Checkout Session (subscription mode)
   - `POST /book/api/membership/change` — upgrade/downgrade (proration)
   - `POST /book/api/membership/cancel` — cancel with period end

2. **Stripe webhook expansion:**
   - `invoice.paid` → extend renewal date
   - `invoice.payment_failed` → set PAST_DUE, email user via Resend
   - `customer.subscription.deleted` → set CANCELLED

3. **Membership management page** (`/book/dashboard/membership`):
   - Current plan display
   - Upgrade/downgrade buttons
   - Billing history
   - Cancel subscription

4. **PATHS tier sync:**
   - When HUB membership changes → call PATHS internal endpoint to update user tier in JWT
   - Center memberships (Optimus/Immortalitas/Transcendentia/VIP) → PATHS Premium
   - E-Clinic (€99/mo) → PATHS Regular
   - Cancellation → revert to Free (or whatever their standalone PATHS tier is)

**Tier mapping (from spec):**

| HUB Membership | Price | PATHS Tier Included |
|----------------|-------|---------------------|
| Optimus | €180/mo | Premium |
| Immortalitas | €220/mo | Premium |
| Transcendentia | €280/mo | Premium |
| VIP | Custom | Premium |
| E-Clinic | €99/mo | Regular |

### PATHS integration endpoint needed

PATHS needs a new internal endpoint:
- `POST /learn/api/internal/tier-sync` — accepts `{ userId, tier }` with API key auth
- Updates user's membership tier in PATHS DB
- This means the **workbench needs to make a change in BOTH repos** for this task

### Verification
- Subscribe to Optimus → Stripe subscription created, membership record in DB
- Upgrade Optimus → Transcendentia → proration applied, plan updated
- Cancel → membership status CANCELLED at period end
- PATHS tier syncs correctly after subscribe/cancel

---

## Task 2: HUB Phase 4 — Patient Portal Dashboard

**Spec:** `docs/superpowers/specs/2026-03-27-hub-design.md` section 4 (Pages & Routes — Authenticated)

### What to build

1. **Dashboard home** (`/book/dashboard`):
   - Upcoming appointments (next 7 days)
   - Membership status card
   - Quick action buttons (book diagnostic, schedule telemedicine, view health)
   - Recent booking activity

2. **Appointment list** (`/book/dashboard/appointments`):
   - Past and upcoming appointments
   - Calendar or list view
   - Status badges (confirmed, completed, cancelled)

3. **Booking history pages:**
   - `/book/dashboard/diagnostics` — past diagnostic bookings
   - `/book/dashboard/stays` — past stay bookings
   - `/book/dashboard/telemedicine` — past telemedicine sessions

4. **Health summary widget** (`/book/dashboard/health`):
   - Reads from Digital Twin API: `GET /api/twin/:userId/summary`
   - Shows latest biomarkers, wearable data summary
   - Links to full health profile (future: OS Dashboard)

### Auth requirement
All `/book/dashboard/*` pages require authentication. Unauthenticated users redirect to `/learn/login?redirect=/book/dashboard`.

### API endpoints
- `GET /book/api/me` — current user profile
- `GET /book/api/me/membership` — membership details
- `GET /book/api/me/appointments` — upcoming + past appointments
- `GET /book/api/me/bookings/diagnostics` — diagnostic booking history
- `GET /book/api/me/bookings/stays` — stay booking history
- `GET /book/api/me/bookings/telemedicine` — telemedicine booking history

### Verification
- Login via PATHS → navigate to `/book/dashboard` → sees personalized content
- Unauthenticated visit to `/book/dashboard` → redirects to PATHS login
- Health widget fetches from Digital Twin API (may show empty state if no data)
- All booking history pages render with correct data

---

## Task 3: Digital Twin Phase 2 — HUB Integration

**Spec:** `docs/superpowers/specs/2026-03-27-digital-twin-design.md` section 11 Phase 2

### What to build

1. **Diagnostic result import:**
   - `POST /api/twin/:userId/diagnostics` — HUB clinician writes diagnostic results
   - Batch biomarker import: diagnostic result → individual biomarker rows
   - Service-to-service auth (API key in `X-Service-Key` header)

2. **Summary endpoint for HUB:**
   - `GET /api/twin/:userId/summary` — returns profile + latest biomarkers + latest wearable data
   - Optimized for the HUB patient portal health widget
   - Returns empty state gracefully if user has no data

3. **Activity log:**
   - `POST /api/twin/:userId/activity` — log cross-app events
   - Called by PATHS (course completed, quiz passed), HUB (booking confirmed, diagnostic done)
   - `GET /api/twin/:userId/activity` — paginated activity history

4. **Biomarker trend calculation:**
   - For each biomarker with 2+ data points: calculate trend (improving/stable/declining)
   - Include trend in `/summary` and `/biomarkers/:name` responses

### Verification
- HUB calls `POST /api/twin/:userId/diagnostics` with test data → biomarker rows created
- `GET /api/twin/:userId/summary` returns structured response
- Activity log accepts events from multiple sources
- Biomarker trend shows "improving" when values move toward optimal range

---

## Task 4: PATHS Header + AI Tutor Integration

Cross-service links now that the gateway is live.

### What to build

1. **PATHS header nav update:**
   - Remove any internal `/stays`, `/telemedicine`, `/diagnostics` links (if they exist)
   - Add HUB links: "Book" → `/book`, or specific pages → `/book/stays`, `/book/telemedicine`
   - These are now same-origin links under `app.limitless-longevity.health`

2. **AI tutor escalation CTA:**
   - When PATHS AI tutor generates `[SUGGEST_CONSULTATION]` marker
   - Render as CTA button linking to `/book/telemedicine`
   - Pre-fill context from health profile if available

3. **Login redirect support:**
   - PATHS login page must accept `?redirect=` parameter
   - After successful login, redirect to the specified URL (e.g., `/book/dashboard`)
   - Validate redirect URL is same-origin (security)

### Verification
- PATHS header shows "Book" link that navigates to HUB
- AI tutor consultation suggestion links to `/book/telemedicine`
- Login with `?redirect=/book/dashboard` → lands on HUB dashboard after auth

---

## Priority Order

1. **Task 3** (DT Phase 2 — HUB integration) — HUB patient portal needs the `/summary` endpoint
2. **Task 1** (HUB Phase 3 — memberships) — revenue-generating, needed for launch
3. **Task 2** (HUB Phase 4 — patient portal) — first authenticated user experience, depends on Tasks 1+3
4. **Task 4** (PATHS integration) — cross-service links, do last

**Note:** Tasks 1 and 3 are in different repos and can be parallelized. Task 2 depends on both (patient portal needs membership data from Task 1 and health data from Task 3).
