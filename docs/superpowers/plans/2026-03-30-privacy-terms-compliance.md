# Privacy Policy & Terms of Service — Compliance Plan

**Date:** 2026-03-30
**Status:** Plan — Awaiting Approval
**Criticality:** HIGH — Required before handling real client health/wearable data

---

## Why This Is Urgent

1. **Wearable data IS health data under GDPR Article 9** — heart rate, HRV, sleep, SpO2, temperature all qualify as special category data when processed in a health context
2. **Oura API agreement mandates** a compliant privacy policy and terms of service
3. **Garmin requires** a written user agreement with protections "at least as protective" as Garmin's
4. **WHOOP requires** mandatory review of the integration including documentation
5. **No privacy policy = no production wearable data**

---

## What We Must Build

### 1. Privacy Policy

**Structure (modeled after WHOOP for breadth, Oura for health data handling):**

| Section | Content |
|---------|---------|
| **1. Introduction & Scope** | Who we are (Limitless Longevity Consultancy), what the policy covers, effective date |
| **2. Data We Collect** | Categorized: personal identifiers, health/biometric (wearable), biomarker/diagnostic, financial, device/technical, usage/behavioral |
| **3. How We Collect Data** | Direct input, wearable devices (Oura, Garmin, future WHOOP/Apple), cookies, third-party APIs |
| **4. Legal Basis for Processing** | GDPR Article 6 (contract) + Article 9(2)(a) (explicit consent for health data). Per-purpose documentation |
| **5. How We Use Data** | Service delivery, personalization, AI features (tutor, recommendations, daily protocol), longevity scoring, analytics (anonymized only) |
| **6. How We Share Data** | Service providers (Render, Cloudflare, OpenRouter), wearable providers (controller-to-controller), payment (Stripe), authorities. **Never sold.** |
| **7. AI & Automated Processing** | What health data AI accesses, no training on user data, user deletion rights, LLM provider zero-retention policy |
| **8. Wearable Data** | Per-provider disclosure: what data synced, encryption in transit + at rest, Oura 60-day cache limit, user controls |
| **9. Cookies & Tracking** | Types (essential, functional, analytics), purposes, opt-in for EU, cookie consent banner |
| **10. Data Retention** | Active account: retained for service. Deletion: within 30 days. Anonymized research: may persist. Legal holds per statute. Oura: 60-day cache limit. |
| **11. Data Security** | AES-256-GCM encryption at rest (wearable tokens already), TLS in transit, access controls, pseudonymization, regular audits |
| **12. International Transfers** | Frankfurt (EU) data residency. Render (US) — Standard Contractual Clauses. Cloudflare — Data Processing Addendum. |
| **13. Your Rights** | Access, erasure, rectification, portability (JSON/CSV export), restrict, object, withdraw consent. Mechanism: email + in-app. 30-day response. |
| **14. Children** | Platform not for under-18. Deletion on discovery. |
| **15. GDPR Notice (EU/UK)** | Controller identification, DPO contact, lawful bases per activity, supervisory authority complaint right, DPIA reference |
| **16. CCPA/CPRA Notice (California)** | Categories collected, right to know/delete/opt-out, no sale of personal information |
| **17. Changes** | Material changes notified via email + in-app banner. 30-day notice period. |
| **18. Contact** | DPO email, legal entity address, supervisory authority |

**Oura-specific requirements in privacy policy:**
- State that Oura collects usage data from API interactions
- Include warranty disclaimers on behalf of Oura
- Disclose 60-day data cache limit

**Garmin-specific requirements:**
- Attribution: "Garmin [device model]" adjacent to all Garmin-sourced data
- Brand color `#6DCFF6` for Garmin attribution
- User agreement protections at least as protective as Garmin's

### 2. Terms of Service

**Structure:**

