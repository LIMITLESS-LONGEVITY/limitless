import type { Endpoint } from 'payload'
import { retrieveRelevantChunks } from '../../ai/retrieval'
import { logUsage } from '../../ai/usageLogger'
import { getEffectiveAccessLevels } from '../../utilities/accessLevels'
import { validateAIRequest, isErrorResponse } from '../../ai/middleware'
import { getUserAccessLevel, getUserTenantAccessLevel } from '../../utilities/types'
import type { AccessLevel } from '../../utilities/accessLevels'

export const semanticSearchEndpoint: Endpoint = {
  path: '/ai/search',
  method: 'post',
  handler: async (req) => {
    // Parse request first (before middleware, since search allows unauthenticated)
    const body = (await req.json?.()) as {
      query?: string
      pillar?: string
      limit?: number
    } | undefined

    if (!body?.query || body.query.trim().length === 0) {
      return Response.json({ error: 'Missing required field: query' }, { status: 400 })
    }

    const ctx = await validateAIRequest(req, 'semantic-search', {
      allowUnauthenticated: true,
      rateLimitMessage: 'Daily search limit reached. Upgrade your plan for more searches.',
    })
    if (isErrorResponse(ctx)) return ctx

    const limit = Math.min(Math.max(body.limit ?? 10, 1), 20)

    // Retrieve chunks
    try {
      const chunks = await retrieveRelevantChunks(
        body.query, req.payload, req,
        { limit: limit * 2, pillarFilter: body.pillar },
      )

      // Deduplicate by source document (take highest-scoring chunk per doc)
      const seen = new Map<string, typeof chunks[0]>()
      for (const chunk of chunks) {
        const key = `${chunk.sourceCollection}:${chunk.sourceId}`
        if (!seen.has(key) || chunk.relevanceScore > seen.get(key)!.relevanceScore) {
          seen.set(key, chunk)
        }
      }

      const deduped = Array.from(seen.values()).slice(0, limit)

      // Compute locked status for each result
      const userLevels = req.user
        ? getEffectiveAccessLevels(
            getUserAccessLevel(req.user),
            getUserTenantAccessLevel(req.user),
          )
        : ['free']

      const results = deduped.map((chunk) => ({
        title: chunk.sourceTitle,
        slug: '',
        collection: chunk.sourceCollection,
        accessLevel: chunk.accessLevel,
        locked: !userLevels.includes(chunk.accessLevel as AccessLevel),
        snippet: chunk.text.slice(0, 300),
        relevanceScore: chunk.relevanceScore,
      }))

      // Log usage
      logUsage(req, {
        feature: 'semantic-search',
        provider: 'jina',
        model: 'jina-embeddings-v3',
        inputTokens: Math.ceil(body.query.length / 4),
        outputTokens: 0,
        durationMs: Date.now() - ctx.startTime,
      })

      return Response.json({ results })
    } catch (_err) {
      return Response.json({ error: 'Search failed. Please try again.' }, { status: 500 })
    }
  },
}
