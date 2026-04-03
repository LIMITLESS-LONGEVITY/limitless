# HUB Phase 5: Clinician Portal

## Context

Hospital network clients need their clinicians to review patient health data before consultations. Today, clinicians have no view into the Digital Twin — they can't see biomarkers, wearable trends, or stay context before a patient walks in. The clinician portal surfaces this data, reducing consult prep from 15 minutes to 30 seconds.

**Auth approach:** Same PATHS login, role-based routing. Users with `role: 'admin'` or `role: 'contributor'` (clinician) in their JWT see the clinician portal at `/book/clinician/`.

## What a Clinician Sees

### Clinician Dashboard (`/book/clinician`)
- Today's appointments (with patient names, time, type)
- Quick stats: patients seen this week, upcoming today, pending telemedicine

### Patient List (`/book/clinician/patients`)
- All patients assigned to this clinician (via Appointment or TelemedicineBooking relationships)
- Each row: name, email, tier, last appointment date, next appointment
- Click → patient detail

### Patient Detail (`/book/clinician/patients/[userId]`)
The core value — the **AI Clinician Copilot** view:

**Health Summary (from DT `/api/twin/{userId}/summary`):**
- Biological age vs chronological age
- Top biomarkers with status + trends (improving/declining/stable)
- Wearable insights: 7-day avg sleep, HRV, recovery, steps

**AI Briefing (from DT `/api/twin/{userId}/ai-context`):**
- AI-generated pre-consult summary (call PATHS AI or generate locally)
- Active stay context (if patient is on a longevity stay)
- Health goals and pillar priorities

**Booking History (from HUB DB):**
- Diagnostic history with results
- Stay history
- Telemedicine sessions
- Appointment history

**Upcoming (from HUB DB):**
- Next appointments
- Pending bookings

## Plan

### 1. Role-Based Middleware

**File:** `src/lib/auth.ts`

Add `requireClinician()` middleware:
```typescript
export async function requireClinician() {
  const session = await getSession()
  if (!session) redirect('/learn/login')
  if (!['admin', 'contributor', 'editor'].includes(session.role)) {
    redirect('/book/dashboard') // non-clinicians go to patient dashboard
  }
  return session
}
```

PATHS roles `contributor`, `editor`, `publisher`, `admin` map to clinical staff. Regular `user` role = patient.

### 2. Link Clinician to User

**File:** `prisma/schema.prisma`

Make `pathsUserId` required on Clinician and add a lookup function. The clinician record is identified by matching `pathsUserId` from JWT.

### 3. Clinician API Routes

**Files in `src/app/api/clinician/`:**

- `GET /api/clinician/me` — get clinician record from JWT (lookup by pathsUserId)
- `GET /api/clinician/appointments` — today's + upcoming appointments with patient details
- `GET /api/clinician/patients` — unique patients from appointments + telemedicine bookings
- `GET /api/clinician/patients/[userId]/bookings` — all bookings for a specific patient

### 4. DT Data Fetching

Patient health data comes from Digital Twin via service key:

- `GET DT_URL/api/twin/{patientUserId}/summary` — biomarkers, trends, wearable insights
- `GET DT_URL/api/twin/{patientUserId}/ai-context` — AI briefing context

HUB calls DT with `x-service-key: HUB_SERVICE_KEY` (already deployed).

**File:** `src/lib/dt-client.ts` — helper for DT API calls from HUB server components.

### 5. Clinician Pages

**Files in `src/app/clinician/`:**

```
clinician/
  layout.tsx              — clinician sidebar (different from patient sidebar)
  page.tsx                — dashboard: today's schedule, quick stats
  ClinicianDashClient.tsx — client component with appointment list
  patients/
    page.tsx              — patient roster
    PatientsClient.tsx    — searchable patient list
    [userId]/
      page.tsx            — patient detail (server: fetch DT + HUB data)
      PatientDetailClient.tsx — tabs: Health Summary, Biomarkers, Bookings, Wearables
```

### 6. Clinician Sidebar

**File:** `src/components/ClinicianSidebar.tsx`

- Dashboard (today's schedule)
- Patients (roster)
- Telemedicine (video consults)
- Settings

Different from patient DashboardSidebar — clinician nav focuses on patient management.

### 7. Conditional Routing

**File:** `src/app/book/layout.tsx` or middleware

When a clinician-role user hits `/book/dashboard`, redirect to `/book/clinician`. When a patient-role user hits `/book/clinician`, redirect to `/book/dashboard`.

## Files to Create (HUB)
- `src/lib/dt-client.ts` — DT API helper
- `src/app/api/clinician/me/route.ts`
- `src/app/api/clinician/appointments/route.ts`
- `src/app/api/clinician/patients/route.ts`
- `src/app/api/clinician/patients/[userId]/bookings/route.ts`
- `src/app/clinician/layout.tsx`
- `src/app/clinician/page.tsx` + `ClinicianDashClient.tsx`
- `src/app/clinician/patients/page.tsx` + `PatientsClient.tsx`
- `src/app/clinician/patients/[userId]/page.tsx` + `PatientDetailClient.tsx`
- `src/components/ClinicianSidebar.tsx`

## Files to Modify (HUB)
- `src/lib/auth.ts` — add `requireClinician()`
- `prisma/schema.prisma` — make Clinician.pathsUserId required (if not already)

## Not in Scope
- AI-generated pre-consult summary (future — needs AI endpoint in HUB or DT)
- Clinician notes/annotations on patient records (future)
- Video consult integration (future)
- Audit logging of clinician data access (future — important for compliance)

## Verification
1. `pnpm build` passes
2. Login as admin → `/book` → redirected to `/book/clinician`
3. Clinician dashboard shows today's appointments
4. Patient list shows patients from appointments
5. Patient detail shows DT health summary + biomarkers + wearable data
6. Login as regular user → `/book` → sees patient dashboard as before
7. Clinician cannot access routes without clinician role
