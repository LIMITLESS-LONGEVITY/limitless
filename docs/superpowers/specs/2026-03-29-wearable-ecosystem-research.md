# Wearable Ecosystem Research: Apple Watch & Garmin Integration

## Context

The El Fuerte Marbella pilot uses loaner Oura Rings, but long-term member retention depends on connecting members' **existing** wearables. Apple Watch (~60% market share) and Garmin (~15% in fitness/longevity segment) are the two most important integrations after Oura and Whoop. This report answers: what data can we get, how do we get it in production, and what future features does this unlock?

---

## 1. GARMIN — Server-Side API (Production-Ready)

### Access Model
- **Garmin Health API** — server-to-server, no app required
- **Free** for approved developers
- Apply at: https://www.garmin.com/en-US/forms/GarminConnectDeveloperAccess/
- Requires: company description, app description, how data will be used
- **OAuth:** Migrating from OAuth 1.0a to **OAuth 2.0 PKCE** (OAuth 1.0 retired 12/31/2026)

### Data Delivery: Push or Ping/Pull
Garmin offers two webhook-based delivery mechanisms:

**Push Service (Recommended):**
- Garmin sends HTTPS POST with full data payload when user syncs device
- Near real-time (within minutes of device sync)
- Data arrives at your webhook endpoint — no polling needed
- Each summary type has its own webhook URL

**Ping/Pull Service:**
- Garmin pings your endpoint with a list of users who have new data
- You then pull the data using provided URLs
- More control but adds a round trip

### Available Data (Production-Grade)

| Data Type | Endpoint | Key Metrics | Update Frequency |
|-----------|----------|-------------|-----------------|
| **Dailies** | /dailies | Steps, distance, calories, active time, heart rate (avg/min/max/resting), stress duration breakdown | Daily |
| **Sleep** | /sleeps | Duration, deep/light/REM/awake stages, sleep score, respiration rate, SpO2 | After each sleep |
| **Stress** | /stressDetails | 3-minute granularity stress scores, Body Battery levels throughout the day | Daily |
| **Body Battery** | (in stressDetails) | Energy reserve 0-100, charge/drain events | Continuous |
| **Heart Rate** | /dailies | Continuous HR samples, resting HR | Daily |
| **HRV** | /hrvSummaries | Beat-to-beat variation during overnight sleep window | Daily |
| **Pulse Ox** | /pulseOxSummaries | Blood oxygen saturation (SpO2) | During sleep |
| **Body Composition** | /bodyComps | Weight, BMI, body fat %, muscle mass, bone mass, body water % | On weigh-in |
| **Respiration** | /respirationSummaries | Average respiration rate, min/max | Daily |
| **Activities** | /activities | Workouts, GPS tracks, lap data, performance metrics | Per activity |
| **User Metrics** | /userMetrics | VO2 Max, fitness age | Updated periodically |

### Garmin-Exclusive Data (Not Available from Others)
- **Body Battery** — proprietary energy management metric (0-100)
- **Stress Score** — continuous stress monitoring with 3-min granularity
- **Training Readiness** — combines sleep, recovery, training load
- **Fitness Age** — Garmin's estimate of metabolic age

### Production Considerations
- Webhook endpoints must be HTTPS
- Garmin sends data as POST with JSON body
- Need to handle backfill (historical data pull via API)
- Rate limits: reasonable for health data (not real-time streaming)
- **Verdict: Fully production-ready. Server-side only, no app needed.**

---

## 2. APPLE WATCH — Requires Native iOS App

### The Hard Truth
- **No server-side API exists.** Apple Health data stays on-device.
- **No cloud sync by default.** All data local to iPhone.
- **HealthKit is an on-device framework**, not a web API.
- **A native iOS app is required** to bridge data from HealthKit to your backend.

### What This Means for LIMITLESS
To integrate Apple Watch, we MUST build (or adopt) a native iOS app that:
1. Requests HealthKit permissions from the user
2. Reads health data locally on the iPhone
3. Syncs data to the Digital Twin API in the background
4. Handles background refresh (iOS limits background execution)

### Available Data (via HealthKit)

Apple HealthKit provides 60+ data types:

