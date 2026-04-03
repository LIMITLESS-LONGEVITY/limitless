# PATHS Content Consumption UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the public-facing article browse and reader experience for the LIMITLESS PATHS platform — feed-first layout with pillar tabs, full article reader with TipTap rendering, and teaser + upgrade CTA for locked content.

**Architecture:** Two new public pages within LearnHouse's existing org layout. Backend: add preview endpoint for truncated content. Frontend: article browse (feed + pillar tabs), article reader (TipTap read-only), locked teaser (fade + upgrade CTA). Uses existing access control service from SP3.

**Tech Stack:** Next.js 16 / React 19 / TypeScript / Tailwind CSS / TipTap (read-only) / FastAPI

**Spec:** `docs/superpowers/specs/2026-03-21-paths-content-ui-design.md`

---

## File Structure

### Backend — New/Modified

| File | Responsibility |
|------|---------------|
| `apps/api/src/services/articles/articles.py` | Add `get_article_preview()` function |
| `apps/api/src/routers/articles.py` | Add `?preview=true` handling to GET endpoint |

### Frontend — New Files

| File | Responsibility |
|------|---------------|
| `apps/web/app/orgs/[orgslug]/(withmenu)/articles/page.tsx` | Browse page route |
| `apps/web/app/orgs/[orgslug]/(withmenu)/article/[articleuuid]/page.tsx` | Reader page route |
| `apps/web/components/Pages/Articles/ArticleBrowse.tsx` | Feed with pillar tabs + search + card grid |
| `apps/web/components/Pages/Articles/ArticleCard.tsx` | Single article card |
| `apps/web/components/Pages/Articles/ArticleReader.tsx` | Full article TipTap read-only rendering |
| `apps/web/components/Pages/Articles/ArticleTeaser.tsx` | Locked teaser: preview + fade + upgrade CTA |
| `apps/web/components/Pages/Articles/PillarTabs.tsx` | Pillar tab bar |

### Frontend — Modified Files

| File | Change |
|------|--------|
| Org `(withmenu)` navigation component | Add "Articles" link |

---

## Tasks

### Task 1: Preview Endpoint

**Files:**
- Modify: `learnhouse/apps/api/src/services/articles/articles.py`
- Modify: `learnhouse/apps/api/src/routers/articles.py`

- [ ] **Step 1: Add get_article_preview function to article service**

In `src/services/articles/articles.py`, add:

```python
def get_article_preview(article, max_blocks=5, max_chars=200):
    """
    Return article dict with truncated content (first N blocks or ~200 chars).
    Used for locked article teasers.
    """
    content = article.content
    if not content or not isinstance(content, dict):
        return None

    # TipTap content is {"type": "doc", "content": [blocks...]}
    blocks = content.get("content", [])
    if not blocks:
        return blocks

    truncated = []
    char_count = 0
    for block in blocks:
        if len(truncated) >= max_blocks or char_count >= max_chars:
            break
        truncated.append(block)
        # Count text in this block (recursive through nested content)
        char_count += _count_block_chars(block)

    return {"type": "doc", "content": truncated}


def _count_block_chars(block):
    """Recursively count text characters in a TipTap block."""
    chars = 0
    if "text" in block:
        chars += len(block["text"])
    if "content" in block and isinstance(block["content"], list):
        for child in block["content"]:
            chars += _count_block_chars(child)
    return chars
```

- [ ] **Step 2: Add preview parameter to GET /articles/{uuid} endpoint**

In `src/routers/articles.py`, modify the single article GET endpoint:

```python
# Add to endpoint parameters:
preview: bool = Query(default=False, description="Return truncated preview content (for teasers)")

# In the endpoint body, BEFORE the access control check:
if preview:
    # Preview mode: return metadata + truncated content for PUBLISHED articles
    article = db_session.exec(select(Article).where(Article.article_uuid == article_uuid)).first()
    if not article or article.status != "PUBLISHED":
        raise HTTPException(status_code=404)

    # Build preview response
    from src.services.articles.articles import get_article_preview
    from src.services.access_control.access_control import can_user_access_article

    user_id = current_user.id if hasattr(current_user, 'id') else None
    locked = not can_user_access_article(user_id, article, db_session)

    preview_content = get_article_preview(article)
    return {
        **ArticleRead.model_validate(article).model_dump(),
        "content": preview_content,
        "locked": locked,
    }
```

- [ ] **Step 3: Test preview endpoint**

