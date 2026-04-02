import { embedText } from './embeddings'
import { rerank } from './reranker'
import { getEffectiveAccessLevels } from '../utilities/accessLevels'
import { sql } from '@payloadcms/db-postgres/drizzle'
import type { Payload, PayloadRequest } from 'payload'

export interface RetrievedChunk {
  id: string
  text: string
  sourceCollection: string
  sourceId: string
  sourceTitle: string
  accessLevel: string
  pillarId?: string
  chunkIndex: number
  relevanceScore: number
}

/**
 * Build the access level filter for vector search.
 * Exported for testing.
 */
export function buildAccessFilter(
  user: any | null,
  enrolledCourseLevels: string[],
): string[] {
  // Admin bypass
  if (user?.role && ['admin', 'publisher', 'editor'].includes(user.role as string)) {
    return ['free', 'regular', 'premium', 'enterprise']
  }

  // Get user's effective levels
  const tierLevel = user?.tier?.accessLevel as string | undefined
  const orgLevel = user?.tenant?.contentAccessLevel as string | undefined
  const baseLevels = getEffectiveAccessLevels(tierLevel ?? null, orgLevel ?? null) as string[]

  // Add enrolled course levels (enrollment bypass)
  const allLevels = new Set([...baseLevels, ...enrolledCourseLevels])
  return Array.from(allLevels)
}

/**
 * Two-stage retrieval: vector search (top N candidates) → rerank (top K results).
 *
 * Access control is applied at the database level in Stage 1.
 * The LLM never sees unauthorized content.
 */
export async function retrieveRelevantChunks(
  query: string,
  payload: Payload,
  req: PayloadRequest,
  options?: {
    limit?: number
    candidateLimit?: number
    pillarFilter?: string
    excludeDocIds?: string[]
  },
): Promise<RetrievedChunk[]> {
  const limit = options?.limit ?? 5
  const candidateLimit = options?.candidateLimit ?? 50
  const user = req.user

  // Get enrolled course access levels for bypass
  let enrolledCourseLevels: string[] = []
  if (user) {
    try {
      const enrollments = await payload.find({
        collection: 'enrollments',
        where: {
          and: [
            { user: { equals: user.id } },
            { status: { equals: 'active' } },
          ],
        },
        depth: 1,
        limit: 100,
        overrideAccess: true,
        req,
      })
      enrolledCourseLevels = enrollments.docs
        .map((e: any) => {
          const course = typeof e.course === 'object' ? e.course : null
          return course?.accessLevel
        })
        .filter(Boolean)
    } catch {
      // Enrollments collection may not exist yet — proceed without bypass
    }
  }

  const allowedLevels = buildAccessFilter(user, enrolledCourseLevels)

  // Stage 1: Vector search
  const queryEmbedding = await embedText(query)
  const vectorStr = `[${queryEmbedding.join(',')}]`

  // Build WHERE clause
  let whereClause = sql`access_level::text = ANY(ARRAY[${sql.raw(allowedLevels.map((l) => `'${l}'`).join(','))}]::text[])`

  if (options?.pillarFilter) {
    whereClause = sql`${whereClause} AND pillar_id = ${options.pillarFilter}`
  }

  if (options?.excludeDocIds && options.excludeDocIds.length > 0) {
    const excludeList = options.excludeDocIds.map((id) => `'${id}'`).join(',')
    whereClause = sql`${whereClause} AND source_id != ALL(ARRAY[${sql.raw(excludeList)}]::text[])`
  }

  const candidates = await payload.db.drizzle.execute(sql`
    SELECT id, text, source_collection, source_id, source_title, access_level, pillar_id, chunk_index,
      1 - (embedding <=> ${vectorStr}::vector) as similarity
    FROM content_chunks
    WHERE embedding IS NOT NULL AND ${whereClause}
    ORDER BY embedding <=> ${vectorStr}::vector
    LIMIT ${candidateLimit}
  `)

  if (!candidates.rows || candidates.rows.length === 0) return []

  // Stage 2: Rerank
  const candidateTexts = candidates.rows.map((r: any) => r.text)
  const reranked = await rerank(query, candidateTexts, limit)

  // Map reranked results back to full chunk data
  return reranked.map((r) => {
    const row = candidates.rows[r.index] as any
    return {
      id: row.id,
      text: row.text,
      sourceCollection: row.source_collection,
      sourceId: row.source_id,
      sourceTitle: row.source_title,
      accessLevel: row.access_level,
      pillarId: row.pillar_id,
      chunkIndex: row.chunk_index,
      relevanceScore: r.relevanceScore,
    }
  })
}