| Category | Key Metrics | Apple Watch Source |
|----------|-------------|-------------------|
| **Heart** | Heart rate, resting HR, walking HR, HRV (SDNN), recovery HR | Yes — continuous |
| **Sleep** | Sleep stages (Core/Deep/REM/Awake), duration, schedule | Yes — native sleep tracking |
| **Activity** | Steps, distance, flights climbed, active calories, exercise minutes, stand hours | Yes — all day |
| **Blood Oxygen** | SpO2 readings | Yes — periodic + sleep |
| **Respiratory** | Respiratory rate | Yes — during sleep |
| **Body** | Weight, BMI, body fat %, lean body mass | Manual entry or smart scale |
| **Vitals** | Blood pressure, body temperature | Manual entry or paired devices |
| **ECG** | Electrocardiogram waveform data | Yes — on-demand |
| **Cardio Fitness** | VO2 Max estimate | Yes — calculated from workouts |
| **Workouts** | Type, duration, calories, HR zones, route GPS | Yes — detailed |
| **Mobility** | Walking speed, step length, double support time, stair ascent/descent speed | Yes — passive |
| **Noise** | Environmental sound levels | Yes — continuous |
| **Mindfulness** | Meditation minutes, reflections | Yes — from Mindfulness app |
| **Nutrition** | Calories, macros, water intake | Manual or third-party apps |
| **Cycle Tracking** | Menstrual cycle, symptoms, predictions | Yes |
| **Medications** | Medication schedules, adherence | Yes — from Health app |

### Apple-Exclusive Data (Not Available from Others)
- **ECG waveform** — medical-grade electrocardiogram
- **Fall detection events** — emergency detection data
- **Mobility metrics** — walking steadiness, gait analysis
- **Wrist temperature** — overnight trend (Series 8+)
- **Crash detection** — impact data
- **Medication adherence** — tracked schedule vs actual intake

### Approaches to Apple Integration

**Option A: Build a Lightweight LIMITLESS iOS App**
- Swift/SwiftUI app with HealthKit entitlement
- Single purpose: connect Apple Health → sync to DT API
- Background delivery for key types (HR, steps, sleep)
- Estimated effort: 2-4 weeks for MVP
- Cost: Apple Developer Program ($99/yr)
- Pro: Full control, branded experience
- Con: App Store review, maintenance burden

**Option B: Use a Wearable Aggregator (Terra, Vital/Junction, Open Wearables)**
- Third-party SDK handles HealthKit connection
- You integrate their API instead of Apple's directly
- They handle background sync, data normalization
- **Terra:** $399/mo, supports Apple Health + 30+ devices, HIPAA compliant
- **Open Wearables:** Open-source, self-hosted, Flutter SDK
- Pro: Faster to market, handles edge cases
- Con: Dependency, per-user costs, data flows through third party

**Option C: Hybrid — Open Wearables (Self-Hosted)**
- Open-source project: no per-user fees, self-hosted
- Flutter SDK for mobile (iOS + Android)
- Unified API normalizes data across Apple Health, Samsung, Garmin, Polar, Suunto, Whoop
- Backend is self-hosted — data stays in our infrastructure
- Pro: No vendor lock-in, no per-user fees, covers Apple + Android
- Con: Need to build/maintain Flutter app, newer project

### Recommended: Option C (Open Wearables) + Option A as fallback
- Start with Open Wearables for broad coverage (Apple + Android)
- If Open Wearables doesn't meet quality bar, build lightweight Swift app
- Either way, data flows to DT API — the backend doesn't change

---

## 3. DATA MAPPING TO DIGITAL TWIN

Our `wearableSummaries` schema already covers all key metrics from all providers:

| DT Schema Field | Oura | Whoop | Garmin | Apple Watch |
|-----------------|------|-------|--------|-------------|
| sleepDuration | ✅ | ✅ | ✅ | ✅ |
| sleepEfficiency | ✅ | ✅ | ✅ | ✅ |
| sleepDeep | ✅ | ✅ | ✅ | ✅ (Core) |
| sleepRem | ✅ | ✅ | ✅ | ✅ |
| sleepLight | ✅ | ✅ | ✅ | ✅ |
| sleepScore | ✅ | ❌ | ✅ | ❌ |
| heartRateAvg | ✅ | ✅ | ✅ | ✅ |
| heartRateResting | ✅ | ✅ | ✅ | ✅ |
| hrvAvg | ✅ | ❌ | ✅ | ✅ (SDNN) |
| steps | ✅ | ❌ | ✅ | ✅ |
| caloriesActive | ✅ | ✅ | ✅ | ✅ |
| activeMinutes | ✅ | ❌ | ✅ | ✅ |
| recoveryScore | ❌ | ✅ | ❌ | ❌ |
| stressScore | ❌ | ✅ (strain) | ✅ | ❌ |