```bash
# Create a published article first (or use existing)
# Test preview:
curl -s "http://127.0.0.1:9000/api/v1/articles/{uuid}?preview=true" | python -c "import sys,json; d=json.load(sys.stdin); print('locked:', d.get('locked'), 'content blocks:', len(d.get('content',{}).get('content',[])))"
```

- [ ] **Step 4: Commit**

```bash
cd learnhouse && git commit -m "feat: add preview endpoint for article teasers"
```

---

### Task 2: Articles Browse Page

**Files:**
- Create: `learnhouse/apps/web/app/orgs/[orgslug]/(withmenu)/articles/page.tsx`
- Create: `learnhouse/apps/web/components/Pages/Articles/ArticleBrowse.tsx`
- Create: `learnhouse/apps/web/components/Pages/Articles/ArticleCard.tsx`
- Create: `learnhouse/apps/web/components/Pages/Articles/PillarTabs.tsx`
- Modify: Org `(withmenu)` navigation

- [ ] **Step 1: Create PillarTabs component**

Horizontal scrollable tab bar. "All" tab selected by default + one tab per active pillar. Each tab shows pillar name. Clicking a tab calls `onSelect(pillarId)` callback (null for "All").

Fetch pillars from `GET /pillars/` (public endpoint, no auth needed).

Style: pill/chip style tabs matching LearnHouse's existing design. Use Tailwind.

- [ ] **Step 2: Create ArticleCard component**

Card showing:
- Pillar badge (colored chip, top-left corner)
- Lock badge (Lucide `Lock` icon with gold `#C9A84C` background, top-right, only if `locked=true`)
- Title (bold, clickable)
- Summary (2-line truncation with CSS `line-clamp-2`)
- Author name + "· X min read" (estimate from content length)
- Featured image thumbnail (if available)

Props: `article: ArticleListItem`, `orgslug: string`

Click navigates to `/article/{article_uuid}` (the reader page).

- [ ] **Step 3: Create ArticleBrowse component**

Main browse component:
- PillarTabs at top
- Search input (filters cards by title, client-side)
- Grid of ArticleCards (2 columns desktop via `grid-cols-1 md:grid-cols-2`, gap-4)
- Loading state while fetching
- Empty state: "No articles yet" message

Data fetching: Use SWR to fetch `GET /articles/?org_id={id}&include_locked=true`. Refetch when pillar tab changes (add `&pillar_id=X`).

For the articles API call, use the existing `getArticles` service from `services/articles/articles.ts` — OR use SWR with `swrFetcher` directly (matching LearnHouse patterns for public pages). Read how the existing course listing page fetches data.

- [ ] **Step 4: Create browse page route**

Create `app/orgs/[orgslug]/(withmenu)/articles/page.tsx`:

```tsx
'use client'
import ArticleBrowse from '@components/Pages/Articles/ArticleBrowse'
import { useOrg } from '@components/Contexts/OrgContext'

export default function ArticlesPage() {
  const org = useOrg() as any
  return <ArticleBrowse orgslug={org?.slug} orgId={org?.id} />
}
```

Read how existing `(withmenu)` pages work (e.g., courses page) and follow the same pattern for context providers, layouts, etc.

- [ ] **Step 5: Add "Articles" to org public navigation**

Find the `(withmenu)` layout navigation component. Add an "Articles" link with a `FileText` or `Newspaper` Lucide icon. Position it near Courses.

Read the existing nav component to understand how links are structured (they likely use org slug in the URL).

- [ ] **Step 6: Test browse page**

Navigate to `http://localhost:3000/articles` (middleware rewrites to org route). Verify:
- Pillar tabs render
- Article cards show with pillar badges
- Locked articles show lock icon
- Pillar filtering works
- Search works

- [ ] **Step 7: Commit**

```bash
cd learnhouse && git commit -m "feat: add articles browse page with pillar tabs and article cards"
```

---

### Task 3: Article Reader Page

**Files:**
- Create: `learnhouse/apps/web/app/orgs/[orgslug]/(withmenu)/article/[articleuuid]/page.tsx`
- Create: `learnhouse/apps/web/components/Pages/Articles/ArticleReader.tsx`
- Create: `learnhouse/apps/web/components/Pages/Articles/ArticleTeaser.tsx`

- [ ] **Step 1: Create ArticleReader component**

