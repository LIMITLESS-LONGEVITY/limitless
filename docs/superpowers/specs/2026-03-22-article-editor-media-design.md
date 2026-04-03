# Article Editor Media Support — Design Spec

**Date:** 2026-03-22
**Status:** Approved
**Type:** Feature / Content Management
**Goal:** Give the article editor full media capabilities (image, video, audio, PDF, embeds) by reusing the course editor's block system with article-aware upload routing.

---

## Table of Contents

1. [Purpose & Goals](#1-purpose--goals)
2. [Architecture](#2-architecture)
3. [Database Changes](#3-database-changes)
4. [API Endpoints](#4-api-endpoints)
5. [Frontend Changes](#5-frontend-changes)
6. [Storage Layout](#6-storage-layout)
7. [Access Control](#7-access-control)
8. [Extensions List](#8-extensions-list)

---

## 1. Purpose & Goals

### Problem

The article editor currently supports text-only content (formatting, YouTube embeds, tables, code blocks, callouts). Authors cannot embed images, videos, audio, or PDFs inline. The course activity editor supports all of these via a rich block system, but the article editor was built with a stripped-down extension set.

### Goal

Extend the article editor to support the same rich media capabilities as the course editor by reusing existing block infrastructure with an article-aware context.

### What changes

- Article editor gets ~14 additional Tiptap extensions (media blocks, slash commands, drag handle, etc.)
- New API endpoints for article block uploads (image, video, audio, PDF)
- New streaming endpoints for article video/audio
- `Block` database table gets a nullable `article_id` foreign key
- Upload services and block components become context-aware (article or activity)
- R2 storage gets an `articles/` directory structure parallel to `courses/`

### What stays the same

- Course editor — no changes to its behavior
- Existing block components — reused, not duplicated
- R2 storage structure for courses — untouched
- Article content format — still Tiptap JSON, now with media block nodes
- Article save/versioning — unchanged

---

## 2. Architecture

### Core concept: Context-aware blocks

The existing block system is tightly coupled to course activities (`activity_uuid`, `course_id`). This design introduces a generic **context** concept:

```
Context = { type: "activity", uuid: activity_uuid }
        | { type: "article",  uuid: article_uuid  }
```

Block components receive a `context` prop that determines:
- Which API endpoint to call for uploads
- Which R2 directory to store files in
- Which streaming URL to use for video/audio

### Data flow for article media upload

```
User drops image in article editor
  → ImageBlockComponent calls uploadNewImageFile(file, context, token)
  → Upload service checks context.type
  → POST /api/v1/articles/{article_uuid}/blocks/image
  → Backend: validate article ownership, generate block_uuid
  → upload_file() → R2: orgs/{org}/articles/{article}/blocks/imageBlock/{block_id}/
  → Create Block row (article_id set, course_id/activity_id null)
  → Return BlockRead → component renders image
```

### Data flow for article media retrieval

```
Article reader loads article with image block
  → Tiptap renders ImageBlockComponent
  → Component reads blockObject.content (file_id, file_format)
  → Calls getArticleBlockMediaDirectory(orgUUID, articleUUID, blockUUID, fileId, type)
  → Returns URL: {MEDIA_URL}content/orgs/{org}/articles/{article}/blocks/imageBlock/{block_id}/{file_id}.{format}
  → Browser loads image
```

---

## 3. Database Changes

### Block table modification

Three changes to the existing `Block` table in `src/db/courses/blocks.py`:

**1. Make `course_id` and `activity_id` nullable:**

These are currently non-nullable with CASCADE deletes. Article blocks won't have a course or activity, so both must become optional:

```python
# Before:
course_id: int = Field(sa_column=Column("course_id", ForeignKey("course.id", ondelete="CASCADE")))
activity_id: int = Field(sa_column=Column("activity_id", ForeignKey("activity.id", ondelete="CASCADE")))

# After:
course_id: Optional[int] = Field(
    default=None,
    sa_column=Column("course_id", Integer, ForeignKey("course.id", ondelete="CASCADE"), nullable=True),
)
activity_id: Optional[int] = Field(
    default=None,
    sa_column=Column("activity_id", Integer, ForeignKey("activity.id", ondelete="CASCADE"), nullable=True),
)
```

**2. Add nullable `article_id` column:**

```python
article_id: Optional[int] = Field(
    default=None,
    sa_column=Column(Integer, ForeignKey("articles.id", ondelete="CASCADE"), nullable=True),
)
```

The `ON DELETE CASCADE` ensures block rows are cleaned up when an article is deleted. R2 file cleanup is a known gap (same as courses) — deferred to a future garbage collection feature.

**3. Update `BlockRead` schema** to make `course_id` and `activity_id` optional:

```python
# In BlockRead (response schema)
course_id: Optional[int] = None
activity_id: Optional[int] = None
article_id: Optional[int] = None
```

**Constraint:** A block belongs to either an activity OR an article, never both. Enforced at the application level.

### BlockFile schema change

In `src/services/blocks/schemas/files.py`, the `BlockFile` model has a required `activity_uuid: str` field. This must become optional, and an `article_uuid` field added:

```python
# Before:
activity_uuid: str

# After:
activity_uuid: Optional[str] = None
article_uuid: Optional[str] = None
```

The `BlockFile` is serialized into `Block.content` as JSON. Frontend components read `blockObject.content.activity_uuid` — these references must be updated to handle the article case (see section 5.2).

**Alembic migration:**
- Alter `course_id` column: set nullable=True (existing rows keep their values)
- Alter `activity_id` column: set nullable=True (existing rows keep their values)
- Add `article_id` column (nullable integer, FK → `articles.id`, ON DELETE CASCADE)
- Add index on `article_id` for query performance

### No new tables

The existing `Block` table is reused. No `ArticleBlock` table needed.

### R2 file cleanup

When an article is deleted, the `ON DELETE CASCADE` on `article_id` will remove block rows from the DB. However, the actual files in R2 will remain orphaned. This is a pre-existing gap (course blocks have the same issue). Deferred to a future R2 garbage collection feature.

---

## 4. API Endpoints

### New article block endpoints

All endpoints in a new router file: `src/routers/articles/blocks.py`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/articles/{article_uuid}/blocks/image` | Upload image block |
| `POST` | `/api/v1/articles/{article_uuid}/blocks/video` | Upload video block |
| `POST` | `/api/v1/articles/{article_uuid}/blocks/audio` | Upload audio block |
| `POST` | `/api/v1/articles/{article_uuid}/blocks/pdf` | Upload PDF block |
| `GET` | `/api/v1/articles/{article_uuid}/blocks/{block_uuid}` | Retrieve block metadata |

**Request format** (same as course blocks):
- `Content-Type: multipart/form-data`
- `file_object: UploadFile` — the media file

**Response format:** `BlockRead` (same schema as course blocks)

**Implementation:** Each endpoint:
1. Fetches the article by `article_uuid`
2. Validates the user has `articles.action_create` permission OR is the article author
3. Generates `block_uuid = f"block_{uuid.uuid4()}"`
4. Calls `upload_file_and_return_file_object()` with article-specific directory
5. Creates `Block` row with `article_id` set, `course_id`/`activity_id` null
6. Returns `BlockRead`

### New streaming endpoints

For range-request video/audio playback:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/stream/article/video/{org_uuid}/{article_uuid}/{block_uuid}/{filename}` | Stream video |
| `GET` | `/api/v1/stream/article/audio/{org_uuid}/{article_uuid}/{block_uuid}/{filename}` | Stream audio |
| `HEAD` | Same paths | Content-Length for range requests |

These mirror the existing course streaming endpoints in `src/routers/courses/activities/stream.py`.

### Existing endpoints unchanged

The course block endpoints (`/blocks/image`, etc.) remain unchanged. They continue to require `activity_uuid`.

---

## 5. Frontend Changes

### 5.1 Upload services

Modify the upload service files to accept a context parameter:

**Files to modify:**
- `apps/web/services/blocks/Image/images.ts`
- `apps/web/services/blocks/Video/video.ts`
- `apps/web/services/blocks/Audio/audio.ts`
- `apps/web/services/blocks/Pdf/pdf.ts`

**Pattern:**

```typescript
// Before:
export function uploadNewImageFile(file: File, activity_uuid: string, token: string)
// POST to: {API_URL}blocks/image  with FormData { file_object, activity_uuid }

// After:
export function uploadNewImageFile(
  file: File,
  context: { type: "activity" | "article", uuid: string },
  token: string
)
// If context.type === "activity":
//   POST to: {API_URL}blocks/image  with FormData { file_object, activity_uuid }
// If context.type === "article":
//   POST to: {API_URL}articles/{uuid}/blocks/image  with FormData { file_object }
```

Same pattern for video, audio, PDF.

### 5.2 Block components

Each media block component has two hard dependencies on course context that must be refactored:

1. **`useCourse()` hook** — used to get `course_uuid` for media URL construction. Will crash/return null in article context.
2. **`blockObject.content.activity_uuid`** — read from the `BlockFile` JSON for fallback URL construction.

**Files to modify:**
- `apps/web/components/Objects/Editor/Extensions/Image/ImageBlockComponent.tsx`
- `apps/web/components/Objects/Editor/Extensions/Video/VideoBlockComponent.tsx`
- `apps/web/components/Objects/Editor/Extensions/Audio/AudioBlockComponent.tsx`
- `apps/web/components/Objects/Editor/Extensions/PDF/PDFBlockComponent.tsx`

**Three changes per component:**

**Change 1 — Upload calls:** Replace `activity_uuid` with `context`:

```typescript
// Before:
const activity_uuid = extension.options.activity?.activity_uuid
uploadNewImageFile(file, activity_uuid, token)

// After:
const context = extension.options.context
// { type: "article", uuid: "article_xxx" } or { type: "activity", uuid: "activity_xxx" }
uploadNewImageFile(file, context, token)
```

**Change 2 — Media URL construction:** Replace `useCourse()` + `getActivityBlockMediaDirectory` with context-aware branching:

```typescript
// Before:
const course = useCourse() as any
const imageUrl = getActivityBlockMediaDirectory(
    org?.org_uuid,
    course?.courseStructure.course_uuid,
    blockObject.content.activity_uuid,
    blockObject.block_uuid, fileId, 'imageBlock'
)

// After:
const context = extension.options.context
const imageUrl = context.type === "article"
    ? getArticleBlockMediaDirectory(org?.org_uuid, context.uuid, blockObject.block_uuid, fileId, 'imageBlock')
    : getActivityBlockMediaDirectory(org?.org_uuid, context.courseUuid, blockObject.content.activity_uuid, blockObject.block_uuid, fileId, 'imageBlock')
```

The `useCourse()` call is removed entirely. For activity context, the course UUID is passed via `context.courseUuid`. For article context, `getArticleBlockMediaDirectory` is used.

**Change 3 — Streaming URLs (Video/Audio only):** Same pattern for stream URL construction:

```typescript
// Before:
const streamUrl = getVideoBlockStreamUrl(org_uuid, course_uuid, activity_uuid, block_uuid, filename)

// After:
const streamUrl = context.type === "article"
    ? getArticleVideoStreamUrl(org_uuid, context.uuid, block_uuid, filename)
    : getVideoBlockStreamUrl(org_uuid, context.courseUuid, context.uuid, block_uuid, filename)
```

**Context type definition:**

```typescript
type BlockContext =
    | { type: "activity", uuid: string, courseUuid: string }
    | { type: "article", uuid: string }
```

The course editor passes `{ type: "activity", uuid: activity_uuid, courseUuid: course_uuid }`. The article editor passes `{ type: "article", uuid: article_uuid }`.

### 5.3 Media URL helpers

Add article media URL function to `apps/web/services/media/media.ts`:

```typescript
export function getArticleBlockMediaDirectory(
  orgUUID: string,
  articleUUID: string,
  blockId: string,
  fileId: string,
  type: string  // 'imageBlock', 'videoBlock', 'audioBlock', 'pdfBlock'
): string {
  return `${MEDIA_URL}content/orgs/${orgUUID}/articles/${articleUUID}/blocks/${type}/${blockId}/${fileId}`
}

export function getArticleVideoStreamUrl(orgUUID, articleUUID, blockUUID, filename): string {
  return `${API_URL}api/v1/stream/article/video/${orgUUID}/${articleUUID}/${blockUUID}/${filename}`
}

export function getArticleAudioStreamUrl(orgUUID, articleUUID, blockUUID, filename): string {
  return `${API_URL}api/v1/stream/article/audio/${orgUUID}/${articleUUID}/${blockUUID}/${filename}`
}
```

Block components use the context type to choose between `getActivityBlockMediaDirectory` and `getArticleBlockMediaDirectory`.

### 5.4 Article editor extensions

Modify `apps/web/components/Dashboard/Pages/Articles/ArticleEditor.tsx`:

**Add extensions (15 total new):**

```typescript
// Media blocks
ImageBlock.configure({ context: { type: "article", uuid: articleUuid } }),
VideoBlock.configure({ context: { type: "article", uuid: articleUuid } }),
AudioBlock.configure({ context: { type: "article", uuid: articleUuid } }),
PDFBlock.configure({ context: { type: "article", uuid: articleUuid } }),
MathEquationBlock,

// Content blocks
EmbedObjects,
Flipcard,
Buttons,
WebPreview,

// Editor UX
SlashCommands,
DragHandle,
PasteFileHandler.configure({ context: { type: "article", uuid: articleUuid } }),

// AI
AIStreamingMark,
AISelectionHighlight,
```

**Keep existing extensions:**
StarterKit, InfoCallout, WarningCallout, Youtube, CodeBlockLowlight, Table/Row/Header/Cell, Link

### 5.5 SlashCommands filtering

The `SlashCommands` extension provides a `/` menu for inserting block types. Check whether it auto-discovers from registered Tiptap extensions or has a hardcoded block list (in `Extensions/SlashCommands/slashCommandsConfig.tsx`). If hardcoded, filter the list based on which extensions are actually registered in the editor instance — excluded block types (Quiz, CodePlayground, Scenarios, Badges, UserBlock, MagicBlock) must not appear in the slash menu.

### 5.6 Article reader

The article reader (`apps/web/components/Pages/Articles/ArticleReader.tsx`) must register the same media block extensions in **read-only mode** so it can render published articles containing media.

**Required changes:**
- Import and register all media block extensions (ImageBlock, VideoBlock, AudioBlock, PDFBlock, etc.) with `editable: false`
- Pass a read-only context: `{ type: "article", uuid: article_uuid }` — needed for media URL construction even in read mode
- Ensure `OrgContext` is available (needed by block components for `org_uuid` in media URLs)
- Non-interactive extensions (SlashCommands, DragHandle, PasteFileHandler) should NOT be registered in the reader

---

## 6. Storage Layout

### R2 directory structure for articles

```
orgs/
  {org_uuid}/
    articles/
      {article_uuid}/
        blocks/
          imageBlock/
            {block_id}/
              block_{file_id}.{jpg|png|webp|gif}
          videoBlock/
            {block_id}/
              block_{file_id}.{mp4|webm}
          audioBlock/
            {block_id}/
              block_{file_id}.{mp3|wav|ogg|m4a}
          pdfBlock/
            {block_id}/
              block_{file_id}.pdf
    courses/
      ... (unchanged)
```

### Upload utility changes

Modify `src/services/blocks/utils/upload_files.py` to accept an optional `article_uuid` parameter alongside the existing `activity_uuid`:

```python
def upload_file_and_return_file_object(
    request, file,
    activity_uuid=None, article_uuid=None,  # one must be provided
    block_id, list_of_allowed_file_formats, type_of_block,
    org_uuid, course_uuid=None
):
    if article_uuid:
        directory = f"articles/{article_uuid}/blocks/{type_of_block}/{block_id}"
    else:
        directory = f"courses/{course_uuid}/activities/{activity_uuid}/dynamic/blocks/{type_of_block}/{block_id}"
    ...
```

---

## 7. Access Control

### Who can upload article blocks

The same users who can edit an article:
- Users with `articles.action_create` permission (Coach/Author, Editor/Publisher, Admin, etc.)
- The article author (via the creator bypass)

### Implementation

Article block endpoints check:
1. User is authenticated
2. Article exists and belongs to the user's org
3. User has `articles.action_create` OR `user_id == article.author_id`

This reuses the existing article permission check pattern.

---

## 8. Extensions List

### Included in article editor (14 new + 7 existing = 21 total)

**Existing (keep):**
1. StarterKit (text formatting)
2. InfoCallout
3. WarningCallout
4. Youtube
5. CodeBlockLowlight
6. Table + Row + Header + Cell
7. Link

**New media blocks:**
8. ImageBlock
9. VideoBlock
10. AudioBlock
11. PDFBlock

**New content blocks:**
12. MathEquationBlock
13. EmbedObjects
14. Flipcard
15. Buttons
16. WebPreview

**New editor UX:**
17. SlashCommands
18. DragHandle
19. PasteFileHandler

**New AI:**
20. AIStreamingMark
21. AISelectionHighlight

### Excluded from article editor (6)

| Extension | Reason |
|-----------|--------|
| QuizBlock | Graded assessments are course-specific |
| CodePlayground | Requires Judge0 integration, course context |
| Scenarios | Branching learning paths, course-specific |
| Badges | Course completion rewards |
| UserBlock | Shows course contributors |
| MagicBlock | Reads `activity.content` and `activity.name` for AI context — would need article-specific adaptation; defer to future iteration |

---

## Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Storage layout | `articles/{uuid}/blocks/` | Mirrors course pattern, easy cleanup |
| Block table | Reuse with nullable `article_id` | Least code, reuses existing logic |
| Components | Reuse with context param | Single source of truth, shared bug fixes |
| Scope | 14 extensions (skip 6 course-bound) | Full media parity without course-specific UX confusion |
| Upload endpoints | Article-specific routes | Clean URL structure, clear ownership |
| Access control | Same as article editing | Consistent with existing permission model |