### Schema Additions Needed

New fields to add to `wearableSummaries`:

| Field | Type | Source |
|-------|------|--------|
| bodyBattery | integer | Garmin exclusive |
| spo2Avg | real | Garmin, Apple |
| respirationRate | real | Garmin, Apple, Oura |
| vo2Max | real | Garmin, Apple |
| wristTemperature | real | Apple (Series 8+), Oura |
| ecgClassification | text | Apple exclusive |
| walkingSteadiness | real | Apple exclusive |

**Architecture note:** Adding these columns now (even if empty) ensures the schema is ready when each provider integration goes live.

---

## 4. FUTURE FEATURES UNLOCKED BY WEARABLE INTEGRATION

### 4A. Real-Time Stay Monitoring (Hotel Pilot — Immediate)
During a longevity stay, the clinician dashboard shows live metrics:
- "Guest in Room 304: HRV dropped 30% overnight. Sleep efficiency 68% (below baseline). Recommend: morning cortisol check + adjusted protocol."
- Requires: continuous sync during stay, clinician-facing dashboard in HUB
- **Architecture impact:** Need real-time data path (wearableData hypertable), not just daily summaries

### 4B. Longevity Score (Near-Term)
A single 0-100 score synthesizing all wearable + biomarker data:
- Components: biological age delta, sleep quality trend, HRV trend, activity level, recovery pattern, stress management, biomarker trajectory
- Gamification: "Your score improved from 72 to 78 this month"
- **Architecture impact:** Need a `longevityScore` table in DT + scoring algorithm service. Consider adding to ai-context so AI can reference it.

### 4C. Predictive Health Alerts (Medium-Term)
AI analyzes multi-week trends to predict health events:
- "Your HRV has declined 15% over 3 weeks while stress scores increased. This pattern preceded your last cortisol spike. Recommend: stress management protocol + follow-up."
- "Sleep quality declining for 5 consecutive days. Body Battery not recovering above 60. Risk of burnout — consider recovery day."
- **Architecture impact:** Need trend analysis service reading from wearableSummaries. May need ML model training on population data at scale.

### 4D. Cross-Device Data Fusion (Medium-Term)
Members with multiple devices get the richest Digital Twin:
- Apple Watch provides ECG + mobility metrics
- Oura provides best sleep staging + temperature
- Garmin provides Body Battery + stress + best activity tracking
- DT fuses all sources: take the best signal for each metric
- **Architecture impact:** `wearableSummaries` already handles multi-provider per user (unique constraint on userId+date+provider). Need a fusion service that picks the best source per metric.

### 4E. AI Coaching Based on Real-Time State (Near-Term)
Daily protocol adjusts based on this morning's data:
- "Your recovery score is 45 (low). Today's protocol: skip HIIT, replace with Zone 2 walk. Focus on sleep hygiene tonight."
- AI Tutor integrates wearable state: "Based on your HRV trend this week, here's why your sleep protocol matters..."
- **Architecture impact:** ai-context endpoint already returns wearableInsights. Extend with today's latest data, not just 7-day averages.

### 4F. Family & Team Health Dashboards (Long-Term)
Corporate wellness and family programs show aggregate wearable data:
- "Team average sleep quality: 72%. 3 members below 60% — recommend wellness intervention."
- "Family: your daughter's activity is above target, your son's sleep quality needs attention."
- **Architecture impact:** Need aggregation queries across multiple users. Access control for family/team groups.

### 4G. Wearable-Triggered Bookings (Long-Term)
Automated clinical responses to wearable anomalies:
- "SpO2 dropped below 92% for 3 consecutive nights → auto-suggest sleep study booking"
- "HRV below baseline for 2 weeks → suggest telemedicine consult"
- **Architecture impact:** Need an event/alerting system in DT that monitors thresholds and triggers actions in HUB (booking) or PATHS (protocol adjustment).

