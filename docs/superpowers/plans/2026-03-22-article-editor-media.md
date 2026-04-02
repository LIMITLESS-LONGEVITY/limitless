# Article Editor Media Support — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full media support (image, video, audio, PDF, embeds) to the article editor by making the existing block system context-aware (article or activity).

**Architecture:** Introduce a `BlockContext` discriminated union (`article | activity`) that flows through upload services, block components, and media URL helpers. New API endpoints under `/articles/{uuid}/blocks/*` handle article uploads. DB migration makes `course_id`/`activity_id` nullable and adds `article_id`.

**Tech Stack:** FastAPI, SQLModel/Alembic, Tiptap, React, Cloudflare R2

**Spec:** `docs/superpowers/specs/2026-03-22-article-editor-media-design.md`

---

## Important Notes

**Working directory:** All paths relative to `learnhouse/` unless otherwise noted. The API is at `apps/api/` and the frontend at `apps/web/`.

**Testing:** The API has existing tests under `apps/api/src/tests/`. Frontend has no test framework currently — verify manually.

**Deployment:** Push to `production` remote (`git push production dev:main`) auto-deploys to Render (API) and Vercel (frontend).

---

## File Structure

### Backend (create)
```
apps/api/migrations/versions/t9u0v1w2x3y4_add_article_blocks.py  — Alembic migration
apps/api/src/services/blocks/article_blocks.py                    — Article block upload services (image/video/audio/pdf)
apps/api/src/routers/article_blocks.py                            — Article block API endpoints
```

### Backend (modify)
```
apps/api/src/db/courses/blocks.py               — Make course_id/activity_id nullable, add article_id
apps/api/src/services/blocks/schemas/files.py    — Make activity_uuid optional, add article_uuid
apps/api/src/services/blocks/utils/upload_files.py — Add article_uuid param, branch directory path
apps/api/src/router.py                           — Register article blocks router
apps/api/src/routers/stream.py                   — Add article video/audio streaming endpoints
```

### Frontend (modify)
```
apps/web/services/blocks/Image/images.ts         — Context-aware upload
apps/web/services/blocks/Video/video.ts          — Context-aware upload
apps/web/services/blocks/Audio/audio.ts          — Context-aware upload
apps/web/services/blocks/Pdf/pdf.ts              — Context-aware upload
apps/web/services/media/media.ts                 — Add article media URL helpers
apps/web/components/Objects/Editor/Extensions/Image/ImageBlockComponent.tsx  — Remove useCourse(), use context
apps/web/components/Objects/Editor/Extensions/Video/VideoBlockComponent.tsx  — Remove useCourse(), use context
apps/web/components/Objects/Editor/Extensions/Audio/AudioBlockComponent.tsx  — Remove useCourse(), use context
apps/web/components/Objects/Editor/Extensions/PDF/PDFBlockComponent.tsx      — Remove useCourse(), use context
apps/web/components/Objects/Editor/Extensions/PasteFileHandler/PasteFileHandler.ts — Use context instead of activity
apps/web/components/Objects/Editor/Extensions/SlashCommands/slashCommandsConfig.tsx — Filter by registered extensions
apps/web/components/Objects/Editor/Editor.tsx    — Pass context instead of activity to extensions
apps/web/components/Dashboard/Pages/Articles/ArticleEditor.tsx — Add 14 new extensions
apps/web/components/Pages/Articles/ArticleReader.tsx — Add media extensions in read-only mode
```

---

### Task 1: Alembic Migration — Make Block Columns Nullable, Add article_id

**Files:**
- Create: `apps/api/migrations/versions/t9u0v1w2x3y4_add_article_blocks.py`

- [ ] **Step 1: Create the migration file**

**IMPORTANT:** Before writing the migration, verify the latest revision by checking the last file in `migrations/versions/`. As of this writing, the latest is `02409bad14b0_add_billing_tables.py`. If newer migrations exist, update `down_revision` accordingly.

```python
"""add_article_blocks

Revision ID: t9u0v1w2x3y4
Revises: 02409bad14b0
Create Date: 2026-03-22 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel  # noqa: F401

# revision identifiers, used by Alembic.
revision: str = 't9u0v1w2x3y4'
down_revision: Union[str, None] = '02409bad14b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Make course_id and activity_id nullable (article blocks won't have these)
    op.alter_column('block', 'course_id', existing_type=sa.Integer(), nullable=True)
    op.alter_column('block', 'activity_id', existing_type=sa.Integer(), nullable=True)

    # Add article_id column
    op.add_column(
        'block',
        sa.Column('article_id', sa.Integer(), sa.ForeignKey('articles.id', ondelete='CASCADE'), nullable=True),
    )
    op.create_index('ix_block_article_id', 'block', ['article_id'])


def downgrade() -> None:
    op.drop_index('ix_block_article_id', table_name='block')
    op.drop_column('block', 'article_id')
    op.alter_column('block', 'activity_id', existing_type=sa.Integer(), nullable=False)
    op.alter_column('block', 'course_id', existing_type=sa.Integer(), nullable=False)
```

- [ ] **Step 2: Update the Block model in `apps/api/src/db/courses/blocks.py`**

Replace the full file content:

