# PATHS Platform — Sub-project 4: Content Consumption UI

**Date:** 2026-03-21
**Status:** Draft
**Platform:** LearnHouse (FastAPI + Next.js)

## Context

Sub-projects 1-3 are complete: auth with membership tiers, articles with editorial workflow, and tier-based access control. This sub-project builds the public-facing experience where end users browse and read articles.

## Scope

### In scope
- Articles browse page: feed-first layout with pillar tab filtering, within existing org layout
- Article reader page: full TipTap content rendering for accessible articles, teaser + fade wall + upgrade CTA for locked articles
- Preview endpoint: `GET /articles/{uuid}?preview=true` returns truncated content for locked articles
- "Articles" link in org public navigation
- Locked article badges in feed (🔒 Premium)
- Related courses section on article reader
- Responsive design (mobile + desktop)
- Anonymous access to free articles

### Out of scope
- Comments, bookmarks, progress tracking (future)
- Separate standalone app/navigation (uses existing org layout)
- Reading history, recommendations, badges (future)
- Upgrade/payment flow (Sub-project 6 — upgrade CTA links to placeholder for now)

## Pages

### 1. Articles Browse Page

**Route:** `/articles` within org layout (middleware rewrites to `/orgs/{orgslug}/(withmenu)/articles`)

**Layout:**
- Pillar tab bar: "All" (default selected) + one tab per active pillar from `GET /pillars/`
- Search input: client-side filter by article title
- Article card grid: 2 columns on desktop, 1 column on mobile

**Article card contents:**
- Pillar badge (colored, top-left)
- 🔒 Premium badge (top-right, only for locked articles)
- Title (bold, clickable → article reader)
- Summary (truncated to 2 lines)
- Author name + estimated read time
- Featured image thumbnail (if set)

**Data flow:**
- Pillars: `GET /pillars/`
- Articles: `GET /articles/?org_id={id}&include_locked=true` — returns all published articles with `locked` boolean
- Pillar filtering: re-fetch with `?pillar_id=X` or client-side filter
- Cards link to: `/article/{article_uuid}`

**Navigation:** Add "Articles" link to the org public navigation (the `(withmenu)` layout), alongside existing links (Courses, Communities, etc.).

### 2. Article Reader Page

**Route:** `/article/{article_uuid}` within org layout

**Full article (user has access):**
- Header: title, pillar badge, author name, published date, estimated read time
- Featured image (full-width, if set)
- Article body: TipTap JSON rendered in read-only mode (same rendering as course activity content, no editor toolbar)
- Related courses section at bottom: frontend takes the `related_courses` UUID array from the article response and fetches each course via `GET /courses/{uuid}` (or a batch endpoint if available). Show as simple cards (title + thumbnail). If a UUID is invalid/deleted, skip it silently. Acceptable N+1 since related_courses is typically 0-3 items.
- Back link to articles browse

**Locked article (user lacks access):**
- Same header as above
- Featured image (if set)
- First ~200 words of content rendered normally (from preview endpoint)
- Fade-to-blur overlay at truncation point
- Upgrade CTA block: "This article requires a [access_level] membership" + "Upgrade" button (placeholder link for now — Sub-project 6 handles actual upgrade flow)
- No related free articles shown

**Data flow:**
- Try `GET /articles/{uuid}` — if 200, render full content
- If 403 (access denied): call `GET /articles/{uuid}?preview=true` to get truncated content + access info, render teaser layout

## API Changes

### Modified endpoint

**`GET /articles/{uuid}`** — add `preview` query parameter:
- `?preview=true`: Returns article metadata + first 3-5 TipTap content blocks (enough for ~200 words). Always returns 200 for PUBLISHED articles regardless of user's access level (bypasses access control). Non-published articles still return 404 for non-editors. Response uses `ArticleListItem` schema with `locked: bool` and truncated `content`. The `locked` field reflects whether the user would need to upgrade to see the full article.
- Without `?preview=true`: existing behavior (200 for accessible, 403 for locked)