### 4H. Research Platform (Long-Term)
At scale (10,000+ users with wearables), the anonymized dataset becomes valuable:
- Population-level correlations: "Users who improved sleep quality by 20% showed a 12% reduction in inflammatory markers within 6 months"
- Pharmaceutical partnerships: anonymized cohort data for longevity research
- **Architecture impact:** Need data warehouse / analytics layer. TimescaleDB continuous aggregates for efficient time-series analytics.

---

## 5. ARCHITECTURAL DECISIONS NEEDED NOW

Based on the future features analysis, these decisions affect current work:

### 5A. Add schema fields for Garmin + Apple data
Add `bodyBattery`, `spo2Avg`, `respirationRate`, `vo2Max`, `wristTemperature` to `wearableSummaries` NOW, even if empty. Avoids schema migration later when these integrations go live.

### 5B. Add `longevityScore` table
Simple table: userId, date, score (0-100), components (jsonb), calculatedAt. Even if the scoring algorithm isn't built yet, having the schema means the OS Dashboard can display it when ready.

### 5C. Decide on Apple Watch approach
- **If pilot is hotel-only (Oura loaners):** Apple integration can wait 2-3 months
- **If members need it for retention:** Start Open Wearables evaluation NOW
- **Recommendation:** Start Open Wearables evaluation in parallel with Oura/Whoop build

### 5D. Add `provider` field normalization
Ensure all wearable data uses consistent provider names: `oura`, `whoop`, `garmin`, `apple`, `samsung`. This affects queries, dashboards, and the fusion service later.

### 5E. Real-time vs daily sync
- Current design: daily summaries (wearableSummaries) — sufficient for most features
- Real-time stay monitoring needs: time-series data (wearableData hypertable) with sub-minute resolution
- **Decision:** Build daily summaries first, add time-series for hotel pilot when needed

---

## 6. IMPLEMENTATION PRIORITY

| Priority | Integration | Effort | Mechanism | Blocker |
|----------|------------|--------|-----------|---------|
| 1 | **Oura Ring** | 1 week | OAuth2 + polling | In progress |
| 2 | **Whoop** | 3 days | OAuth2 + polling | Developer account |
| 3 | **Garmin** | 1 week | OAuth2 PKCE + Push webhooks | Developer account approval |
| 4 | **Apple Watch** | 2-4 weeks | iOS app or Open Wearables | iOS app development or SDK evaluation |

### Garmin: Next Steps
1. Apply for Garmin Connect Developer Program (free)
2. Describe LIMITLESS use case (longevity health monitoring)
3. Request Health API access (dailies, sleep, stress, HRV, body composition)
4. Implement OAuth 2.0 PKCE flow (Garmin retiring OAuth 1.0 end of 2026)
5. Set up Push webhook endpoint for real-time data delivery

### Apple Watch: Next Steps
1. Evaluate Open Wearables Flutter SDK (1 week spike)
2. If viable: integrate Open Wearables as mobile data bridge
3. If not: build lightweight Swift HealthKit app (2-4 weeks)
4. Either way: data flows to same DT API endpoints

---

## Sources

- [Garmin Health API](https://developer.garmin.com/gc-developer-program/health-api/)
- [Garmin Connect Developer Program](https://developer.garmin.com/gc-developer-program/)
- [Garmin OAuth2 PKCE Spec](https://developerportal.garmin.com/sites/default/files/OAuth2PKCE_1.pdf)
- [Apple HealthKit Documentation](https://developer.apple.com/documentation/healthkit)
- [Apple HealthKit Data Types](https://developer.apple.com/documentation/healthkit/data-types)
- [What You Can and Can't Do With Apple HealthKit Data](https://www.themomentum.ai/blog/what-you-can-and-cant-do-with-apple-healthkit-data)
- [Do You Need a Mobile App to Access Apple Health Data?](https://www.themomentum.ai/blog/do-you-need-a-mobile-app-to-access-apple-health-data)
- [Terra API — Wearable Aggregator](https://tryterra.co/)
- [Open Wearables](https://www.themomentum.ai/blog/introducing-open-wearables-the-open-source-api-for-wearable-health-intelligence)
- [Garmin Health API Data — Stress, Body Battery & Respiration](https://ilumivu.freshdesk.com/support/solutions/articles/9000259229)