| Section | Content |
|---------|---------|
| **1. Acceptance** | Binding agreement, age 18+, capacity to consent |
| **2. Description of Services** | Platform overview: learning (PATHS), booking (HUB), health data (Digital Twin), dashboard (OS) |
| **3. Medical Disclaimer** | **PROMINENT.** Not medical advice, not a substitute for professional care, no doctor-patient relationship, consult your physician, emergency disclaimer, not FDA-evaluated, no liability for reliance |
| **4. User Accounts** | Registration, security responsibility, one account per person, termination rights |
| **5. Health Data Consent** | Separate, granular consent for: wearable sync (per provider), biomarker storage, AI analysis, longevity scoring. Consent withdrawal mechanism. |
| **6. Wearable Integrations** | Third-party terms apply (Oura, Garmin, WHOOP, Apple). We are not responsible for third-party data practices. Oura warranty disclaimers. |
| **7. Acceptable Use** | Prohibited conduct (misuse, reverse engineering, unauthorized access) |
| **8. Intellectual Property** | Platform ownership, user license, content rights |
| **9. User Content** | Rights granted for feedback, course reviews. Responsibility for accuracy. |
| **10. Fees & Billing** | Membership tiers, Stripe processing, refund policy, tier changes |
| **11. AI Features Disclaimer** | AI-generated content is not medical advice, may contain errors, user responsible for decisions |
| **12. Limitation of Liability** | Cap at fees paid in prior 12 months, exclusion of consequential damages |
| **13. Indemnification** | User indemnifies platform for misuse, false information, third-party claims |
| **14. Dispute Resolution** | Governing law (to be determined — EU or UK), informal resolution first, arbitration clause |
| **15. Termination** | User can terminate anytime. We can terminate for breach. Data deletion on termination per privacy policy. |
| **16. Data & Privacy** | Reference to privacy policy, GDPR rights summary |
| **17. Changes** | 30-day notice, continued use = acceptance |
| **18. Severability / Entire Agreement** | Standard legal boilerplate |
| **19. Contact** | Legal entity, DPO, support email |

### 3. Cookie Consent Banner

- **EU visitors:** Opt-in required (not pre-checked)
- **Categories:** Essential (always on), Functional, Analytics
- **Implementation:** Cookie consent library (e.g., `cookie-script` or custom)
- **Applies to:** All apps (OS Dashboard, PATHS, HUB)
- **Must persist choice** and allow easy withdrawal

### 4. Health Data Consent Flow

Separate from general terms acceptance. Triggered when user first:
- Connects a wearable device
- Enables AI health features
- Views biomarker data

**Flow:**
1. Modal explaining what data will be processed and why
2. Granular checkboxes (not a single "Accept all"):
   - "I consent to syncing my [Oura/Garmin] data for health tracking"
   - "I consent to AI analysis of my health data for personalized recommendations"
   - "I consent to longevity score calculation from my health metrics"
3. Each consent is recorded with timestamp in Digital Twin
4. User can withdraw any consent from account settings
5. Withdrawal is as easy as granting (one click)

### 5. Data Processing Agreements (DPAs)

| Processor | Type | Status | Action |
|-----------|------|--------|--------|
| **Render** | Hosting (processor) | DPA available | Sign/accept |
| **Cloudflare** | CDN/Workers (processor) | DPA available | Sign/accept |
| **OpenRouter** | AI API (processor) | **HIGH RISK** — verify zero-retention | Review DPA, verify health data handling |
| **Stripe** | Payments (processor) | DPA available | Sign/accept |
| **Oura** | Wearable (independent controller) | Controller-to-controller agreement | Draft data sharing agreement |
| **Garmin** | Wearable (independent controller) | Part of developer agreement | Review |
| **Jina AI** | RAG embeddings (processor) | Review needed | Verify data handling |

### 6. DPIA (Data Protection Impact Assessment)

**Mandatory** — health data + wearable monitoring + AI profiling + scoring all trigger DPIA requirements under GDPR Article 35.

**Must document:**
- Processing activities and purposes
- Necessity and proportionality assessment
- Risks to data subjects
- Mitigation measures
- DPO consultation outcome

**When:** Must be completed before processing real client health data.

### 7. DPO (Data Protection Officer)

**Recommended** even if not strictly required at current scale:
- German supervisory authorities (BfDI) are strict
- UHNW clients expect maximum privacy governance
- Signals seriousness and accountability
- DPO-as-a-service: EUR 500-2,000/month

---

## Technical Requirements

### Already Implemented
- AES-256-GCM encryption for wearable OAuth tokens (Digital Twin)
- TLS in transit (all services via Render/Cloudflare)
- GDPR export endpoint (`GET /api/twin/{userId}/export`)
- GDPR delete endpoint (`DELETE /api/twin/{userId}`)
- Activity logging with source tracking
- Frankfurt data residency (Render EU region)