The preview response uses the `ArticleListItem` schema (includes `locked` field) with a truncated `content` field containing only the first few TipTap blocks.

### Content truncation logic

TipTap content is a JSON array of blocks. To truncate:
1. Walk the content blocks in order
2. Count text characters across blocks
3. After reaching ~200 characters (or 3-5 blocks), stop
4. Return only those blocks in the `content` field

This is a backend service function: `get_article_preview(article) → dict` that returns the article with truncated content.

## Frontend Components

### New files

| File | Responsibility |
|------|---------------|
| `app/orgs/[orgslug]/(withmenu)/articles/page.tsx` | Browse page |
| `app/orgs/[orgslug]/(withmenu)/article/[articleuuid]/page.tsx` | Reader page |
| `components/Pages/Articles/ArticleBrowse.tsx` | Feed with pillar tabs + search + card grid |
| `components/Pages/Articles/ArticleCard.tsx` | Single article card for the feed |
| `components/Pages/Articles/ArticleReader.tsx` | Full article reader (TipTap read-only rendering) |
| `components/Pages/Articles/ArticleTeaser.tsx` | Locked article teaser (preview + fade + upgrade CTA) |
| `components/Pages/Articles/PillarTabs.tsx` | Pillar tab bar component |

### Modified files

| File | Change |
|------|--------|
| Org `(withmenu)` layout/navigation | Add "Articles" link |

### TipTap Read-Only Rendering

The article reader needs to render TipTap JSON as read-only HTML. LearnHouse already does this for course activities. The approach:
- Use the same TipTap extensions that the editor uses
- Set `editable: false` on the TipTap editor instance
- No toolbar, no drag handles, no slash commands

Approach: Reuse the TipTap editor component with `editable: false` and no toolbar. This is the simplest pattern — the same component that coaches use to write content renders it read-only for consumers. No separate viewer needed. Initialize TipTap with all the same extensions (for rendering quiz blocks, video, PDF, etc.) but disable editing. Look at how LearnHouse renders activity content in course views for reference.

## Design Language

Follow LearnHouse's existing design patterns:
- Dark theme (matching the existing org pages)
- Tailwind CSS classes
- Existing UI components from `components/ui/`
- Card style matching existing course cards
- Responsive breakpoints matching existing pages

**Pillar tab colors:** Each pillar can have a color derived from its position or icon. Use subtle background tints (like the mockup) to differentiate pillars visually.

**Lock badge:** Gold/amber color (`#C9A84C` — matching LIMITLESS brand gold) with a Lucide `Lock` icon (not emoji). Small, positioned top-right of card.

## Testing & Verification Criteria

1. **Articles nav link** — "Articles" appears in org public navigation, links to browse page
2. **Browse page loads** — pillar tabs render, article cards display with correct pillar badges
3. **Pillar filtering** — clicking a pillar tab filters articles to that pillar only
4. **Locked articles visible** — premium articles show 🔒 badge and "Premium" label in feed
5. **Article reader — full access** — clicking a free article opens reader with full TipTap content
6. **Article reader — locked teaser** — clicking a premium article (as free user) shows header + preview content + fade overlay + upgrade CTA
7. **Preview endpoint** — `GET /articles/{uuid}?preview=true` returns truncated content for locked articles
8. **Responsive** — browse and reader pages work at 375px and 1440px
9. **Anonymous access** — unauthenticated user can browse and read free articles
10. **Related courses** — article reader shows linked courses at bottom (if any)

## Success Criteria

1. All 10 verification criteria pass
2. TipTap content renders correctly in read-only mode (all block types)
3. No modifications to existing LearnHouse course pages
4. Responsive at mobile and desktop breakpoints
5. Upgrade CTA is visible and clickable (even if destination is placeholder)
6. Anonymous users can browse and read free content without logging in
