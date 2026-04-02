# Unified Header & Navigation — LIMITLESS Longevity OS

**Date:** 2026-03-30
**Status:** Plan — Awaiting Approval
**Problem:** Each app has a different header with inconsistent branding, navigation, user menu, and auth handling. The OS Dashboard has no user dropdown or logout. HUB has no auth integration in the header. PATHS is the most complete but uses "PATHS" branding instead of "LIMITLESS."

---

## Design Principles

1. **One brand, one experience** — Users should feel they're in one platform, not jumping between apps
2. **Consistent user menu** — Avatar + dropdown with profile, logout available everywhere
3. **Contextual navigation** — App-specific links change, but the header shell stays the same
4. **Shared auth state** — All apps read the same JWT cookie from `.limitless-longevity.health`
5. **Centralized menu config** — User dropdown items served from Digital Twin OS config endpoint, not hardcoded per app
6. **No shared component library (yet)** — Each app maintains its own header, but follows the same spec. A shared package adds build complexity we don't need at this scale.

---

## Unified Header Specification

### Structure

```
┌─────────────────────────────────────────────────────────┐
│  [LIMITLESS]        [App Nav Links]        [User Menu]  │
│   ↓ link to /       contextual per app      avatar+dropdown │
└─────────────────────────────────────────────────────────┘
```

### Logo (Left)

| Property | Value |
|----------|-------|
| Text | "LIMITLESS" (all apps) |
| Font | `font-display text-2xl font-semibold tracking-[0.12em]` |
| Color | `text-brand-gold` |
| Hover | `hover:text-brand-gold/80 transition-colors` |
| Link | `href="/"` — always links to OS Dashboard (gateway root) |
| Element | `<a>` (not Next.js `<Link>`) for cross-app navigation |

**PATHS change:** Replace "PATHS" icon+text logo with "LIMITLESS" text. The PATHS icon can move to the app launcher or be removed entirely — users already know which app they're in from the nav links and URL.

### Navigation (Center)

App-specific links. Each app defines its own nav items but follows the same styling spec.

**OS Dashboard (authenticated):**
```
Dashboard    /
Health       /health
Train        /train
```

**PATHS:**
```
Courses      /learn/courses
Articles     /learn/articles
Discover     /learn/discover
Guide        /learn/guide
Search       /learn/search (icon only)
```

**HUB:**
```
Memberships   /book/memberships
Diagnostics   /book/diagnostics
Stays         /book/stays
Telemedicine  /book/telemedicine
```

**Styling (all apps):**
- Desktop: `hidden md:flex items-center gap-6`
- Text: `text-sm tracking-wide text-brand-silver`
- Active: `text-brand-gold` (pathname match)
- Hover: `hover:text-brand-gold transition-colors`

### App Switcher (Optional — between logo and nav)

A subtle dropdown or pill showing which app you're in, with quick links to the others:

```
[Dashboard ▾]  →  dropdown: Dashboard /, Learn /learn, Book /book
```

**Decision needed:** Is this worth the complexity now, or should cross-app navigation stay in the App Launcher widget on the dashboard? Recommend deferring — the app launcher already serves this purpose.

### User Menu (Right) — Centralized via DT OS Config

Consistent across ALL apps when authenticated. **Menu items are NOT hardcoded** — they are fetched from the Digital Twin OS config endpoint so adding/removing items requires zero cross-app changes.

#### OS Config Endpoint

```
GET /api/twin/os/config
```

No authentication required — this is global config, not user-specific. Served from a static JSON config file in the DT codebase (version-controlled, deploys with the service).

**Response:**
```json
{
  "userMenu": [
    { "label": "Profile", "href": "/learn/account/profile", "icon": "user", "roles": [] },
    { "label": "My Courses", "href": "/learn/account/courses", "icon": "book-open", "roles": [] },
    { "label": "Health Data", "href": "/health", "icon": "heart-pulse", "roles": [] },
    { "label": "Clinician Portal", "href": "/book/clinician", "icon": "stethoscope", "roles": ["admin", "contributor"] }
  ]
}
```

**Field definitions:**
- `label` — Display text
- `href` — Absolute path (cross-app navigation via gateway)
- `icon` — Lucide icon name (each app maps this to its icon component)
- `roles` — Empty array = visible to all. Non-empty = only shown to users with a matching role. Apps filter client-side using the `role` from `/learn/api/users/me`.

