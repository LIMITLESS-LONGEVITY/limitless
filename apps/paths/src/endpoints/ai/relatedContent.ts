import type { Endpoint } from 'payload'
import { embedText } from '../../ai/embeddings'
import { isStaffRole } from '../../ai/rateLimiter'
import { sql } from '@payloadcms/db-postgres/drizzle'

export const relatedContentEndpoint: Endpoint = {
  path: '/ai/related-content',
  method: 'post',
  handler: async (req) => {
    // 1. Authenticate — staff only
    if (!req.user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (!isStaffRole((req.user.role as string) ?? 'user')) {
      return Response.json({ error: 'Staff access required' }, { status: 403 })
    }

    // 2. Parse request
    const body = (await req.json?.()) as {
      text?: string
      excludeId?: string
    } | undefined

    if (!body?.text || body.text.trim().length === 0) {
      return Response.json({ error: 'Missing required field: text' }, { status: 400 })
    }

    try {
      // 3. Embed the text
      const embedding = await embedText(body.text.slice(0, 8000)) // truncate to context limit
      const vectorStr = `[${embedding.join(',')}]`

      // 4. Vector search (no reranking — speed over precision for a helper tool)
      let excludeClause = sql``
      if (body.excludeId) {
        excludeClause = sql`AND source_id != ${body.excludeId}`
      }

      const results = await req.payload.db.drizzle.execute(sql`
        SELECT DISTINCT ON (source_id) source_id, source_collection, source_title, pillar,
          1 - (embedding <=> ${vectorStr}::vector) as similarity
        FROM content_chunks
        WHERE embedding IS NOT NULL ${excludeClause}
        ORDER BY source_id, embedding <=> ${vectorStr}::vector
        LIMIT 50
      `)

      // Sort by similarity and take top 10
      const sorted = (results.rows as any[])
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 10)

      const related = sorted.map((row) => ({
        id: row.source_id,
        title: row.source_title,
        collection: row.source_collection,
        similarityScore: Math.round(row.similarity * 100) / 100,
      }))

      return Response.json({ related })
    } catch (_err) {
      return Response.json({ error: 'Related content search failed.' }, { status: 500 })
    }
  },
}
