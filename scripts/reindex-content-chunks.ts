/**
 * One-time script to index all published articles into ContentChunks.
 *
 * The indexContentChunks afterChange hook was deployed after articles were
 * created, so they were never indexed. This script replicates the hook logic
 * for all existing published articles.
 *
 * Usage: pnpm reindex
 * Requires: DATABASE_URL, AI_PROVIDER_JINA_BASE_URL, AI_PROVIDER_JINA_API_KEY
 */

import { getPayload } from 'payload'
import config from '../src/payload.config.js'
import { chunkLexicalContent } from '../src/ai/chunker'
import { embedBatch } from '../src/ai/embeddings'
import { sql } from '@payloadcms/db-postgres/drizzle'

async function reindex() {
  console.log('Starting content chunk re-indexing...')
  const payload = await getPayload({ config: await config })

  // Find all published articles
  const articles = await payload.find({
    collection: 'articles',
    where: { editorialStatus: { equals: 'published' } },
    limit: 100,
    depth: 1,
    overrideAccess: true,
  })

  console.log(`Found ${articles.docs.length} published articles to index.`)

  let totalChunks = 0

  for (const article of articles.docs) {
    // 1. Chunk content
    const chunks = chunkLexicalContent(article.content)
    if (chunks.length === 0) {
      console.log(`  Skipping "${article.title}" — no content to chunk`)
      continue
    }

    // 2. Generate embeddings
    const embeddings = await embedBatch(chunks.map((c) => c.text))

    // 3. Delete existing chunks for this article
    const existing = await payload.find({
      collection: 'content-chunks',
      where: {
        and: [
          { sourceCollection: { equals: 'articles' } },
          { sourceId: { equals: String(article.id) } },
        ],
      },
      limit: 1000,
      overrideAccess: true,
    })
    for (const chunk of existing.docs) {
      await payload.delete({
        collection: 'content-chunks',
        id: chunk.id,
        overrideAccess: true,
      })
    }

    // 4. Insert new chunks with embeddings
    const accessLevel = article.accessLevel ?? 'free'
    const pillar =
      typeof article.pillar === 'object' ? article.pillar?.id : article.pillar

    for (let i = 0; i < chunks.length; i++) {
      const created = await payload.create({
        collection: 'content-chunks',
        data: {
          text: chunks[i].text,
          sourceCollection: 'articles',
          sourceId: String(article.id),
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
        sql`UPDATE content_chunks SET embedding = ${vectorStr}::vector WHERE id = ${created.id}`,
      )
    }

    totalChunks += chunks.length
    console.log(`  Indexed ${chunks.length} chunks for "${article.title}"`)
  }

  console.log(`\nDone. Indexed ${totalChunks} total chunks from ${articles.docs.length} articles.`)
  process.exit(0)
}

reindex().catch((err) => {
  console.error('Re-indexing failed:', err)
  process.exit(1)
})