**Why DT, not PATHS?**
- The user menu is an **OS-level concern**, not a learning platform concern
- DT is already the cross-cutting service (health data, activity logs, wearables)
- Avoids coupling all apps to PATHS for non-learning functionality
- If PATHS goes down, the other apps still get their menu config
- Future: DT can serve other OS-level config (feature flags, user preferences, notification settings)

**Why static config file, not database?**
- Menu items change rarely (new app launch, not daily)
- Version control gives an audit trail
- No migration or admin UI needed
- Can move to database later if runtime editing is needed

**Adding a new menu item (e.g., "Your Stays"):**
1. Edit the config file in `limitless-digital-twin/src/config/os-config.json`
2. Commit, push, deploy DT
3. All apps pick it up on next page load — zero cross-app PRs

#### Desktop Rendering

```
[Avatar circle]  ▾
  ┌────────────────────────┐
  │  James Richardson       │
  │  admin@limitless...     │
  │  ┌──────────────┐      │
  │  │ Elite        │      │  ← tier badge
  │  └──────────────┘      │
  │─────────────────────────│
  │  [icon]  Profile        │  ← from config
  │  [icon]  My Courses     │  ← from config
  │  [icon]  Health Data    │  ← from config
  │─────────────────────────│
  │  🔴  Log Out            │  ← always present, not from config
  └────────────────────────┘
```

(Icons are Lucide components, not emoji — listed above for illustration)

**Logout is always hardcoded** — it's not a navigation item, it's an action. Never served from config.

**Avatar:**
- Circle: `w-9 h-9 rounded-full`
- Background: `bg-brand-glass-bg border border-brand-glass-border`
- Content: First initial from `firstName`, or first letter of email
- If user has avatar image: show image instead

**Dropdown styling:**
- Background: `bg-brand-dark-alt border border-brand-glass-border rounded-lg shadow-lg`
- Width: `w-64`
- Backdrop blur: `backdrop-blur-md` + `-webkit-backdrop-filter: blur(12px)`
- Items: `px-4 py-2 hover:bg-brand-glass-bg-hover transition-colors`
- Logout: `text-red-400 hover:text-red-300`

**Logged out state:**
```
[Log In]  [Get Started]
```
- Log In: text link, `text-brand-silver hover:text-brand-gold`
- Get Started: border button, `border-brand-gold text-brand-gold hover:bg-brand-gold/10`

### Auth + Config Data Fetching

All apps fetch two things on mount (in parallel):

```
GET /learn/api/users/me    (credentials: 'include')  → user data
GET /api/twin/os/config    (no auth needed)           → menu config
```

**User data** provides: `id`, `email`, `firstName`, `lastName`, `role`, `tier`, `avatar`, `currentStreak`

**OS config** provides: `userMenu` items with labels, hrefs, icons, and role filters.

Each app should:
1. Call both endpoints on mount (client-side, `Promise.allSettled`)
2. Cache both results for the session (React state or context)
3. Filter `userMenu` items by user's `role` (empty `roles` array = show to all)
4. Pass user data + filtered menu items to the header component
5. Handle failures gracefully:
   - Auth fails → show logged-out state
   - Config fails → fall back to hardcoded default menu (Profile + Log Out)

**Logout:** All apps call:
```
POST /learn/api/users/logout   (credentials: 'include')
```
Then redirect to `/` (gateway root → OS Dashboard landing).

### Mobile Responsiveness

Consistent hamburger menu across all apps:

- **Breakpoint:** `md:` (768px)
- **Hamburger icon:** 3-line SVG, animated to X on open
- **Mobile menu:** Full-width dropdown below header
- **Contents:** Nav links stacked + user info + logout
- **Touch targets:** Min 44px height on all interactive elements
- **Backdrop blur:** Same as desktop header

### Scroll Behavior

All apps:
- **At top:** `bg-transparent border-transparent`
- **Scrolled:** `bg-brand-dark/90 backdrop-blur-md border-brand-glass-border`
- Transition: `transition-all duration-300`

---

## Implementation Per App

### Digital Twin — OS Config Endpoint (First)

**Current state:** No OS config endpoint exists.

**Changes:**
1. Create `src/config/os-config.json` with `userMenu` items
2. Add `GET /api/twin/os/config` route that serves the JSON file
3. No auth required — public config endpoint
4. Add cache headers (`Cache-Control: public, max-age=300`) — 5 min cache is fine for config that changes on deploy