```python
from typing import Optional
from sqlalchemy import JSON, Column, ForeignKey, Integer
from sqlmodel import Field, SQLModel
from enum import Enum


class BlockTypeEnum(str, Enum):
    BLOCK_QUIZ = "BLOCK_QUIZ"
    BLOCK_VIDEO = "BLOCK_VIDEO"
    BLOCK_DOCUMENT_PDF = "BLOCK_DOCUMENT_PDF"
    BLOCK_IMAGE = "BLOCK_IMAGE"
    BLOCK_AUDIO = "BLOCK_AUDIO"
    BLOCK_CUSTOM = "BLOCK_CUSTOM"


class BlockBase(SQLModel):
    id: Optional[int] = Field(default=None, primary_key=True)
    block_type: BlockTypeEnum = BlockTypeEnum.BLOCK_CUSTOM
    content: dict = Field(default_factory=dict, sa_column=Column(JSON))


class Block(BlockBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    content: dict = Field(default_factory=dict, sa_column=Column(JSON))
    org_id: int = Field(sa_column=Column("org_id", ForeignKey("organization.id", ondelete="CASCADE")))
    course_id: Optional[int] = Field(
        default=None,
        sa_column=Column("course_id", Integer, ForeignKey("course.id", ondelete="CASCADE"), nullable=True),
    )
    chapter_id: Optional[int] = Field(
        default=None,
        sa_column=Column("chapter_id", ForeignKey("chapter.id", ondelete="CASCADE")),
    )
    activity_id: Optional[int] = Field(
        default=None,
        sa_column=Column("activity_id", Integer, ForeignKey("activity.id", ondelete="CASCADE"), nullable=True),
    )
    article_id: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("articles.id", ondelete="CASCADE"), nullable=True),
    )
    block_uuid: str
    creation_date: str
    update_date: str


class BlockCreate(BlockBase):
    pass


class BlockRead(BlockBase):
    id: int = Field(default=None, primary_key=True)
    org_id: int = Field(default=None, foreign_key="organization.id")
    course_id: Optional[int] = Field(default=None, foreign_key="course.id")
    chapter_id: Optional[int] = Field(default=None, foreign_key="chapter.id")
    activity_id: Optional[int] = Field(default=None, foreign_key="activity.id")
    article_id: Optional[int] = Field(default=None)
    block_uuid: str
    creation_date: str
    update_date: str
```

- [ ] **Step 3: Update BlockFile schema in `apps/api/src/services/blocks/schemas/files.py`**

```python
from typing import Optional
from pydantic import BaseModel


class BlockFile(BaseModel):
    file_id: str
    file_format: str
    file_name: str
    file_size: int
    file_type: str
    activity_uuid: Optional[str] = None
    article_uuid: Optional[str] = None
```

- [ ] **Step 4: Run the migration against production DB**

```bash
cd apps/api
LEARNHOUSE_SQL_CONNECTION_STRING="<production_connection_string>" alembic upgrade head
```

Verify: check that `block` table now has `article_id` column and `course_id`/`activity_id` are nullable.

- [ ] **Step 5: Run existing tests to ensure no regression**

```bash
cd apps/api
python -m pytest src/tests/ -v --timeout=30
```

Expected: All existing tests pass.

- [ ] **Step 6: Commit**

```bash
git add migrations/versions/t9u0v1w2x3y4_add_article_blocks.py src/db/courses/blocks.py src/services/blocks/schemas/files.py
git commit -m "feat: make Block columns nullable and add article_id for article media support"
```

---

### Task 2: Update Upload Utility — Context-Aware Directory Paths

**Files:**
- Modify: `apps/api/src/services/blocks/utils/upload_files.py`

- [ ] **Step 1: Rewrite upload utility to accept article context**

```python
import uuid
from fastapi import HTTPException, Request, UploadFile
from src.services.blocks.schemas.files import BlockFile
from src.services.utils.upload_content import upload_file


async def upload_file_and_return_file_object(
    request: Request,
    file: UploadFile,
    block_id: str,
    list_of_allowed_file_formats: list,
    type_of_block: str,
    org_uuid: str,
    *,
    activity_uuid: str | None = None,
    course_uuid: str | None = None,
    article_uuid: str | None = None,
):
    """Upload file for blocks. Provide either (activity_uuid + course_uuid) or article_uuid."""
    file_id = str(uuid.uuid4())

    # Map legacy format list to type system
    allowed_types = []
    if any(fmt in ['jpg', 'jpeg', 'png', 'gif', 'webp'] for fmt in list_of_allowed_file_formats):
        allowed_types.append('image')
    if any(fmt in ['mp4', 'webm'] for fmt in list_of_allowed_file_formats):
        allowed_types.append('video')
    if any(fmt in ['pdf'] for fmt in list_of_allowed_file_formats):
        allowed_types.append('document')
    if any(fmt in ['mp3', 'wav', 'ogg', 'm4a'] for fmt in list_of_allowed_file_formats):
        allowed_types.append('audio')

    if not allowed_types:
        raise HTTPException(status_code=400, detail="No valid file types specified")

    # Build directory based on context
    if article_uuid:
        directory = f"articles/{article_uuid}/blocks/{type_of_block}/{block_id}"
    else:
        directory = f"courses/{course_uuid}/activities/{activity_uuid}/dynamic/blocks/{type_of_block}/{block_id}"

    # Upload file
    filename = await upload_file(
        file=file,
        directory=directory,
        type_of_dir='orgs',
        uuid=org_uuid,
        allowed_types=allowed_types,
        filename_prefix=f"block_{file_id}"
    )

    # Get file metadata
    file.file.seek(0)
    content = await file.read()

    # Extract actual name on disk and extension
    parts = filename.rsplit(".", 1)
    name_on_disk = parts[0]
    ext = parts[1] if len(parts) > 1 else "bin"

    return BlockFile(
        file_id=name_on_disk,
        file_format=ext,
        file_name=file.filename,
        file_size=len(content),
        file_type=file.content_type,
        activity_uuid=activity_uuid,
        article_uuid=article_uuid,
    )
```