Full article reader for accessible articles:
- Article header: title (h1), pillar badge, author name, published date, estimated read time
- Featured image (full-width below header, if set)
- TipTap content rendered read-only: initialize TipTap editor with `editable: false`, no toolbar. Use the same extensions as the article editor so all block types render correctly (quiz, video, PDF, callouts, code, etc.).
- Related courses at bottom: if `article.related_courses` has items, fetch each course by UUID and show as simple cards (title + thumbnail). Skip invalid UUIDs silently.
- Back link: "← Back to Articles" linking to `/articles`

**IMPORTANT — TipTap read-only:** Read how the existing editor works at `components/Objects/Editor/Editor.tsx`. The article editor component at `components/Dashboard/Pages/Articles/ArticleEditor.tsx` already initializes TipTap. For the reader, create a simplified version:

```tsx
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
// Import same extensions as ArticleEditor

const editor = useEditor({
  extensions: [StarterKit, /* other extensions */],
  content: article.content,
  editable: false,
})

return <EditorContent editor={editor} className="prose prose-invert max-w-none" />
```

- [ ] **Step 2: Create ArticleTeaser component**

For locked articles — shows preview + upgrade CTA:
- Same header as ArticleReader (title, pillar, author, date)
- Featured image (if set)
- Preview content rendered via TipTap (read-only, from `?preview=true` response)
- Fade overlay: `bg-gradient-to-b from-transparent to-black/90` div positioned over the last part of the preview
- Upgrade CTA block overlaying the fade:
  - Text: "This article requires a {access_level} membership"
  - Button: "Upgrade to {access_level}" (gold/amber styled, links to placeholder URL for now)
  - Subtle message: "Unlock all {access_level} content" below button

- [ ] **Step 3: Create reader page route**

Create `app/orgs/[orgslug]/(withmenu)/article/[articleuuid]/page.tsx`:

```tsx
'use client'
import { useParams } from 'next/navigation'
import { useOrg } from '@components/Contexts/OrgContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
// Fetch article, check access, render ArticleReader or ArticleTeaser

export default function ArticlePage() {
  const { articleuuid } = useParams()
  // 1. Try fetching full article: GET /articles/{uuid}
  // 2. If 403 or locked: fetch preview: GET /articles/{uuid}?preview=true
  // 3. Render ArticleReader (full) or ArticleTeaser (preview)
}
```

Data flow:
1. Fetch `GET /articles/{uuid}` with auth cookies
2. If 200: render `ArticleReader` with full content
3. If 403: fetch `GET /articles/{uuid}?preview=true`, render `ArticleTeaser` with truncated content + access info

- [ ] **Step 4: Test reader page**

1. Create a free published article with content
2. Navigate to it → verify full TipTap content renders
3. Create a premium published article
4. Navigate as free user → verify teaser with fade + upgrade CTA
5. Test on mobile (375px) and desktop (1440px)

- [ ] **Step 5: Commit**

```bash
cd learnhouse && git commit -m "feat: add article reader page with TipTap rendering and locked teaser"
```

---

### Task 4: End-to-End Verification

- [ ] **Step 1: Verify Articles nav link exists and works**
- [ ] **Step 2: Verify browse page loads with pillar tabs + article cards**
- [ ] **Step 3: Verify pillar filtering works**
- [ ] **Step 4: Verify locked articles show lock badge in feed**
- [ ] **Step 5: Verify free article reader renders full TipTap content**
- [ ] **Step 6: Verify locked article shows teaser + fade + upgrade CTA**
- [ ] **Step 7: Verify preview endpoint returns truncated content**
- [ ] **Step 8: Verify responsive at 375px and 1440px**
- [ ] **Step 9: Verify anonymous user can browse and read free articles**
- [ ] **Step 10: Verify related courses render on article reader (if any linked)**
- [ ] **Step 11: Commit any remaining fixes**

```bash
cd learnhouse && git commit -m "chore: complete content consumption UI E2E verification"
```

---

## Verification Checklist (all must pass)

- [ ] "Articles" in org public navigation
- [ ] Browse page: pillar tabs + article cards
- [ ] Pillar tab filtering works
- [ ] Locked articles: lock badge in feed
- [ ] Free article: full TipTap read-only rendering
- [ ] Locked article: teaser + fade + upgrade CTA
- [ ] Preview endpoint: truncated content returned
- [ ] Responsive: 375px + 1440px
- [ ] Anonymous access: free articles browsable
- [ ] Related courses render on reader page
