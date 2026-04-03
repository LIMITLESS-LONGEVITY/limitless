import type { Endpoint } from 'payload'
import { retrieveRelevantChunks } from '../../ai/retrieval'
import { getEffectiveAccessLevels, type AccessLevel } from '../../utilities/accessLevels'
import { getUserAccessLevel, getUserTenantAccessLevel } from '../../utilities/types'
import { sql } from '@payloadcms/db-postgres/drizzle'

export const recommendationsEndpoint: Endpoint = {
  path: '/ai/recommendations',
  method: 'post',
  handler: async (req) => {
    // 1. Authenticate
    if (!req.user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    // 2. Parse request
    const body = (await req.json?.()) as {
      contextType?: string
      contextId?: string
      limit?: number
    } | undefined

    if (!body?.contextType || !body?.contextId) {
      return Response.json({ error: 'Missing required fields: contextType, contextId' }, { status: 400 })
    }

    const limit = Math.min(Math.max(body.limit ?? 5, 1), 10)

    try {
      // 3. Get current document's first chunk embedding as query vector
      const currentChunks = await req.payload.db.drizzle.execute(sql`
        SELECT embedding FROM content_chunks
        WHERE source_collection = ${body.contextType}
          AND source_id = ${body.contextId}
          AND embedding IS NOT NULL
        ORDER BY chunk_index
        LIMIT 1
      `)

      if (!currentChunks.rows || currentChunks.rows.length === 0) {
        return Response.json({ recommendations: [] })
      }

      // 4. Use existing retrieval pipeline with the document's embedding as context
      // We re-embed the title+first chunk text for a semantic query
      const firstChunk = await req.payload.find({
        collection: 'content-chunks',
        where: {
          and: [
            { sourceCollection: { equals: body.contextType } },
            { sourceId: { equals: body.contextId } },
          ],
        },
        sort: 'chunkIndex',
        limit: 1,
        overrideAccess: true,
        req,
      })

      if (firstChunk.docs.length === 0) {
        return Response.json({ recommendations: [] })
      }

      const queryText = (firstChunk.docs[0] as unknown as { text: string }).text

      // 5. Get completed lesson IDs to exclude
      let completedDocIds: string[] = [body.contextId]
      try {
        const progress = await req.payload.find({
          collection: 'lesson-progress',
          where: {
            and: [
              { user: { equals: req.user.id } },
              { status: { equals: 'completed' } },
            ],
          },
          limit: 200,
          overrideAccess: true,
          req,
        })
        const lessonIds = progress.docs.map((p: any) =>
          typeof p.lesson === 'string' ? p.lesson : p.lesson?.id,
        ).filter(Boolean) as string[]
        completedDocIds = [...completedDocIds, ...lessonIds]
      } catch {}

      // 6. Retrieve similar content
      const chunks = await retrieveRelevantChunks(queryText, req.payload, req, {
        limit: limit * 2,
        excludeDocIds: completedDocIds,
      })

      // 7. Deduplicate by source document
      const seen = new Map<string, typeof chunks[0]>()
      for (const chunk of chunks) {
        const key = `${chunk.sourceCollection}:${chunk.sourceId}`
        if (!seen.has(key)) seen.set(key, chunk)
      }

      const userLevels = getEffectiveAccessLevels(
        getUserAccessLevel(req.user),
        getUserTenantAccessLevel(req.user),
      )

      const recommendations = Array.from(seen.values()).slice(0, limit).map((chunk) => ({
        title: chunk.sourceTitle,
        collection: chunk.sourceCollection,
        sourceId: chunk.sourceId,
        accessLevel: chunk.accessLevel,
        locked: !userLevels.includes(chunk.accessLevel as AccessLevel),
        snippet: chunk.text.slice(0, 200),
        relevanceScore: chunk.relevanceScore,
      }))

      return Response.json({ recommendations })
    } catch (_err) {
      return Response.json({ error: 'Recommendations failed.' }, { status: 500 })
    }
  },
}