- [ ] **Step 2: Find ALL callers of `upload_file_and_return_file_object`**

```bash
cd apps/api
grep -rn "upload_file_and_return_file_object" src/
```

Verify the list matches these 4 files (plus the definition). If there are additional callers, update them too.

- [ ] **Step 3: Update existing callers to use keyword arguments**

In `apps/api/src/services/blocks/block_types/imageBlock/imageBlock.py`, change the `upload_file_and_return_file_object` call (line 42-51):

```python
    # Before (positional args):
    # block_data = await upload_file_and_return_file_object(
    #     request, image_file, activity_uuid, block_uuid, [...], block_type, org.org_uuid, str(course.course_uuid),
    # )

    # After (keyword args):
    block_data = await upload_file_and_return_file_object(
        request,
        image_file,
        block_uuid,
        ["jpg", "jpeg", "png", "gif", "webp"],
        block_type,
        org.org_uuid,
        activity_uuid=activity_uuid,
        course_uuid=str(course.course_uuid),
    )
```

Apply the same change to all 4 block type services:
- `apps/api/src/services/blocks/block_types/imageBlock/imageBlock.py`
- `apps/api/src/services/blocks/block_types/videoBlock/videoBlock.py`
- `apps/api/src/services/blocks/block_types/audioBlock/audioBlock.py`
- `apps/api/src/services/blocks/block_types/pdfBlock/pdfBlock.py`

Each has the same pattern — find the `upload_file_and_return_file_object(` call and convert the `activity_uuid` and `course_uuid` positional args to keyword args. Remove the positional `activity_uuid` (was arg 3).

- [ ] **Step 4: Run existing tests**

```bash
cd apps/api
python -m pytest src/tests/ -v --timeout=30
```

Expected: All pass (keyword args are backward-compatible).

- [ ] **Step 5: Commit**

```bash
git add src/services/blocks/utils/upload_files.py src/services/blocks/block_types/
git commit -m "feat: make upload utility context-aware (article or activity)"
```

---

### Task 3: Article Block Upload Services + API Endpoints

**Files:**
- Create: `apps/api/src/services/blocks/article_blocks.py`
- Create: `apps/api/src/routers/article_blocks.py`
- Modify: `apps/api/src/router.py`

- [ ] **Step 1: Create article block services**

Create `apps/api/src/services/blocks/article_blocks.py`:

```python
"""
Article block upload services.

Mirrors the course block services (imageBlock.py, videoBlock.py, etc.)
but looks up the Article instead of Activity/Course.
"""
from datetime import datetime
from uuid import uuid4

from fastapi import HTTPException, Request, UploadFile, status
from sqlmodel import Session, select

from src.db.articles import Article
from src.db.courses.blocks import Block, BlockRead, BlockTypeEnum
from src.db.organizations import Organization
from src.db.users import PublicUser
from src.services.blocks.utils.upload_files import upload_file_and_return_file_object
from src.services.articles.articles import _get_article_rights


# Map of block type name → (BlockTypeEnum, allowed formats)
BLOCK_TYPES = {
    "image": (BlockTypeEnum.BLOCK_IMAGE, "imageBlock", ["jpg", "jpeg", "png", "gif", "webp"]),
    "video": (BlockTypeEnum.BLOCK_VIDEO, "videoBlock", ["mp4", "webm"]),
    "audio": (BlockTypeEnum.BLOCK_AUDIO, "audioBlock", ["mp3", "wav", "ogg", "m4a"]),
    "pdf":   (BlockTypeEnum.BLOCK_DOCUMENT_PDF, "pdfBlock", ["pdf"]),
}


async def create_article_block(
    request: Request,
    file: UploadFile,
    article_uuid: str,
    block_type_key: str,
    current_user: PublicUser,
    db_session: Session,
) -> BlockRead:
    """Create a media block attached to an article."""
    # Validate block type
    if block_type_key not in BLOCK_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid block type: {block_type_key}")

    block_type_enum, block_type_name, allowed_formats = BLOCK_TYPES[block_type_key]

    # Look up article
    article = db_session.exec(
        select(Article).where(Article.article_uuid == article_uuid)
    ).first()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    # Access control: user must have articles.action_create OR be the author
    rights = _get_article_rights(current_user.id, article.org_id, db_session)
    if not rights.get("action_create") and current_user.id != article.author_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to upload media to this article")

    # Look up org
    org = db_session.exec(
        select(Organization).where(Organization.id == article.org_id)
    ).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    # Generate block UUID and upload file
    block_uuid = f"block_{uuid4()}"
    block_data = await upload_file_and_return_file_object(
        request,
        file,
        block_uuid,
        allowed_formats,
        block_type_name,
        org.org_uuid,
        article_uuid=article_uuid,
    )

    # Create block row
    block = Block(
        block_type=block_type_enum,
        content=block_data.model_dump(),
        org_id=org.id,
        article_id=article.id,
        block_uuid=block_uuid,
        creation_date=str(datetime.now()),
        update_date=str(datetime.now()),
    )
    db_session.add(block)
    db_session.commit()
    db_session.refresh(block)

    return BlockRead.model_validate(block)


async def get_article_block(
    block_uuid: str,
    db_session: Session,
) -> BlockRead:
    """Retrieve a block by UUID."""
    block = db_session.exec(
        select(Block).where(Block.block_uuid == block_uuid)
    ).first()
    if not block:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Block not found")
    return BlockRead.model_validate(block)
```

