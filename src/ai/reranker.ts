export const RERANKER_MODEL = 'jina-reranker-v3'

export interface RerankResult {
  index: number
  relevanceScore: number
}

/**
 * Rerank a list of documents by relevance to a query.
 * Uses Jina's /v1/rerank endpoint (not OpenAI-compatible).
 * Returns the top N results sorted by relevance score.
 */
export async function rerank(
  query: string,
  documents: string[],
  topN: number = 5,
): Promise<RerankResult[]> {
  if (documents.length === 0) return []

  const baseUrl = process.env.AI_PROVIDER_JINA_BASE_URL ?? 'https://api.jina.ai/v1'
  const apiKey = process.env.AI_PROVIDER_JINA_API_KEY
  if (!apiKey) {
    throw new Error('AI_PROVIDER_JINA_API_KEY is not configured')
  }

  const response = await fetch(`${baseUrl.replace('/v1', '')}/v1/rerank`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: RERANKER_MODEL,
      query,
      documents,
      top_n: topN,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Reranker API error: ${response.status} ${error}`)
  }

  const data = (await response.json()) as {
    results: Array<{ index: number; relevance_score: number }>
  }

  return data.results.map((r) => ({
    index: r.index,
    relevanceScore: r.relevance_score,
  }))
}