**Config file (`src/config/os-config.json`):**
```json
{
  "userMenu": [
    { "label": "Profile", "href": "/learn/account/profile", "icon": "user", "roles": [] },
    { "label": "My Courses", "href": "/learn/account/courses", "icon": "book-open", "roles": [] },
    { "label": "Health Data", "href": "/health", "icon": "heart-pulse", "roles": [] },
    { "label": "Clinician Portal", "href": "/book/clinician", "icon": "stethoscope", "roles": ["admin", "contributor"] }
  ]
}
```

**Effort:** 0.5 day (including PR + deploy)

### OS Dashboard (Highest Priority)

**Current state:** Inline header in `DashboardView.tsx`, no dropdown, no logout.

**Changes:**
1. Extract header to `src/components/Header.tsx` (shared between all views)
2. Fetch OS config on mount alongside user data
3. Add user menu with avatar + dropdown (items from config)
4. Add nav links (Dashboard, Health, Train)
5. Add logout functionality (POST to `/learn/api/users/logout`, reset state)
6. Add mobile hamburger menu
7. Add scroll detection for background transition
8. Update `LandingView.tsx` to use same header (with logged-out state)
9. Hardcoded fallback menu if config fetch fails (Profile + Log Out)

**Effort:** 1 day

### HUB

**Current state:** Has header with nav links and mobile menu, but no user menu.

**Changes:**
1. Add auth check on mount (fetch `/learn/api/users/me`)
2. Fetch OS config on mount (fetch `/api/twin/os/config`)
3. Add user menu component (avatar + dropdown, items from config)
4. Replace "LIMITLESS" logo link to go to `/` (already does)
5. Add logout functionality
6. Ensure mobile menu includes user section when logged in
7. Hardcoded fallback menu if config fetch fails

**Effort:** 0.5 day

### PATHS

**Current state:** Most complete. Has user dropdown, auth, mobile. Uses "PATHS" branding.

**Changes:**
1. Replace "PATHS" logo with "LIMITLESS" text
2. Replace hardcoded dropdown items with config-driven items (fetch `/api/twin/os/config`)
3. Add role-based filtering of menu items
4. Update logout to redirect to `/` (gateway root) instead of `/learn`
5. Verify styling matches spec exactly
6. Hardcoded fallback menu if config fetch fails

**Effort:** 0.5 day

---

## What NOT to Build

- **Shared component library / npm package** — Too much build infrastructure for 3 apps. Instead, each app follows the spec. When we add a 4th app, revisit.
- **App switcher dropdown** — App Launcher widget on dashboard already handles cross-app navigation. Defer.
- **Server-side auth** — Keep client-side fetch to `/learn/api/users/me`. SSR auth adds complexity across 3 different frameworks.
- **Database-driven config** — Static JSON file in DT codebase is sufficient. Menu items change on app launches, not daily. Move to database only if runtime editing becomes a real need.
- **Hardcoded menu items per app** — All menu items come from the DT OS config. The only hardcoded element is Logout (it's an action, not navigation).

---

## Implementation Order

| Step | App | Task | Owner | Effort |
|------|-----|------|-------|--------|
| 1 | Digital Twin | OS config endpoint (`/api/twin/os/config`) | Workbench | 0.5 day |
| 2 | OS Dashboard | Extract header + config-driven dropdown + logout + nav + mobile | Main | 1 day |
| 3 | HUB | Add auth + config fetch + user dropdown + logout | Workbench | 0.5 day |
| 4 | PATHS | Rebrand logo + config-driven dropdown + logout redirect | Workbench | 0.5 day |
| 5 | All | Cross-app QA — verify consistent look and behavior | Main | 0.5 day |

Steps 1 is a prerequisite for 2-4. Steps 2, 3, 4 can run in parallel after step 1 deploys.

**Total effort:** ~3 days

---

## Visual Consistency Checklist

After implementation, all 3 apps must pass:

- [ ] Logo reads "LIMITLESS" and links to `/`
- [ ] Logo styling: `font-display text-2xl font-semibold tracking-[0.12em] text-brand-gold`
- [ ] Nav links: `text-sm tracking-wide text-brand-silver`, gold when active
- [ ] Avatar: `w-9 h-9 rounded-full` with initial or image
- [ ] Dropdown: dark background, gold/silver text, red logout
- [ ] Logged out: "Log In" + "Get Started" buttons
- [ ] Mobile: hamburger at `md:` breakpoint, animated toggle
- [ ] Scroll: transparent → blurred background transition
- [ ] Logout redirects to `/` (gateway root)
- [ ] `prefers-reduced-motion` respected
- [ ] `-webkit-backdrop-filter` included alongside `backdrop-filter`
- [ ] Touch targets 44px minimum