- [ ] **Step 2: Create article block router**

Create `apps/api/src/routers/article_blocks.py`:

```python
"""
Article block upload endpoints.

POST /articles/{article_uuid}/blocks/image
POST /articles/{article_uuid}/blocks/video
POST /articles/{article_uuid}/blocks/audio
POST /articles/{article_uuid}/blocks/pdf
GET  /articles/{article_uuid}/blocks/{block_uuid}
"""
from typing import Union

from fastapi import APIRouter, Depends, Request, UploadFile
from sqlmodel import Session

from src.core.events.database import get_db_session
from src.db.courses.blocks import BlockRead
from src.db.users import AnonymousUser, PublicUser
from src.security.auth import get_authenticated_user
from src.services.blocks.article_blocks import create_article_block, get_article_block

router = APIRouter()


@router.post("/{article_uuid}/blocks/image", response_model=BlockRead)
async def api_create_article_image_block(
    request: Request,
    article_uuid: str,
    file_object: UploadFile,
    db_session: Session = Depends(get_db_session),
    current_user=Depends(get_authenticated_user),
):
    return await create_article_block(request, file_object, article_uuid, "image", current_user, db_session)


@router.post("/{article_uuid}/blocks/video", response_model=BlockRead)
async def api_create_article_video_block(
    request: Request,
    article_uuid: str,
    file_object: UploadFile,
    db_session: Session = Depends(get_db_session),
    current_user=Depends(get_authenticated_user),
):
    return await create_article_block(request, file_object, article_uuid, "video", current_user, db_session)


@router.post("/{article_uuid}/blocks/audio", response_model=BlockRead)
async def api_create_article_audio_block(
    request: Request,
    article_uuid: str,
    file_object: UploadFile,
    db_session: Session = Depends(get_db_session),
    current_user=Depends(get_authenticated_user),
):
    return await create_article_block(request, file_object, article_uuid, "audio", current_user, db_session)


@router.post("/{article_uuid}/blocks/pdf", response_model=BlockRead)
async def api_create_article_pdf_block(
    request: Request,
    article_uuid: str,
    file_object: UploadFile,
    db_session: Session = Depends(get_db_session),
    current_user=Depends(get_authenticated_user),
):
    return await create_article_block(request, file_object, article_uuid, "pdf", current_user, db_session)


@router.get("/{article_uuid}/blocks/{block_uuid}", response_model=BlockRead)
async def api_get_article_block(
    article_uuid: str,
    block_uuid: str,
    db_session: Session = Depends(get_db_session),
    current_user=Depends(get_authenticated_user),
):
    return await get_article_block(block_uuid, db_session)
```

- [ ] **Step 3: Register the router in `apps/api/src/router.py`**

Add import at line 31 (after the articles import):

```python
from src.routers.article_blocks import router as article_blocks_router
```

Add router registration after the articles router (after line 300).

**IMPORTANT:** Both the existing articles router and this new blocks router use prefix `/articles`. FastAPI handles this correctly — the more specific paths (`/{uuid}/blocks/image`) won't conflict with the existing articles CRUD paths (`/`, `/{uuid}`, `/{uuid}/submit`, etc.). Verify by checking that no existing article route uses a wildcard that could match `/blocks/*`.

```python
# CMS: Article Blocks (media uploads)
v1_router.include_router(
    article_blocks_router,
    prefix="/articles",
    tags=["Article Blocks"],
    dependencies=[Depends(get_non_api_token_user)],
)
```

- [ ] **Step 4: Run tests**

```bash
cd apps/api
python -m pytest src/tests/ -v --timeout=30
```

- [ ] **Step 5: Commit**

```bash
git add src/services/blocks/article_blocks.py src/routers/article_blocks.py src/router.py
git commit -m "feat: add article block upload endpoints (image, video, audio, pdf)"
```

---

### Task 4: Article Streaming Endpoints

**Files:**
- Modify: `apps/api/src/routers/stream.py`

- [ ] **Step 1: Add article streaming endpoints**

Read `apps/api/src/routers/stream.py` to understand the existing pattern. Then append article streaming endpoints that mirror the course streaming pattern but look up by `article_uuid` instead of `course_uuid/activity_uuid`.

Add these endpoints to the existing `stream.py` router:

```python
# --- Article streaming ---

async def _verify_article_access(
    article_uuid: str,
    current_user,
    db_session: Session,
) -> Article:
    """Verify user can access the article (for streaming)."""
    from src.db.articles import Article
    article = db_session.exec(
        select(Article).where(Article.article_uuid == article_uuid)
    ).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


@router.get("/article/video/{org_uuid}/{article_uuid}/{block_uuid}/{filename}")
@router.head("/article/video/{org_uuid}/{article_uuid}/{block_uuid}/{filename}")
async def stream_article_video(
    request: Request,
    org_uuid: str,
    article_uuid: str,
    block_uuid: str,
    filename: str,
    db_session: Session = Depends(get_db_session),
    current_user=Depends(get_current_user),
):
    article = await _verify_article_access(article_uuid, current_user, db_session)
    file_path = f"content/orgs/{org_uuid}/articles/{article_uuid}/blocks/videoBlock/{block_uuid}/{filename}"
    return await stream_video_file(request, file_path)


@router.get("/article/audio/{org_uuid}/{article_uuid}/{block_uuid}/{filename}")
@router.head("/article/audio/{org_uuid}/{article_uuid}/{block_uuid}/{filename}")
async def stream_article_audio(
    request: Request,
    org_uuid: str,
    article_uuid: str,
    block_uuid: str,
    filename: str,
    db_session: Session = Depends(get_db_session),
    current_user=Depends(get_current_user),
):
    article = await _verify_article_access(article_uuid, current_user, db_session)
    file_path = f"content/orgs/{org_uuid}/articles/{article_uuid}/blocks/audioBlock/{block_uuid}/{filename}"
    return await stream_video_file(request, file_path)
```

**Note:** Read the existing `stream_video_file` function to understand imports needed. The function handles Range headers for both video and audio.

- [ ] **Step 2: Run tests**

```bash
cd apps/api
python -m pytest src/tests/ -v --timeout=30
```

- [ ] **Step 3: Commit**

```bash
git add src/routers/stream.py
git commit -m "feat: add article video/audio streaming endpoints"
```

---

### Task 5: Frontend — Media URL Helpers

**Files:**
- Modify: `apps/web/services/media/media.ts`

- [ ] **Step 1: Add article media URL functions**

Append to the end of `apps/web/services/media/media.ts`:

```typescript
// --- Article block media ---

export function getArticleBlockMediaDirectory(
  orgUUID: string,
  articleUUID: string,
  blockId: string,
  fileId: string,
  type: string
) {
  return `${getMediaUrl()}content/orgs/${orgUUID}/articles/${articleUUID}/blocks/${type}/${blockId}/${fileId}`
}

export function getArticleVideoStreamUrl(
  orgUUID: string,
  articleUUID: string,
  blockUUID: string,
  filename: string
) {
  // Use the same getApiUrl() local function as existing stream helpers
  // Check existing stream URL functions in this file for the exact pattern
  // The URL must include the /api/v1/ prefix
  return `${getApiUrl()}api/v1/stream/article/video/${orgUUID}/${articleUUID}/${blockUUID}/${filename}`
}

export function getArticleAudioStreamUrl(
  orgUUID: string,
  articleUUID: string,
  blockUUID: string,
  filename: string
) {
  return `${getApiUrl()}api/v1/stream/article/audio/${orgUUID}/${articleUUID}/${blockUUID}/${filename}`
}
```

- [ ] **Step 2: Add BlockContext type**

Create `apps/web/services/blocks/blockContext.ts`:

```typescript
export type BlockContext =
  | { type: 'activity'; uuid: string; courseUuid: string }
  | { type: 'article'; uuid: string }
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/services/media/media.ts apps/web/services/blocks/blockContext.ts
git commit -m "feat: add article media URL helpers and BlockContext type"
```

---

### Task 6: Frontend — Context-Aware Upload Services

**Files:**
- Modify: `apps/web/services/blocks/Image/images.ts`
- Modify: `apps/web/services/blocks/Video/video.ts`
- Modify: `apps/web/services/blocks/Audio/audio.ts`
- Modify: `apps/web/services/blocks/Pdf/pdf.ts`

- [ ] **Step 1: Update image upload service**

Replace `apps/web/services/blocks/Image/images.ts`:

```typescript
import { getAPIUrl } from '@services/config/config'
import {
  RequestBodyFormWithAuthHeader,
  RequestBodyWithAuthHeader,
} from '@services/utils/ts/requests'
import type { BlockContext } from '@services/blocks/blockContext'

export async function uploadNewImageFile(
  file: any,
  context: BlockContext | string,  // string for backward compat during transition
  access_token: string
) {
  const formData = new FormData()
  formData.append('file_object', file)

  let url: string
  if (typeof context === 'string') {
    // Legacy: activity_uuid passed directly
    formData.append('activity_uuid', context)
    url = `${getAPIUrl()}blocks/image`
  } else if (context.type === 'article') {
    url = `${getAPIUrl()}articles/${context.uuid}/blocks/image`
  } else {
    formData.append('activity_uuid', context.uuid)
    url = `${getAPIUrl()}blocks/image`
  }

  const result = await fetch(
    url,
    RequestBodyFormWithAuthHeader('POST', formData, null, access_token)
  )

  const data = await result.json()

  if (!result.ok) {
    const errorMessage = typeof data?.detail === 'string'
      ? data.detail
      : Array.isArray(data?.detail)
        ? data.detail.map((e: any) => e.msg).join(', ')
        : 'Upload failed'
    throw new Error(errorMessage)
  }

  return data
}

export async function getImageFile(file_id: string, access_token: string) {
  return fetch(
    `${getAPIUrl()}blocks/image?file_id=${file_id}`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  )
    .then((result) => result.json())
    .catch((error) => console.log('error', error))
}
```

- [ ] **Step 2: Apply same pattern to video, audio, PDF upload services**

