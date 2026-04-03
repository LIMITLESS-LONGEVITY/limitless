# PATHS Contributor Guide — Design Spec

**Date:** 2026-03-21
**Status:** Approved
**Type:** Documentation / Onboarding
**Audience:** Non-technical platform contributors (coaches, doctors, PhD holders)

---

## Table of Contents

1. [Purpose & Context](#1-purpose--context)
2. [Audience & Roles](#2-audience--roles)
3. [Guide Structure](#3-guide-structure)
4. [Content Specification](#4-content-specification)
5. [Visual Design & Branding](#5-visual-design--branding)
6. [Tooling](#6-tooling)
7. [Deployment & Hosting](#7-deployment--hosting)
8. [Prerequisites](#8-prerequisites)
9. [Maintenance](#9-maintenance)

---

## 1. Purpose & Context

PATHS is live in production. Five initial contributors need to be onboarded to start creating content. Rather than piecemeal training, this guide provides a comprehensive, self-service onboarding experience — invest the time once so contributors can work independently at their own pace.

**Goal:** A polished, web-based contributor guide that takes a non-technical person from "I just got my login" to "I can create, submit, and manage articles independently" — and for editors/publishers, "I can review, approve, and publish content."

**This guide is the first component of a broader PATHS Platform Manual.** Future additions may include course management, billing, and admin guides.

---

## 2. Audience & Roles

### Initial contributors (5 people)

| Person | Role | Permissions | Relationship |
|--------|------|-------------|-------------|
| Coach 1 | Coach/Author | Create articles, submit for review | External contributor |
| Coach 2 | Coach/Author | Create articles, submit for review | External contributor |
| MD | Coach/Author | Create articles, submit for review | External contributor |
| PhD grad | Editor/Publisher | Review, approve, reject, publish | Internal (full-time) |
| VP of Sales | Editor/Publisher | Review, approve, reject, publish | Internal (full-time) |

### Audience profile

- **Digital comfort:** Google Docs level. Not Notion/Slack power users.
- **Technical skills:** Non-technical. The guide must assume zero familiarity with web platforms beyond basic browsing.
- **Motivation:** Subject matter experts who want to share knowledge, not learn software.

### Role-based content strategy

The guide covers both Author and Editor/Publisher perspectives but uses **visual role badges** and **content tabs** to clearly separate what applies to whom:

- 🟢 **All Contributors** — sections everyone reads
- 🔵 **Authors** — sections specific to content creators
- 🟣 **Editors/Publishers** — sections specific to reviewers and publishers

---

## 3. Guide Structure

### Information architecture (10 pages)

```
guide.limitless-longevity.health/
├── index.md                        — Welcome & role selector
│
├── getting-started/
│   ├── your-account.md             — Password setup, first login, profile
│   └── finding-your-way.md         — Dashboard tour, navigation, terminology
│
├── writing-articles/
│   ├── creating-an-article.md      — New article, editor basics, first save
│   ├── using-the-editor.md         — Rich text, images, videos, version history
│   └── metadata-and-pillars.md     — Title, summary, pillar, access level
│
├── editorial-workflow/
│   ├── how-it-works.md             — Flowchart overview, status reference table
│   ├── submitting-for-review.md    — Author perspective (🔵)
│   └── reviewing-and-publishing.md — Editor/Publisher perspective (🟣)
│
└── reference/
    ├── glossary.md                 — Platform terms A-Z
    └── faq.md                      — Common questions & troubleshooting
```

### Reading path

A new contributor reads top-to-bottom and is productive by the end. The structure mirrors the natural workflow: set up account → learn the workspace → write content → understand the review pipeline → reference as needed.

---

## 4. Content Specification

### 4.1 Welcome & Role Selector (`index.md`)

**Badge:** 🟢 All Contributors

- Welcome paragraph in premium/concierge tone
- Two role cards explaining Author vs. Editor/Publisher in plain language
- Quick Start link: "New here? Start with Setting Up Your Account →"
- Role badge legend explaining the 🟢 🔵 🟣 system used throughout

### 4.2 Your Account (`getting-started/your-account.md`)

**Badge:** 🟢 All Contributors

| Step | Content | Visual |
|------|---------|--------|
| 1 | Receive "set your password" email | Screenshot of email |
| 2 | Set your password | Screenshot of password page |
| 3 | Log in at `paths.limitless-longevity.health` | Screenshot of login page |
| 4 | Set up your profile (name, avatar, bio) | Screenshot of profile page |

- Admonition tip: "Bookmark `paths.limitless-longevity.health`"

### 4.3 Finding Your Way (`getting-started/finding-your-way.md`)

**Badge:** 🟢 All Contributors

- Annotated screenshot of dashboard with numbered callouts: sidebar navigation, articles section, profile menu, organization context
- Plain-language explanation of each area
- Terminology box (admonition): Dashboard, Organization, Pillar, Article, Draft

### 4.4 Creating an Article (`writing-articles/creating-an-article.md`)

**Badge:** 🟢 All Contributors

- Step-by-step: Dashboard → Articles → "New Article" → editor
- Screenshot of empty editor with callouts: title, content area, metadata sidebar
- Mini-exercise: "Create a test article — give it a title, write a paragraph, hit Save"
- Admonition warning: auto-save vs. manual save (version snapshots)

### 4.5 Using the Editor (`writing-articles/using-the-editor.md`)

**Badge:** 🟢 All Contributors

- Visual reference card of editor toolbar (bold, italic, lists, headings, links)
- How to: add images, embed YouTube videos, use callout boxes, create tables
- Admonition tip: "Write in Google Docs first if that's more comfortable, then paste into the editor"
- Version History: how to view past versions, how to restore

### 4.6 Metadata & Pillars (`writing-articles/metadata-and-pillars.md`)

**Badge:** 🟢 All Contributors

- Screenshot of metadata sidebar with each field explained:
  - **Title** — what readers see
  - **Slug** — auto-generated URL (editable)
  - **Summary** — 1-2 sentences for article listings
  - **Featured image** — thumbnail for browse views
  - **Pillar** — content category (list all 6: Nutrition, Movement, Sleep, Mental Health, Medicine, Health Tech)
  - **Access level** — Free vs. gated
- Admonition important: "Every article must have a Pillar before it can be published"

### 4.7 How It Works (`editorial-workflow/how-it-works.md`)

**Badge:** 🟢 All Contributors

- Flowchart diagram of the full pipeline:
  - Draft → In Review → Approved → Published
  - With rejection/revision loops back to Draft
  - Archival and reopening paths
- Status reference table: status name, meaning, who can move it, what happens next
- Admonition tip: "You'll always see your article's status as a colored badge"

### 4.8 Submitting for Review (`editorial-workflow/submitting-for-review.md`)

**Badge:** 🔵 Authors

- "Submit for Review" button — screenshot with callout
- What happens after submission: status changes, editor gets notified
- If rejected: where to find editor's feedback, how to revise and resubmit
- Screenshot of feedback/notes area
- Admonition tip: "Rejection is part of the collaborative process — editors provide specific feedback to strengthen your work"

### 4.9 Reviewing & Publishing (`editorial-workflow/reviewing-and-publishing.md`)

**Badge:** 🟣 Editors/Publishers

Content tabs (MkDocs Material tabs feature) — note: these tabs separate concepts pedagogically, but both internal team members hold the same Editor/Publisher role and can perform all actions.

**Tab: Reviewing**
- Finding articles awaiting review (filter by "In Review")
- Reading through an article
- Approving vs. rejecting with notes
- What good review feedback looks like

**Tab: Publishing**
- Approving for publication
- The Publish button and what happens when you click it
- Archiving older content
- Reopening archived articles

- Admonition important: "When rejecting, always include clear feedback"

### 4.10 Glossary (`reference/glossary.md`)

**Badge:** 🟢 All Contributors

Alphabetical definitions of platform terms:
- Archive, Dashboard, Draft, Editor, In Review, Pillar, Published, Publisher, Slug, Version, and others as needed

### 4.11 FAQ (`reference/faq.md`)

**Badge:** 🟢 All Contributors

Q&A format, 2-3 sentence answers with links to relevant guide sections:
- "I accidentally deleted my article. Can I recover it?"
- "Can I edit an article after it's published?"
- "My images aren't uploading. What should I do?"
- "Who can see my draft articles?"
- "What's the difference between auto-save and manual save?"
- And others as discovered during guide creation

---

## 5. Visual Design & Branding

### Tone

**Premium/concierge framing with help-center clarity for instructions.** The brand voice sets the stage; the instructions themselves are direct and simple.

- Welcome/intro text: warm, professional, high-end ("We've designed your workspace to make creating world-class content effortless")
- Instructional text: direct help-center style ("Click Dashboard in the sidebar. You'll see your articles listed here.")
- No jargon. No assumptions about technical knowledge.

### Visual elements

| Element | Treatment |
|---------|-----------|
| Screenshots | Auto-captured via Scribe, annotated with numbered callouts. Clickable to enlarge (glightbox plugin). |
| Flowcharts | Simple diagrams for the editorial workflow. Created as images or Mermaid diagrams (MkDocs Material supports Mermaid). |
| Role badges | Colored badges on section headings: 🟢 All · 🔵 Authors · 🟣 Editors/Publishers. Implemented via custom CSS. |
| Admonitions | MkDocs Material admonition boxes for tips, warnings, and important notes. |
| Content tabs | MkDocs Material tabs for role-specific content (Editor vs Publisher views). |
| Cards | MkDocs Material grid cards for the role selector on the welcome page. |

### Brand customization

- Custom CSS overrides for LIMITLESS brand colors (gold/teal accents from the corporate site)
- Typography: match or complement the corporate site's Cormorant Garamond / Inter pairing where appropriate, while keeping body text highly readable
- Logo in the header/nav
- Favicon matching the LIMITLESS brand

---

## 6. Tooling

### Build & generate

| Tool | Purpose | Cost | Notes |
|------|---------|------|-------|
| **MkDocs** | Static site generator | Free (MIT) | Python-based, `pip install mkdocs` |
| **MkDocs Material** | Premium documentation theme | Free (MIT, Insiders tier optional) | Admonitions, tabs, cards, search, dark mode |
| **mkdocs-glightbox** | Screenshot lightbox plugin | Free | Click-to-enlarge images |
| **mkdocs-awesome-pages** | Simplified page ordering | Free | Optional — simplifies nav config |

### Screenshot capture

| Tool | Purpose | Cost | Notes |
|------|---------|------|-------|
| **Scribe** | Auto-capture step-by-step screenshots | Free (Chrome extension) | Unlimited browser captures on free tier. Export text + images, paste into Markdown. |
| **Tango** | Alternative screenshot capture | Free (15 guides) | Built-in annotation (boxes/arrows). Use as backup if Scribe is insufficient. |

### To investigate

| Tool | Purpose | Notes |
|------|---------|-------|
| **Vercel agent-browser** | Automated screenshot capture | `github.com/vercel-labs/agent-browser` — could programmatically navigate PATHS and capture screenshots, useful for keeping visuals up to date when the UI changes. Evaluate feasibility. |

---

## 7. Deployment & Hosting

### Architecture

```
guide.limitless-longevity.health
        │
        ▼
   Vercel (static)
        │
        ▼
   MkDocs build output (HTML/CSS/JS)
        │
   Source: limitless-paths repo
          └── docs/contributor-guide/
              ├── mkdocs.yml
              ├── docs/
              │   ├── index.md
              │   ├── getting-started/
              │   ├── writing-articles/
              │   ├── editorial-workflow/
              │   └── reference/
              ├── overrides/         (custom CSS, logo)
              ├── requirements.txt   (mkdocs-material, mkdocs-glightbox)
              └── assets/            (screenshots, diagrams)
```

### Access

The guide site is **publicly accessible** — it contains no sensitive information (only platform usage instructions and generic screenshots). No authentication required.

### Source material

The existing admin guides at `learnhouse/docs/guides/` (editorial-workflow.md, role-setup.md, pillar-management.md) should be used as source material during implementation. They contain accurate workflow descriptions, permission matrices, and status definitions that can be reframed for the contributor audience.

### Deployment

- **Subdomain:** `guide.limitless-longevity.health`
- **Hosting:** Separate Vercel project on the existing Pro account
- **Source:** Lives in the `limitless-paths` repo under `docs/contributor-guide/`
- **Build command:** `cd docs/contributor-guide && pip install -r requirements.txt && mkdocs build`
- **Output directory:** `docs/contributor-guide/site`
- **Auto-deploy:** Vercel auto-deploys on push to `main` (same as PATHS itself)
- **Search:** MkDocs Material built-in search enabled (default) — useful for glossary and FAQ

### DNS

Add CNAME record in Cloudflare:
- Type: CNAME
- Name: `guide`
- Target: `cname.vercel-dns.com`
- Proxy: DNS only

---

## 8. Prerequisites

Before the guide can be used for onboarding, the following must be in place:

| Prerequisite | Status | Notes |
|-------------|--------|-------|
| Resend email provider configured | TODO | Required for "set your password" emails to new contributors |
| 5 contributor accounts created | TODO | Create in admin panel, assign Coach/Author or Editor/Publisher roles |
| Scribe Chrome extension installed | TODO | For capturing platform screenshots during guide creation |
| `guide` CNAME record in Cloudflare | TODO | Points to Vercel |
| Vercel project for guide site | TODO | Separate project on existing Pro account |

---

## 9. Maintenance

### When to update the guide

- **UI changes in PATHS** — re-capture affected screenshots with Scribe, replace image files
- **New features added** — add new pages or sections as needed
- **Role changes** — update role descriptions and badge assignments
- **New pillars added** — update the pillar list in metadata-and-pillars.md

### Update workflow

1. Identify which pages are affected by the change
2. Re-run Scribe captures on affected flows in the live platform
3. Replace screenshot files in `docs/contributor-guide/docs/assets/`
4. Update Markdown content as needed
5. Push to `main` → auto-deploys to `guide.limitless-longevity.health`

### Future expansion

This guide is the **first chapter** of a broader PATHS Platform Manual. Future additions:
- Course management guide (when course creation features are used)
- Organization admin guide (settings, members, billing)
- API documentation (for technical integrations)

---

## Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Guide format | MkDocs Material (static site) | Best visual output, no server to maintain, deploys on Vercel |
| Screenshot tool | Scribe (free Chrome extension) | Auto-captures annotated step-by-step guides, unlimited on free tier |
| Role-based content | Badges + content tabs | Simpler than separate guides per role, keeps content unified |
| Hosting | Separate subdomain (`guide.*`) | Clean, independent, consistent with flat subdomain pattern |
| Source location | `limitless-paths` repo | Keeps guide alongside platform code, single deployment pipeline |
| Tone | Premium framing + help-center clarity | Matches LIMITLESS brand while remaining practical for non-technical readers |
| Scope | Full workflow (account → editorial) | One-time investment for self-service onboarding, avoids piecemeal training |
