# Handoff: Re-Index Content Chunks for AI Search

**Issue:** [#18](https://github.com/LIMITLESS-LONGEVITY/limitless-paths/issues/18)
**From:** Main Instance (Operator)
**To:** Workbench Instance (Engineer)
**Priority:** Urgent — AI search returns empty results until this is fixed

---

## Problem

The `ContentChunks` collection is empty. AI search (`GET /api/ai/search?q=longevity`) returns 200 but zero results because no articles have been indexed with embeddings.

## Root Cause

The `indexContentChunks` afterChange hook on Articles was deployed **after** the 12 sample articles were created. The hook only fires when:

1. `editorialStatus` changes **to** `'published'` (i.e., it wasn't published before), OR
2. Content (`doc.content`) changes on an already-published article

Since the articles were created and published before the hook existed, they were never indexed. Re-saving an article without changes does NOT trigger indexing either — the hook checks `JSON.stringify(doc.content) !== JSON.stringify(previousDoc?.content)` and skips if content is identical.

## Fix: One-Time Re-Index Script

Write a script at `scripts/reindex-content-chunks.ts` that:

1. Initializes Payload (`getPayload()`)
2. Finds all articles with `editorialStatus: 'published'`
3. For each article, directly calls the indexing logic:
   - Chunk the Lexical content via `chunkLexicalContent(doc.content)`
   - Generate embeddings via `embedBatch(chunks)`
   - Delete any existing chunks for this article
   - Insert new chunks with embeddings (via Payload create + raw SQL for the vector column)

### Why Not Just Re-Save?

Re-saving without changing content won't trigger the hook (see line 37 of the hook: both `statusChangedToPublished` and `contentChanged` will be false). You'd need to either:
- Temporarily modify content, save, revert, save again (hacky), or
- Call the indexing logic directly (clean)

### Key Files

| File | Purpose |
|------|---------|
| `src/hooks/indexContentChunks.ts` | The afterChange hook — study the logic, reuse the core flow |
| `src/ai/chunker.ts` | `chunkLexicalContent()` — chunks Lexical JSON into text segments |
| `src/ai/embeddings.ts` | `embedBatch()` — calls Jina AI to generate vectors |
| `src/collections/Articles/index.ts:95` | Where the hook is registered (afterChange) |
| `src/collections/ContentChunks/index.ts` | The content-chunks collection schema |

### Required Env Vars

The script needs Jina AI credentials (for embedding generation):
```
AI_PROVIDER_JINA_BASE_URL=...
AI_PROVIDER_JINA_API_KEY=...
```
These should already be in `.env.development`. The script does NOT need the LLM key (`AI_PROVIDER_DEFAULT_API_KEY`) — that's for chat generation, not embeddings.

### Script Pattern

Follow the existing `scripts/build-guide-search-index.ts` as a reference for script structure. Use `getPayload()` to initialize (same pattern as `scripts/ci-migrate.ts`).

```typescript
// scripts/reindex-content-chunks.ts (pseudocode outline)
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { chunkLexicalContent } from '../src/ai/chunker'
import { embedBatch } from '../src/ai/embeddings'
import { sql } from '@payloadcms/db-postgres/drizzle'

async function reindex() {
  const payload = await getPayload({ config })

  // Find all published articles
  const articles = await payload.find({
    collection: 'articles',
    where: { editorialStatus: { equals: 'published' } },
    limit: 100,
    depth: 1,
  })

  for (const article of articles.docs) {
    // 1. Chunk content
    const chunks = chunkLexicalContent(article.content)
    if (chunks.length === 0) continue

    // 2. Generate embeddings
    const embeddings = await embedBatch(chunks.map(c => c.text))

    // 3. Delete existing chunks for this article
    const existing = await payload.find({
      collection: 'content-chunks',
      where: {
        and: [
          { sourceCollection: { equals: 'articles' } },
          { sourceId: { equals: article.id } },
        ],
      },
      limit: 1000,
      overrideAccess: true,
    })
    for (const chunk of existing.docs) {
      await payload.delete({ collection: 'content-chunks', id: chunk.id, overrideAccess: true })
    }

    // 4. Insert new chunks
    const accessLevel = article.accessLevel ?? 'free'
    const pillar = typeof article.pillar === 'string' ? article.pillar : article.pillar?.id

    for (let i = 0; i < chunks.length; i++) {
      const created = await payload.create({
        collection: 'content-chunks',
        data: {
          text: chunks[i].text,
          sourceCollection: 'articles',
          sourceId: article.id as string,
          sourceTitle: article.title as string,
          accessLevel,
          pillar: pillar ?? undefined,
          chunkIndex: chunks[i].index,
          tokenCount: chunks[i].tokenCount,
        },
        overrideAccess: true,
      })

      const vectorStr = `[${embeddings[i].join(',')}]`
      await payload.db.drizzle.execute(
        sql`UPDATE content_chunks SET embedding = ${vectorStr}::vector WHERE id = ${created.id}`
      )
    }

    console.log(`Indexed ${chunks.length} chunks for article: ${article.title}`)
  }

  console.log('Done. Exiting.')
  process.exit(0)
}

reindex().catch(err => { console.error(err); process.exit(1) })
```

### Add to package.json

```json
"scripts": {
  "reindex": "tsx scripts/reindex-content-chunks.ts"
}
```

### Execution

Run locally first to verify:
```bash
cmd.exe /c "cd limitless-paths && pnpm reindex"
```

Then run against production DB (set `DATABASE_URI` to the Render connection string). Or deploy the script and run it once on Render.

## Verification

After running, verify:
1. `ContentChunks` collection has entries: check admin panel or `payload.count({ collection: 'content-chunks' })`
2. AI search returns results: `curl "https://paths-api.limitless-longevity.health/api/ai/search?q=longevity"` (with auth header)
3. Expected: ~50-100 chunks from 12 articles

## Scope

- Only Articles — Lessons don't have the `indexContentChunks` hook
- Only `editorialStatus: 'published'` articles
- No code changes to the hook itself — the hook works correctly for future saves