Each file follows the same pattern — change the upload function signature from `activity_uuid: string` to `context: BlockContext | string`, and branch the URL based on context type. The only difference is the endpoint path (`/blocks/video`, `/blocks/audio`, `/blocks/pdf` for activity; `/articles/{uuid}/blocks/video`, etc. for article).

Read each file, apply the same changes as the image service.

- [ ] **Step 3: Commit**

```bash
git add apps/web/services/blocks/
git commit -m "feat: make upload services context-aware (article or activity)"
```

---

### Task 7: Frontend — Refactor Block Components to Use Context

**Files:**
- Modify: `apps/web/components/Objects/Editor/Extensions/Image/ImageBlockComponent.tsx`
- Modify: `apps/web/components/Objects/Editor/Extensions/Video/VideoBlockComponent.tsx`
- Modify: `apps/web/components/Objects/Editor/Extensions/Audio/AudioBlockComponent.tsx`
- Modify: `apps/web/components/Objects/Editor/Extensions/PDF/PDFBlockComponent.tsx`

This is the largest task. Each component needs 3 changes.

- [ ] **Step 1: Refactor ImageBlockComponent**

In `ImageBlockComponent.tsx`:

**Change 1 — Remove `useCourse` import and usage:**
```typescript
// REMOVE this import:
// import { useCourse } from '@components/Contexts/CourseContext'

// REMOVE this line inside the component:
// const course = useCourse() as any

// ADD this import:
import { getArticleBlockMediaDirectory } from '@services/media/media'
```

**Change 2 — Replace upload call (around line 58-61):**
```typescript
// Before:
let object = await uploadNewImageFile(
  file,
  props.extension.options.activity.activity_uuid,
  access_token
)

// After:
const context = props.extension.options.context
let object = await uploadNewImageFile(file, context, access_token)
```

**Change 3 — Replace all `getActivityBlockMediaDirectory` calls that use `course`:**

Find every call to `getActivityBlockMediaDirectory` in the file and replace with context-aware branching:

```typescript
// Before (appears ~2 times in file):
const imageUrl = getActivityBlockMediaDirectory(
  org?.org_uuid,
  course?.courseStructure.course_uuid,
  blockObject.content.activity_uuid || props.extension.options.activity.activity_uuid,
  blockObject.block_uuid,
  fileId || '',
  'imageBlock'
)

// After:
const context = props.extension.options.context
const imageUrl = context?.type === 'article'
  ? getArticleBlockMediaDirectory(org?.org_uuid, context.uuid, blockObject.block_uuid, fileId || '', 'imageBlock')
  : getActivityBlockMediaDirectory(org?.org_uuid, context?.courseUuid, blockObject.content.activity_uuid, blockObject.block_uuid, fileId || '', 'imageBlock')
```

- [ ] **Step 2: Refactor VideoBlockComponent**

Same 3 changes as ImageBlockComponent, plus:
- Replace streaming URL construction to use `getArticleVideoStreamUrl` when context is article
- Remove `useCourse` import and usage
- The video upload service call uses `uploadNewVideoFile` instead of `uploadNewImageFile`

- [ ] **Step 3: Refactor AudioBlockComponent**

Same pattern. Uses `uploadNewAudioFile` and `getArticleAudioStreamUrl`.

- [ ] **Step 4: Refactor PDFBlockComponent**

Same pattern. Uses `uploadNewPDFFile`. No streaming URLs needed for PDF.

- [ ] **Step 5: Verify course editor still works**

Open the course editor in a browser and verify that uploading an image/video in a course activity still works. The `context` prop is not set yet for the course editor (Task 8 handles that), but the components should fall back gracefully via `props.extension.options.activity` if `context` is undefined.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/Objects/Editor/Extensions/Image/ apps/web/components/Objects/Editor/Extensions/Video/ apps/web/components/Objects/Editor/Extensions/Audio/ apps/web/components/Objects/Editor/Extensions/PDF/
git commit -m "feat: refactor block components to use context instead of useCourse()"
```

---

### Task 8: Frontend — Update Course Editor to Pass Context

**Files:**
- Modify: `apps/web/components/Objects/Editor/Editor.tsx`
- Modify: `apps/web/components/Objects/Editor/Extensions/PasteFileHandler/PasteFileHandler.ts`

- [ ] **Step 1: Update Editor.tsx extension configuration**

In `Editor.tsx`, find where extensions are configured (around line 154-165). Change from `activity: props.activity` to `context`:

```typescript
// Before:
ImageBlock.configure({
  editable: true,
  activity: props.activity,
}),

// After:
ImageBlock.configure({
  editable: true,
  activity: props.activity,  // keep for backward compat during transition
  context: {
    type: 'activity' as const,
    uuid: props.activity?.activity_uuid,
    courseUuid: props.course?.course_uuid,
  },
}),
```

Apply this to all media block extensions (ImageBlock, VideoBlock, AudioBlock, PDFBlock) and PasteFileHandler.

- [ ] **Step 2: Update PasteFileHandler to use context**

In `PasteFileHandler.ts`, make these changes:

**Change 1 — Update imports and interfaces:**
```typescript
// Add import
import type { BlockContext } from '@services/blocks/blockContext'

// Update the options interface:
interface PasteFileHandlerOptions {
  activity: any  // keep for backward compat
  context?: BlockContext
  getAccessToken: () => string | undefined
}