### Still Needed
- [ ] Encryption at rest for ALL health data (not just OAuth tokens) — WHOOP mandates this
- [ ] Oura 60-day data cache enforcement (auto-purge raw wearable data older than 60 days)
- [ ] Consent record storage (per-user, per-purpose, with timestamps)
- [ ] Cookie consent banner across all apps
- [ ] Granular health data consent flow (modal + per-purpose checkboxes)
- [ ] Consent withdrawal UI in account settings
- [ ] Data breach notification procedure (72 hours to supervisory authority)
- [ ] Record of Processing Activities (ROPA) document
- [ ] DPIA document
- [ ] DPA agreements signed with all processors

---

## Implementation Plan

### Phase 1: Legal Documents (~2 days)

| Task | Owner | Effort |
|------|-------|--------|
| Draft privacy policy (all 18 sections) | Main (planning) + legal review | 1 day |
| Draft terms of service (all 19 sections) | Main (planning) + legal review | 1 day |
| Medical disclaimer (standalone, reusable) | Main | 2 hours |

**Important:** These should be reviewed by a qualified EU privacy lawyer before going live. Draft first, legal review second.

**Where to host:** Static pages on the corporate website (GitHub Pages) at:
- `limitless-longevity.health/privacy`
- `limitless-longevity.health/terms`

Linked from all app footers.

### Phase 2: Consent Infrastructure (~2 days)

| Task | Owner | Effort |
|------|-------|--------|
| Cookie consent banner (all apps) | Workbench | 0.5 day |
| Health data consent flow (DT + PATHS) | Workbench | 1 day |
| Consent record storage in DT | Workbench | 0.5 day |
| Consent withdrawal UI in account settings | Workbench | 0.5 day |

### Phase 3: Technical Compliance (~1.5 days)

| Task | Owner | Effort |
|------|-------|--------|
| Encryption at rest for all DT health data | Workbench | 0.5 day |
| Oura 60-day cache enforcement | Workbench | 0.5 day |
| Garmin attribution component | Workbench | 0.5 day |

### Phase 4: Documentation (~1 day)

| Task | Owner | Effort |
|------|-------|--------|
| DPIA document | Main + DPO | 0.5 day |
| ROPA document | Main | 0.5 day |
| DPA agreements executed | Main (admin) | Ongoing |

### Phase 5: Legal Review

| Task | Owner | Effort |
|------|-------|--------|
| EU privacy lawyer review of all documents | External | 1-2 weeks |
| Incorporate lawyer feedback | Main | 1-2 days |

**Total internal effort:** ~6.5 days + external legal review

---

## Immediate Action Items (Before Next Wearable Work)

1. **Contact branduse@ouraring.com** for brand asset approval
2. **Create WHOOP developer account** (requires membership purchase)
3. **Check Garmin developer approval status**
4. **Begin DPA collection** (Render, Cloudflare, Stripe — most have self-serve DPAs)
5. **Identify EU privacy lawyer** for document review

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Processing health data without valid Article 9 consent | EUR 20M or 4% global turnover | Implement consent flow before going live with real clients |
| Oura API access revoked for non-compliance | Wearable feature loss | Comply with 60-day cache, privacy policy requirements |
| UHNW client data breach | Catastrophic reputational damage | Encryption at rest, access controls, breach procedure, DPO |
| AI processing health data without disclosure | Regulatory action | Document AI data flows in privacy policy, ensure zero-retention with LLM providers |
| Classified as medical device under EU MDR | Regulatory burden | Position as wellness platform, avoid diagnostic claims, route clinical decisions through licensed professionals |

---

## Sources

- GDPR Articles 6, 9, 13-22, 28, 30, 35, 37-39
- Oura Ring API Developer Agreement
- Garmin Health API Developer Terms
- WHOOP Developer Platform Requirements
- Apple HealthKit Human Interface Guidelines
- EU MDR 2017/745
- EHDS Regulation (March 2025)
- Competitor policies: Oura, WHOOP, InsideTracker, Fountain Life
- Full research: `docs/superpowers/specs/2026-03-29-wearable-platform-compliance-research.md`
- Full research: `docs/superpowers/specs/2026-03-29-eu-privacy-health-data-regulation-research.md`
