# OS Dashboard — Real Widget Plan

**Date:** 2026-03-28
**Current state:** 4 widgets exist (HealthWidget, UpcomingEventsWidget, LearningProgressWidget, DailyProtocolWidget) — all fetch from live APIs but may show empty states since data is sparse.

---

## Current Widgets (Already Built)

| Widget | API | Shows |
|--------|-----|-------|
| HealthWidget | `GET /api/twin/{userId}/summary` | Biological age, top biomarkers with status |
| UpcomingEventsWidget | `GET /book/api/me/appointments` | Next 3 appointments |
| LearningProgressWidget | `GET /learn/api/me/enrollments` | Course progress bars |
| DailyProtocolWidget | `GET /learn/api/me/protocol` | Daily checklist items |

## New Widgets to Build

### 1. App Launcher (replace Quick Actions)
The current Quick Actions grid is static buttons. Replace with a dynamic app launcher showing each OS service with live status.

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ 📚 Learn     │  │ 🏥 Book      │  │ 🧬 Health    │  │ 💪 Train     │
│ 3 courses    │  │ 1 upcoming   │  │ Last: 2d ago │  │ Coming soon  │
│ active       │  │ appointment  │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

- **Data:** Aggregate counts from each service API
- **Links:** `/learn`, `/book`, `/api/twin`, `/train`
- **Empty state:** "No activity yet — get started"

### 2. Biomarker Trends Widget
Compact sparkline chart showing 3-5 key biomarkers over time.

- **API:** `GET /api/twin/{userId}/biomarkers/{name}` for each key biomarker
- **Display:** Mini sparklines with trend arrows (improving/stable/declining)
- **Empty state:** "Complete your first diagnostic to track trends"

### 3. Membership Status Widget
Shows current plan, renewal date, features, and upgrade CTA.

- **API:** `GET /book/api/me/membership`
- **Display:** Plan badge, renewal date, diagnostic discount %, quick links
- **Empty state:** "Join a membership plan" → `/book/memberships`

### 4. Activity Feed Widget
Timeline of recent cross-platform activity.

- **API:** `GET /api/twin/{userId}/activity?limit=10`
- **Display:** Chronological list: "Completed Lesson 3 of Nutrition 101", "Booked diagnostic", "Biomarker update"
- **Empty state:** "Your activity will appear here"

### 5. Wearable Summary Widget (Phase 2 — after DT wearable integration)
Daily wearable metrics: sleep, HRV, steps, recovery.

- **API:** `GET /api/twin/{userId}/summary` (wearableInsights field)
- **Display:** 4 metric cards with daily values + 7-day trend
- **Empty state:** "Connect a wearable device" → `/book/dashboard/health`

## Widget Architecture Pattern

All widgets follow the same pattern (already established):
```tsx
'use client'
export default function MyWidget({ userId }: { userId: string }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/...', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <WidgetSkeleton />
  if (!data) return <EmptyState cta="..." href="..." />
  return <WidgetContent data={data} />
}
```

## Implementation Order

1. **App Launcher** — highest impact, replaces static buttons with live data
2. **Membership Status** — drives upgrades, simple API
3. **Activity Feed** — requires DT activity log data (may need HUB to start logging)
4. **Biomarker Trends** — requires biomarker history (depends on Phase 3 migration)
5. **Wearable Summary** — depends on DT wearable integration

## Grid Layout (Final)

```
┌─────────────────────────────────────────────┐
│ Header: LIMITLESS + user + tier badge       │
├─────────────────────────────────────────────┤
│ App Launcher (full width, 4 cards)          │
├──────────────────────┬──────────────────────┤
│ Health Widget        │ Membership Status    │
├──────────────────────┼──────────────────────┤
│ Learning Progress    │ Upcoming Events      │
├──────────────────────┼──────────────────────┤
│ Daily Protocol       │ Activity Feed        │
├──────────────────────┴──────────────────────┤
│ Biomarker Trends (full width, sparklines)   │
├─────────────────────────────────────────────┤
│ Wearable Summary (full width, 4 metrics)    │
└─────────────────────────────────────────────┘
```