// Update the FileTypeMapping upload type:
interface FileTypeMapping {
  blockType: BlockType
  label: string
  upload: (file: File, context: BlockContext | string, accessToken: string) => Promise<any>
}
```

**Change 2 — Update handleFiles function (around line 57):**
```typescript
// Before:
const activityUuid = activity.activity_uuid
upload(file, activityUuid, accessToken)

// After:
const ctx = this.options.context || (activity ? { type: 'activity' as const, uuid: activity.activity_uuid, courseUuid: '' } : null)
if (!ctx) return false
// ... later in the loop:
upload(file, ctx, accessToken)
```

- [ ] **Step 3: Verify course editor works end-to-end**

Test in browser: create a course activity, upload an image, verify it displays.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/Objects/Editor/Editor.tsx apps/web/components/Objects/Editor/Extensions/PasteFileHandler/PasteFileHandler.ts
git commit -m "feat: pass BlockContext from course editor to all media extensions"
```

---

### Task 9: Frontend — Add Extensions to Article Editor

**Files:**
- Modify: `apps/web/components/Dashboard/Pages/Articles/ArticleEditor.tsx`

- [ ] **Step 1: Check if EditorProvider context is needed**

The block components use `useEditorProvider()` for the `isEditable` flag. Check if `ArticleEditor.tsx` wraps the editor in an `EditorProvider`. If not, either:
- Wrap the editor content in `<EditorProvider value={{ isEditable: true }}>`
- Or verify the components have a safe fallback when the context is missing

Also check that `OrgContext` is available — the block components call `useOrg()` for `org_uuid`. The article editor should be rendered within an `OrgProvider`. Verify by checking the parent component/page.

- [ ] **Step 2: Add imports for all new extensions**

At the top of `ArticleEditor.tsx`, add:

```typescript
import ImageBlock from '@components/Objects/Editor/Extensions/Image/ImageBlock'
import VideoBlock from '@components/Objects/Editor/Extensions/Video/VideoBlock'
import AudioBlock from '@components/Objects/Editor/Extensions/Audio/AudioBlock'
import PDFBlock from '@components/Objects/Editor/Extensions/PDF/PDFBlock'
import MathEquationBlock from '@components/Objects/Editor/Extensions/MathEquation/MathEquationBlock'
import EmbedObjects from '@components/Objects/Editor/Extensions/EmbedObjects/EmbedObjects'
import Flipcard from '@components/Objects/Editor/Extensions/Flipcard/Flipcard'
import Buttons from '@components/Objects/Editor/Extensions/Buttons/Buttons'
import WebPreview from '@components/Objects/Editor/Extensions/WebPreview/WebPreview'
import { SlashCommands } from '@components/Objects/Editor/Extensions/SlashCommands'
import DragHandle from '@components/Objects/Editor/Extensions/DragHandle/DragHandle'
import PasteFileHandler from '@components/Objects/Editor/Extensions/PasteFileHandler/PasteFileHandler'
import AIStreamingMark from '@components/Objects/Editor/Extensions/AIStreaming/AIStreamingMark'
import AISelectionHighlight from '@components/Objects/Editor/Extensions/AISelectionHighlight/AISelectionHighlight'
```

- [ ] **Step 2: Add extensions to the editor configuration**

In the `useEditor` call (around line 87-108), add the new extensions after the existing ones:

```typescript
const editor = useEditor({
  editable: true,
  extensions: [
    // ... existing extensions (StarterKit, InfoCallout, WarningCallout, Youtube, CodeBlockLowlight, Table, Link) ...

    // Media blocks
    ImageBlock.configure({
      context: { type: 'article' as const, uuid: articleUuid },
    }),
    VideoBlock.configure({
      context: { type: 'article' as const, uuid: articleUuid },
    }),
    AudioBlock.configure({
      context: { type: 'article' as const, uuid: articleUuid },
    }),
    PDFBlock.configure({
      context: { type: 'article' as const, uuid: articleUuid },
    }),
    MathEquationBlock,

    // Content blocks
    EmbedObjects,
    Flipcard,
    Buttons,
    WebPreview,

    // Editor UX
    SlashCommands,
    DragHandle,
    PasteFileHandler.configure({
      context: { type: 'article' as const, uuid: articleUuid },
      getAccessToken: () => access_token,
    }),

    // AI
    AIStreamingMark,
    AISelectionHighlight,
  ],
  content: '',
  immediatelyRender: false,
})
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/Dashboard/Pages/Articles/ArticleEditor.tsx
git commit -m "feat: add 14 media/content extensions to article editor"
```

---

### Task 10: Frontend — Filter SlashCommands for Article Context

**Files:**
- Modify: `apps/web/components/Objects/Editor/Extensions/SlashCommands/slashCommandsConfig.tsx`

- [ ] **Step 1: Add filtering by registered extensions**

The slash commands list is hardcoded and includes entries for Quiz, CodePlayground, Scenarios, Badges, UserBlock, and MagicBlock which are excluded from the article editor.

The simplest approach: add a function that filters commands based on which Tiptap node types are actually registered in the editor.

Find where `slashCommands` are used (likely in the `SlashCommands.ts` extension). The filter should check:

```typescript
// In the suggestion items getter, filter by registered extensions:
const registeredTypes = new Set(editor.extensionManager.extensions.map(e => e.name))
const availableCommands = slashCommands.filter(cmd => {
  // Extract the node type from the command (inspect command function or add a nodeType field)
  // If the command inserts a node type that's not registered, filter it out
  return true // default: show
})
```

