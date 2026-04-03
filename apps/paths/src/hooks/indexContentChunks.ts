import type { CollectionAfterChangeHook } from 'payload'
import { chunkLexicalContent } from '../ai/chunker'
import { embedBatch } from '../ai/embeddings'
import { sql } from '@payloadcms/db-postgres/drizzle'

/**
 * afterChange hook that indexes content chunks with embeddings when published.
 *
 * Triggers when:
 * - Document is published (editorialStatus changed to 'published')
 * - Published document's content is updated
 *
 * Flow:
 * 1. Check if indexing is needed
 * 2. Chunk the Lexical content semantically
 * 3. Generate embeddings via Jina API (batched)
 * 4. Delete existing chunks for this document
 * 5. Insert new chunks with embeddings
 */
export const indexContentChunks: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  collection,
}) => {
  const collectionSlug = collection.slug

  // Determine if indexing is needed
  const isPublished = doc.editorialStatus === 'published'
  const wasPublished = previousDoc?.editorialStatus === 'published'
  const statusChangedToPublished = isPublished && !wasPublished
  const contentChanged =
    isPublished &&
    wasPublished &&
    JSON.stringify(doc.content) !== JSON.stringify(previousDoc?.content)

  if (!statusChangedToPublished && !contentChanged) return doc

  // If unpublished, delete existing chunks
  if (!isPublished) {
    await deleteChunks(req, collectionSlug, doc.id)
    return doc
  }

  try {
    // 1. Chunk the content
    const chunks = chunkLexicalContent(doc.content)
    if (chunks.length === 0) return doc

    // 2. Generate embeddings (batched)
    const embeddings = await embedBatch(chunks.map((c) => c.text))

    // 3. Delete existing chunks
    await deleteChunks(req, collectionSlug, doc.id)

    // 4. Insert new chunks with embeddings
    const accessLevel = doc.accessLevel ?? 'free'
    const pillar = typeof doc.pillar === 'string' ? doc.pillar : doc.pillar?.id

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const embedding = embeddings[i]

      // Create chunk record via Payload
      const created = await req.payload.create({
        collection: 'content-chunks',
        data: {
          text: chunk.text,
          sourceCollection: collectionSlug,
          sourceId: doc.id as string,
          sourceTitle: doc.title as string,
          accessLevel,
          pillar: pillar ?? undefined,
          chunkIndex: chunk.index,
          tokenCount: chunk.tokenCount,
        },
        req,
        overrideAccess: true,
      })

      // Update embedding via raw SQL (Payload doesn't support vector fields)
      const vectorStr = `[${embedding.join(',')}]`
      await req.payload.db.drizzle.execute(
        sql`UPDATE content_chunks SET embedding = ${vectorStr}::vector WHERE id = ${created.id}`,
      )
    }

    console.log(
      `[indexContentChunks] Indexed ${chunks.length} chunks for ${collectionSlug}/${doc.id}`,
    )
  } catch (err) {
    console.error('[indexContentChunks] Error:', (err as Error).message)
    // Don't block the save — indexing failure is non-fatal
  }

  return doc
}

async function deleteChunks(req: any, collection: string, docId: string) {
  const existing = await req.payload.find({
    collection: 'content-chunks',
    where: {
      and: [
        { sourceCollection: { equals: collection } },
        { sourceId: { equals: docId } },
      ],
    },
    limit: 1000,
    overrideAccess: true,
    req,
  })

  for (const chunk of existing.docs) {
    await req.payload.delete({
      collection: 'content-chunks',
      id: chunk.id,
      req,
      overrideAccess: true,
    })
  }
}
