# Wearable Platform Compliance Requirements Research

**Date:** 2026-03-29
**Purpose:** Document the specific privacy policy, terms of service, and compliance requirements that Oura, Garmin, WHOOP, and Apple mandate for third-party apps integrating with their platforms.
**Status:** Research complete

---

## Table of Contents

1. [Oura Ring](#1-oura-ring)
2. [Garmin](#2-garmin)
3. [WHOOP](#3-whoop)
4. [Apple HealthKit](#4-apple-healthkit)
5. [Cross-Platform Summary Matrix](#5-cross-platform-summary-matrix)
6. [LIMITLESS Compliance Checklist](#6-limitless-compliance-checklist)

---

## 1. Oura Ring

### Developer Agreement

**Source:** [Oura API Agreement](https://cloud.ouraring.com/legal/api-agreement)

### 1.1 Required Privacy Policy Content

Your Developer Application **must** have a privacy policy that:

- Is lawful and GDPR-compliant
- Is accessible via "reasonably prominent hyperlinks"
- Explains collection, storage, use, and transfer of personal data
- Does **not** conflict with or supersede Oura's Privacy Policy
- Includes a statement that **Oura collects usage data from API interactions**
- Discloses when personal data is provided directly to Oura
- Makes users aware of data processing and disclosure practices

### 1.2 Data Handling Requirements

| Requirement | Detail |
|---|---|
| **Cache limit** | No Oura Data shall remain in cache longer than **60 days** |
| **Storage** | No storage except limited caching to improve performance |
| **Third-party display** | Cannot provide or display Oura data to third parties except the end user |
| **Encryption** | Must use commercially reasonable security including encryption over HTTPS |
| **Scope** | Cannot collect, use, store, aggregate, or transfer Oura Data beyond expressly permitted purposes |
| **GDPR Art. 32(1)** | Must implement technical and organisational security measures aligned with GDPR Article 32(1) |

### 1.3 User Consent Requirements

- Oura users must **expressly authorize** your Developer Application prior to accessing any of their data
- Users must be able to access their collected data upon request
- Users must express contact preferences via notice and opt-out at collection point and in subsequent marketing
- Cannot grant data visibility to anyone except the user without **prior express consent of that user**
- Must obtain all necessary consents before providing personal data directly to Oura

### 1.4 Data Deletion Requirements

- Delete **all data** upon user request or application termination
- "All Data about an end user in your possession or control must be deleted by you upon such end user's request"
- Upon access revocation, ensure deletion from "related networks, systems and servers"
- Must remove cached resources immediately if unavailable from Oura

### 1.5 Prohibited Uses

- Cannot create applications that "merely replicate or compete with Oura"
- Cannot use API for purposes "competitive to Oura or the Oura Platform"
- **Cannot sell, license, lease, or disclose Oura Data** to any third party including advertisers or data brokers, **even if the user consents**
- Cannot charge end users for API access or related functionality
- Cannot use API for benchmarking or competitive analysis
- Cannot send unsolicited advertising or promotions to Oura users
- Cannot reverse engineer, decompile, or modify Oura API materials
- Cannot enable virtual races or competitions
- Cannot use web scraping, harvesting, or data extraction methods
- Cannot frame, wrap, or reproduce significant platform portions

### 1.6 Branding & Attribution Requirements

**Source:** [Oura Branding Guidelines v1](https://static.ouraring.com/pdfs/Oura_BrandGuidelines_v1.pdf) | [Commercial Use Guidelines](https://ouraring.com/guidelines-for-commercial-use)

- **Must** attribute use of Oura Data using links and logos Oura provides
- **Must** comply with Oura Branding Guidelines (updated from time to time)
- **Cannot** use Oura Marks as the name, icon, or logo of your application
- **Cannot** use a "confusingly similar mark" to Oura branding
- Must update Oura Marks to reflect current versions from Branding Guidelines
- **No press releases** or announcements mentioning Oura without prior written consent
- All commercial use requires **written permission** from Oura — contact branduse@ouraring.com
- License is non-exclusive, non-transferable, worldwide, royalty-free, revocable at any time

### 1.7 Terms of Service Requirements

Your app's terms must include:

- Disclaimer of warranties **on behalf of third-party service providers**, including implied warranties of merchantability and fitness for particular purpose
- Exclusion of third parties **from all liability** for consequential, special, punitive, indirect damages
- Easily accessible user support contact information
- Clear navigation links to Oura user accounts

### 1.8 Security & Breach Notification

- Notify Oura of security breaches **within 24 hours**
- Review and implement Security Controls provided by Oura
- Maintain confidentiality of client ID and client secrets
- Notify Oura of unauthorized account access immediately

### 1.9 Audit & Enforcement

- Oura may monitor API usage to improve the platform
- Oura collects "Usage Data" for business purposes
- Can terminate or limit uses if Agreement is violated
- May revoke access for applications not providing "added benefit to Oura users"
- Can modify or discontinue API at any time with or without notice
- Developer must indemnify Oura for claims arising from API misuse

### 1.10 Additional Requirements

- Keep registration information accurate, complete, and current
- Comply with U.S. Export Administration Regulations
- Cannot charge service, booking, or subscription fees for Oura Platform functionality
- Cannot sell, rent, lease, sublicense, redistribute, or syndicate API access
- Cannot use Oura Data in advertisements without express written consent
- Advertisements must not suggest Oura endorsement

---

## 2. Garmin

### Developer Agreement

**Source:** [Garmin Connect Developer Program Agreement (PDF)](https://www8.garmin.com/en-US/GARMINCONNECTDEVELOPERPROGRAMAGREEMENT/GARMINCONNECTDEVELOPERPROGRAMAGREEMENT_EN.pdf) | [Program Overview](https://developer.garmin.com/gc-developer-program/overview/) | [Program FAQ](https://developer.garmin.com/gc-developer-program/program-faq/)

### 2.1 Required Privacy Policy Content

- Must provide "conspicuous notice in compliance with Applicable Data Protection Laws" to end users of privacy practices (a "Privacy Policy")
- Must confirm that any required consent has been obtained from End Users
- Privacy policy must comply with all Applicable Data Protection Laws in your jurisdiction
- Must enter into a **written agreement with each End User** containing protections and limitations of liability "at least as protective" of user data as Garmin requires

### 2.2 Data Handling Requirements

| Requirement | Detail |
|---|---|
| **Security measures** | Industry-standard security protections; appropriate technical and organizational measures per Applicable Data Protection Laws |
| **Scope** | Data used solely for stated purposes with user authorization |
| **Third-party sharing** | Cannot sell, share, or disclose user data to third parties without consent |
| **Vulnerability reporting** | Must report security vulnerabilities to Garmin immediately |
| **Documentation** | Must maintain documentation of data handling practices |
| **Processing** | Must comply with Applicable Data Protection Laws for Processing of End User Personal Data |

### 2.3 User Consent Requirements

- Explicit consent required for any data collection beyond minimum functional requirements
- Users must be informed about data practices transparently
- Consent **cannot be bundled or presumed**
- Before collecting End User Personal Data through the API, must provide conspicuous notice and confirm required consent obtained

### 2.4 Data Deletion Requirements

- Users retain rights to request data deletion
- Must establish procedures enabling users to delete their data
- Data retention limited to necessary operational periods

### 2.5 Branding & Attribution Requirements

**Source:** [API Brand Guidelines](https://developer.garmin.com/brand-guidelines/api-brand-guidelines/) | [Brand Guidelines Overview](https://developer.garmin.com/brand-guidelines/overview/) | [API Brand Guidelines PDF](https://developer.garmin.com/downloads/brand/Garmin-Developer-API-Brand-Guidelines.pdf)

**Attribution is mandatory in these contexts:**

| Context | Requirement |
|---|---|
| **Title-level displays** | "Garmin [device model]" must appear directly beneath or adjacent to data titles — **never in tooltips or footnotes** |
| **Secondary screens** | Garmin attribution required on detail views |
| **Exported data** | All commercial uses of Garmin device-sourced data shared via file formats (CSVs, PDFs) or digital interfaces (APIs, webhooks) must include Garmin attribution |
| **Derived data** | Attribution required even on data derived from Garmin sources |
| **Social media** | Garmin attribution required when sharing data socially |

**Logo rules:**

- Use official Garmin Connect logos and wordmarks only
- Maintain brand color consistency (Garmin candy blue: `#6DCFF6`)
- Follow proper placement and sizing requirements
- Garmin tag logo must appear when displaying Garmin data
- **Cannot** alter or animate the Garmin tag logo
- **Cannot** use the Garmin tag logo in avatars, badges, or unrelated imagery
- Cannot use Garmin trademarks without explicit authorization — limited to describing integration, not implying endorsement
- Must accept Garmin Confidentiality Agreement and Terms of Use before downloading brand assets

**Enforcement:** Garmin reserves the right to review applications for attribution compliance; **noncompliance may result in suspension or termination of API access**.

### 2.6 Prohibited Uses

- No unauthorized access to user accounts or data
- Cannot reverse engineer or circumvent security measures
- Prohibited from competing with Garmin's core services
- Cannot use platform for illegal activities or violations

### 2.7 Audit & Enforcement

- Garmin retains audit rights over developer implementations
- Subject to periodic compliance reviews
- Must cooperate with security assessments
- Applications reviewed within **two business days** for initial approval

### 2.8 Indemnification & Insurance

- Developer indemnifies Garmin against third-party claims
- Responsible for IP infringement claims related to developer content
- Must cover damages from violation of terms
- Must maintain appropriate liability insurance
- Provide support contact information

### 2.9 Program Scope

- **Enterprise use only** — not for consumer applications
- Free for approved business developers (no licensing or maintenance fees)
- Some metrics may require licensing fees or minimum device orders for commercial applications
- Separate from Connect IQ developer program (watch faces, widgets)
- Typical integration timeline: 1-4 weeks

---

## 3. WHOOP

### Developer Agreement

**Source:** [WHOOP API Terms of Use](https://developer.whoop.com/api-terms-of-use/) | [App Approval](https://developer.whoop.com/docs/developing/app-approval/) | [Design Guidelines](https://developer.whoop.com/docs/developing/design-guidelines/)

### 3.1 Required Privacy Policy Content

Privacy policy must "clearly and accurately" describe:

- The services provided by your application
- The user data accessed (specific types)
- How the data will be used
- How data is transferred to third parties (if applicable)
- Developer's contact information
- Must comply with applicable privacy laws
- Must provide adequate notice and obtain prior consent for collection, use, and storage of user data

### 3.2 Data Handling Requirements

| Requirement | Detail |
|---|---|
| **Encryption** | All WHOOP data must be encrypted **in transit AND at rest** using secure encrypted channel (e.g., HTTPS) |
| **No data sales** | Cannot market, sell, license, or lease data transferred through the API — even with user consent |
| **No permanent copies** | Cannot scrape, build databases, or create permanent copies of WHOOP Data |
| **Cache limits** | Cached copies cannot be retained longer than specified HTTP headers permit |
| **No derivative works** | Prohibited from creating derivative works or modifying WHOOP data |
| **No third-party exposure** | Cannot expose data to other users or third parties without **explicit opt-in consent** |
| **Security measures** | "Commercially reasonable and appropriate administrative, technical, and physical measures" required |

### 3.3 User Consent Requirements

- Prior **express authorization by each end user** before accessing their data
- Must obtain "all necessary and appropriate consents required by all applicable laws" including data privacy laws
- Users must be able to access data that you have collected via the APIs
- OAuth 2.0 standard used — WHOOP members must **opt-in** to share data

### 3.4 Data Deletion Requirements

- Upon termination: **immediately stop** using APIs, cease all use of Brand Elements, and **delete any cached or stored content**
- Must report unauthorized access or use to End Users as required by law

### 3.5 Security & Breach Notification

- Notify WHOOP **immediately** of security incidents at apisupport@whoop.com
- Promptly report to End Users any unauthorized access or use as required by law
- Maintain developer credential confidentiality
- Do not share credentials across applications

### 3.6 Branding & Attribution Requirements

**Source:** [WHOOP Brand & Design Guidelines (PDF)](https://developer.whoop.com/assets/files/WHOOP%20-%20Brand%20&%20Design%20Guidelines-bdea3554e94b4ea09e68695b1e8dc8e7.pdf)

- Must display **all attributions required by WHOOP** as described in documentation
- Use brand elements **only** for promoting or advertising that you use the APIs
- Must obtain **prior written approval** before making statements referencing WHOOP or APIs
- Must adhere to WHOOP Design and Brand Guidelines for app approval
- License is nontransferable, nonsublicenseable, nonexclusive

**Typography:**
- Proxima Nova for words
- DINPro for numbers

**Logo rules:**
- Logo should not be distorted, warped, or rotated
- Logo files available in SVG, PNG, and PDF formats
- Use only official versions provided

### 3.7 App Approval Process

**Every integration is reviewed by WHOOP before becoming available to all members.**

**Submission requirements:**

1. Complete and accurate App Name in Developer Dashboard
2. Contact Email(s) filled in
3. Privacy Policy URL provided and accurate
4. App must adhere to WHOOP Design and Brand Guidelines
5. Formal submission via designated Typeform link including:
   - Design mockups and visual assets
   - Contextual documentation explaining functionality
6. Must have tested with at least one WHOOP member

**Timeline:** Review can take **several weeks**.

**Initial development:** Apps available immediately with 10-member limit. Post-approval: access to full WHOOP member ecosystem.

### 3.8 Prohibited Uses

- Cannot sublicense APIs to third parties
- Cannot create applications "substantially the same as the APIs"
- Cannot use APIs to "compete, directly or indirectly, with WHOOP"
- Cannot distribute malware, viruses, or destructive items
- Cannot use with unlawful content or content promoting online gambling
- Cannot reverse engineer or extract WHOOP algorithms or source code
- Cannot disparage WHOOP or participate in activities "perceived as detrimental or harmful" to WHOOP

### 3.9 Audit & Enforcement

- WHOOP may monitor use of the APIs
- WHOOP may access and use Company Applications (e.g., to identify security issues)
- WHOOP may modify APIs without compatibility guarantees
- Must provide customer support for your applications

### 3.10 Membership Requirement

You **must have a WHOOP membership** to develop an app on the Developer Platform (your WHOOP account is your developer login).

---

## 4. Apple HealthKit

### Developer Guidelines

**Source:** [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) | [Protecting User Privacy](https://developer.apple.com/documentation/healthkit/protecting-user-privacy) | [Apple Health Privacy White Paper](https://www.apple.com/privacy/docs/Health_Privacy_White_Paper_May_2023.pdf) | [Apple Platform Security Guide](https://support.apple.com/guide/security/protecting-access-to-users-health-data-sec88be9900f/web)

### 4.1 Required Privacy Policy Content (Section 5.1.1)

Privacy policy is **mandatory** and must:

- Be linked in App Store Connect metadata **and** within the app in an easily accessible manner
- Clearly and explicitly identify **what data** the app collects, **how** it collects that data, and **all uses** of that data
- Confirm that any third party receiving user data will provide the **same or equal protection** as stated in your privacy policy
- Explain data **retention/deletion policies**
- Describe **how a user can revoke consent** and/or request deletion of their data
- **Specifically disclose which health data types** you are collecting from the device

### 4.2 Data Handling Requirements

| Requirement | Detail |
|---|---|
| **No iCloud storage** | Personal health information **cannot** be stored in iCloud (Section 5.1.3(ii)) |
| **No false data** | Cannot write false or inaccurate data into HealthKit (Section 5.1.3(ii)) |
| **No advertising use** | Health data cannot be used for advertising, marketing, or use-based data mining (Section 5.1.3(i)) |
| **No third-party data mining** | Cannot disclose health data to third parties for advertising or data-mining purposes (Section 5.1.2(vi)) |
| **Encryption in transit** | Must use HTTPS/SSL-TLS (App Transport Security mandatory since Jan 1, 2017) |
| **Data minimization** | Only request access to data relevant to core functionality (Section 5.1.1(iii)) |
| **No PHI in push notifications** | Protected health information prohibited in notifications (Section 4.5.4) |
| **On-device encryption** | HealthKit data encrypted with device passcode; "Protected Unless Open" class — inaccessible 10 minutes after device locks |

### 4.3 User Consent Requirements

- **Every data type requires explicit user consent** — granular per-type permissions are mandatory
- Apps are granted **separate access** for reading and writing, and **separate access for each type** of health data
- Users can revoke permission at any time from Settings > Health > Data Access & Devices
- Must present Apple's HealthKit permissions dialog for each data type
- Paid functionality **must not** be dependent on granting health data access (Section 5.1.1(ii))
- Must provide an **easily accessible way to withdraw consent**
- Purpose strings must **clearly and completely** describe use of the data
- Cannot bypass user consent or misrepresent how data is used
- If relying on GDPR legitimate interest (without consent), must comply with all terms of that law

**Inference prevention:** When an app doesn't have read access, all queries return no data (same as empty database) — prevents apps from inferring health status.

### 4.4 Data Storage & Encryption

| Layer | Protection |
|---|---|
| **Primary health data** | "Protected Unless Open" — accessible only when device is unlocked |
| **Management data** | "Protected Until First User Authentication" |
| **Temporary journal files** | "Protected Unless Open" |
| **Medical ID** | "No Protection" (emergency access) |
| **iCloud sync** | End-to-end encrypted (requires iOS 12+, 2FA) |
| **Clinical records** | Downloaded via TLS 1.3 |
| **Health sharing** | End-to-end iCloud encryption; Apple cannot access |
| **Backups** | Health data stored **only if backup is encrypted** |

### 4.5 What You CAN and CANNOT Do

**Can do:**
- Read health metrics (activity, heart, sleep, body, nutrition, lab results)
- Write workout data, mindful minutes, nutrition, body measurements
- Build native iOS apps that request user permissions
- Transmit HealthKit data securely to backend servers
- Create personalized dashboards and AI-driven recommendations
- Implement background sync via HKObserverQuery

**Cannot do:**
- Access HealthKit from a web-only application — **there is no public server API**
- Access Apple Health data from Android devices
- Stream raw sensor signals (e.g., raw PPG data)
- Access another user's data from a single device
- Guarantee real-time continuous data or clinical-grade accuracy

### 4.6 Advertising & Commercial Restrictions (Section 5.1.3(i))

> "Apps may not use or disclose to third parties data gathered in the health, fitness, and medical research context—including from the Clinical Health Records API, HealthKit API, Motion and Fitness, MovementDisorder APIs, or health-related human subject research—for advertising, marketing, or other use-based data mining purposes other than improving health management, or for the purpose of health research, and then only with permission."

**Exception:** Apps may use health/fitness data to provide a benefit directly to that user (e.g., reduced insurance premium), **provided** the app is submitted by the entity providing the benefit and data is not shared with a third party.

### 4.7 Health Research Requirements (Sections 5.1.3(iii-iv))

If conducting health-related human subject research:

- Must obtain informed consent including: (a) nature, purpose, and duration; (b) procedures, risks, and benefits; (c) information about confidentiality and data handling including third-party sharing; (d) point of contact for questions; (e) withdrawal process
- Must secure approval from an **independent ethics review board (IRB)**
- Proof of IRB approval must be provided upon request

### 4.8 Branding Requirements

**Source:** Apple "Works with Apple Health" badge

- Use official **"Works with Apple Health" badge** (white with outline only)
- Do not alter the artwork in any way except to change its size
- No trademark symbols on badge artwork
- Maintain minimum clear space around Apple Health icon
- Never mask, add borders, overlays, gradients, or shadows to icons
- No color variations beyond provided white/outline option

### 4.9 App Store Review

- HealthKit apps undergo standard App Store review
- Medical device apps face **enhanced scrutiny** (Section 1.4.1)
- Apps must clearly disclose data and methodology to support accuracy claims — if accuracy/methodology cannot be validated, Apple **will reject** the app
- Must have HealthKit entitlement properly configured
- API access controlled with entitlements

### 4.10 Critical Architecture Constraint

**There is no public server-side API for Apple Health.** All data access must occur through the user's iPhone via a native iOS app. This means LIMITLESS would need:

- A native iOS app (or Flutter/React Native with HealthKit plugin)
- The app acts as the "data gateway" — reads HealthKit on-device, then transmits to Digital Twin API
- Cannot integrate Apple Health from a web dashboard alone

---

## 5. Cross-Platform Summary Matrix

| Requirement | Oura | Garmin | WHOOP | Apple HealthKit |
|---|---|---|---|---|
| **Privacy policy required** | Yes (GDPR-compliant) | Yes (per local data protection laws) | Yes (clearly describes data use) | Yes (in app + App Store Connect) |
| **User consent** | Express authorization | Explicit, cannot be bundled | Express authorization, opt-in | Granular per data type |
| **Data deletion on request** | Yes, all data | Yes, procedures required | Yes, on termination | User controls via Settings |
| **Encryption in transit** | HTTPS required | Industry standard | HTTPS required | App Transport Security (TLS) |
| **Encryption at rest** | Not specified | Not specified | **Required** | Device-level (Protected Unless Open) |
| **Cache/storage limit** | 60 days max cache | Necessary operational periods | Per HTTP headers | No iCloud; on-device encrypted |
| **No data sales** | Prohibited even with consent | Prohibited without consent | Prohibited even with consent | Prohibited (advertising/mining) |
| **No advertising use** | Not explicitly stated | Not explicitly stated | Not explicitly stated | **Explicitly prohibited** |
| **No competing apps** | Prohibited | Prohibited | Prohibited | N/A |
| **Breach notification** | 24 hours to Oura | Immediately to Garmin | Immediately to WHOOP + users | N/A (Apple platform handles) |
| **Audit rights** | Yes (monitoring) | Yes (periodic reviews) | Yes (monitoring + app access) | App Store review process |
| **Brand attribution** | Required (Oura links/logos) | Required ("Garmin [device model]") | Required (per documentation) | "Works with Apple Health" badge |
| **App review/approval** | No formal review mentioned | 2 business day review | Mandatory review (weeks) | App Store review |
| **Indemnification** | Developer indemnifies Oura | Developer indemnifies Garmin | Implied in terms | Standard App Store terms |
| **Server-side API** | Yes (REST API) | Yes (cloud-to-cloud) | Yes (REST API + webhooks) | **No** (native iOS app required) |

---

## 6. LIMITLESS Compliance Checklist

Based on the above research, LIMITLESS must implement the following for full compliance:

### 6.1 Privacy Policy (must cover ALL platforms)

The privacy policy at `limitless-longevity.health/privacy` must include:

- [ ] Specific health data types collected from each wearable platform
- [ ] How data is collected (OAuth flow, API polling, webhooks)
- [ ] All uses of health data (Digital Twin, AI recommendations, longevity scoring)
- [ ] Statement that Oura collects usage data from API interactions (Oura-specific)
- [ ] Data retention periods (respect Oura's 60-day cache limit)
- [ ] Data deletion procedure — how users request deletion
- [ ] How users revoke consent / disconnect wearables
- [ ] Third-party sharing disclosures (even if none — state that)
- [ ] Confirmation that third parties receiving data provide equal protection
- [ ] Contact information for privacy inquiries
- [ ] GDPR compliance statements (Oura requirement)
- [ ] Statement that health data is NOT used for advertising, marketing, or data mining
- [ ] Statement that health data is NOT sold, licensed, or leased to third parties

### 6.2 Terms of Service (must cover ALL platforms)

- [ ] Disclaimer of warranties on behalf of third-party service providers (Oura)
- [ ] Disclaimer of implied warranties of merchantability, fitness for particular purpose (Oura)
- [ ] Exclusion of third parties from liability for consequential/indirect damages (Oura)
- [ ] User support contact information (all platforms)
- [ ] Link to Oura user accounts for data management
- [ ] Written agreement with protections "at least as protective" as Garmin requires

### 6.3 Technical Implementation

- [ ] Encrypt all wearable data **in transit** (HTTPS — all platforms)
- [ ] Encrypt all wearable data **at rest** (WHOOP requirement, good practice for all)
- [ ] Implement OAuth 2.0 flows for Oura, Garmin, WHOOP
- [ ] Respect Oura's 60-day cache limit
- [ ] Respect WHOOP's HTTP cache header limits
- [ ] Implement data deletion endpoint — purge all user data on request
- [ ] Implement wearable disconnect — stop storing/processing on revocation
- [ ] Do not store data beyond operational necessity (Garmin)
- [ ] Maintain audit logs of data access
- [ ] Report security breaches: 24h to Oura, immediately to Garmin and WHOOP

### 6.4 Branding & Attribution

- [ ] Display "Garmin [device model]" attribution next to all Garmin-sourced data
- [ ] Use official Garmin Connect logos (candy blue `#6DCFF6`), never alter/animate
- [ ] Attribute Oura data using official Oura links/logos per Branding Guidelines
- [ ] Do NOT use Oura Marks as app name, icon, or logo
- [ ] Display WHOOP attributions per their documentation
- [ ] Use WHOOP brand elements only to indicate API integration
- [ ] Use official "Works with Apple Health" badge (white/outline, unmodified)
- [ ] No press releases mentioning Oura without prior written consent
- [ ] No statements referencing WHOOP without prior written approval

### 6.5 Apple HealthKit (if/when native app is built)

- [ ] Build native iOS app (or use Flutter/React Native with HealthKit plugin)
- [ ] Request HealthKit entitlement
- [ ] Present Apple's HealthKit permissions dialog per data type
- [ ] Do NOT store health data in iCloud
- [ ] Do NOT use health data for advertising
- [ ] Do NOT write false/inaccurate data to HealthKit
- [ ] Do NOT send PHI in push notifications
- [ ] Only request data types relevant to core functionality
- [ ] Purpose strings must clearly describe data use
- [ ] Paid features must not require granting health data access

### 6.6 Platform-Specific Accounts & Approvals

| Platform | Status | Action Required |
|---|---|---|
| **Oura** | OAuth2 integrated, credentials deployed | Verify branding compliance; request brand asset approval from branduse@ouraring.com |
| **Garmin** | Application submitted, awaiting approval | Complete integration call upon approval; comply with API brand guidelines |
| **WHOOP** | Developer account not created | Create account (requires WHOOP membership); submit for formal review (allow several weeks) |
| **Apple** | No native app yet | Requires native iOS app development; no server-side API alternative |

---

## Source Links

### Oura
- [Oura API Agreement](https://cloud.ouraring.com/legal/api-agreement)
- [Oura Privacy Policy](https://ouraring.com/privacy-policy)
- [Oura Terms and Conditions](https://ouraring.com/terms-and-conditions)
- [Oura Branding Guidelines v1 (PDF)](https://static.ouraring.com/pdfs/Oura_BrandGuidelines_v1.pdf)
- [Oura Commercial Use Guidelines](https://ouraring.com/guidelines-for-commercial-use)
- [Oura API Help](https://support.ouraring.com/hc/en-us/articles/4415266939155-The-Oura-API)
- [Oura Partner Support - API](https://partnersupport.ouraring.com/hc/en-us/categories/20496670750995-API)

### Garmin
- [Garmin Connect Developer Program Agreement (PDF)](https://www8.garmin.com/en-US/GARMINCONNECTDEVELOPERPROGRAMAGREEMENT/GARMINCONNECTDEVELOPERPROGRAMAGREEMENT_EN.pdf)
- [Garmin Developer Program Overview](https://developer.garmin.com/gc-developer-program/overview/)
- [Garmin Health API](https://developer.garmin.com/gc-developer-program/health-api/)
- [Garmin Program FAQ](https://developer.garmin.com/gc-developer-program/program-faq/)
- [Garmin API Brand Guidelines](https://developer.garmin.com/brand-guidelines/api-brand-guidelines/)
- [Garmin Brand Guidelines Overview](https://developer.garmin.com/brand-guidelines/overview/)
- [Garmin API Brand Guidelines (PDF)](https://developer.garmin.com/downloads/brand/Garmin-Developer-API-Brand-Guidelines.pdf)
- [Garmin Logo Guidelines](https://developer.garmin.com/brand-guidelines/logo/)
- [Garmin Privacy Policy](https://www.garmin.com/en-US/privacy/connect/policy/)

### WHOOP
- [WHOOP API Terms of Use](https://developer.whoop.com/api-terms-of-use/)
- [WHOOP Developer Platform](https://developer.whoop.com/)
- [WHOOP App Approval](https://developer.whoop.com/docs/developing/app-approval/)
- [WHOOP Design Guidelines](https://developer.whoop.com/docs/developing/design-guidelines/)
- [WHOOP Brand & Design Guidelines (PDF)](https://developer.whoop.com/assets/files/WHOOP%20-%20Brand%20&%20Design%20Guidelines-bdea3554e94b4ea09e68695b1e8dc8e7.pdf)
- [WHOOP Privacy Policies](https://www.whoop.com/us/en/whoop-privacy-policies/)
- [WHOOP Getting Started](https://developer.whoop.com/docs/developing/getting-started/)

### Apple
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Protecting User Privacy (HealthKit)](https://developer.apple.com/documentation/healthkit/protecting-user-privacy)
- [Apple Health Privacy White Paper (PDF)](https://www.apple.com/privacy/docs/Health_Privacy_White_Paper_May_2023.pdf)
- [Apple Platform Security - Health Data](https://support.apple.com/guide/security/protecting-access-to-users-health-data-sec88be9900f/web)
- [Apple Health App Privacy](https://www.apple.com/legal/privacy/data/en/health-app/)
- [HealthKit Documentation](https://developer.apple.com/documentation/healthkit)
- [Health and Fitness Apps](https://developer.apple.com/health-fitness/)
- [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
- [HealthKit HIG](https://developer.apple.com/design/human-interface-guidelines/healthkit)
