# OS Dashboard: Own Login & Registration Pages

## Context

The OS Dashboard currently redirects to PATHS (`/learn/login`) for authentication. This breaks the user experience: after login, the user lands on PATHS instead of the dashboard, the PATHS branding is different, and the flow feels fragmented. The dashboard should own the auth experience — users log in *on* the dashboard, which calls the PATHS API behind the scenes.

**Constraint:** The dashboard is a static export (`output: 'export'`) on Cloudflare Pages — no backend, no API routes. All auth calls go through the gateway to PATHS.

## Plan

### 1. Create LoginView component

**File:** `src/components/LoginView.tsx`

- Full-screen centered form matching the Scientific Luxury design (dark bg, gold accents, glassmorphism card)
- Two fields: email, password
- Submit POSTs to `/learn/api/users/login` with `credentials: 'include'`
- On success: PATHS sets `payload-token` cookie with `Domain=.limitless-longevity.health`
- On success: call `onLogin(user)` callback to update parent state (no page reload needed)
- On error: show error message (`text-red-400`)
- "Forgot password?" links to `/learn/forgot-password` (PATHS handles it)
- "Create account" button switches to RegisterView
- LIMITLESS branding: display font header, gold accents, glass card

### 2. Create RegisterView component

**File:** `src/components/RegisterView.tsx`

- Same design as LoginView
- Four fields: firstName, lastName, email, password (+ confirm password)
- Client-side validation: password >= 8 chars, passwords match
- Submit POSTs to `/learn/api/auth/register` with `credentials: 'include'`
- On success: show "Check your email to verify your account" message
- On success: cookie is set, user is logged in (call `onLogin(user)`)
- "Already have an account?" switches to LoginView

### 3. Update page.tsx auth flow

**File:** `src/app/page.tsx`

Current flow:
```
mount → fetch /learn/api/users/me → user? DashboardView : LandingView
```

New flow:
```
mount → fetch /learn/api/users/me → user? DashboardView : LandingView
LandingView "Log In" → LoginView (client state, no navigation)
LandingView "Get Started" → RegisterView (client state, no navigation)
LoginView success → onLogin(user) → DashboardView
RegisterView success → onLogin(user) → DashboardView
```

State: `view: 'landing' | 'login' | 'register' | 'dashboard'`

### 4. Update LandingView

**File:** `src/components/LandingView.tsx`

- Change login/register buttons from `<a href="/learn/login">` to `onClick` handlers
- Accept `onLogin` and `onRegister` callbacks from parent
- Keep the app cards and hero design

### Files to create
- `src/components/LoginView.tsx`
- `src/components/RegisterView.tsx`

### Files to modify
- `src/app/page.tsx` — add view state management
- `src/components/LandingView.tsx` — buttons trigger state change instead of navigation

### Design reference
Match PATHS LoginForm.tsx styling:
- Card: `rounded-2xl border border-brand-glass-border bg-brand-glass-bg backdrop-blur-md p-8`
- Inputs: `bg-brand-glass-bg border border-brand-glass-border rounded-lg focus:ring-brand-gold/50`
- Button: `border border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-brand-dark rounded-full uppercase tracking-[0.15em]`
- Always include `style={{ WebkitBackdropFilter: 'blur(12px)' }}` on glass elements
- Header: LIMITLESS in display font with gold color

### API endpoints (called through gateway)
- Login: `POST /learn/api/users/login` — body: `{ email, password }` — returns `{ user }` + Set-Cookie
- Register: `POST /learn/api/auth/register` — body: `{ email, password, firstName, lastName }` — returns `{ user, emailVerificationSent }` + Set-Cookie
- Auth check: `GET /learn/api/users/me` — returns `{ user }` or 401

### What this does NOT do
- Password reset (links to PATHS `/learn/forgot-password`)
- Email verification page (handled by PATHS `/learn/verify-email`)
- Replace PATHS login page (PATHS keeps its own for direct access)

## Verification
1. `pnpm build` passes
2. `app.limitless-longevity.health` → LandingView → click "Log In" → LoginView renders (no navigation)
3. Enter credentials → POST to /learn/api/users/login → cookie set → DashboardView renders
4. Refresh page → still authenticated (cookie persists)
5. Click "Get Started" → RegisterView → fill form → account created → DashboardView
6. Direct PATHS login at `/learn/login` still works independently