Alternatively, the simpler approach: add an optional `nodeType` field to each slash command entry, and filter by `editor.extensionManager.extensions`:

```typescript
// In slashCommandsConfig.tsx, add nodeType to entries that insert blocks:
{
  id: 'image',
  title: 'Image',
  nodeType: 'blockImage',  // NEW
  // ...
},
{
  id: 'quiz',
  title: 'Quiz',
  nodeType: 'blockQuiz',  // NEW — will be filtered out in article editor
  // ...
}

// Add filter function:
export function getAvailableCommands(editor: any): SlashCommandItem[] {
  const registeredNodes = new Set(
    editor.extensionManager.extensions.map((e: any) => e.name)
  )
  return slashCommands.filter(cmd => {
    if (!cmd.nodeType) return true  // non-block commands always shown
    return registeredNodes.has(cmd.nodeType)
  })
}
```

Then use `getAvailableCommands(editor)` instead of `slashCommands` in the suggestion plugin.

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/Objects/Editor/Extensions/SlashCommands/
git commit -m "feat: filter slash commands based on registered editor extensions"
```

---

### Task 11: Frontend — Article Reader Media Extensions

**Files:**
- Modify: `apps/web/components/Pages/Articles/ArticleReader.tsx`

- [ ] **Step 1: Read the current ArticleReader file and check context providers**

Read `apps/web/components/Pages/Articles/ArticleReader.tsx` to understand its structure. Check:
1. Does it use Tiptap (useEditor) in read-only mode?
2. Is it rendered within an `OrgProvider`? (Block components need `useOrg()` for media URLs)
3. If `OrgProvider` is missing, wrap the reader content in one — you'll need the `org` prop from the parent page component.

- [ ] **Step 2: Add media block extensions in read-only mode**

Add the same media block imports as the article editor, but configure as read-only:

```typescript
import ImageBlock from '@components/Objects/Editor/Extensions/Image/ImageBlock'
import VideoBlock from '@components/Objects/Editor/Extensions/Video/VideoBlock'
import AudioBlock from '@components/Objects/Editor/Extensions/Audio/AudioBlock'
import PDFBlock from '@components/Objects/Editor/Extensions/PDF/PDFBlock'
import MathEquationBlock from '@components/Objects/Editor/Extensions/MathEquation/MathEquationBlock'
import EmbedObjects from '@components/Objects/Editor/Extensions/EmbedObjects/EmbedObjects'
import Flipcard from '@components/Objects/Editor/Extensions/Flipcard/Flipcard'
import Buttons from '@components/Objects/Editor/Extensions/Buttons/Buttons'
import WebPreview from '@components/Objects/Editor/Extensions/WebPreview/WebPreview'

// In the useEditor call, add these extensions:
ImageBlock.configure({
  context: { type: 'article' as const, uuid: article.article_uuid },
}),
VideoBlock.configure({
  context: { type: 'article' as const, uuid: article.article_uuid },
}),
AudioBlock.configure({
  context: { type: 'article' as const, uuid: article.article_uuid },
}),
PDFBlock.configure({
  context: { type: 'article' as const, uuid: article.article_uuid },
}),
MathEquationBlock,
EmbedObjects,
Flipcard,
Buttons,
WebPreview,
```

Do NOT add interactive-only extensions (SlashCommands, DragHandle, PasteFileHandler).

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/Pages/Articles/ArticleReader.tsx
git commit -m "feat: add media block extensions to article reader (read-only)"
```

---

### Task 12: Integration Test and Deploy

- [ ] **Step 1: Test backend endpoints locally**

```bash
cd apps/api
python -m pytest src/tests/ -v --timeout=30
```

- [ ] **Step 2: Verify frontend builds**

```bash
cd apps/web
bun run build
```

Expected: No TypeScript or build errors.

- [ ] **Step 3: Manual integration test**

1. Start the dev environment
2. Log in as admin on the admin panel
3. Create a new article
4. In the article editor, use the slash command `/` to verify media options appear (Image, Video, Audio, PDF)
5. Upload an image — verify it displays
6. Upload a video — verify it plays
7. Save the article, reload — verify media persists
8. Publish the article — verify media renders in the reader
9. Open a course activity editor — verify existing media uploads still work (no regression)

- [ ] **Step 4: Commit any fixes from testing**

```bash
git add -A
git commit -m "fix: integration test fixes for article media support"
```

- [ ] **Step 5: Deploy to production**

```bash
git push production dev:main
```

---

## Task Dependency Graph

```
Task 1 (DB migration + model changes)
  ↓
Task 2 (Upload utility refactor)
  ↓
Task 3 (Article block API endpoints)
  ↓
Task 4 (Streaming endpoints)
  ↓
Task 5 (Frontend media URL helpers)
  ↓
Task 6 (Frontend upload services)
  ↓
Task 7 (Frontend block component refactor)  ← largest task
  ↓
Task 8 (Course editor context passthrough)
  ↓
Task 9 (Article editor extensions)
  ↓
Task 10 (Slash commands filtering)
  ↓
Task 11 (Article reader extensions)
  ↓
Task 12 (Integration test + deploy)
```

Tasks 1-4 (backend) and Tasks 5-6 (frontend services) could theoretically run in parallel, but the frontend depends on the API being available for testing. Execute sequentially for safety.
